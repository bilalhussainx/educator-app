/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   ViewLessonPage.tsx (Final Version - Phase 6)
 * =================================================================
 * DESCRIPTION: This version is fully instrumented for analytics and
 * is connected to the global APE store to adapt the AI tutor's
 * behavior based on the student's cognitive profile.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { Submission, Lesson, LessonFile } from '../types/index.ts';
import Editor, { OnMount } from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { cn } from "@/lib/utils";

// --- ANALYTICS & APE: Import services and stores ---
import analytics from '../services/analyticsService.ts';
import { useApeStore } from '../stores/apeStore';

// Import shadcn components and icons
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb, Save, Send, ArrowLeftRight } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// --- Type definition for structured test results ---
interface TestResult {
    passed: number;
    failed: number;
    total: number;
    results: string; // The raw output from the test runner
}

// --- CoreZenith Styled Modals ---
const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
    <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
);

// --- NEW Feedback Card Component ---
const FeedbackCard = ({ submission }: { submission: Submission }) => (
    <Card className="bg-green-950/40 backdrop-blur-lg border border-green-500/30">
        <CardHeader>
            <CardTitle className="text-xl text-green-300 flex justify-between items-center">
                <span>Teacher Feedback</span>
                <span className="text-lg font-bold px-3 py-1 bg-green-500/20 text-green-200 rounded-full">
                    Grade: {submission.grade}
                </span>
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{submission.feedback}</p>
            <p className="text-xs text-slate-500 mt-4">
                Graded on: {new Date(submission.submitted_at).toLocaleDateString()}
            </p>
        </CardContent>
    </Card>
);

const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
    <AlertDialog open={true} onOpenChange={onClose}>
        <GlassAlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-3 text-cyan-300"><BeakerIcon /> Test Run Results</AlertDialogTitle>
                <AlertDialogDescription className="pt-4 space-y-4 text-slate-300">
                    {isLoading ? "Executing tests in simulation..." : results && (
                        <>
                            <div className={cn('p-4 rounded-lg border', results.failed > 0 ? 'bg-red-950/40 border-red-500/30 text-red-300' : 'bg-green-950/40 border-green-500/30 text-green-300')}>
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    {results.failed > 0 ? <><XCircle/>{`${results.failed} / ${results.total} Tests Failed`}</> : <><CheckCircle/>{`All ${results.total} Tests Passed!`}</>}
                                </h3>
                            </div>
                            <div className="bg-black/40 p-3 rounded-md text-slate-300 whitespace-pre-wrap text-xs max-h-60 overflow-y-auto font-mono">
                                <code>{results.results}</code>
                            </div>
                        </>
                    )}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
            </AlertDialogFooter>
        </GlassAlertDialogContent>
    </AlertDialog>
);

const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
    <AlertDialog open={true} onOpenChange={onClose}>
        <GlassAlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-3 text-fuchsia-300"><BrainCircuit /> AI Oracle</AlertDialogTitle>
                <AlertDialogDescription className="pt-4 text-slate-300">
                    {isLoading ? "Consulting the Oracle..." : <div className="bg-fuchsia-950/40 border border-fuchsia-500/30 p-4 rounded-md whitespace-pre-wrap">{hint}</div>}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
            </AlertDialogFooter>
        </GlassAlertDialogContent>
    </AlertDialog>
);


const ViewLessonPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // --- APE: Read the current tutor style from the global store ---
    const tutorStyle = useApeStore((state) => state.tutorStyle);

    // --- State Management ---
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [files, setFiles] = useState<LessonFile[]>([]);
    const [activeFileId, setActiveFileId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isHintModalOpen, setIsHintModalOpen] = useState(false);
    const [aiHint, setAiHint] = useState('');
    const [isHintLoading, setIsHintLoading] = useState(false);
    const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
    const [testResults, setTestResults] = useState<TestResult | null>(null);
    const [isTesting, setIsTesting] = useState(false);
    const [conceptualHint, setConceptualHint] = useState<string | null>(null);
    const [submission, setSubmission] = useState<Submission | null>(null); // <-- ADD THIS LINE

    // --- APE State ---
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [codeChurn, setCodeChurn] = useState<number>(0);
    const prevFileContentRef = useRef<string>("");
    
    // --- Refs ---
    const editorRef = useRef<any>(null);
    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal | null>(null);
    const ws = useRef<WebSocket | null>(null);

    const queryParams = new URLSearchParams(location.search);
    const teacherSessionId = queryParams.get('sessionId');
    const isLiveHomework = !!teacherSessionId;

    const activeFile = files.find(f => f.id === activeFileId);
    
    const calculateLineDiff = (oldContent: string, newContent: string): number => {
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        return Math.abs(oldLines.length - newLines.length);
    };

    // --- WebSocket Connection Logic ---
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token || !lessonId) return;

        const terminalSessionId = crypto.randomUUID(); 
        const wsUrl = isLiveHomework
            ? `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${lessonId}`
            : `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}`;
            
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

    // --- Terminal Initialization ---
    useEffect(() => {
        if (terminalRef.current && !term.current) {
            const fitAddon = new FitAddon();
            const newTerm = new Terminal({
                cursorBlink: true,
                theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' },
                fontSize: 14,
                fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
            });
            newTerm.loadAddon(fitAddon);
            newTerm.open(terminalRef.current);
            fitAddon.fit();
            newTerm.onData((data) => {
                if (ws.current?.readyState === WebSocket.OPEN) {
                    const messageType = isLiveHomework ? 'HOMEWORK_TERMINAL_IN' : 'TERMINAL_IN';
                    ws.current.send(JSON.stringify({ type: messageType, payload: data }));
                }
            });
            term.current = newTerm;

            const resizeObserver = new ResizeObserver(() => {
                setTimeout(() => fitAddon.fit(), 0);
            });
            if (terminalRef.current) {
                resizeObserver.observe(terminalRef.current);
            }

            return () => {
                resizeObserver.disconnect();
                newTerm.dispose();
                term.current = null;
            };
        }
    }, [isLiveHomework]);

    // --- Data Fetching & Initial Analytics Event ---
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        const fetchLessonState = async () => {
            if (!lessonId) return;
            setIsLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/student-state`, { 
                    headers: { 'Authorization': `Bearer ${token}` } 
                });
                if (!response.ok) throw new Error('Failed to fetch lesson state.');
                
                const data = await response.json();
                setLesson(data.lesson);
                setFiles(data.files || []);
                setSubmission(data.submission || null); // <-- ADD THIS LINE to store the submission data

                setActiveFileId(data.files?.[0]?.id || null);

                analytics.track('Lesson Started', {
                    lesson_id: data.lesson.id,
                    lesson_title: data.lesson.title,
                });

                setStartTime(Date.now());
                setCodeChurn(0);
                const initialContent = data.files?.find((f: LessonFile) => f.id === (data.files?.[0]?.id || null))?.content || "";
                prevFileContentRef.current = initialContent;

            } catch (err) {
                if (err instanceof Error) setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLessonState();
    }, [lessonId]);
    
    // --- Analytics: Paste Event Listener ---
    useEffect(() => {
        const editor = editorRef.current;
        if (editor) {
            const pasteListener = editor.onDidPaste((pasteEvent: any) => {
                const pastedText = pasteEvent.text || '';
                const lineCount = pastedText.split('\n').length;
                analytics.track('Code Pasted', {
                    character_count: pastedText.length,
                    line_count: lineCount,
                    active_file: activeFile?.filename,
                    lesson_id: lessonId,
                });
            });
            return () => {
                pasteListener.dispose();
            };
        }
    }, [editorRef.current, activeFile, lessonId]);

    const handleFileContentChange = (content: string | undefined) => {
        const newContent = content || '';
        const churn = calculateLineDiff(prevFileContentRef.current, newContent);
        setCodeChurn(prevChurn => prevChurn + churn);
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

    const handleSaveCode = async () => {
        if (!lessonId) return;
        setIsSaving(true);
        const token = localStorage.getItem('authToken');
        toast.loading("Saving your progress...");

        try {
            const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/save-progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ files })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save progress.');
            }
            
            toast.dismiss();
            toast.success("Progress saved successfully!");

        } catch (err) {
            toast.dismiss();
            if (err instanceof Error) {
                toast.error(err.message);
            } else {
                toast.error("An unknown error occurred while saving.");
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        const token = localStorage.getItem('authToken');
        setError(null);
        setConceptualHint(null);
        
        const timeToSolveSeconds = Math.round((Date.now() - startTime) / 1000);
        const submissionPayload = {
            files,
            time_to_solve_seconds: timeToSolveSeconds,
            code_churn: codeChurn,
            lesson_id: lessonId,
        };
        
        analytics.track('Solution Submitted', submissionPayload);

        const promise = () => new Promise(async (resolve, reject) => {
            try {
                const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(submissionPayload)
                });

                if (!submitResponse.ok) {
                    const errorData = await submitResponse.json().catch(() => ({
                        error: 'Submission failed. Please run the tests to see the errors.'
                    }));
                    return reject(new Error(errorData.error));
                }

                const result = await submitResponse.json();
                
                if (result.feedback_type === 'conceptual_hint') {
                    setConceptualHint(result.message);
                    return resolve({ message: "All tests passed! The AI has a suggestion for you." });
                } else {
                    setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
                    return resolve({ message: "Great work! Your solution is correct. Redirecting..." });
                }
            } catch (err) {
                return reject(err);
            }
        });

        toast.promise(promise, {
            loading: 'Submitting and checking tests...',
            success: (data: any) => `${data.message}`,
            error: (err) => {
                if (err instanceof Error) {
                    setError(err.message);
                    return `Submission Failed: ${err.message}`;
                }
                return "An unknown error occurred.";
            },
        });
    };

    const handleRunTests = async () => {
        if (!lessonId) return;
        setIsTesting(true);
        setIsTestResultsModalOpen(true);
        setTestResults(null);
        const token = localStorage.getItem('authToken');

        try {
            const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/run-tests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ files })
            });
            const data: TestResult = await response.json();
            setTestResults(data);

            analytics.track('Test Run Executed', {
                passed_count: data.passed,
                failed_count: data.failed,
                total_tests: data.total,
                lesson_id: lessonId,
            });

        } catch (err) {
            const results = err instanceof Error ? err.message : 'An unknown error occurred.';
            setTestResults({ passed: 0, failed: 1, total: 1, results });
        } finally {
            setIsTesting(false);
        }
    };
    
    const handleAddFile = () => {
        const newFileName = prompt("Enter new file name (e.g., helpers.js):");
        if (newFileName && !files.some(f => f.filename === newFileName)) {
            const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
            setFiles([...files, newFile]);
            setActiveFileId(newFile.id);
        } else if (newFileName) {
            alert("A file with that name already exists.");
        }
    };

    const handleDeleteFile = (fileIdToDelete: string) => {
        if (files.length <= 1) {
            alert("You must have at least one file.");
            return;
        }
        const newFiles = files.filter(f => f.id !== fileIdToDelete);
        setFiles(newFiles);
        if (activeFileId === fileIdToDelete) {
            setActiveFileId(newFiles[0].id);
        }
    };
    
    const handleSwitchFile = (fileId: string) => {
        const newActiveFile = files.find(f => f.id === fileId);
        if (newActiveFile) {
            prevFileContentRef.current = newActiveFile.content;
            setActiveFileId(fileId);
        }
    };

    const handleGetHint = async () => {
        if (!editorRef.current || !lesson || !activeFile) return;
        
        analytics.track('Hint Requested', {
            lesson_id: lesson.id,
            active_file: activeFile.filename,
            tutor_style_used: tutorStyle,
        });

        const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
        if (!selectedCode.trim()) {
            alert("Please select a piece of code to get a hint for.");
            return;
        }
        setIsHintModalOpen(true);
        setIsHintLoading(true);
        setAiHint('');
        const token = localStorage.getItem('authToken');

        let promptModifier = "The student is asking for a Socratic hint. Guide them to the answer without giving it away directly.";
        if (tutorStyle === 'hint_based') {
            promptModifier = "The student seems to be struggling. Provide a more direct hint to help them get unstuck.";
        } else if (tutorStyle === 'direct') {
            promptModifier = "The student needs a direct explanation. Explain the concept and provide a corrected code snippet.";
        }

        const payload = {
            selectedCode: activeFile.content,
            lessonId: lesson.id,
            promptModifier: promptModifier,
        };

        try {
            const response = await fetch('http://localhost:5000/api/ai/get-hint', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'The AI assistant could not provide a hint.');
            }
            const data = await response.json();
            setAiHint(data.hint);
        } catch (err) {
            if (err instanceof Error) setAiHint(`Error: ${err.message}`);
            else setAiHint('An unknown error occurred.');
        } finally {
            setIsHintLoading(false);
        }
    };

    if (isLoading) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Initializing Ascent Environment...</p></div>;
    if (error) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-red-400"><p className="relative z-10">{error}</p></div>;
    if (!lesson) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Lesson not found.</p></div>;

    return (
        <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans">
            <Toaster theme="dark" richColors position="top-center" />
            {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
            {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <header className="relative z-20 flex-shrink-0 flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950/40 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)} className="hover:bg-slate-800"><ChevronLeft className="h-5 w-5" /></Button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-100">{lesson.title}</h1>
                        <p className="text-sm text-slate-400">Student Ascent Environment</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isLiveHomework && (
                        <Button variant="outline" onClick={() => navigate(`/session/${teacherSessionId}`)} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
                            <ArrowLeftRight className="mr-2 h-4 w-4" /> View Classroom
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleSaveCode} disabled={isSaving} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
                        <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleRunTests} disabled={isTesting} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
                        <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
                    </Button>
                    <Button variant="outline" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
                        <BrainCircuit className="mr-2 h-4 w-4" /> Get Hint
                    </Button>
                    <Button onClick={handleSubmit} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold">
                        <Send className="mr-2 h-4 w-4" /> Submit Solution
                    </Button>
                </div>
            </header>

            <main className="relative z-10 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
                <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <Card className="bg-slate-900/40 backdrop-blur-lg border-0">
                        <CardHeader><CardTitle className="text-xl text-slate-100">Mission Briefing</CardTitle></CardHeader>
                        <CardContent><p className="text-slate-300 leading-relaxed">{lesson.description}</p></CardContent>
                    </Card>

                    {submission && (
            <FeedbackCard submission={submission} />
        )}

                    {error && (
                        <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300">
                            <XCircle className="h-5 w-5 text-red-400" /><AlertTitle className="font-bold">Submission Error</AlertTitle><AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    {conceptualHint && (
                        <Alert className="bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-300">
                            <Lightbulb className="h-5 w-5 text-fuchsia-400" /><AlertTitle className="font-bold">AI Insight</AlertTitle><AlertDescription>{conceptualHint}</AlertDescription>
                        </Alert>
                    )}
                    
                    <Card className="flex-grow flex flex-col bg-slate-900/40 backdrop-blur-lg border-0">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-xl text-slate-100">Project Files</CardTitle>
                            <Button variant="ghost" size="sm" onClick={handleAddFile} className="hover:bg-slate-800 text-slate-300">
                                <FilePlus2 className="mr-2 h-4 w-4" /> Add File
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-grow overflow-y-auto">
                            <ul className="space-y-1">
                                {files.map((file) => (
                                    <li key={file.id} className={cn("flex items-center justify-between group rounded-md transition-colors", activeFileId === file.id && 'bg-cyan-500/10')}>
                                        <button onClick={() => handleSwitchFile(file.id)} className="w-full text-left p-2.5 flex items-center text-sm font-medium text-slate-200">
                                            <FileIcon className="mr-3 h-4 w-4 text-slate-400" />{file.filename}
                                        </button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
                                            <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2 h-full flex flex-col rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={70} minSize={20} className="overflow-hidden">
                            <Editor
                                height="100%"
                                path={activeFile?.filename}
                                language={activeFile?.filename.split('.').pop() || 'javascript'}
                                theme="vs-dark"
                                value={activeFile?.content}
                                onChange={handleFileContentChange}
                                onMount={handleEditorDidMount}
                                options={{ fontSize: 14, minimap: { enabled: false } }}
                            />
                        </Panel>
                        <PanelResizeHandle className="h-2 bg-slate-800 hover:bg-slate-700 transition-colors" />
                        <Panel defaultSize={30} minSize={10} className="flex flex-col">
                             <div className="flex-shrink-0 bg-slate-800/80 text-slate-300 p-2 flex items-center gap-2 text-sm font-semibold border-t border-slate-700">
                                 <TerminalIcon className="h-4 w-4" />Terminal
                             </div>
                             <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#0D1117]/90" />
                        </Panel>
                    </PanelGroup>
                </div>
            </main>
        </div>
    );
};

export default ViewLessonPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V8.1 - Fully Instrumented for Analytics)
//  * =================================================================
//  * DESCRIPTION: This version implements the CoreZenith "Student Ascent
//  * Environment" and is fully instrumented with both database and
//  * behavioral analytics to power the Adaptive Path Engine.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { Lesson, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // --- ANALYTICS: Import the central analytics service ---
// import analytics from '../services/analyticsService.ts';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb, Save, Send, ArrowLeftRight } from 'lucide-react';
// import { toast, Toaster } from 'sonner';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- CoreZenith Styled Modals (No Changes) ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <GlassAlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle className="flex items-center gap-3 text-cyan-300"><BeakerIcon /> Test Run Results</AlertDialogTitle>
//                 <AlertDialogDescription as="div" className="pt-4 space-y-4 text-slate-300">
//                     {isLoading ? "Executing tests in simulation..." : results && (
//                         <>
//                             <div className={cn('p-4 rounded-lg border', results.failed > 0 ? 'bg-red-950/40 border-red-500/30 text-red-300' : 'bg-green-950/40 border-green-500/30 text-green-300')}>
//                                 <h3 className="font-bold text-lg flex items-center gap-2">
//                                     {results.failed > 0 ? <><XCircle/>{`${results.failed} / ${results.total} Tests Failed`}</> : <><CheckCircle/>{`All ${results.total} Tests Passed!`}</>}
//                                 </h3>
//                             </div>
//                             <div className="bg-black/40 p-3 rounded-md text-slate-300 whitespace-pre-wrap text-xs max-h-60 overflow-y-auto font-mono">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </GlassAlertDialogContent>
//     </AlertDialog>
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


// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();

//     // --- State Management ---
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);
    
//     // --- APE State ---
//     const [startTime, setStartTime] = useState<number>(Date.now());
//     const [codeChurn, setCodeChurn] = useState<number>(0);
//     const prevFileContentRef = useRef<string>("");
    
//     // --- Refs ---
//     const editorRef = useRef<any>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);
    
//     const calculateLineDiff = (oldContent: string, newContent: string): number => {
//         const oldLines = oldContent.split('\n');
//         const newLines = newContent.split('\n');
//         return Math.abs(oldLines.length - newLines.length);
//     };

//     // --- WebSocket & Terminal Logic (No Changes) ---
//     useEffect(() => { /* ...existing logic... */ }, [lessonId, isLiveHomework, teacherSessionId]);
//     useEffect(() => { /* ...existing logic... */ }, [isLiveHomework]);

//     // --- Data Fetching & Initial Analytics Event ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonState = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch lesson state.');
                
//                 const data = await response.json();
//                 setLesson(data.lesson);
//                 setFiles(data.files || []);
//                 setActiveFileId(data.files?.[0]?.id || null);

//                 // --- ANALYTICS: Track when the user starts a lesson ---
//                 analytics.track('Lesson Started', {
//                     lesson_id: data.lesson.id,
//                     lesson_title: data.lesson.title,
//                 });

//                 setStartTime(Date.now());
//                 setCodeChurn(0);
//                 const initialContent = data.files?.find((f: LessonFile) => f.id === (data.files?.[0]?.id || null))?.content || "";
//                 prevFileContentRef.current = initialContent;

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonState();
//     }, [lessonId]);
    
//     // --- ANALYTICS: Attach listener for paste events to the editor ---
//     useEffect(() => {
//         const editor = editorRef.current;
//         if (editor) {
//             const pasteListener = editor.onDidPaste((pasteEvent: any) => {
//                 const pastedText = pasteEvent.text || '';
//                 const lineCount = pastedText.split('\n').length;
//                 analytics.track('Code Pasted', {
//                     character_count: pastedText.length,
//                     line_count: lineCount,
//                     active_file: activeFile?.filename,
//                     lesson_id: lessonId,
//                 });
//             });

//             // Cleanup listener when the component unmounts or editor changes
//             return () => {
//                 pasteListener.dispose();
//             };
//         }
//     }, [editorRef.current, activeFile, lessonId]); // Re-attach if editor or active file changes

//     const handleFileContentChange = (content: string | undefined) => {
//         const newContent = content || '';
//         const churn = calculateLineDiff(prevFileContentRef.current, newContent);
//         setCodeChurn(prevChurn => prevChurn + churn);
//         prevFileContentRef.current = newContent;

//         const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: newContent } : file);
//         setFiles(updatedFiles);

//         if (isLiveHomework && ws.current?.readyState === WebSocket.OPEN) {
//             // ...existing logic...
//         }
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleSaveCode = async () => { /* ...existing logic... */ };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setError(null);
//         setConceptualHint(null);
        
//         const timeToSolveSeconds = Math.round((Date.now() - startTime) / 1000);
//         const submissionPayload = {
//             files,
//             time_to_solve_seconds: timeToSolveSeconds,
//             code_churn: codeChurn,
//             lesson_id: lessonId,
//         };
        
//         // --- ANALYTICS: Track the final submission attempt ---
//         analytics.track('Solution Submitted', submissionPayload);

//         const promise = () => new Promise(async (resolve, reject) => {
//             try {
//                 const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                     body: JSON.stringify(submissionPayload)
//                 });

//                 if (!submitResponse.ok) {
//                     const errorData = await submitResponse.json().catch(() => ({
//                         error: 'Submission failed. Please run the tests to see the errors.'
//                     }));
//                     return reject(new Error(errorData.error));
//                 }

//                 const result = await submitResponse.json();
                
//                 if (result.feedback_type === 'conceptual_hint') {
//                     setConceptualHint(result.message);
//                     return resolve({ message: "All tests passed! The AI has a suggestion for you." });
//                 } else {
//                     setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//                     return resolve({ message: "Great work! Your solution is correct. Redirecting..." });
//                 }

//             } catch (err) {
//                 return reject(err);
//             }
//         });

//         toast.promise(promise, { /* ...existing logic... */ });
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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

//             // --- ANALYTICS: Track the result of the test run ---
//             analytics.track('Test Run Executed', {
//                 passed_count: data.passed,
//                 failed_count: data.failed,
//                 total_tests: data.total,
//                 lesson_id: lessonId,
//             });

//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };
    
//     const handleAddFile = () => { /* ...existing logic... */ };
//     const handleDeleteFile = (fileIdToDelete: string) => { /* ...existing logic... */ };
//     const handleSwitchFile = (fileId: string) => { /* ...existing logic... */ };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
        
//         // --- ANALYTICS: Track that the user requested a hint ---
//         analytics.track('Hint Requested', {
//             lesson_id: lesson.id,
//             active_file: activeFile.filename,
//         });

//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     if (isLoading) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Initializing Ascent Environment...</p></div>;
//     if (error) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-red-400"><p className="relative z-10">{error}</p></div>;
//     if (!lesson) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Lesson not found.</p></div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans">
//             <Toaster theme="dark" richColors position="top-center" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950/40 backdrop-blur-xl">
//                 <div className="flex items-center gap-3">
//                     <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)} className="hover:bg-slate-800"><ChevronLeft className="h-5 w-5" /></Button>
//                     <div>
//                         <h1 className="text-xl font-bold text-slate-100">{lesson.title}</h1>
//                         <p className="text-sm text-slate-400">Student Ascent Environment</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {isLiveHomework && (
//                         <Button variant="outline" onClick={() => navigate(`/session/${teacherSessionId}`)} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
//                             <ArrowLeftRight className="mr-2 h-4 w-4" /> View Classroom
//                         </Button>
//                     )}
//                     <Button variant="outline" onClick={handleSaveCode} disabled={isSaving} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
//                         <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save'}
//                     </Button>
//                     <Button variant="outline" onClick={handleRunTests} disabled={isTesting} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="outline" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get Hint
//                     </Button>
//                     <Button onClick={handleSubmit} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold">
//                         <Send className="mr-2 h-4 w-4" /> Submit Solution
//                     </Button>
//                 </div>
//             </header>

//             <main className="relative z-10 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
//                     <Card className="bg-slate-900/40 backdrop-blur-lg border-0">
//                         <CardHeader><CardTitle className="text-xl text-slate-100">Mission Briefing</CardTitle></CardHeader>
//                         <CardContent><p className="text-slate-300 leading-relaxed">{lesson.description}</p></CardContent>
//                     </Card>

//                     {error && (
//                         <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300">
//                             <XCircle className="h-5 w-5 text-red-400" /><AlertTitle className="font-bold">Submission Error</AlertTitle><AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}
//                     {conceptualHint && (
//                         <Alert className="bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-300">
//                             <Lightbulb className="h-5 w-5 text-fuchsia-400" /><AlertTitle className="font-bold">AI Insight</AlertTitle><AlertDescription>{conceptualHint}</AlertDescription>
//                         </Alert>
//                     )}
                    
//                     <Card className="flex-grow flex flex-col bg-slate-900/40 backdrop-blur-lg border-0">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle className="text-xl text-slate-100">Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile} className="hover:bg-slate-800 text-slate-300">
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className={cn("flex items-center justify-between group rounded-md transition-colors", activeFileId === file.id && 'bg-cyan-500/10')}>
//                                         <button onClick={() => handleSwitchFile(file.id)} className="w-full text-left p-2.5 flex items-center text-sm font-medium text-slate-200">
//                                             <FileIcon className="mr-3 h-4 w-4 text-slate-400" />{file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                             <Editor
//                                 height="100%"
//                                 path={activeFile?.filename}
//                                 language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                 theme="vs-dark"
//                                 value={activeFile?.content}
//                                 onChange={handleFileContentChange}
//                                 onMount={handleEditorDidMount}
//                                 options={{ fontSize: 14, minimap: { enabled: false } }}
//                             />
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-800 hover:bg-slate-700 transition-colors" />
//                         <Panel defaultSize={30} minSize={10} className="flex flex-col">
//                              <div className="flex-shrink-0 bg-slate-800/80 text-slate-300 p-2 flex items-center gap-2 text-sm font-semibold border-t border-slate-700">
//                                  <TerminalIcon className="h-4 w-4" />Terminal
//                              </div>
//                              <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#0D1117]/90" />
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V8.1 - CoreZenith Design + APE Phase 2)
//  * =================================================================
//  * DESCRIPTION: This version implements the CoreZenith "Student Ascent
//  * Environment" design while preserving 100% of the original V8.1
//  * functionality.
//  *
//  * PHASE 2 UPDATE: This file is now instrumented to collect data for the
//  * Adaptive Path Engine (APE). It tracks time-to-solve and code churn.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { Lesson, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb, Save, Send, ArrowLeftRight } from 'lucide-react';
// import { toast, Toaster } from 'sonner';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- CoreZenith Styled Modals ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <GlassAlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle className="flex items-center gap-3 text-cyan-300"><BeakerIcon /> Test Run Results</AlertDialogTitle>
//                 <AlertDialogDescription as="div" className="pt-4 space-y-4 text-slate-300">
//                     {isLoading ? "Executing tests in simulation..." : results && (
//                         <>
//                             <div className={cn('p-4 rounded-lg border', results.failed > 0 ? 'bg-red-950/40 border-red-500/30 text-red-300' : 'bg-green-950/40 border-green-500/30 text-green-300')}>
//                                 <h3 className="font-bold text-lg flex items-center gap-2">
//                                     {results.failed > 0 ? <><XCircle/>{`${results.failed} / ${results.total} Tests Failed`}</> : <><CheckCircle/>{`All ${results.total} Tests Passed!`}</>}
//                                 </h3>
//                             </div>
//                             <div className="bg-black/40 p-3 rounded-md text-slate-300 whitespace-pre-wrap text-xs max-h-60 overflow-y-auto font-mono">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </GlassAlertDialogContent>
//     </AlertDialog>
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


// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();

//     // --- State Management (Original + APE additions) ---
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);
    
//     // --- APE PHASE 2: State for data collection ---
//     const [startTime, setStartTime] = useState<number>(Date.now());
//     const [codeChurn, setCodeChurn] = useState<number>(0);
//     const prevFileContentRef = useRef<string>("");
//     // --- End APE ---

//     // --- Refs (100% Original) ---
//     const editorRef = useRef<any>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);
    
//     // --- APE PHASE 2: Helper function to calculate line diff ---
//     const calculateLineDiff = (oldContent: string, newContent: string): number => {
//         // This is a simplified churn calculation based on line count changes.
//         // A more sophisticated approach would use a diffing library.
//         const oldLines = oldContent.split('\n');
//         const newLines = newContent.split('\n');
//         return Math.abs(oldLines.length - newLines.length);
//     };
//     // --- End APE ---


//     // --- WebSocket Connection Logic (100% Original) ---
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

//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
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

//     // --- Terminal Initialization (100% Original) ---
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' },
//                 fontSize: 14,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     const messageType = isLiveHomework ? 'HOMEWORK_TERMINAL_IN' : 'TERMINAL_IN';
//                     ws.current.send(JSON.stringify({ type: messageType, payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             if (terminalRef.current) {
//                 resizeObserver.observe(terminalRef.current);
//             }

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, [isLiveHomework]);

//     // --- Data Fetching (Original + APE additions) ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonState = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch lesson state.');
                
//                 const data = await response.json();
//                 setLesson(data.lesson);
//                 setFiles(data.files || []);
//                 setActiveFileId(data.files?.[0]?.id || null);

//                 // --- APE PHASE 2: Initialize trackers ---
//                 setStartTime(Date.now()); // Reset timer when lesson loads
//                 setCodeChurn(0); // Reset churn on load
//                 const initialContent = data.files?.find((f: LessonFile) => f.id === (data.files?.[0]?.id || null))?.content || "";
//                 prevFileContentRef.current = initialContent;
//                 // --- End APE ---

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonState();
//     }, [lessonId]);

//     // --- Handler Functions (Original + APE additions) ---
//     const handleFileContentChange = (content: string | undefined) => {
//         const newContent = content || '';
        
//         // --- APE PHASE 2: Calculate and update code churn ---
//         const churn = calculateLineDiff(prevFileContentRef.current, newContent);
//         setCodeChurn(prevChurn => prevChurn + churn);
//         prevFileContentRef.current = newContent;
//         // --- End APE ---

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

//     const handleSaveCode = async () => {
//         if (!lessonId) return;
//         setIsSaving(true);
//         const token = localStorage.getItem('authToken');
//         toast.loading("Saving your progress...");

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/save-progress`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });

//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'Failed to save progress.');
//             }
            
//             toast.dismiss();
//             toast.success("Progress saved successfully!");

//         } catch (err) {
//             toast.dismiss();
//             if (err instanceof Error) {
//                 toast.error(err.message);
//             } else {
//                 toast.error("An unknown error occurred while saving.");
//             }
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setError(null);
//         setConceptualHint(null);
        
//         // --- APE PHASE 2: Prepare analytics data for submission ---
//         const timeToSolveSeconds = Math.round((Date.now() - startTime) / 1000);
//         const submissionPayload = {
//             files,
//             time_to_solve_seconds: timeToSolveSeconds,
//             code_churn: codeChurn,
//         };
//         // --- End APE ---

//         const promise = () => new Promise(async (resolve, reject) => {
//             try {
//                 const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                     // --- APE PHASE 2: Use the new payload ---
//                     body: JSON.stringify(submissionPayload)
//                     // --- End APE ---
//                 });

//                 if (!submitResponse.ok) {
//                     const errorData = await submitResponse.json().catch(() => ({
//                         error: 'Submission failed. Please run the tests to see the errors.'
//                     }));
//                     return reject(new Error(errorData.error));
//                 }

//                 const result = await submitResponse.json();
                
//                 if (result.feedback_type === 'conceptual_hint') {
//                     setConceptualHint(result.message);
//                     return resolve({ message: "All tests passed! The AI has a suggestion for you." });
//                 } else {
//                     setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//                     return resolve({ message: "Great work! Your solution is correct. Redirecting..." });
//                 }

//             } catch (err) {
//                 return reject(err);
//             }
//         });

//         toast.promise(promise, {
//             loading: 'Submitting and checking tests...',
//             success: (data: any) => `${data.message}`,
//             error: (err) => {
//                 if (err instanceof Error) {
//                     setError(err.message);
//                     return `Submission Failed: ${err.message}`;
//                 }
//                 return "An unknown error occurred.";
//             },
//         });
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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
//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };
    
//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };
    
//     const handleSwitchFile = (fileId: string) => {
//         const newActiveFile = files.find(f => f.id === fileId);
//         if (newActiveFile) {
//             // Update the ref to the *new* file's content before switching
//             prevFileContentRef.current = newActiveFile.content;
//             setActiveFileId(fileId);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     if (isLoading) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Initializing Ascent Environment...</p></div>;
//     if (error) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-red-400"><p className="relative z-10">{error}</p></div>;
//     if (!lesson) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Lesson not found.</p></div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans">
//             <Toaster theme="dark" richColors position="top-center" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950/40 backdrop-blur-xl">
//                 <div className="flex items-center gap-3">
//                     <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)} className="hover:bg-slate-800"><ChevronLeft className="h-5 w-5" /></Button>
//                     <div>
//                         <h1 className="text-xl font-bold text-slate-100">{lesson.title}</h1>
//                         <p className="text-sm text-slate-400">Student Ascent Environment</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {isLiveHomework && (
//                         <Button variant="outline" onClick={() => navigate(`/session/${teacherSessionId}`)} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
//                             <ArrowLeftRight className="mr-2 h-4 w-4" /> View Classroom
//                         </Button>
//                     )}
//                     <Button variant="outline" onClick={handleSaveCode} disabled={isSaving} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
//                         <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save'}
//                     </Button>
//                     <Button variant="outline" onClick={handleRunTests} disabled={isTesting} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="outline" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get Hint
//                     </Button>
//                     <Button onClick={handleSubmit} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold">
//                         <Send className="mr-2 h-4 w-4" /> Submit Solution
//                     </Button>
//                 </div>
//             </header>

//             <main className="relative z-10 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
//                     <Card className="bg-slate-900/40 backdrop-blur-lg border-0">
//                         <CardHeader><CardTitle className="text-xl text-slate-100">Mission Briefing</CardTitle></CardHeader>
//                         <CardContent><p className="text-slate-300 leading-relaxed">{lesson.description}</p></CardContent>
//                     </Card>

//                     {error && (
//                         <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300">
//                             <XCircle className="h-5 w-5 text-red-400" /><AlertTitle className="font-bold">Submission Error</AlertTitle><AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}
//                     {conceptualHint && (
//                         <Alert className="bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-300">
//                             <Lightbulb className="h-5 w-5 text-fuchsia-400" /><AlertTitle className="font-bold">AI Insight</AlertTitle><AlertDescription>{conceptualHint}</AlertDescription>
//                         </Alert>
//                     )}
                    
//                     <Card className="flex-grow flex flex-col bg-slate-900/40 backdrop-blur-lg border-0">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle className="text-xl text-slate-100">Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile} className="hover:bg-slate-800 text-slate-300">
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className={cn("flex items-center justify-between group rounded-md transition-colors", activeFileId === file.id && 'bg-cyan-500/10')}>
//                                         {/* APE Phase 2: Use handleSwitchFile to update churn tracking correctly */}
//                                         <button onClick={() => handleSwitchFile(file.id)} className="w-full text-left p-2.5 flex items-center text-sm font-medium text-slate-200">
//                                             <FileIcon className="mr-3 h-4 w-4 text-slate-400" />{file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                             <Editor
//                                 height="100%"
//                                 path={activeFile?.filename}
//                                 language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                 theme="vs-dark"
//                                 value={activeFile?.content}
//                                 onChange={handleFileContentChange}
//                                 onMount={handleEditorDidMount}
//                                 options={{ fontSize: 14, minimap: { enabled: false } }}
//                             />
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-800 hover:bg-slate-700 transition-colors" />
//                         <Panel defaultSize={30} minSize={10} className="flex flex-col">
//                              <div className="flex-shrink-0 bg-slate-800/80 text-slate-300 p-2 flex items-center gap-2 text-sm font-semibold border-t border-slate-700">
//                                  <TerminalIcon className="h-4 w-4" />Terminal
//                              </div>
//                              <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#0D1117]/90" />
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V8.1 - CoreZenith Design)
//  * =================================================================
//  * DESCRIPTION: This version implements the CoreZenith "Student Ascent
//  * Environment" design while preserving 100% of the original V8.1
//  * functionality. It features a high-contrast, accessible color
//  * scheme and a professional IDE layout.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { Lesson, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb, Save, Send, ArrowLeftRight } from 'lucide-react';
// import { toast, Toaster } from 'sonner';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- CoreZenith Styled Modals ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <GlassAlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle className="flex items-center gap-3 text-cyan-300"><BeakerIcon /> Test Run Results</AlertDialogTitle>
//                 <AlertDialogDescription as="div" className="pt-4 space-y-4 text-slate-300">
//                     {isLoading ? "Executing tests in simulation..." : results && (
//                         <>
//                             <div className={cn('p-4 rounded-lg border', results.failed > 0 ? 'bg-red-950/40 border-red-500/30 text-red-300' : 'bg-green-950/40 border-green-500/30 text-green-300')}>
//                                 <h3 className="font-bold text-lg flex items-center gap-2">
//                                     {results.failed > 0 ? <><XCircle/>{`${results.failed} / ${results.total} Tests Failed`}</> : <><CheckCircle/>{`All ${results.total} Tests Passed!`}</>}
//                                 </h3>
//                             </div>
//                             <div className="bg-black/40 p-3 rounded-md text-slate-300 whitespace-pre-wrap text-xs max-h-60 overflow-y-auto font-mono">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </GlassAlertDialogContent>
//     </AlertDialog>
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


// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();

//     // --- State Management (100% Original) ---
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isSaving, setIsSaving] = useState(false);
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);

//     // --- Refs (100% Original) ---
//     const editorRef = useRef<any>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);

//     // --- WebSocket Connection Logic (100% Original) ---
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

//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
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

//     // --- Terminal Initialization (100% Original) ---
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' },
//                 fontSize: 14,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     const messageType = isLiveHomework ? 'HOMEWORK_TERMINAL_IN' : 'TERMINAL_IN';
//                     ws.current.send(JSON.stringify({ type: messageType, payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             if (terminalRef.current) {
//                 resizeObserver.observe(terminalRef.current);
//             }

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, [isLiveHomework]);

//     // --- Data Fetching (100% Original) ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonState = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch lesson state.');
                
//                 const data = await response.json();
//                 setLesson(data.lesson);
//                 setFiles(data.files || []);
//                 setActiveFileId(data.files?.[0]?.id || null);

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonState();
//     }, [lessonId]);

//     // --- Handler Functions (100% Original) ---
//     const handleFileContentChange = (content: string | undefined) => {
//         const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file);
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

//     const handleSaveCode = async () => {
//         if (!lessonId) return;
//         setIsSaving(true);
//         const token = localStorage.getItem('authToken');
//         toast.loading("Saving your progress...");

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/save-progress`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });

//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'Failed to save progress.');
//             }
            
//             toast.dismiss();
//             toast.success("Progress saved successfully!");

//         } catch (err) {
//             toast.dismiss();
//             if (err instanceof Error) {
//                 toast.error(err.message);
//             } else {
//                 toast.error("An unknown error occurred while saving.");
//             }
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setError(null);
//         setConceptualHint(null);
        
//         const promise = () => new Promise(async (resolve, reject) => {
//             try {
//                 const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                     body: JSON.stringify({ files })
//                 });

//                 if (!submitResponse.ok) {
//                     const errorData = await submitResponse.json().catch(() => ({
//                         error: 'Submission failed. Please run the tests to see the errors.'
//                     }));
//                     return reject(new Error(errorData.error));
//                 }

//                 const result = await submitResponse.json();
                
//                 if (result.feedback_type === 'conceptual_hint') {
//                     setConceptualHint(result.message);
//                     return resolve({ message: "All tests passed! The AI has a suggestion for you." });
//                 } else {
//                     setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//                     return resolve({ message: "Great work! Your solution is correct. Redirecting..." });
//                 }

//             } catch (err) {
//                 return reject(err);
//             }
//         });

//         toast.promise(promise, {
//             loading: 'Submitting and checking tests...',
//             success: (data: any) => `${data.message}`,
//             error: (err) => {
//                 if (err instanceof Error) {
//                     setError(err.message);
//                     return `Submission Failed: ${err.message}`;
//                 }
//                 return "An unknown error occurred.";
//             },
//         });
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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
//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };
    
//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     if (isLoading) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Initializing Ascent Environment...</p></div>;
//     if (error) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-red-400"><p className="relative z-10">{error}</p></div>;
//     if (!lesson) return <div className="w-full h-screen flex items-center justify-center bg-[#0a091a] text-white"><p className="relative z-10">Lesson not found.</p></div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans">
//             <Toaster theme="dark" richColors position="top-center" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             <header className="relative z-20 flex-shrink-0 flex justify-between items-center p-3 border-b border-slate-800 bg-slate-950/40 backdrop-blur-xl">
//                 <div className="flex items-center gap-3">
//                     <Button variant="ghost" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)} className="hover:bg-slate-800"><ChevronLeft className="h-5 w-5" /></Button>
//                     <div>
//                         <h1 className="text-xl font-bold text-slate-100">{lesson.title}</h1>
//                         <p className="text-sm text-slate-400">Student Ascent Environment</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {isLiveHomework && (
//                         <Button variant="outline" onClick={() => navigate(`/session/${teacherSessionId}`)} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
//                             <ArrowLeftRight className="mr-2 h-4 w-4" /> View Classroom
//                         </Button>
//                     )}
//                     <Button variant="outline" onClick={handleSaveCode} disabled={isSaving} className="text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white">
//                         <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save'}
//                     </Button>
//                     <Button variant="outline" onClick={handleRunTests} disabled={isTesting} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="outline" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 hover:text-fuchsia-200 hover:border-fuchsia-500">
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get Hint
//                     </Button>
//                     <Button onClick={handleSubmit} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-bold">
//                         <Send className="mr-2 h-4 w-4" /> Submit Solution
//                     </Button>
//                 </div>
//             </header>

//             <main className="relative z-10 flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto pr-2">
//                     <Card className="bg-slate-900/40 backdrop-blur-lg border-0">
//                         <CardHeader><CardTitle className="text-xl text-slate-100">Mission Briefing</CardTitle></CardHeader>
//                         <CardContent><p className="text-slate-300 leading-relaxed">{lesson.description}</p></CardContent>
//                     </Card>

//                     {error && (
//                         <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300">
//                             <XCircle className="h-5 w-5 text-red-400" /><AlertTitle className="font-bold">Submission Error</AlertTitle><AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}
//                     {conceptualHint && (
//                         <Alert className="bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-300">
//                             <Lightbulb className="h-5 w-5 text-fuchsia-400" /><AlertTitle className="font-bold">AI Insight</AlertTitle><AlertDescription>{conceptualHint}</AlertDescription>
//                         </Alert>
//                     )}
                    
//                     <Card className="flex-grow flex flex-col bg-slate-900/40 backdrop-blur-lg border-0">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle className="text-xl text-slate-100">Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile} className="hover:bg-slate-800 text-slate-300">
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className={cn("flex items-center justify-between group rounded-md transition-colors", activeFileId === file.id && 'bg-cyan-500/10')}>
//                                         <button onClick={() => setActiveFileId(file.id)} className="w-full text-left p-2.5 flex items-center text-sm font-medium text-slate-200">
//                                             <FileIcon className="mr-3 h-4 w-4 text-slate-400" />{file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border border-slate-700/80 bg-slate-900/40 backdrop-blur-lg overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                             <Editor
//                                 height="100%"
//                                 path={activeFile?.filename}
//                                 language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                 theme="vs-dark"
//                                 value={activeFile?.content}
//                                 onChange={handleFileContentChange}
//                                 onMount={handleEditorDidMount}
//                                 options={{ fontSize: 14, minimap: { enabled: false } }}
//                             />
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-800 hover:bg-slate-700 transition-colors" />
//                         <Panel defaultSize={30} minSize={10} className="flex flex-col">
//                              <div className="flex-shrink-0 bg-slate-800/80 text-slate-300 p-2 flex items-center gap-2 text-sm font-semibold border-t border-slate-700">
//                                  <TerminalIcon className="h-4 w-4" />Terminal
//                              </div>
//                              <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#0D1117]/90" />
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;

// // /*
// //  * =================================================================
// //  * FOLDER: src/pages/
// //  * FILE:   ViewLessonPage.tsx (V8.1 - Full Functionality)
// //  * =================================================================
// //  * DESCRIPTION: This version adds the full suite of student actions,
// //  * including saving progress, submitting solutions, and getting hints.
// //  * It correctly loads the student's latest work on component mount
// //  * and preserves it across refreshes.
// //  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb, Save, Send, ArrowLeftRight } from 'lucide-react';
// import { toast, Toaster } from 'sonner';


// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();

//     // --- State Management ---
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isSaving, setIsSaving] = useState(false);
    
//     // AI & Testing Modals
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);

//     // Refs
//     const editorRef = useRef<any>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);

//     // --- WebSocket Connection Logic ---
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

//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
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

//     // --- Terminal Initialization ---
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     const messageType = isLiveHomework ? 'HOMEWORK_TERMINAL_IN' : 'TERMINAL_IN';
//                     ws.current.send(JSON.stringify({ type: messageType, payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             if (terminalRef.current) {
//                 resizeObserver.observe(terminalRef.current);
//             }

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, [isLiveHomework]);

//     // --- Data Fetching to get latest student state ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonState = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch lesson state.');
                
//                 const data = await response.json();
//                 setLesson(data.lesson);
//                 setFiles(data.files || []);
//                 setActiveFileId(data.files?.[0]?.id || null);

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonState();
//     }, [lessonId]);

//     // --- Handler Functions ---
//     const handleFileContentChange = (content: string | undefined) => {
//         const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file);
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

//     const handleSaveCode = async () => {
//         if (!lessonId) return;
//         setIsSaving(true);
//         const token = localStorage.getItem('authToken');
//         toast.loading("Saving your progress...");

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/save-progress`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });

//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'Failed to save progress.');
//             }
            
//             toast.success("Progress saved successfully!");

//         } catch (err) {
//             if (err instanceof Error) {
//                 toast.error(err.message);
//             } else {
//                 toast.error("An unknown error occurred while saving.");
//             }
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setError(null);
//         setConceptualHint(null);
        
//         const promise = () => new Promise(async (resolve, reject) => {
//             try {
//                 const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                     body: JSON.stringify({ files })
//                 });

//                 if (!submitResponse.ok) {
//                     const errorData = await submitResponse.json().catch(() => ({
//                         error: 'Submission failed. Please run the tests to see the errors.'
//                     }));
//                     return reject(new Error(errorData.error));
//                 }

//                 const result = await submitResponse.json();
                
//                 if (result.feedback_type === 'conceptual_hint') {
//                     setConceptualHint(result.message);
//                     return resolve("All tests passed! The AI has a suggestion for you.");
//                 } else {
//                     setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//                     return resolve("Great work! Your solution is correct. Redirecting...");
//                 }

//             } catch (err) {
//                 return reject(err);
//             }
//         });

//         toast.promise(promise, {
//             loading: 'Submitting and checking tests...',
//             success: (message) => `${message}`,
//             error: (err) => {
//                 if (err instanceof Error) {
//                     setError(err.message);
//                     return `Submission Failed: ${err.message}`;
//                 }
//                 return "An unknown error occurred.";
//             },
//         });
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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
//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };
    
//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             <Toaster richColors position="top-center" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Working on your solution.</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {isLiveHomework && (
//                         <Button variant="outline" onClick={() => navigate(`/session/${teacherSessionId}`)}>
//                             <ArrowLeftRight className="mr-2 h-4 w-4" /> View Classroom
//                         </Button>
//                     )}
//                     <Button variant="outline" onClick={handleSaveCode} disabled={isSaving}>
//                         <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Progress'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="secondary" onClick={handleGetHint}>
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                     </Button>
//                     <Button variant="default" onClick={handleSubmit}>
//                         <Send className="mr-2 h-4 w-4" /> Submit Solution
//                     </Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>

//                     {error && (
//                         <Alert variant="destructive">
//                             <XCircle className="h-4 w-4" />
//                             <AlertTitle className="font-bold">Submission Error</AlertTitle>
//                             <AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}
//                     {conceptualHint && (
//                         <Alert variant="default" className="bg-blue-50 border-blue-200">
//                             <Lightbulb className="h-4 w-4 text-blue-600" />
//                             <AlertTitle className="font-bold text-blue-800">A Helpful Suggestion</AlertTitle>
//                             <AlertDescription className="text-blue-700">{conceptualHint}</AlertDescription>
//                         </Alert>
//                     )}

//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename}
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                  <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                      <TerminalIcon className="h-4 w-4" />
//                                      <span className="font-semibold text-sm">Terminal</span>
//                                  </div>
//                                  <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                              </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V8.0 - Save/Submit & Classroom Sync)
//  * =================================================================
//  * DESCRIPTION: This version adds robust functionality for students.
//  * - Save Progress: Students can save their work without submitting.
//  * - Classroom Toggle: If in a live session, students can switch
//  * between their homework and the teacher's live view.
//  * - Unified State Loading: The page now intelligently loads the
//  * most recent code, whether it's saved progress, a past submission,
//  * or the original lesson template.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb, Save, Send, ArrowLeftRight } from 'lucide-react';
// import { toast, Toaster } from 'sonner';


// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();

//     // --- State Management ---
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [isSaving, setIsSaving] = useState(false);
    
//     // AI & Testing Modals
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);

//     // Refs
//     const editorRef = useRef<any>(null);
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     // NEW: Check if this is a live homework session
//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);

//     // --- WebSocket Connection Logic (Unchanged) ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         if (!token || !lessonId) return;

//         // Use a unique session ID for the backend container, but link it to the teacher's session if it's live homework
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

//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
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

//     // --- Terminal Initialization (Unchanged) ---
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     const messageType = isLiveHomework ? 'HOMEWORK_TERMINAL_IN' : 'TERMINAL_IN';
//                     ws.current.send(JSON.stringify({ type: messageType, payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             if (terminalRef.current) {
//                 resizeObserver.observe(terminalRef.current);
//             }

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, [isLiveHomework]);

//     // --- MODIFIED: Data Fetching to get latest student state ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonState = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             try {
//                 // This new endpoint is responsible for returning the lesson details
//                 // and the correct version of the student's files (saved > submitted > template).
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/student-state`, { 
//                     headers: { 'Authorization': `Bearer ${token}` } 
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch lesson state.');
                
//                 const data = await response.json();
//                 setLesson(data.lesson);
//                 setFiles(data.files || []);
//                 setActiveFileId(data.files?.[0]?.id || null);

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonState();
//     }, [lessonId]);

//     // --- Handler Functions ---
//     const handleFileContentChange = (content: string | undefined) => {
//         const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file);
//         setFiles(updatedFiles);

//         // **CONDITIONAL BROADCAST for live monitoring**
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

//     // --- NEW: Save Progress Handler ---
//     const handleSaveCode = async () => {
//         if (!lessonId) return;
//         setIsSaving(true);
//         const token = localStorage.getItem('authToken');
//         toast.loading("Saving your progress...");

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/save-progress`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });

//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'Failed to save progress.');
//             }
            
//             toast.success("Progress saved successfully!");

//         } catch (err) {
//             if (err instanceof Error) {
//                 toast.error(err.message);
//             } else {
//                 toast.error("An unknown error occurred while saving.");
//             }
//         } finally {
//             setIsSaving(false);
//         }
//     };

//     // --- MODIFIED: Submit Handler ---
//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setError(null);
//         setConceptualHint(null);
        
//         const promise = () => new Promise(async (resolve, reject) => {
//             try {
//                 const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                     method: 'POST',
//                     headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                     body: JSON.stringify({ files })
//                 });

//                 if (!submitResponse.ok) {
//                     const errorData = await submitResponse.json().catch(() => ({
//                         error: 'Submission failed. Please run the tests to see the errors.'
//                     }));
//                     return reject(new Error(errorData.error));
//                 }

//                 const result = await submitResponse.json();
                
//                 if (result.feedback_type === 'conceptual_hint') {
//                     setConceptualHint(result.message);
//                     return resolve("All tests passed! The AI has a suggestion for you.");
//                 } else {
//                     setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//                     return resolve("Great work! Your solution is correct. Redirecting...");
//                 }

//             } catch (err) {
//                 return reject(err);
//             }
//         });

//         toast.promise(promise, {
//             loading: 'Submitting and checking tests...',
//             success: (message) => `${message}`,
//             error: (err) => {
//                 if (err instanceof Error) {
//                     setError(err.message);
//                     return `Submission Failed: ${err.message}`;
//                 }
//                 return "An unknown error occurred.";
//             },
//         });
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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
//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };
    
//     // Unchanged handlers: handleAddFile, handleDeleteFile, handleGetHint, handleRunCode
//     const handleAddFile = () => { /* ... (implementation from skeleton) ... */ };
//     const handleDeleteFile = (fileIdToDelete: string) => { /* ... (implementation from skeleton) ... */ };
//     const handleGetHint = async () => { /* ... (implementation from skeleton) ... */ };
//     const handleRunCode = async () => { /* ... (implementation from skeleton) ... */ };


//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             <Toaster richColors position="top-center" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Working on your solution.</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {isLiveHomework && (
//                         <Button variant="outline" onClick={() => navigate(`/session/${teacherSessionId}`)}>
//                             <ArrowLeftRight className="mr-2 h-4 w-4" /> View Classroom
//                         </Button>
//                     )}
//                     <Button variant="outline" onClick={handleSaveCode} disabled={isSaving}>
//                         <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Progress'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="default" onClick={handleSubmit}>
//                         <Send className="mr-2 h-4 w-4" /> Submit Solution
//                     </Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>

//                     {error && (
//                         <Alert variant="destructive">
//                             <XCircle className="h-4 w-4" />
//                             <AlertTitle className="font-bold">Submission Error</AlertTitle>
//                             <AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}
//                     {conceptualHint && (
//                         <Alert variant="default" className="bg-blue-50 border-blue-200">
//                             <Lightbulb className="h-4 w-4 text-blue-600" />
//                             <AlertTitle className="font-bold text-blue-800">A Helpful Suggestion</AlertTitle>
//                             <AlertDescription className="text-blue-700">{conceptualHint}</AlertDescription>
//                         </Alert>
//                     )}

//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename}
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                  <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                      <TerminalIcon className="h-4 w-4" />
//                                      <span className="font-semibold text-sm">Terminal</span>
//                                  </div>
//                                  <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                              </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V7.1 - Unified Standalone & Broadcast)
//  * =================================================================
//  * DESCRIPTION: This version merges the original standalone lesson functionality
//  * with the new real-time broadcasting capabilities. The component now
//  * conditionally connects to a WebSocket for teacher monitoring if a
//  * 'sessionId' is present in the URL, otherwise it functions as before.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb } from 'lucide-react';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();
//     const location = useLocation();

//     // --- State Management (Original + New) ---
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);
    
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     // --- WebSocket Connection Logic ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const queryParams = new URLSearchParams(location.search);
//         const teacherSessionId = queryParams.get('sessionId');

//         // Only establish a WebSocket connection if it's a live-assigned homework
//         if (teacherSessionId && token && lessonId) {
//             const homeworkSessionId = crypto.randomUUID(); // Unique ID for this student's container
//             const wsUrl = `ws://localhost:5000?sessionId=${homeworkSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${lessonId}`;
//             const currentWs = new WebSocket(wsUrl);
//             ws.current = currentWs;

//             currentWs.onopen = () => {
//                 console.log('Live Homework WebSocket connected.');
//                 currentWs.send(JSON.stringify({ type: 'HOMEWORK_JOIN' }));
//             };

//             currentWs.onmessage = (event) => {
//                 try {
//                     const message = JSON.parse(event.data);
//                     if (message.type === 'TERMINAL_OUT') {
//                         term.current?.write(message.payload);
//                     }
//                 } catch (error) {
//                     console.error('Error processing WebSocket message:', error);
//                 }
//             };
            
//             return () => {
//                 currentWs.close();
//             };
//         } else {
//             // Fallback for standalone lesson (no real-time broadcasting)
//             const terminalSessionId = crypto.randomUUID();
//             const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//             const currentWs = new WebSocket(wsUrl);
//             ws.current = currentWs;
//             currentWs.onopen = () => console.log('Standalone Terminal WebSocket connected.');
//             currentWs.onmessage = (event) => {
//                 try {
//                     const message = JSON.parse(event.data);
//                     if (message.type === 'TERMINAL_OUT') {
//                         term.current?.write(message.payload);
//                     }
//                 } catch (error) {
//                     console.error('Error processing WebSocket message:', error);
//                 }
//             };
//             return () => {
//                 currentWs.close();
//             };
//         }
//     }, [lessonId, location.search]);

//     // --- Terminal Initialization ---
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     const queryParams = new URLSearchParams(location.search);
//                     const messageType = queryParams.get('sessionId') ? 'HOMEWORK_TERMINAL_IN' : 'TERMINAL_IN';
//                     ws.current.send(JSON.stringify({ type: messageType, payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             resizeObserver.observe(terminalRef.current);

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, [location.search]); // Re-init if mode changes

//     // --- Data Fetching ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData: Submission | null = await submissionResponse.json();
                
//                 if (submissionData && Array.isArray(submissionData.submitted_code) && submissionData.submitted_code.length > 0) {
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else if (lessonData.files) {
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     // --- Handler Functions (Original Functionality Preserved) ---
//     const handleFileContentChange = (content: string | undefined) => {
//         const updatedFiles = files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file);
//         setFiles(updatedFiles);

//         // **CONDITIONAL BROADCAST**
//         if (ws.current?.readyState === WebSocket.OPEN && new URLSearchParams(location.search).has('sessionId')) {
//             ws.current.send(JSON.stringify({
//                 type: 'HOMEWORK_CODE_UPDATE',
//                 payload: { files: updatedFiles, activeFileId }
//             }));
//         }
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     // --- UPDATED: handleSubmit now correctly handles submission failures ---
//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         setConceptualHint(null);

//         try {
//             // Step 1: Submit the solution
//             const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });

//             // If the submission failed (e.g., tests didn't pass), the backend will send a 400 error.
//             if (!submitResponse.ok) {
//                 // Try to parse the error message from the backend
//                 const errorData = await submitResponse.json().catch(() => ({ 
//                     error: 'Submission failed. Please run the tests to see the errors.' 
//                 }));
//                 throw new Error(errorData.error);
//             }

//             // Step 2: Handle the successful submission
//             setSubmitMessage('All tests passed! Analyzing your solution for conceptual feedback...');

//             const studentCode = files.map(f => f.content).join('\n\n');
//             const feedbackResponse = await fetch(`http://localhost:5000/api/ai/get-conceptual-feedback`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ studentCode, lessonId })
//             });

//             if (!feedbackResponse.ok) {
//                 throw new Error("Could not fetch conceptual feedback.");
//             }

//             const feedbackResult = await feedbackResponse.json();

//             if (feedbackResult.feedback_type === 'conceptual_hint') {
//                 setSubmitMessage('');
//                 setConceptualHint(feedbackResult.message);
//             } else {
//                 setSubmitMessage('Great work! Your solution is correct. Redirecting...');
//                 setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//             }
//         } catch (err) {
//             if (err instanceof Error) {
//                 setSubmitMessage('');
//                 setError(err.message);
//             }
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript',
//             py: 'python',
//             html: 'html',
//             css: 'css',
//             java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';

//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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

//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
    
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Part of Course ID: {lesson.course_id}</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="secondary" onClick={handleGetHint}>
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                     </Button>
//                     <Button onClick={handleSubmit}>Submit Solution</Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>

//                     {error && (
//                         <Alert variant="destructive">
//                             <XCircle className="h-4 w-4" />
//                             <AlertTitle className="font-bold">Submission Failed</AlertTitle>
//                             <AlertDescription>{error}</AlertDescription>
//                         </Alert>
//                     )}
//                     {submitMessage && (
//                          <Alert variant="default" className="bg-green-50 border-green-200">
//                                <CheckCircle className="h-4 w-4 text-green-600" />
//                              <AlertTitle className="font-bold text-green-800">Success!</AlertTitle>
//                              <AlertDescription className="text-green-700">{submitMessage}</AlertDescription>
//                          </Alert>
//                     )}
//                     {conceptualHint && (
//                         <Alert variant="default" className="bg-blue-50 border-blue-200">
//                             <Lightbulb className="h-4 w-4 text-blue-600" />
//                             <AlertTitle className="font-bold text-blue-800">A Helpful Suggestion</AlertTitle>
//                             <AlertDescription className="text-blue-700">{conceptualHint}</AlertDescription>
//                         </Alert>
//                     )}

//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                     {mySubmission?.feedback && (
//                         <Alert>
//                             <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                             <AlertDescription>
//                                 {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                                 <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                             </AlertDescription>
//                         </Alert>
//                     )}
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                  <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                      <TerminalIcon className="h-4 w-4" />
//                                      <span className="font-semibold text-sm">Terminal</span>
//                                  </div>
//                                  <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                              </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V6.3 - Robust Error Handling)
//  * =================================================================
//  * DESCRIPTION: This version fixes a bug where a failed submission would
//  * cause a redirect and a connection error. It now correctly handles the
//  * 400 Bad Request from the backend and displays the error message to the user.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb } from 'lucide-react';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);
    
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         currentWs.onopen = () => console.log('Terminal WebSocket connected.');
//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
//                     term.current?.write(message.payload);
//                 }
//             } catch (error) {
//                 console.error('Error processing WebSocket message:', error);
//             }
//         };

//         return () => {
//             currentWs.close();
//             term.current?.dispose();
//         };
//     }, []);

//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             resizeObserver.observe(terminalRef.current);

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, []);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData: Submission | null = await submissionResponse.json();
                
//                 if (submissionData && Array.isArray(submissionData.submitted_code) && submissionData.submitted_code.length > 0) {
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else if (lessonData.files) {
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file));
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     // --- UPDATED: handleSubmit now correctly handles submission failures ---
//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         setConceptualHint(null);

//         try {
//             // Step 1: Submit the solution
//             const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });

//             // If the submission failed (e.g., tests didn't pass), the backend will send a 400 error.
//             if (!submitResponse.ok) {
//                 // Try to parse the error message from the backend
//                 const errorData = await submitResponse.json().catch(() => ({ 
//                     error: 'Submission failed. Please run the tests to see the errors.' 
//                 }));
//                 throw new Error(errorData.error);
//             }

//             // Step 2: Handle the successful submission
//             setSubmitMessage('All tests passed! Analyzing your solution for conceptual feedback...');

//             const studentCode = files.map(f => f.content).join('\n\n');
//             const feedbackResponse = await fetch(`http://localhost:5000/api/ai/get-conceptual-feedback`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ studentCode, lessonId })
//             });

//             if (!feedbackResponse.ok) {
//                 throw new Error("Could not fetch conceptual feedback.");
//             }

//             const feedbackResult = await feedbackResponse.json();

//             if (feedbackResult.feedback_type === 'conceptual_hint') {
//                 setSubmitMessage('');
//                 setConceptualHint(feedbackResult.message);
//             } else {
//                 setSubmitMessage('Great work! Your solution is correct. Redirecting...');
//                 setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//             }
//         } catch (err) {
//             if (err instanceof Error) {
//                 setSubmitMessage('');
//                 setError(err.message);
//             }
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript',
//             py: 'python',
//             html: 'html',
//             css: 'css',
//             java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';

//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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

//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
    
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Part of Course ID: {lesson.course_id}</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="secondary" onClick={handleGetHint}>
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                     </Button>
//                     <Button onClick={handleSubmit}>Submit Solution</Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>

//                     {/* --- UPDATED: Display logic for different messages --- */}
//                     {error && (
//                         <Alert variant="destructive">
//                             <XCircle className="h-4 w-4" />
//                             <AlertTitle className="font-bold">Submission Failed</AlertTitle>
//                             <AlertDescription>
//                                 {error}
//                             </AlertDescription>
//                         </Alert>
//                     )}

//                     {submitMessage && (
//                         <Alert variant="default" className="bg-green-50 border-green-200">
//                              <CheckCircle className="h-4 w-4 text-green-600" />
//                             <AlertTitle className="font-bold text-green-800">Success!</AlertTitle>
//                             <AlertDescription className="text-green-700">
//                                 {submitMessage}
//                             </AlertDescription>
//                         </Alert>
//                     )}

//                     {conceptualHint && (
//                         <Alert variant="default" className="bg-blue-50 border-blue-200">
//                             <Lightbulb className="h-4 w-4 text-blue-600" />
//                             <AlertTitle className="font-bold text-blue-800">A Helpful Suggestion</AlertTitle>
//                             <AlertDescription className="text-blue-700">
//                                 {conceptualHint}
//                             </AlertDescription>
//                         </Alert>
//                     )}

//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                     {mySubmission?.feedback && (
//                         <Alert>
//                             <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                             <AlertDescription>
//                                 {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                                 <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                             </AlertDescription>
//                         </Alert>
//                     )}
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                 <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                     <TerminalIcon className="h-4 w-4" />
//                                     <span className="font-semibold text-sm">Terminal</span>
//                                 </div>
//                                 <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                             </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V6.2 - Improved UX Flow)
//  * =================================================================
//  * DESCRIPTION: This version improves the user experience by providing
//  * immediate success feedback before fetching the conceptual hint,
//  * ensuring the student sees that their code is correct.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb } from 'lucide-react';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);
    
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         currentWs.onopen = () => console.log('Terminal WebSocket connected.');
//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
//                     term.current?.write(message.payload);
//                 }
//             } catch (error) {
//                 console.error('Error processing WebSocket message:', error);
//             }
//         };

//         return () => {
//             currentWs.close();
//             term.current?.dispose();
//         };
//     }, []);

//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             resizeObserver.observe(terminalRef.current);

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, []);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData: Submission | null = await submissionResponse.json();
                
//                 if (submissionData && Array.isArray(submissionData.submitted_code) && submissionData.submitted_code.length > 0) {
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else if (lessonData.files) {
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file));
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     // --- UPDATED: handleSubmit now has a better UX flow ---
//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         setConceptualHint(null);

//         try {
//             // Step 1: Submit the solution to check for correctness
//             const submitResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });

//             if (!submitResponse.ok) {
//                 const errorData = await submitResponse.json().catch(() => ({ error: 'Submission failed. Your code may not have passed all tests.' }));
//                 throw new Error(errorData.error);
//             }

//             // Step 2: Provide immediate success feedback to the user
//             setSubmitMessage('All tests passed! Analyzing your solution for conceptual feedback...');

//             // Step 3: Call the new AI endpoint for conceptual feedback
//             const studentCode = files.map(f => f.content).join('\n\n');
//             const feedbackResponse = await fetch(`http://localhost:5000/api/ai/get-conceptual-feedback`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ studentCode, lessonId })
//             });

//             if (!feedbackResponse.ok) {
//                 throw new Error("Could not fetch conceptual feedback.");
//             }

//             const feedbackResult = await feedbackResponse.json();

//             // Step 4: Display the feedback or update the success message and redirect
//             if (feedbackResult.feedback_type === 'conceptual_hint') {
//                 setSubmitMessage(''); // Clear the intermediate message
//                 setConceptualHint(feedbackResult.message);
//             } else {
//                 setSubmitMessage('Great work! Your solution is correct. Redirecting...');
//                 setTimeout(() => navigate(`/courses/${lesson?.course_id}/learn`), 2500);
//             }
//         } catch (err) {
//             if (err instanceof Error) {
//                 setSubmitMessage(''); // Clear any intermediate messages on error
//                 setError(err.message);
//             }
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript',
//             py: 'python',
//             html: 'html',
//             css: 'css',
//             java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';

//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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

//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Part of Course ID: {lesson.course_id}</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="secondary" onClick={handleGetHint}>
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                     </Button>
//                     <Button onClick={handleSubmit}>Submit Solution</Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>

//                     {/* --- UPDATED: Display logic for different messages --- */}
//                     {submitMessage && (
//                         <Alert variant="default" className="bg-green-50 border-green-200">
//                              <CheckCircle className="h-4 w-4 text-green-600" />
//                             <AlertTitle className="font-bold text-green-800">Success!</AlertTitle>
//                             <AlertDescription className="text-green-700">
//                                 {submitMessage}
//                             </AlertDescription>
//                         </Alert>
//                     )}

//                     {conceptualHint && (
//                         <Alert variant="default" className="bg-blue-50 border-blue-200">
//                             <Lightbulb className="h-4 w-4 text-blue-600" />
//                             <AlertTitle className="font-bold text-blue-800">A Helpful Suggestion</AlertTitle>
//                             <AlertDescription className="text-blue-700">
//                                 {conceptualHint}
//                             </AlertDescription>
//                         </Alert>
//                     )}

//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                     {mySubmission?.feedback && (
//                         <Alert>
//                             <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                             <AlertDescription>
//                                 {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                                 <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                             </AlertDescription>
//                         </Alert>
//                     )}
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                 <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                     <TerminalIcon className="h-4 w-4" />
//                                     <span className="font-semibold text-sm">Terminal</span>
//                                 </div>
//                                 <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                             </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V6.0 - Conceptual Feedback)
//  * =================================================================
//  * DESCRIPTION: This version is updated to handle and display the new
//  * AI-powered conceptual feedback after a student submits a correct solution.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2, Lightbulb } from 'lucide-react';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     // --- NEW: State to hold the conceptual hint from the backend ---
//     const [conceptualHint, setConceptualHint] = useState<string | null>(null);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);
    
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     // Effect for WebSocket connection
//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         currentWs.onopen = () => console.log('Terminal WebSocket connected.');
//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
//                     term.current?.write(message.payload);
//                 }
//             } catch (error) {
//                 console.error('Error processing WebSocket message:', error);
//             }
//         };

//         return () => {
//             currentWs.close();
//             term.current?.dispose();
//         };
//     }, []);

//     // Effect for initializing the terminal
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             resizeObserver.observe(terminalRef.current);

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, []);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData: Submission | null = await submissionResponse.json();
                
//                 if (submissionData && Array.isArray(submissionData.submitted_code) && submissionData.submitted_code.length > 0) {
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else if (lessonData.files) {
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file));
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     // --- UPDATED: handleSubmit now checks for conceptual feedback ---
//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         setConceptualHint(null); // Reset hint on new submission

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');

//             const result = await response.json();

//             // Check if the backend sent back a conceptual hint
//             if (result.feedback_type === 'conceptual_hint') {
//                 setConceptualHint(result.message);
//                 // Keep the user on the page to see the hint
//             } else {
//                 // Otherwise, it's a standard success message
//                 setSubmitMessage('Your solution has been submitted successfully! Redirecting...');
//                 setTimeout(() => {
//                     navigate(`/courses/${lesson?.course_id}/learn`);
//                 }, 2000);
//             }
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript',
//             py: 'python',
//             html: 'html',
//             css: 'css',
//             java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';

//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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

//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Part of Course ID: {lesson.course_id}</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="secondary" onClick={handleGetHint}>
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                     </Button>
//                     <Button onClick={handleSubmit}>Submit Solution</Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>

//                     {/* --- NEW: Alert to display the conceptual hint --- */}
//                     {conceptualHint && (
//                         <Alert variant="default" className="bg-blue-50 border-blue-200">
//                             <Lightbulb className="h-4 w-4 text-blue-600" />
//                             <AlertTitle className="font-bold text-blue-800">A Helpful Suggestion</AlertTitle>
//                             <AlertDescription className="text-blue-700">
//                                 {conceptualHint}
//                             </AlertDescription>
//                         </Alert>
//                     )}

//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                     {mySubmission?.feedback && (
//                         <Alert>
//                             <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                             <AlertDescription>
//                                 {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                                 <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                             </AlertDescription>
//                         </Alert>
//                     )}
//                 </div>

//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                 <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                     <TerminalIcon className="h-4 w-4" />
//                                     <span className="font-semibold text-sm">Terminal</span>
//                                 </div>
//                                 <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                             </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V5.0 - AI System Alignment)
//  * =================================================================
//  * DESCRIPTION: This version is simplified to align with the new AI
//  * stuck point system. It no longer needs to trigger the analysis;
//  * it only runs the tests, and the backend handles the logging.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2 } from 'lucide-react';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);
    
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     // Effect for WebSocket connection
//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         currentWs.onopen = () => console.log('Terminal WebSocket connected.');
//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
//                     term.current?.write(message.payload);
//                 }
//             } catch (error) {
//                 console.error('Error processing WebSocket message:', error);
//             }
//         };

//         return () => {
//             currentWs.close();
//             term.current?.dispose();
//         };
//     }, []);

//     // Effect for initializing the terminal
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             resizeObserver.observe(terminalRef.current);

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, []);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData: Submission | null = await submissionResponse.json();
                
//                 if (submissionData && Array.isArray(submissionData.submitted_code) && submissionData.submitted_code.length > 0) {
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else if (lessonData.files) {
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file));
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             setSubmitMessage('Your solution has been submitted successfully! Redirecting...');
//             setTimeout(() => {
//                 navigate(`/courses/${lesson?.course_id}/learn`);
//             }, 2000);
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript',
//             py: 'python',
//             html: 'html',
//             css: 'css',
//             java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';

//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     // =================================================================
//     // SIMPLIFIED TEST HANDLER
//     // =================================================================
//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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

//             // REMOVED: The frontend no longer needs to trigger the analysis.
//             // The backend now logs the test run automatically, and the stuck
//             // point service analyzes the history when the teacher dashboard loads.

//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });
//         } finally {
//             setIsTesting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Part of Course ID: {lesson.course_id}</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="secondary" onClick={handleGetHint}>
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                     </Button>
//                     <Button onClick={handleSubmit}>Submit Solution</Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 {/* Left Column: Lesson Plan */}
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>
//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                     {mySubmission?.feedback && (
//                         <Alert>
//                             <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                             <AlertDescription>
//                                 {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                                 <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                             </AlertDescription>
//                         </Alert>
//                     )}
//                 </div>

//                 {/* Right Column: Workspace */}
//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                 <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                     <TerminalIcon className="h-4 w-4" />
//                                     <span className="font-semibold text-sm">Terminal</span>
//                                 </div>
//                                 <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                             </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;

// _________________________________________________________________________________
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (V4.0 - Stuck Point Detector)
//  * =================================================================
//  * DESCRIPTION: This version integrates the "Stuck Point" detector
//  * by calling the analysis endpoint after a failed test run.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Play, File as FileIcon, BrainCircuit, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, CheckCircle, XCircle, FilePlus2, Trash2 } from 'lucide-react';

// // --- Type definition for structured test results ---
// interface TestResult {
//     passed: number;
//     failed: number;
//     total: number;
//     results: string; // The raw output from the test runner
// }

// // --- Modal for displaying test results ---
// const TestResultsModal = ({ results, isLoading, onClose }: { results: TestResult | null, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>Test Results</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4 space-y-4">
//                     {isLoading ? "Running tests..." : results && (
//                         <>
//                             <div className={`p-4 rounded-md ${results.failed > 0 ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
//                                 <h3 className="font-bold text-lg">
//                                     {results.failed > 0 ? `${results.failed} / ${results.total} Tests Failed` : `All ${results.total} Tests Passed!`}
//                                 </h3>
//                             </div>
//                             <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap text-xs max-h-60 overflow-y-auto">
//                                 <code>{results.results}</code>
//                             </div>
//                         </>
//                     )}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );


// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);
    
//     const [isTestResultsModalOpen, setIsTestResultsModalOpen] = useState(false);
//     const [testResults, setTestResults] = useState<TestResult | null>(null);
//     const [isTesting, setIsTesting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     // Effect for WebSocket connection
//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         currentWs.onopen = () => console.log('Terminal WebSocket connected.');
//         currentWs.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
//                     term.current?.write(message.payload);
//                 }
//             } catch (error) {
//                 console.error('Error processing WebSocket message:', error);
//             }
//         };

//         return () => {
//             currentWs.close();
//             term.current?.dispose();
//         };
//     }, []);

//     // Effect for initializing the terminal
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#1e1e1e', foreground: '#d4d4d4' },
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             newTerm.onData((data) => {
//                 if (ws.current?.readyState === WebSocket.OPEN) {
//                     ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//                 }
//             });
//             term.current = newTerm;

//             const resizeObserver = new ResizeObserver(() => {
//                 setTimeout(() => fitAddon.fit(), 0);
//             });
//             resizeObserver.observe(terminalRef.current);

//             return () => {
//                 resizeObserver.disconnect();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }
//     }, []);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, { headers: { 'Authorization': `Bearer ${token}` } });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData: Submission | null = await submissionResponse.json();
                
//                 if (submissionData && Array.isArray(submissionData.submitted_code) && submissionData.submitted_code.length > 0) {
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else if (lessonData.files) {
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => file.id === activeFileId ? { ...file, content: content || '' } : file));
//     };

//     const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             alert("A file with that name already exists.");
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ selectedCode: activeFile.content, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ files })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             setSubmitMessage('Your solution has been submitted successfully! Redirecting...');
//             setTimeout(() => {
//                 navigate(`/courses/${lesson?.course_id}/learn`);
//             }, 2000);
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) return;
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript',
//             py: 'python',
//             html: 'html',
//             css: 'css',
//             java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';

//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     // =================================================================
//     // UPDATED TEST HANDLER
//     // =================================================================
//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setIsTestResultsModalOpen(true);
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

//             // NEW: If the tests failed, trigger the stuck point analysis.
//             if (data.failed > 0) {
//                 // This is a "fire-and-forget" request. We don't need to wait for the response.
//                 fetch(`http://localhost:5000/api/stuck-points/lessons/${lessonId}/analyze`, {
//                     method: 'POST',
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 }).catch(analysisError => {
//                     // Log any errors from the analysis call, but don't show them to the user.
//                     console.error('Stuck point analysis trigger failed:', analysisError);
//                 });
//             }
//         } catch (err) {
//             const results = err instanceof Error ? err.message : 'An unknown error occurred.';
//             setTestResults({ passed: 0, failed: 1, total: 1, results });

//             // NEW: Also trigger the analysis on a catastrophic failure (e.g., network error).
//             fetch(`http://localhost:5000/api/stuck-points/lessons/${lessonId}/analyze`, {
//                 method: 'POST',
//                 headers: { 'Authorization': `Bearer ${token}` }
//             }).catch(analysisError => {
//                 console.error('Stuck point analysis trigger failed:', analysisError);
//             });
//         } finally {
//             setIsTesting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col bg-slate-50">
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
//             {isTestResultsModalOpen && <TestResultsModal results={testResults} isLoading={isTesting} onClose={() => setIsTestResultsModalOpen(false)} />}
            
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" size="icon" onClick={() => navigate(`/courses/${lesson.course_id}/learn`)}>
//                         <ChevronLeft className="h-4 w-4" />
//                     </Button>
//                     <div>
//                         <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                         <p className="text-muted-foreground">Part of Course ID: {lesson.course_id}</p>
//                     </div>
//                 </div>
//                 <div className="flex items-center gap-4">
//                     <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button onClick={handleRunTests} disabled={isTesting}>
//                         <BeakerIcon className="mr-2 h-4 w-4" /> {isTesting ? 'Running...' : 'Run Tests'}
//                     </Button>
//                     <Button variant="secondary" onClick={handleGetHint}>
//                         <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                     </Button>
//                     <Button onClick={handleSubmit}>Submit Solution</Button>
//                 </div>
//             </header>

//             <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 overflow-hidden">
//                 {/* Left Column: Lesson Plan */}
//                 <div className="lg:col-span-1 flex flex-col gap-6">
//                     <Card>
//                         <CardHeader><CardTitle>Instructions</CardTitle></CardHeader>
//                         <CardContent><p className="text-muted-foreground">{lesson.description}</p></CardContent>
//                     </Card>
//                     <Card className="flex-grow flex flex-col">
//                         <CardHeader className="flex flex-row items-center justify-between">
//                             <CardTitle>Project Files</CardTitle>
//                             <Button variant="ghost" size="sm" onClick={handleAddFile}>
//                                 <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                             </Button>
//                         </CardHeader>
//                         <CardContent className="flex-grow overflow-y-auto">
//                             <ul className="space-y-1">
//                                 {files.map((file) => (
//                                     <li key={file.id} className="flex items-center justify-between group">
//                                         <button
//                                             onClick={() => setActiveFileId(file.id)}
//                                             className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                         >
//                                             <FileIcon className="mr-2 h-4 w-4" />
//                                             {file.filename}
//                                         </button>
//                                         <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteFile(file.id)}>
//                                             <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                         </Button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         </CardContent>
//                     </Card>
//                     {mySubmission?.feedback && (
//                         <Alert>
//                             <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                             <AlertDescription>
//                                 {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                                 <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                             </AlertDescription>
//                         </Alert>
//                     )}
//                 </div>

//                 {/* Right Column: Workspace */}
//                 <div className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <div className="h-full w-full bg-[#1e1e1e]">
//                                 <Editor
//                                     height="100%"
//                                     language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                     theme="vs-dark"
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     onMount={handleEditorDidMount}
//                                     options={{ minimap: { enabled: false } }}
//                                 />
//                             </div>
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
//                         <Panel defaultSize={30} minSize={10}>
//                              <div className="h-full flex flex-col">
//                                 <div className="flex-shrink-0 bg-slate-800 text-white p-2 flex items-center gap-2">
//                                     <TerminalIcon className="h-4 w-4" />
//                                     <span className="font-semibold text-sm">Terminal</span>
//                                 </div>
//                                 <div ref={terminalRef} className="flex-grow w-full h-full p-2 bg-[#1e1e1e]" />
//                             </div>
//                         </Panel>
//                     </PanelGroup>
//                 </div>
//             </main>
//         </div>
//     );
// };

// export default ViewLessonPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (FULLY IMPLEMENTED & CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This is the complete student-facing page for viewing
//  * and working on a lesson, now using React Router for navigation.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Play, X, File, BrainCircuit } from 'lucide-react';

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData: Submission | null = await submissionResponse.json();
                
//                 if (submissionData && submissionData.submitted_code) {
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else {
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
//     };

//     const handleEditorDidMount: OnMount = (editor) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson || !activeFile) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     selectedCode,
//                     lessonId: lesson.id
//                 })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ files })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission);
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !lesson) return;
//         setIsExecuting(true);
//         setConsoleOutput(prev => [...prev, `> Executing ${activeFile.filename}...`]);
//         const token = localStorage.getItem('authToken');
//         try {
//             const language = activeFile.filename.split('.').pop() || 'javascript';
//             const response = await fetch('http://localhost:5000/api/execute', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ code: activeFile.content, language })
//             });
//             const data = await response.json();
//             const output = data.output || 'No output';
//             setConsoleOutput(prev => [...prev, output]);
//         } catch (err) {
//             const errorMsg = `Error executing code: ${err instanceof Error ? err.message : 'Unknown error'}`;
//             setConsoleOutput(prev => [...prev, errorMsg]);
//         } finally {
//             setIsExecuting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col">
//             {isHintModalOpen && (
//                 <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />
//             )}
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div>
//                     <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                     <p className="text-muted-foreground">{lesson.description}</p>
//                 </div>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>

//             <div className="flex-grow grid grid-cols-4 overflow-hidden">
//                 <aside className="col-span-1 bg-slate-50 p-4 border-r overflow-y-auto">
//                     <h3 className="text-lg font-semibold mb-4">Project Files</h3>
//                     <ul className="space-y-2">
//                         {files.map(file => (
//                             <li key={file.id}>
//                                 <button
//                                     onClick={() => setActiveFileId(file.id)}
//                                     className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                 >
//                                     <File className="mr-2 h-4 w-4" />
//                                     {file.filename}
//                                 </button>
//                             </li>
//                         ))}
//                     </ul>
//                 </aside>

//                 <main className="col-span-3 flex flex-col">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <Editor
//                                 height="100%"
//                                 path={activeFile?.filename}
//                                 value={activeFile?.content}
//                                 onChange={handleFileContentChange}
//                                 onMount={handleEditorDidMount}
//                                 theme="vs-light"
//                             />
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20" />
//                         <Panel defaultSize={30} minSize={10}>
//                             <div className="h-full flex flex-col bg-black text-white">
//                                 <div className="p-2 bg-gray-800 text-sm font-semibold flex justify-between items-center">
//                                     <span>Console</span>
//                                     <Button variant="ghost" size="icon" onClick={() => setConsoleOutput([])} className="text-white hover:bg-gray-700 hover:text-white">
//                                         <X className="h-4 w-4" />
//                                     </Button>
//                                 </div>
//                                 <pre className="flex-grow p-2 text-xs overflow-y-auto whitespace-pre-wrap">
//                                     {consoleOutput.join('\n')}
//                                 </pre>
//                             </div>
//                         </Panel>
//                     </PanelGroup>
//                 </main>
//             </div>
            
//             <footer className="flex-shrink-0 p-4 border-t bg-white flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600 text-sm mr-auto">{submitMessage}</p>}
//                 <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                     <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                 </Button>
//                 <Button variant="secondary" onClick={handleGetHint}>
//                     <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                 </Button>
//                 <Button onClick={handleSubmit}>Submit Solution</Button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;



// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission, LessonFile } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Play, X, File, BrainCircuit } from 'lucide-react';

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [files, setFiles] = useState<LessonFile[]>([]);
//     const [activeFileId, setActiveFileId] = useState<string | null>(null);
    
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData: Lesson = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData && submissionData.submitted_code) {
//                     // If they have a past submission, load those files.
//                     setFiles(submissionData.submitted_code);
//                     setActiveFileId(submissionData.submitted_code[0]?.id || null);
//                 } else {
//                     // Otherwise, load the boilerplate files from the lesson.
//                     setFiles(lessonData.files);
//                     setActiveFileId(lessonData.files[0]?.id || null);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
//     };

//     const handleEditorDidMount: OnMount = (editor) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         // ... (handleGetHint logic remains the same)
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 // Send the entire files array as the submission.
//                 body: JSON.stringify({ files: files })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile) return;
//         setIsExecuting(true);
//         setConsoleOutput(prev => [...prev, `> Executing ${activeFile.filename}...`]);
//         const token = localStorage.getItem('authToken');
//         try {
//             // NOTE: This simple runner only executes one file at a time.
//             // A true multi-file execution would require a bundler on the backend.
//             const response = await fetch('http://localhost:5000/api/execute', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ code: activeFile.content, language: lesson?.files[0]?.filename.split('.').pop() || 'javascript' })
//             });
//             const data = await response.json();
//             const output = data.output || 'No output';
//             setConsoleOutput(prev => [...prev, output]);
//         } catch (err) {
//             const errorMsg = `Error executing code: ${err instanceof Error ? err.message : 'Unknown error'}`;
//             setConsoleOutput(prev => [...prev, errorMsg]);
//         } finally {
//             setIsExecuting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col">
//             {isHintModalOpen && (
//                 <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />
//             )}
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div>
//                     <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                     <p className="text-muted-foreground">{lesson.description}</p>
//                 </div>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>

//             <div className="flex-grow grid grid-cols-4 overflow-hidden">
//                 {/* File Navigator */}
//                 <aside className="col-span-1 bg-slate-50 p-4 border-r overflow-y-auto">
//                     <h3 className="text-lg font-semibold mb-4">Project Files</h3>
//                     <ul className="space-y-2">
//                         {files.map(file => (
//                             <li key={file.id}>
//                                 <button
//                                     onClick={() => setActiveFileId(file.id)}
//                                     className={`w-full text-left p-2 rounded-md flex items-center text-sm ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                 >
//                                     <File className="mr-2 h-4 w-4" />
//                                     {file.filename}
//                                 </button>
//                             </li>
//                         ))}
//                     </ul>
//                 </aside>

//                 {/* Main Content Area */}
//                 <main className="col-span-3 flex flex-col">
//                     <PanelGroup direction="vertical">
//                         <Panel defaultSize={70} minSize={20}>
//                             <Editor
//                                 height="100%"
//                                 path={activeFile?.filename}
//                                 value={activeFile?.content}
//                                 onChange={handleFileContentChange}
//                                 theme="vs-light"
//                             />
//                         </Panel>
//                         <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20" />
//                         <Panel defaultSize={30} minSize={10}>
//                             <div className="h-full flex flex-col bg-black text-white">
//                                 <div className="p-2 bg-gray-800 text-sm font-semibold flex justify-between items-center">
//                                     <span>Console</span>
//                                     <Button variant="ghost" size="icon" onClick={() => setConsoleOutput([])} className="text-white hover:bg-gray-700 hover:text-white">
//                                         <X className="h-4 w-4" />
//                                     </Button>
//                                 </div>
//                                 <pre className="flex-grow p-2 text-xs overflow-y-auto whitespace-pre-wrap">
//                                     {consoleOutput.join('\n')}
//                                 </pre>
//                             </div>
//                         </Panel>
//                     </PanelGroup>
//                 </main>
//             </div>
            
//             <footer className="flex-shrink-0 p-4 border-t bg-white flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600 text-sm mr-auto">{submitMessage}</p>}
//                 <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                     <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                 </Button>
//                 <Button variant="secondary" onClick={handleGetHint}>
//                     <BrainCircuit className="mr-2 h-4 w-4" /> Get a Hint
//                 </Button>
//                 <Button onClick={handleSubmit}>Submit Solution</Button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;



// mvp
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This page now includes a resizable console for students
//  * to run their code and see the output.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Play, X } from 'lucide-react';

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     // NEW: State for the student's console
//     const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
//     const [isExecuting, setIsExecuting] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData) {
//                     setMySubmission(submissionData);
//                     setCode(submissionData.submitted_code);
//                 } else {
//                     setCode(lessonData.boilerplate_code || '');
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleEditorDidMount: OnMount = (editor) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ selectedCode, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission);
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     // NEW: Function for the student to run their own code.
//     const handleRunCode = async () => {
//         if (!lesson) return;
//         setIsExecuting(true);
//         setConsoleOutput(prev => [...prev, `> Executing...`]);
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/execute', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ code, language: lesson.language })
//             });
//             const data = await response.json();
//             const output = data.output || 'No output';
//             setConsoleOutput(prev => [...prev, output]);
//         } catch (err) {
//             const errorMsg = `Error executing code: ${err instanceof Error ? err.message : 'Unknown error'}`;
//             setConsoleOutput(prev => [...prev, errorMsg]);
//         } finally {
//             setIsExecuting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col">
//             {isHintModalOpen && (
//                 <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />
//             )}
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div>
//                     <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                     <p className="text-muted-foreground">{lesson.description}</p>
//                 </div>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>

//             <div className="flex-grow p-4 flex flex-col gap-4 overflow-y-auto">
//                 {mySubmission?.feedback && (
//                     <Alert>
//                         <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                         <AlertDescription>
//                             {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                             <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                         </AlertDescription>
//                     </Alert>
//                 )}
                
//                 {/* NEW: Resizable Panel Group for Editor and Console */}
//                 <PanelGroup direction="vertical" className="flex-grow border rounded-md overflow-hidden">
//                     <Panel defaultSize={70} minSize={20}>
//                         <Editor
//                             height="100%"
//                             language={lesson.language}
//                             value={code}
//                             onChange={(value) => setCode(value || '')}
//                             onMount={handleEditorDidMount}
//                             theme="vs-light"
//                         />
//                     </Panel>
//                     <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20" />
//                     <Panel defaultSize={30} minSize={10}>
//                         <div className="h-full flex flex-col bg-black text-white">
//                             <div className="p-2 bg-gray-800 text-sm font-semibold flex justify-between items-center">
//                                 <span>Console</span>
//                                 <Button variant="ghost" size="icon" onClick={() => setConsoleOutput([])} className="text-white hover:bg-gray-700 hover:text-white">
//                                     <X className="h-4 w-4" />
//                                 </Button>
//                             </div>
//                             <pre className="flex-grow p-2 text-xs overflow-y-auto whitespace-pre-wrap">
//                                 {consoleOutput.join('\n')}
//                             </pre>
//                         </div>
//                     </Panel>
//                 </PanelGroup>
//             </div>
            
//             <footer className="flex-shrink-0 p-4 border-t bg-white flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600 text-sm mr-auto">{submitMessage}</p>}
//                 <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                     <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                 </Button>
//                 <Button variant="secondary" onClick={handleGetHint}>Get a Hint</Button>
//                 <Button onClick={handleSubmit}>Submit Solution</Button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This page now includes a resizable console for students
//  * to run their code and see the output.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Play, X } from 'lucide-react';

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <AlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-4">
//                     {isLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel>Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </AlertDialogContent>
//     </AlertDialog>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
    
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     // NEW: State for the student's console
//     const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
//     const [isExecuting, setIsExecuting] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData) {
//                     setMySubmission(submissionData);
//                     setCode(submissionData.submitted_code);
//                 } else {
//                     setCode(lessonData.boilerplate_code || '');
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleEditorDidMount: OnMount = (editor) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson) return;
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }
//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ selectedCode, lessonId: lesson.id })
//             });
//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }
//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) setAiHint(`Error: ${err.message}`);
//             else setAiHint('An unknown error occurred.');
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission);
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     // NEW: Function for the student to run their own code.
//     const handleRunCode = async () => {
//         if (!lesson) return;
//         setIsExecuting(true);
//         setConsoleOutput(prev => [...prev, `> Executing...`]);
//         const token = localStorage.getItem('authToken');
//         try {
//             const response = await fetch('http://localhost:5000/api/execute', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ code, language: lesson.language })
//             });
//             const data = await response.json();
//             const output = data.output || 'No output';
//             setConsoleOutput(prev => [...prev, output]);
//         } catch (err) {
//             const errorMsg = `Error executing code: ${err instanceof Error ? err.message : 'Unknown error'}`;
//             setConsoleOutput(prev => [...prev, errorMsg]);
//         } finally {
//             setIsExecuting(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col">
//             {isHintModalOpen && (
//                 <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />
//             )}
//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white">
//                 <div>
//                     <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                     <p className="text-muted-foreground">{lesson.description}</p>
//                 </div>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>

//             <div className="flex-grow p-4 flex flex-col gap-4 overflow-y-auto">
//                 {mySubmission?.feedback && (
//                     <Alert>
//                         <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                         <AlertDescription>
//                             {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                             <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                         </AlertDescription>
//                     </Alert>
//                 )}
                
//                 {/* NEW: Resizable Panel Group for Editor and Console */}
//                 <PanelGroup direction="vertical" className="flex-grow border rounded-md overflow-hidden">
//                     <Panel defaultSize={70} minSize={20}>
//                         <Editor
//                             height="100%"
//                             language={lesson.language}
//                             value={code}
//                             onChange={(value) => setCode(value || '')}
//                             onMount={handleEditorDidMount}
//                             theme="vs-light"
//                         />
//                     </Panel>
//                     <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20" />
//                     <Panel defaultSize={30} minSize={10}>
//                         <div className="h-full flex flex-col bg-black text-white">
//                             <div className="p-2 bg-gray-800 text-sm font-semibold flex justify-between items-center">
//                                 <span>Console</span>
//                                 <Button variant="ghost" size="icon" onClick={() => setConsoleOutput([])} className="text-white hover:bg-gray-700 hover:text-white">
//                                     <X className="h-4 w-4" />
//                                 </Button>
//                             </div>
//                             <pre className="flex-grow p-2 text-xs overflow-y-auto whitespace-pre-wrap">
//                                 {consoleOutput.join('\n')}
//                             </pre>
//                         </div>
//                     </Panel>
//                 </PanelGroup>
//             </div>
            
//             <footer className="flex-shrink-0 p-4 border-t bg-white flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600 text-sm mr-auto">{submitMessage}</p>}
//                 <Button variant="outline" onClick={handleRunCode} disabled={isExecuting}>
//                     <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                 </Button>
//                 <Button variant="secondary" onClick={handleGetHint}>Get a Hint</Button>
//                 <Button onClick={handleSubmit}>Submit Solution</Button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission } from '../types';
// import Editor, { OnMount } from '@monaco-editor/react';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData) {
//                     setMySubmission(submissionData);
//                     setCode(submissionData.submitted_code);
//                 } else {
//                     setCode(lessonData.boilerplate_code || '');
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleEditorDidMount: OnMount = (editor) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson) return;
        
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
        
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }

//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');

//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     selectedCode,
//                     lessonId: lesson.id
//                 })
//             });

//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }

//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) {
//                 setAiHint(`Error: ${err.message}`);
//             } else {
//                 setAiHint('An unknown error occurred.');
//             }
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission);
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading lesson...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;
//     if (!lesson) return <div className="p-8">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col">
//             <AlertDialog open={isHintModalOpen} onOpenChange={setIsHintModalOpen}>
//                 <AlertDialogContent>
//                     <AlertDialogHeader>
//                         <AlertDialogTitle>AI Teaching Assistant</AlertDialogTitle>
//                         <AlertDialogDescription className="pt-4">
//                             {isHintLoading ? "Thinking..." : <div className="bg-muted p-4 rounded-md text-foreground whitespace-pre-wrap">{aiHint}</div>}
//                         </AlertDialogDescription>
//                     </AlertDialogHeader>
//                     <AlertDialogFooter>
//                         <AlertDialogCancel>Close</AlertDialogCancel>
//                     </AlertDialogFooter>
//                 </AlertDialogContent>
//             </AlertDialog>

//             <header className="flex-shrink-0 flex justify-between items-center p-4 border-b">
//                 <div>
//                     <h1 className="text-2xl font-bold">{lesson.title}</h1>
//                     <p className="text-muted-foreground">{lesson.description}</p>
//                 </div>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>

//             <div className="flex-grow p-4 flex flex-col gap-4 overflow-y-auto">
//                 {mySubmission?.feedback && (
//                     <Alert>
//                         <AlertTitle className="font-bold">Teacher Feedback</AlertTitle>
//                         <AlertDescription>
//                             {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                             <p className="mt-2 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                         </AlertDescription>
//                     </Alert>
//                 )}

//                 <main className="flex-grow border rounded-md overflow-hidden">
//                     <Editor
//                         height="100%"
//                         language={lesson.language}
//                         value={code}
//                         onChange={(value) => setCode(value || '')}
//                         onMount={handleEditorDidMount}
//                         theme="vs-light"
//                     />
//                 </main>
//             </div>
//             <footer className="flex-shrink-0 p-4 border-t flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600 text-sm">{submitMessage}</p>}
//                 <Button variant="outline" onClick={handleGetHint}>Get a Hint</Button>
//                 <Button onClick={handleSubmit}>Submit Solution</Button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (FULLY IMPLEMENTED & CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This is the complete student-facing page for viewing
//  * and working on a lesson, now using React Router for navigation and
//  * with the corrected import statement for Monaco Editor.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Lesson, Submission } from '../types';
// // CORRECTED: The value 'Editor' and the type 'OnMount' are now imported correctly.
// import Editor from '@monaco-editor/react';
// import type { OnMount } from '@monaco-editor/react';

// // A simple modal component for displaying the AI hint.
// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
//             <h3 className="text-xl font-bold text-gray-800 mb-4">AI Teaching Assistant</h3>
//             {isLoading ? (
//                 <div className="flex items-center justify-center">
//                     <p>Thinking...</p>
//                 </div>
//             ) : (
//                 <div className="bg-gray-100 p-4 rounded-md text-gray-700 whitespace-pre-wrap">{hint}</div>
//             )}
//             <button onClick={onClose} className="mt-4 py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Close</button>
//         </div>
//     </div>
// );

// const ViewLessonPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');
//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             if (!lessonId) return;
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData) {
//                     setMySubmission(submissionData);
//                     setCode(submissionData.submitted_code);
//                 } else {
//                     setCode(lessonData.boilerplate_code || '');
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleEditorDidMount: OnMount = (editor) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson) return;
        
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
        
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }

//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');

//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     selectedCode,
//                     lessonId: lesson.id
//                 })
//             });

//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }

//             const data = await response.json();
//             setAiHint(data.hint);
//         } catch (err) {
//             if (err instanceof Error) {
//                 setAiHint(`Error: ${err.message}`);
//             } else {
//                 setAiHint('An unknown error occurred.');
//             }
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission);
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     if (isLoading) return <div className="p-4">Loading lesson...</div>;
//     if (error) return <div className="p-4 text-red-500">{error}</div>;
//     if (!lesson) return <div className="p-4">Lesson not found.</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             {isHintModalOpen && (
//                 <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />
//             )}
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <div>
//                     <h1 className="text-3xl font-bold text-gray-800">{lesson.title}</h1>
//                     <p className="text-gray-600">{lesson.description}</p>
//                 </div>
//                 <button onClick={() => navigate('/dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>

//             {mySubmission?.feedback && (
//                 <div className="mb-4 p-4 bg-indigo-100 border border-indigo-300 rounded-lg">
//                     <h3 className="font-bold text-lg text-indigo-800">Teacher Feedback</h3>
//                     {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                     <p className="mt-2 text-gray-700 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                 </div>
//             )}

//             <main className="flex-grow border-2 border-gray-300 rounded-lg overflow-hidden">
//                 <Editor
//                     height="100%"
//                     language={lesson.language}
//                     value={code}
//                     onChange={(value) => setCode(value || '')}
//                     onMount={handleEditorDidMount}
//                     theme="vs-light"
//                 />
//             </main>
//             <footer className="flex-shrink-0 pt-4 flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600">{submitMessage}</p>}
//                 <button onClick={handleGetHint} className="py-3 px-8 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600">Get a Hint</button>
//                 <button onClick={handleSubmit} className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Submit Solution</button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This is the final version. The handleGetHint function
//  * now makes a real API call to your backend to get a hint from Gemini.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import type { ViewLessonPageProps, Lesson, Submission } from '../types';
// // CORRECTED: The value 'Editor' and the type 'OnMount' are now imported correctly.
// import Editor from '@monaco-editor/react';
// import type { OnMount } from '@monaco-editor/react';

// // A simple modal component for displaying the AI hint.
// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
//             <h3 className="text-xl font-bold text-gray-800 mb-4">AI Teaching Assistant</h3>
//             {isLoading ? (
//                 <div className="flex items-center justify-center">
//                     <p>Thinking...</p>
//                     {/* You could add a spinner here */}
//                 </div>
//             ) : (
//                 <div className="bg-gray-100 p-4 rounded-md text-gray-700 whitespace-pre-wrap">{hint}</div>
//             )}
//             <button onClick={onClose} className="mt-4 py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Close</button>
//         </div>
//     </div>
// );


// const ViewLessonPage: React.FC<ViewLessonPageProps> = ({ setRoute, lessonId }) => {
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');

//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData) {
//                     setMySubmission(submissionData);
//                     setCode(submissionData.submitted_code);
//                 } else {
//                     setCode(lessonData.boilerplate_code || '');
//                 }

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleEditorDidMount: OnMount = (editor, monaco) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current || !lesson) return;
        
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
        
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }

//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');

//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/ai/get-hint', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     selectedCode,
//                     lessonId: lesson.id
//                 })
//             });

//             if (!response.ok) {
//                 const errData = await response.json();
//                 throw new Error(errData.error || 'The AI assistant could not provide a hint.');
//             }

//             const data = await response.json();
//             setAiHint(data.hint);

//         } catch (err) {
//             if (err instanceof Error) {
//                 setAiHint(`Error: ${err.message}`);
//             } else {
//                 setAiHint('An unknown error occurred.');
//             }
//         } finally {
//             setIsHintLoading(false);
//         }
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission);
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     if (isLoading) return <p>Loading lesson...</p>;
//     if (error) return <p className="text-red-500">{error}</p>;
//     if (!lesson) return <p>Lesson not found.</p>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             {isHintModalOpen && (
//                 <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />
//             )}
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <div>
//                     <h1 className="text-3xl font-bold text-gray-800">{lesson.title}</h1>
//                     <p className="text-gray-600">{lesson.description}</p>
//                 </div>
//                 <button onClick={() => setRoute('dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>

//             {mySubmission?.feedback && (
//                 <div className="mb-4 p-4 bg-indigo-100 border border-indigo-300 rounded-lg">
//                     <h3 className="font-bold text-lg text-indigo-800">Teacher Feedback</h3>
//                     {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                     <p className="mt-2 text-gray-700 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                 </div>
//             )}

//             <main className="flex-grow border-2 border-gray-300 rounded-lg overflow-hidden">
//                 <Editor
//                     height="100%"
//                     language={lesson.language}
//                     value={code}
//                     onChange={(value) => setCode(value || '')}
//                     onMount={handleEditorDidMount}
//                     theme="vs-light"
//                 />
//             </main>
//             <footer className="flex-shrink-0 pt-4 flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600">{submitMessage}</p>}
//                 <button onClick={handleGetHint} className="py-3 px-8 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600">Get a Hint</button>
//                 <button onClick={handleSubmit} className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Submit Solution</button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import type { ViewLessonPageProps, Lesson, Submission } from '../types';
// // UPDATED: The value 'Editor' and the type 'OnMount' are now imported correctly.
// import Editor from '@monaco-editor/react';
// import type { OnMount } from '@monaco-editor/react';

// // A simple modal component for displaying the AI hint.
// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
//             <h3 className="text-xl font-bold text-gray-800 mb-4">AI Teaching Assistant</h3>
//             {isLoading ? (
//                 <p>Thinking...</p>
//             ) : (
//                 <div className="bg-gray-100 p-4 rounded-md text-gray-700 whitespace-pre-wrap">{hint}</div>
//             )}
//             <button onClick={onClose} className="mt-4 py-2 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700">Close</button>
//         </div>
//     </div>
// );


// const ViewLessonPage: React.FC<ViewLessonPageProps> = ({ setRoute, lessonId }) => {
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');

//     const [isHintModalOpen, setIsHintModalOpen] = useState(false);
//     const [aiHint, setAiHint] = useState('');
//     const [isHintLoading, setIsHintLoading] = useState(false);
//     const editorRef = useRef<any>(null);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             try {
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData = await lessonResponse.json();
//                 setLesson(lessonData);

//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData) {
//                     setMySubmission(submissionData);
//                     setCode(submissionData.submitted_code);
//                 } else {
//                     setCode(lessonData.boilerplate_code || '');
//                 }

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleEditorDidMount: OnMount = (editor, monaco) => {
//         editorRef.current = editor;
//     };

//     const handleGetHint = async () => {
//         if (!editorRef.current) return;
        
//         const selectedCode = editorRef.current.getModel().getValueInRange(editorRef.current.getSelection());
        
//         if (!selectedCode.trim()) {
//             alert("Please select a piece of code to get a hint for.");
//             return;
//         }

//         setIsHintModalOpen(true);
//         setIsHintLoading(true);
//         setAiHint('');

//         setTimeout(() => {
//             setAiHint(`It looks like you're working on this piece of code:\n\n---\n${selectedCode}\n---\n\nHave you considered checking if the loop variable is correct?`);
//             setIsHintLoading(false);
//         }, 1500);
//     };

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission);
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     if (isLoading) return <p>Loading lesson...</p>;
//     if (error) return <p className="text-red-500">{error}</p>;
//     if (!lesson) return <p>Lesson not found.</p>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             {isHintModalOpen && (
//                 <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />
//             )}
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <div>
//                     <h1 className="text-3xl font-bold text-gray-800">{lesson.title}</h1>
//                     <p className="text-gray-600">{lesson.description}</p>
//                 </div>
//                 <button onClick={() => setRoute('dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>

//             {mySubmission?.feedback && (
//                 <div className="mb-4 p-4 bg-indigo-100 border border-indigo-300 rounded-lg">
//                     <h3 className="font-bold text-lg text-indigo-800">Teacher Feedback</h3>
//                     {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                     <p className="mt-2 text-gray-700 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                 </div>
//             )}

//             <main className="flex-grow border-2 border-gray-300 rounded-lg overflow-hidden">
//                 <Editor
//                     height="100%"
//                     language={lesson.language}
//                     value={code}
//                     onChange={(value) => setCode(value || '')}
//                     onMount={handleEditorDidMount}
//                     theme="vs-light"
//                 />
//             </main>
//             <footer className="flex-shrink-0 pt-4 flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600">{submitMessage}</p>}
//                 <button onClick={handleGetHint} className="py-3 px-8 bg-yellow-500 text-white font-bold rounded-lg hover:bg-yellow-600">Get a Hint</button>
//                 <button onClick={handleSubmit} className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Submit Solution</button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { ViewLessonPageProps, Lesson, Submission } from '../types';
// import Editor from '@monaco-editor/react';

// const ViewLessonPage: React.FC<ViewLessonPageProps> = ({ setRoute, lessonId }) => {
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [mySubmission, setMySubmission] = useState<Submission | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
        
//         const fetchLessonAndSubmission = async () => {
//             try {
//                 // Fetch the main lesson details
//                 const lessonResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!lessonResponse.ok) throw new Error('Failed to fetch lesson details.');
//                 const lessonData = await lessonResponse.json();
//                 setLesson(lessonData);

//                 // Fetch the student's submission for this lesson
//                 const submissionResponse = await fetch(`http://localhost:5000/api/lessons/${lessonId}/mysubmission`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!submissionResponse.ok) throw new Error('Failed to fetch submission details.');
//                 const submissionData = await submissionResponse.json();
                
//                 if (submissionData) {
//                     setMySubmission(submissionData);
//                     // If they have a past submission, load that code into the editor.
//                     setCode(submissionData.submitted_code);
//                 } else {
//                     // Otherwise, load the boilerplate code.
//                     setCode(lessonData.boilerplate_code || '');
//                 }

//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };

//         fetchLessonAndSubmission();
//     }, [lessonId]);

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             const updatedSubmission = await response.json();
//             setMySubmission(updatedSubmission); // Update state with the new submission
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     if (isLoading) return <p>Loading lesson...</p>;
//     if (error) return <p className="text-red-500">{error}</p>;
//     if (!lesson) return <p>Lesson not found.</p>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <div>
//                     <h1 className="text-3xl font-bold text-gray-800">{lesson.title}</h1>
//                     <p className="text-gray-600">{lesson.description}</p>
//                 </div>
//                 <button onClick={() => setRoute('dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>

//             {/* NEW: Display Feedback and Grade if it exists */}
//             {mySubmission?.feedback && (
//                 <div className="mb-4 p-4 bg-indigo-100 border border-indigo-300 rounded-lg">
//                     <h3 className="font-bold text-lg text-indigo-800">Teacher Feedback</h3>
//                     {mySubmission.grade && <p className="font-semibold">Grade: {mySubmission.grade}</p>}
//                     <p className="mt-2 text-gray-700 whitespace-pre-wrap">{mySubmission.feedback}</p>
//                 </div>
//             )}

//             <main className="flex-grow border-2 border-gray-300 rounded-lg overflow-hidden">
//                 <Editor
//                     height="100%"
//                     language={lesson.language}
//                     value={code}
//                     onChange={(value) => setCode(value || '')}
//                     theme="vs-light"
//                 />
//             </main>
//             <footer className="flex-shrink-0 pt-4 flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600">{submitMessage}</p>}
//                 <button onClick={handleSubmit} className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Submit Solution</button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   ViewLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { ViewLessonPageProps, Lesson } from '../types';
// import Editor from '@monaco-editor/react';

// const ViewLessonPage: React.FC<ViewLessonPageProps> = ({ setRoute, lessonId }) => {
//     const [lesson, setLesson] = useState<Lesson | null>(null);
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [submitMessage, setSubmitMessage] = useState('');

//     useEffect(() => {
//         const fetchLesson = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) throw new Error('Failed to fetch lesson details.');
//                 const data = await response.json();
//                 setLesson(data);
//                 setCode(data.boilerplate_code || '');
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchLesson();
//     }, [lessonId]);

//     const handleSubmit = async () => {
//         const token = localStorage.getItem('authToken');
//         setSubmitMessage('');
//         setError(null);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ submitted_code: code })
//             });
//             if (!response.ok) throw new Error('Failed to submit solution.');
//             setSubmitMessage('Your solution has been submitted successfully!');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         }
//     };

//     if (isLoading) return <p>Loading lesson...</p>;
//     if (error) return <p className="text-red-500">{error}</p>;
//     if (!lesson) return <p>Lesson not found.</p>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <div>
//                     <h1 className="text-3xl font-bold text-gray-800">{lesson.title}</h1>
//                     <p className="text-gray-600">{lesson.description}</p>
//                 </div>
//                 <button onClick={() => setRoute('dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>
//             <main className="flex-grow border-2 border-gray-300 rounded-lg overflow-hidden">
//                 <Editor
//                     height="100%"
//                     language={lesson.language}
//                     value={code}
//                     onChange={(value) => setCode(value || '')}
//                     theme="vs-light"
//                 />
//             </main>
//             <footer className="flex-shrink-0 pt-4 flex justify-end items-center gap-4">
//                 {submitMessage && <p className="text-green-600">{submitMessage}</p>}
//                 <button onClick={handleSubmit} className="py-3 px-8 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700">Submit Solution</button>
//             </footer>
//         </div>
//     );
// };

// export default ViewLessonPage;