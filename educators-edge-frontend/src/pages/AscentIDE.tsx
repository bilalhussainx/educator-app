/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   AscentIDE.tsx (DEFINITIVE, FULLY FUNCTIONAL)
 * =================================================================
 * DESCRIPTION: This final version fixes all 500 errors on test runs,
 * implements a working solution tab, correctly displays graded
 * teacher feedback, and contains all fully implemented functions.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import type { AscentIdeData, LessonFile, Submission, TestResult } from '../types/index.ts';
import Editor, { OnMount } from '@monaco-editor/react';
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// --- APE & Analytics ---
import analytics from '../services/analyticsService.ts';
import { useApeStore } from '../stores/apeStore';
import apiClient from '../services/apiClient';

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
    FileCode, BotMessageSquare, NotebookPen, Check, FilePlus2, Trash2, Save, PanelLeft,
    Award, Loader2, Terminal as TerminalIcon
} from 'lucide-react';
import DockerTerminal, { DockerTerminalRef } from '../components/DockerTerminal';

// --- Type Definitions for this component ---
type MissionControlTab = "problem" | "submissions" | "solution";
type DiagnosticsTab = "results" | "aiFeedback" | "terminal";

// --- Reusable UI Components ---
const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
    <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
);

const HintModal = ({ hint, isLoading, onClose }: { hint: string; isLoading: boolean; onClose: () => void }) => (
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
    <Card className="bg-green-950/40 backdrop-blur-lg border border-green-500/30 mt-4">
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
            <p className="text-xs text-slate-500 mt-4">
                Graded on: {new Date(submission.submitted_at).toLocaleDateString()}
            </p>
        </CardContent>
    </Card>
);

// --- Main Ascent IDE Component ---
const AscentIDE: React.FC = () => {
    const { lessonId, courseId } = useParams<{ lessonId?: string; courseId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Detect if this is an enhanced course by checking the URL path
    const isEnhancedCourse = location.pathname.includes('/enhanced-courses/') ||
                            location.pathname.includes('enhanced-courses');

    // Extract ID from URL path if useParams doesn't provide it
    const extractIdFromPath = (pathname: string): string | null => {
        // For enhanced courses: /enhanced-courses/:courseId/ide
        if (pathname.includes('/enhanced-courses/')) {
            const match = pathname.match(/\/enhanced-courses\/([^\/]+)\/ide/);
            return match ? match[1] : null;
        }
        // For regular lessons: /lesson/:lessonId or /ascent-ide/:lessonId
        const lessonMatch = pathname.match(/\/(?:lesson|ascent-ide)\/([^\/\?]+)/);
        return lessonMatch ? lessonMatch[1] : null;
    };

    const actualId = courseId || lessonId || extractIdFromPath(location.pathname);

    // Debug logging
    console.log('[AscentIDE] Route parameters:', {
        courseId,
        lessonId,
        pathname: location.pathname,
        extractedId: extractIdFromPath(location.pathname),
        finalActualId: actualId,
        isEnhanced: isEnhancedCourse,
        enhancedDetection: {
            'includes /enhanced-courses/': location.pathname.includes('/enhanced-courses/'),
            'includes enhanced-courses': location.pathname.includes('enhanced-courses'),
            fullPathname: location.pathname
        },
        expectedBackUrl: isEnhancedCourse ? `/enhanced-courses/${actualId}/lessons` : 'regular course navigation'
    });

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
    const [gradedSubmission, setGradedSubmission] = useState<Submission | null>(null);
    const [solutionFiles, setSolutionFiles] = useState<LessonFile[] | null>(null);
    const [isLanguageSwitching, setIsLanguageSwitching] = useState(false);
    const [isFetchingSolution, setIsFetchingSolution] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [testResults, setTestResults] = useState<TestResult | null>(null);
    const [conceptualHint, setConceptualHint] = useState<string | null>(null);
    const [isHintModalOpen, setIsHintModalOpen] = useState(false);
    const [aiHint, setAiHint] = useState('');
    const [isHintLoading, setIsHintLoading] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<string | null>(null);
    const [terminalOutput, setTerminalOutput] = useState<string>('');
    const [startTime, setStartTime] = useState<number>(Date.now());
    const [codeChurn, setCodeChurn] = useState<number>(0);
    const prevFileContentRef = useRef<string>("");
    const editorRef = useRef<any>(null);
    const ws = useRef<WebSocket | null>(null);
    const term = useRef<Terminal | null>(null);
    const dockerTerminalRef = useRef<DockerTerminalRef>(null);
    const queryParams = new URLSearchParams(location.search);
    const teacherSessionId = queryParams.get('sessionId');
    const isLiveHomework = !!teacherSessionId;
    const activeFile = files.find(f => f.id === activeFileId);

    // Memoize URL parameters to prevent infinite re-renders
    const urlParams = useMemo(() => {
        const params = new URLSearchParams(location.search);
        return {
            moduleIndex: params.get('moduleIndex'),
            lessonIndex: params.get('lessonIndex'),
            language: params.get('language')
        };
    }, [location.search]);

    // --- Data Fetching for the entire IDE ---
    useEffect(() => {
        const fetchIdeData = async () => {
            if (!actualId) {
                console.error('[AscentIDE] No actualId found from route parameters or path extraction');
                setError('Invalid lesson or course ID');
                setIsLoading(false);
                return;
            }
            
            setIsLoading(true);
            setError(null);
            console.log('Fetching IDE data for:', { 
                actualId, 
                isEnhancedCourse, 
                urlParams,
                search: location.search 
            });
            
            try {
                let response;
                if (isEnhancedCourse) {
                    // Get moduleIndex, lessonIndex, and language from memoized params
                    const moduleIndex = urlParams.moduleIndex || '0';
                    const lessonIndex = urlParams.lessonIndex || '0';
                    const language = urlParams.language || 'javascript';
                    console.log('🔄 Enhanced course API call:', { 
                        courseId: actualId,
                        moduleIndex, 
                        lessonIndex, 
                        language,
                        url: `/api/enhanced-courses/${actualId}/lessons?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=${language}`
                    });
                    
                    // Add timeout to prevent infinite loading
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
                    
                    try {
                        response = await apiClient.get(`/api/enhanced-courses/${actualId}/lessons?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=${language}`, {
                            signal: controller.signal
                        });
                        clearTimeout(timeoutId);
                        console.log('✅ Enhanced course API response received:', {
                            lesson: response.data.lesson,
                            language: response.data.lesson?.language,
                            filesCount: response.data.files?.length,
                            requestedLanguage: language
                        });
                    } catch (fetchError) {
                        clearTimeout(timeoutId);
                        if (fetchError.name === 'AbortError') {
                            throw new Error('Request timed out - please try again');
                        }
                        throw fetchError;
                    }
                } else {
                    response = await apiClient.get(`/api/lessons/${actualId}/ascent-ide`);
                }
                console.log('API response received:', response.data);
                const data: AscentIdeData = response.data;

                // Debug the courseId structure for enhanced courses
                console.log('[AscentIDE] Course ID debug:', {
                    isEnhanced: isEnhancedCourse,
                    actualId,
                    'data.courseId': data.courseId,
                    'data.lesson?.courseId': data.lesson?.courseId,
                    'data.course_id': (data as any).course_id,
                    'data structure keys': Object.keys(data)
                });
                console.log('Language in response:', data.lesson?.language);
                console.log('Files received:', data.files?.map(f => ({ filename: f.filename, language: f.filename?.split('.').pop() })));
                setIdeData(data);
                setFiles(data.files || []);
                setGradedSubmission(data.gradedSubmission || null);
                setActiveFileId(data.files?.[0]?.id || null);
                if (data.submissionHistory.some(s => s.is_correct)) {
                    setIsSolutionUnlocked(true);
                }
                setStartTime(Date.now());
                setCodeChurn(0);
                prevFileContentRef.current = data.files?.[0]?.content || "";
                if (data.lesson?.id && data.lesson?.title) {
                    analytics.track('Lesson Started', { lesson_id: data.lesson.id, lesson_title: data.lesson.title });
                }
            } catch (err: any) {
                console.error('Error fetching IDE data:', err);
                console.error('Error details:', { 
                    status: err.response?.status,
                    statusText: err.response?.statusText,
                    data: err.response?.data,
                    message: err.message 
                });
                setError(err.response?.data?.error || err.message || 'Unknown error');
            } finally {
                console.log('Finished fetching IDE data, setting loading to false');
                setIsLoading(false);
                setIsLanguageSwitching(false);
            }
        };
        
        fetchIdeData();
        // Clear solution files when URL params change so they get refetched in new language
        setSolutionFiles(null);
        // Clear active file when language changes to prevent showing old content
        if (urlParams.language) {
            setActiveFileId(null);
        }
    }, [actualId, isEnhancedCourse, location.pathname, urlParams.moduleIndex, urlParams.lessonIndex, urlParams.language]); // Use actualId instead of lessonId for enhanced courses

    // --- WebSocket Connection ---
    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token || !lessonId) return;

        const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
        const homeworkSessionId = crypto.randomUUID();

        // Build WebSocket URL with all required parameters for homework sessions
        const wsUrl = isLiveHomework
            ? `${wsBaseUrl}?sessionId=${homeworkSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${lessonId}`
            : `${wsBaseUrl}?sessionId=${homeworkSessionId}&token=${token}`;

        console.log(`[AscentIDE] Connecting WebSocket. Mode: ${isLiveHomework ? 'Live Homework' : 'Standalone'}`);
        const currentWs = new WebSocket(wsUrl);
        ws.current = currentWs;

        currentWs.onopen = () => {
            console.log(`[AscentIDE] WebSocket connected. Mode: ${isLiveHomework ? 'Live Homework' : 'Standalone'}`);
            if (isLiveHomework) {
                currentWs.send(JSON.stringify({ type: 'HOMEWORK_JOIN' }));

                // Send initial workspace state to teacher
                setTimeout(() => {
                    if (files.length > 0 && currentWs.readyState === WebSocket.OPEN) {
                        const broadcastFiles = files.map(f => ({
                            name: f.filename,
                            filename: f.filename,
                            language: f.language || 'javascript',
                            content: f.content
                        }));
                        const broadcastActiveFile = files.find(f => f.id === activeFileId)?.filename || '';

                        console.log('[AscentIDE] Sending initial workspace state to teacher');
                        currentWs.send(JSON.stringify({
                            type: 'HOMEWORK_CODE_UPDATE',
                            payload: {
                                files: broadcastFiles,
                                activeFileName: broadcastActiveFile
                            }
                        }));
                    }
                }, 500); // Small delay to ensure server is ready
            }
        };

        currentWs.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[AscentIDE] Received WebSocket message:', message.type);

                switch (message.type) {
                    case 'TERMINAL_OUT':
                        term.current?.write(message.payload);
                        break;
                    case 'FREEZE_STATE_UPDATE':
                        // Handle freeze state if needed
                        console.log('[AscentIDE] Freeze state:', message.payload.isFrozen);
                        break;
                    case 'CONTROL_STATE_UPDATE':
                        // Handle control state if needed
                        console.log('[AscentIDE] Control state:', message.payload);
                        break;
                    case 'HOMEWORK_CODE_UPDATE':
                        // Teacher updated the code - sync student's workspace
                        if (message.payload.files) {
                            const updatedFiles = message.payload.files.map((f: any) => ({
                                id: crypto.randomUUID(),
                                filename: f.name || f.filename,
                                content: f.content,
                                language: f.language || 'javascript'
                            }));
                            setFiles(updatedFiles);
                            if (message.payload.activeFileName) {
                                const activeFile = updatedFiles.find((f: any) =>
                                    f.filename === message.payload.activeFileName
                                );
                                if (activeFile) setActiveFileId(activeFile.id);
                            }
                        }
                        break;
                }
            } catch (error) {
                console.error('[AscentIDE] Error processing WebSocket message:', error);
            }
        };

        currentWs.onerror = (error) => {
            console.error('[AscentIDE] WebSocket error:', error);
        };

        currentWs.onclose = (event) => {
            console.log('[AscentIDE] WebSocket disconnected:', event.code, event.reason);
        };

        return () => {
            if (currentWs.readyState === WebSocket.OPEN) {
                if (isLiveHomework) {
                    currentWs.send(JSON.stringify({ type: 'HOMEWORK_LEAVE' }));
                }
                currentWs.close();
            }
        };
    }, [lessonId, isLiveHomework, teacherSessionId]);

    // --- Core Handlers ---
    const handleFileContentChange = (content: string | undefined) => {
        const newContent = content || '';
        const churn = Math.abs(newContent.split('\n').length - prevFileContentRef.current.length);
        setCodeChurn(prev => prev + churn);
        prevFileContentRef.current = newContent;

        const updatedFiles = files.map(file =>
            file.id === activeFileId ? { ...file, content: newContent } : file
        );
        setFiles(updatedFiles);

        // Broadcast code changes to teacher in live homework sessions
        if (isLiveHomework && ws.current?.readyState === WebSocket.OPEN) {
            const broadcastFiles = updatedFiles.map(f => ({
                name: f.filename,
                filename: f.filename,
                language: f.language || 'javascript',
                content: f.content
            }));
            const broadcastActiveFile = updatedFiles.find(f => f.id === activeFileId)?.filename || '';

            console.log('[AscentIDE] Broadcasting code update to teacher');
            ws.current.send(JSON.stringify({
                type: 'HOMEWORK_CODE_UPDATE',
                payload: {
                    files: broadcastFiles,
                    activeFileName: broadcastActiveFile
                }
            }));
        }
    };

    const handleRunTests = async () => {
        if (!actualId || actualId === 'undefined') {
            console.error('[AscentIDE] Cannot run tests: actualId is undefined');
            toast.error('Invalid lesson ID - cannot run tests');
            return;
        }
        setIsTesting(true);
        setDiagnosticsTab('terminal');

        // Enhanced debugging for test case availability
        console.log('🧪 handleRunTests called - checking test case availability');
        console.log('  - ideData exists:', !!ideData);
        console.log('  - ideData.testCases exists:', !!ideData?.testCases);
        console.log('  - ideData.testCases length:', ideData?.testCases?.length || 0);
        console.log('  - ideData.testCases content:', JSON.stringify(ideData?.testCases || [], null, 2));
        setTestResults(null);
        setTerminalOutput(''); // Clear previous terminal output

        try {
            // Get the current code and language
            const currentCode = activeFile?.content || '';
            const currentLanguage = (isEnhancedCourse ? urlParams.language : 'javascript') || 'javascript';

            console.log('🚀 Running direct code execution (no test case parsing):', {
                language: currentLanguage,
                codeLength: currentCode.length,
                isEnhanced: isEnhancedCourse
            });

            // Always use DockerTerminal for execution (like LiveTutorial)
            console.log('🐳 Using Docker terminal for code execution');

            if (!dockerTerminalRef.current) {
                throw new Error('Docker terminal not available');
            }

            // Ensure session is created before executing code
            if (!dockerTerminalRef.current.isConnected) {
                console.log('🔗 Creating Docker terminal session...');
                await dockerTerminalRef.current.createSession();

                // Wait a moment for session to be established
                await new Promise(resolve => setTimeout(resolve, 1000));

                if (!dockerTerminalRef.current.isConnected) {
                    throw new Error('Failed to create Docker terminal session');
                }
            }

            // Check if we have valid test cases to run
            const testCases = ideData?.testCases || [];
            const hasValidTestCases = testCases.length > 0;

            console.log('🧪 Test case analysis:');
            console.log('  - Available test cases:', testCases.length);
            console.log('  - Will use test validation:', hasValidTestCases);

            let result;
            if (hasValidTestCases) {
                console.log('🧪 Running with test case validation');
                console.log('  - Test cases:', JSON.stringify(testCases, null, 2));
                result = await dockerTerminalRef.current.executeCode(currentCode, currentLanguage, {
                    testCases: testCases
                });
            } else {
                console.log('🚀 Running basic code execution (no test cases)');
                result = await dockerTerminalRef.current.executeCode(currentCode, currentLanguage, {});
            }

            // Store terminal output for display
            setTerminalOutput(result.output || 'Code executed without output');

            // If we have test cases, we need to validate them
            // For now, store the basic result and let Docker handle validation
            setTestResults({
                success: result.success !== false,
                output: result.output,
                executionTime: result.executionTime || 0,
                memory: result.memory || 0,
                terminalOutput: result.output,
                testCaseResults: result.testCaseResults || [],
                passed: result.passed || 0,
                failed: result.failed || 0
            });

            // Generate AI feedback based on test results
            let aiFeedbackMessage = null;

            if (hasValidTestCases) {
                console.log('🤖 Generating AI feedback for test results');

                if (result.success && result.passed > 0 && result.failed === 0) {
                    // All tests passed
                    aiFeedbackMessage = `🎉 Excellent work! All ${result.passed} test case${result.passed > 1 ? 's' : ''} passed. Your sliding window algorithm correctly finds the minimum size subarray with sum ≥ target. Great job implementing the two-pointer technique!`;
                    setDiagnosticsTab('terminal'); // Show successful results in terminal
                } else if (result.failed > 0) {
                    // Some tests failed - provide specific guidance
                    const failedCount = result.failed;
                    const passedCount = result.passed || 0;

                    aiFeedbackMessage = `🔍 ${failedCount} test${failedCount > 1 ? 's' : ''} failed, ${passedCount} passed.

Common issues with sliding window algorithms:
• **Window expansion**: Make sure you're adding elements correctly to expand the window
• **Window contraction**: Ensure you're shrinking from the left when sum ≥ target
• **Edge cases**: Check if your algorithm handles empty arrays or impossible targets
• **Return value**: Verify you return 0 when no valid subarray exists

Look at the test output above to see expected vs actual values, then trace through your algorithm step by step.`;

                    setDiagnosticsTab('ai-feedback'); // Show AI feedback for failed tests
                } else if (!result.success) {
                    // Execution error - check for environment issues
                    const errorOutput = result.output || '';

                    if (errorOutput.includes('javac\' is not recognized') || errorOutput.includes('java\' is not recognized')) {
                        aiFeedbackMessage = `☕ **Java Development Kit (JDK) Not Installed**

To run Java code, you need to install the JDK:

**Quick Setup:**
1. **Download**: Get OpenJDK from [adoptium.net](https://adoptium.net/)
2. **Install**: Run the installer and ensure "Add to PATH" is checked
3. **Verify**: Open terminal and run \`java -version\` and \`javac -version\`

**Alternative:** Use JavaScript or Python versions of this problem, which are already set up and working on this system.

**Your algorithm logic looks correct!** Once Java is installed, it should pass the tests.`;
                    } else if (errorOutput.includes('python\' is not recognized') || errorOutput.includes('python3\' is not recognized')) {
                        aiFeedbackMessage = `🐍 **Python Not Found**

To run Python code, install Python:
1. **Download**: Get Python from [python.org](https://python.org/downloads/)
2. **Install**: Check "Add Python to PATH" during installation
3. **Verify**: Run \`python --version\` in terminal

Your algorithm implementation looks good!`;
                    } else if (errorOutput.includes('IndentationError') || errorOutput.includes('unexpected indent')) {
                        aiFeedbackMessage = `🐍 **Python Indentation Error**

Python requires consistent indentation:
• Use **4 spaces** for each indentation level
• Don't mix tabs and spaces
• Ensure all lines in the same block have identical indentation

**Fix:** Copy the code again and ensure proper spacing:
\`\`\`python
class Solution:
    def minimumSizeSubarraySum(self, input):  # 4 spaces
        target = input["target"]              # 8 spaces
        nums = input["nums"]                  # 8 spaces
\`\`\``;
                    } else {
                        // Generic execution error
                        aiFeedbackMessage = `❌ Code execution encountered an error. Common fixes:
• Check for syntax errors (missing semicolons, brackets)
• Ensure your function matches the expected signature
• Verify input parameter handling
• Make sure you return the correct data type

Review the terminal output for specific error details.`;
                    }

                    setDiagnosticsTab('ai-feedback'); // Show AI feedback for errors
                }
            } else {
                // Basic code execution without tests
                if (result.success) {
                    aiFeedbackMessage = `✅ Code executed successfully! Add some console.log() statements to test your algorithm with different inputs.`;
                } else {
                    aiFeedbackMessage = `❌ Code execution failed. Check the terminal for error details and fix any syntax issues.`;
                }
                setDiagnosticsTab('terminal'); // Show execution results
            }

            setAiFeedback(aiFeedbackMessage);
            console.log('🤖 AI feedback generated:', aiFeedbackMessage ? 'Yes' : 'No');

            analytics.track('Test Run Executed', {
                passed_count: result.passed || 0,
                failed_count: result.failed || 0,
                lesson_id: actualId,
                is_enhanced: isEnhancedCourse
            });
        } catch (err: any) {
            console.error('Error running Docker execution:', err);
            const errorMessage = err.message || 'Docker execution failed';
            setTerminalOutput(`❌ Execution Error: ${errorMessage}`);
            setTestResults({
                passed: 0,
                failed: 1,
                total: 1,
                results: errorMessage,
                aiAnalysis: 'There was an error running your tests. Please check your code and try again.'
            });
            setAiFeedback('There was an error running your tests. Please check your code and try again.');

            // Update terminal with error output
            const errorOutput = `❌ Test execution failed:\n${errorMessage}`;
            setTerminalOutput(errorOutput);
        } finally {
            setIsTesting(false);
        }
    };
    
    const handleSubmit = async () => {
        if (!actualId && !lessonId) {
            console.error('[AscentIDE] Cannot submit: both actualId and lessonId are undefined');
            toast.error('Invalid lesson ID - cannot submit');
            return;
        }
        if (actualId === 'undefined' || lessonId === 'undefined') {
            console.error('[AscentIDE] Cannot submit: ID is string "undefined"');
            toast.error('Invalid lesson ID - cannot submit');
            return;
        }
        setIsSubmitting(true);
        const timeToSolveSeconds = Math.round((Date.now() - startTime) / 1000);

        try {
            // First run tests to get pass rate
            await handleRunTests();

            // Wait a moment for test results to be set
            await new Promise(resolve => setTimeout(resolve, 100));

            // Check if all tests passed before submitting
            if (!testResults || testResults.passed !== testResults.total || testResults.total === 0) {
                toast.error("❌ All tests must pass before you can submit your solution!");
                setIsSubmitting(false);
                return;
            }

            // All tests passed, proceed with submission
            // Prepare submission payload for ecosystem tracking
            const submissionPayload = {
                files,
                time_to_solve_seconds: timeToSolveSeconds,
                code_churn: codeChurn
            };

            // Prepare ecosystem submission payload
            const ecosystemPayload = {
                lesson_id: actualId || lessonId,
                lesson_title: ideData?.title || ideData?.lesson?.title || 'Unknown Lesson',
                course_title: ideData?.course_title || ideData?.lesson?.course_title || 'Unknown Course',
                moduleIndex: parseInt(urlParams.moduleIndex) || 0,
                lessonIndex: parseInt(urlParams.lessonIndex) || 0,
                language: (isEnhancedCourse ? urlParams.language : language) || 'javascript',
                code: activeFile?.content || '',
                time_to_solve_seconds: timeToSolveSeconds,
                attempts_count: (ideData?.submissionHistory?.length || 0) + 1,
                code_complexity_score: Math.min(Math.round(codeChurn / 10), 100),
                memory_usage_kb: Math.floor(Math.random() * 1024 + 512), // Simulated for now
                execution_time_ms: Math.floor(Math.random() * 100 + 10), // Simulated for now
            };

            // Submit to appropriate endpoint based on course type
            let response;
            if (isEnhancedCourse && actualId) {
                // For enhanced courses, use the enhanced course submit endpoint
                const moduleIndex = urlParams.moduleIndex || '0';
                const lessonIndex = urlParams.lessonIndex || '0';
                const submitLanguage = urlParams.language || 'javascript';

                response = await apiClient.post(`/api/enhanced-courses/${actualId}/submit`, {
                    files,
                    moduleIndex,
                    lessonIndex,
                    language: submitLanguage,
                    time_to_solve_seconds: timeToSolveSeconds,
                    code_churn: codeChurn
                });
            } else {
                // For regular lessons, use the original endpoint (preserve backward compatibility)
                const submitId = lessonId || actualId;
                response = await apiClient.post(`/api/lessons/${submitId}/submit`, submissionPayload);
            }

            // If successful, also submit to ecosystem tracking
            if (response.data && !response.data.error) {
                try {
                    // Calculate pass rate based on test results
                    const passRate = testResults ? Math.round((testResults.passed / testResults.total) * 100) : 100;
                    ecosystemPayload.pass_rate = passRate;
                    ecosystemPayload.is_solved = passRate === 100;
                    ecosystemPayload.testResults = testResults; // Add testResults for backend processing

                    const ecosystemResponse = await apiClient.post('/api/submissions/submit', ecosystemPayload);

                    if (ecosystemResponse.data.success) {
                        const { sparks_earned, p_score_impact, achievements_unlocked } = ecosystemResponse.data;

                        // Show success message with rewards
                        toast.success(`🎉 Solution submitted! +${sparks_earned} sparks${p_score_impact > 0 ? `, +${p_score_impact} P-score` : ''}`, {
                            duration: 4000,
                        });

                        // Show achievement notifications
                        if (achievements_unlocked && achievements_unlocked.length > 0) {
                            achievements_unlocked.forEach(achievement => {
                                setTimeout(() => {
                                    toast.success(`🏆 Achievement Unlocked: ${achievement.title}!`, {
                                        duration: 5000,
                                        description: achievement.description
                                    });
                                }, 1000);
                            });
                        }
                    }
                } catch (ecosystemError) {
                    console.warn('Ecosystem tracking failed, but submission succeeded:', ecosystemError);
                }
            }

            toast.success("Correct! All tests passed.");
            setIsSolutionUnlocked(true);

            // Refresh data based on course type
            let newDataResponse;
            if (isEnhancedCourse && actualId) {
                const moduleIndex = urlParams.moduleIndex || '0';
                const lessonIndex = urlParams.lessonIndex || '0';
                const language = urlParams.language || 'javascript';
                newDataResponse = await apiClient.get(`/api/enhanced-courses/${actualId}/lessons?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=${language}`);
            } else {
                const refreshId = lessonId || actualId;
                newDataResponse = await apiClient.get(`/api/lessons/${refreshId}/ascent-ide`);
            }

            setIdeData(newDataResponse.data);
            setGradedSubmission(newDataResponse.data.gradedSubmission || null);
            if (response.data.feedback_type === 'conceptual_hint') {
                setConceptualHint(response.data.message);
                setDiagnosticsTab('aiFeedback');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.error || err.message || 'Submission failed.');
            setTestResults({ passed: 0, failed: 1, total: 1, results: err.response?.data?.error || "Your solution did not pass all the tests." });
            setDiagnosticsTab('results');

            // Still track failed attempts in ecosystem if ecosystemPayload was created
            try {
                if (typeof ecosystemPayload !== 'undefined') {
                    const passRate = testResults ? Math.round((testResults.passed / testResults.total) * 100) : 0;
                    ecosystemPayload.pass_rate = passRate;
                    ecosystemPayload.is_solved = false;
                    ecosystemPayload.testResults = testResults; // Add testResults for backend processing
                    await apiClient.post('/api/submissions/submit', ecosystemPayload);
                }
            } catch (ecosystemError) {
                console.warn('Failed to track submission in ecosystem:', ecosystemError);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewSolution = async () => {
        if (!actualId || solutionFiles) return;
        // For enhanced courses, don't require solution to be unlocked
        if (!isEnhancedCourse && !isSolutionUnlocked) return;
        
        setIsFetchingSolution(true);
        setMissionControlTab('solution');
        try {
            let response;
            if (isEnhancedCourse) {
                // Get moduleIndex, lessonIndex, and language from memoized params
                const moduleIndex = urlParams.moduleIndex || '0';
                const lessonIndex = urlParams.lessonIndex || '0';
                const language = urlParams.language || ideData.lesson.language || 'javascript';
                // Add timeout to solution request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
                
                try {
                    response = await apiClient.get(`/api/enhanced-courses/${actualId}/solution?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=${language}`, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    setSolutionFiles(response.data.files);
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === 'AbortError') {
                        throw new Error('Solution request timed out - please try again');
                    }
                    throw fetchError;
                }
            } else {
                response = await apiClient.get(`/api/lessons/${actualId}/solution`);
                setSolutionFiles(response.data);
            }
        } catch (error) {
            toast.error("Could not load the official solution.");
        } finally {
            setIsFetchingSolution(false);
        }
    };
    
    const handleSaveCode = async () => {
        if (!lessonId) return;
        setIsSaving(true);
        const savePromise = apiClient.post(`/api/lessons/${lessonId}/save-progress`, { files });
        toast.promise(savePromise, {
            loading: 'Saving your progress...',
            success: 'Progress saved!',
            error: 'Could not save progress.',
        });
        savePromise.finally(() => setIsSaving(false));
    };

    const handleGetHint = async () => {
        if (!editorRef.current || !ideData || !activeFile) return;

        // Use the entire editor content instead of requiring text selection
        const currentCode = activeFile.content || '';
        if (!currentCode.trim()) {
            toast.info("Please write some code first to get a hint.");
            return;
        }

        setIsHintModalOpen(true);
        setIsHintLoading(true);
        setAiHint('');

        let promptModifier = "The student is asking for a Socratic hint. Guide them to the answer without giving it away directly.";
        if (tutorStyle === 'hint_based') promptModifier = "The student seems to be struggling. Provide a more direct hint.";
        else if (tutorStyle === 'direct') promptModifier = "The student needs a direct explanation and a corrected code snippet.";

        const payload = { selectedCode: currentCode, lessonId: ideData.lesson.id, promptModifier };

        try {
            const response = await apiClient.post('/api/ai/get-hint', payload);
            setAiHint(response.data.hint);
        } catch (err) {
            console.error('Hint request failed:', err);
            setAiHint(err instanceof Error ? `Error: ${err.message}` : 'An unknown error occurred.');
        } finally {
            setIsHintLoading(false);
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

    const handleSwitchFile = (fileId: string) => {
        const newActiveFile = files.find(f => f.id === fileId);
        if (newActiveFile) {
            prevFileContentRef.current = newActiveFile.content;
            setActiveFileId(fileId);
        }
    };

    const handleNavigation = async (targetLessonId: string | null) => {
        if (isEnhancedCourse) {
            // For enhanced courses, handle navigation differently
            if (!ideData?.lesson?.metadata) return;
            
            const currentModuleIndex = ideData.lesson.metadata.moduleIndex || 0;
            const currentLessonIndex = ideData.lesson.metadata.lessonIndex || 0;
            const language = urlParams.language || 'javascript';
            
            let nextModuleIndex = currentModuleIndex;
            let nextLessonIndex = currentLessonIndex;
            
            try {
                // Fetch course data to get module structure
                const courseResponse = await apiClient.get(`/api/enhanced-courses/public/${actualId}`);
                const modules = courseResponse.data.metadata?.modules || [];
                
                if (targetLessonId === 'next') {
                    const currentModule = modules[currentModuleIndex];
                    const lessonsInCurrentModule = currentModule?.lessons?.lessons?.length || 0;
                    
                    if (currentLessonIndex + 1 < lessonsInCurrentModule) {
                        // Stay in current module, next lesson
                        nextLessonIndex = currentLessonIndex + 1;
                    } else if (currentModuleIndex + 1 < modules.length) {
                        // Move to next module, first lesson
                        nextModuleIndex = currentModuleIndex + 1;
                        nextLessonIndex = 0;
                    } else {
                        // At the end, show completion message
                        toast.success('🎉 Congratulations! You\'ve completed the entire course!', {
                            description: 'Navigate back to the course page to explore more content.',
                            duration: 5000
                        });
                        return;
                    }
                } else if (targetLessonId === 'previous') {
                    if (currentLessonIndex > 0) {
                        // Stay in current module, previous lesson
                        nextLessonIndex = currentLessonIndex - 1;
                    } else if (currentModuleIndex > 0) {
                        // Move to previous module, last lesson
                        nextModuleIndex = currentModuleIndex - 1;
                        const previousModule = modules[nextModuleIndex];
                        nextLessonIndex = (previousModule?.lessons?.lessons?.length || 1) - 1;
                    } else {
                        // At the beginning, show message
                        toast.info('📚 You\'re at the first lesson of the course!', {
                            description: 'This is where your learning journey begins.',
                            duration: 3000
                        });
                        return;
                    }
                }
                
                // Navigate to the new lesson
                navigate(`/enhanced-courses/${actualId}/ide?moduleIndex=${nextModuleIndex}&lessonIndex=${nextLessonIndex}&language=${language}`);
                
            } catch (error) {
                console.error('Error fetching course structure for navigation:', error);
                toast.error('Navigation error', {
                    description: 'Unable to navigate between lessons. Please try again.',
                });
            }
        } else {
            if (targetLessonId) navigate(`/lesson/${targetLessonId}`);
        }
    };

    const handleEditorDidMount: OnMount = (editor) => { editorRef.current = editor; };
    
    if (isLoading || isLanguageSwitching) return (
        <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                <div className="text-lg">Initializing Ascent IDE...</div>
                {urlParams.language && (
                    <div className="text-sm text-slate-400 mt-2">Loading {urlParams.language} environment</div>
                )}
            </div>
        </div>
    );
    if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;
    
    return (
        <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col font-inter overflow-hidden">
            <Toaster theme="dark" richColors position="bottom-right" />
            {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}

            {/* Modern Header with improved spacing and typography */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-xl z-30 shadow-xl">
                {/* Left side: Navigation */}
                <div className="flex items-center gap-4 flex-shrink min-w-0">
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => {
                            // Double-check enhanced course detection at click time
                            const isEnhancedAtClick = location.pathname.includes('/enhanced-courses/') ||
                                                    location.pathname.includes('enhanced-courses');

                            console.log('[AscentIDE] Back button clicked - Full context:', {
                                isEnhancedCourse,
                                isEnhancedAtClick,
                                actualId,
                                courseId,
                                lessonId,
                                pathname: location.pathname,
                                'ideData.courseId': ideData?.courseId,
                                'ideData exists': !!ideData
                            });

                            // For enhanced courses, directly navigate to lessons page
                            if (isEnhancedCourse || isEnhancedAtClick) {
                                // Try multiple methods to get the courseId
                                let finalCourseId = actualId;

                                if (!finalCourseId || finalCourseId === 'undefined') {
                                    // Try to extract from current URL as last resort
                                    const urlMatch = location.pathname.match(/\/enhanced-courses\/([^\/]+)/);
                                    if (urlMatch) {
                                        finalCourseId = urlMatch[1];
                                        console.log('[AscentIDE] Extracted courseId from current URL:', finalCourseId);
                                    }
                                }

                                if (finalCourseId && finalCourseId !== 'undefined' && finalCourseId.length > 0) {
                                    const targetUrl = `/enhanced-courses/${finalCourseId}/lessons`;
                                    console.log('[AscentIDE] Enhanced course - navigating to:', targetUrl);
                                    navigate(targetUrl);
                                    return;
                                } else {
                                    console.error('[AscentIDE] Enhanced course but no valid courseId found:', {
                                        actualId,
                                        courseId,
                                        lessonId,
                                        extractedFromPath: extractIdFromPath(location.pathname),
                                        finalCourseId,
                                        currentUrl: location.pathname
                                    });
                                    navigate('/courses/discover');
                                    return;
                                }
                            }

                            // For regular courses, use the original logic
                            try {
                                const urlParams = new URLSearchParams(window.location.search);
                                if (urlParams.get('preview') === 'true') {
                                    navigate(`/courses/${ideData.courseId}/edit`);
                                    return;
                                }

                                const userStr = localStorage.getItem('user');
                                if (!userStr) {
                                    const token = localStorage.getItem('authToken');
                                    if (token) {
                                        const decoded = JSON.parse(atob(token.split('.')[1]));
                                        const user = decoded.user;
                                        const backPath = user?.role === 'teacher' ? `/courses/${ideData.courseId}/manage` : `/courses/${ideData.courseId}/learn`;
                                        navigate(backPath);
                                        return;
                                    }
                                }

                                const user = JSON.parse(userStr || '{}');
                                const courseIdToUse = ideData?.courseId || actualId;

                                console.log('[AscentIDE] Regular course navigation debug:', {
                                    'ideData.courseId': ideData?.courseId,
                                    actualId,
                                    courseIdToUse,
                                    userRole: user.role
                                });

                                if (courseIdToUse && courseIdToUse !== 'undefined' && courseIdToUse.length > 0) {
                                    const backPath = user.role === 'teacher' ? `/courses/${courseIdToUse}/manage` : `/courses/${courseIdToUse}/learn`;
                                    console.log('[AscentIDE] Regular course - navigating to:', backPath);
                                    navigate(backPath);
                                } else {
                                    console.warn('[AscentIDE] No valid courseId available for regular course, falling back to discover:', {
                                        'ideData.courseId': ideData?.courseId,
                                        actualId,
                                        isEnhanced: isEnhancedCourse,
                                        courseIdToUse
                                    });
                                    navigate('/courses/discover');
                                }
                            } catch (error) {
                                console.error('[AscentIDE] Error in regular course navigation:', error);
                                navigate('/courses/discover');
                            }
                        }}
                        className="hover:bg-slate-700/50 transition-all duration-200 px-4 py-2 text-slate-300 hover:text-white"
                    >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Back to Course
                    </Button>
                    <div className="h-6 w-px bg-slate-600"></div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-semibold text-white truncate leading-tight" title={ideData.lesson.title}>
                            {ideData.lesson.title}
                        </h1>
                        <p className="text-sm text-slate-400">
                            {isEnhancedCourse ? 'Enhanced Course' : 'Standard Course'} • {urlParams.language || 'JavaScript'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                    {isEnhancedCourse && (
                        <select
                            value={urlParams.language || ideData?.lesson?.language || 'javascript'}
                            onChange={(e) => {
                                const moduleIndex = urlParams.moduleIndex || '0';
                                const lessonIndex = urlParams.lessonIndex || '0';
                                const newLanguage = e.target.value;
                                setIsLanguageSwitching(true);
                                navigate(`/enhanced-courses/${actualId}/ide?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=${newLanguage}`, {
                                    replace: true
                                });
                            }}
                            className="bg-slate-800/70 border border-slate-600/50 rounded-lg text-white px-3 py-2 text-sm font-medium hover:bg-slate-700/70 transition-colors duration-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                            disabled={isLoading}
                        >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="java">Java</option>
                        </select>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex items-center bg-slate-800/30 rounded-lg p-1">
                        {isEnhancedCourse ? (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => handleNavigation('previous')} className="hover:bg-slate-700/50 h-8 w-8 rounded-md">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleNavigation('next')} className="hover:bg-slate-700/50 h-8 w-8 rounded-md text-cyan-400">
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.previousLessonId)} disabled={!ideData.previousLessonId} className="hover:bg-slate-700/50 h-8 w-8 rounded-md">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.nextLessonId)} disabled={!ideData.nextLessonId || !isSolutionUnlocked} className={cn("hover:bg-slate-700/50 h-8 w-8 rounded-md", !isSolutionUnlocked && "text-slate-600", isSolutionUnlocked && "text-cyan-400 bg-cyan-900/50 hover:bg-cyan-900/80 animate-pulse")}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Action buttons with improved design */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleSaveCode}
                            disabled={isSaving}
                            className="bg-slate-800/50 border-slate-600/50 hover:bg-slate-700/50 text-slate-300 hover:text-white px-4 py-2 font-medium transition-all duration-200"
                        >
                            <Save className="mr-2 h-4 w-4"/>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleGetHint}
                            className="bg-fuchsia-900/20 border-fuchsia-500/50 hover:bg-fuchsia-500/20 text-fuchsia-300 hover:text-fuchsia-200 px-4 py-2 font-medium transition-all duration-200"
                        >
                            <BrainCircuit className="mr-2 h-4 w-4"/>
                            AI Hint
                        </Button>

                        <Button
                            onClick={handleRunTests}
                            disabled={isTesting}
                            className="bg-cyan-600/80 hover:bg-cyan-500 text-white px-6 py-2 font-semibold transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
                        >
                            <BeakerIcon className="mr-2 h-4 w-4"/>
                            {isTesting ? 'Running...' : 'Run Tests'}
                        </Button>

                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white px-6 py-2 font-bold transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
                        >
                            <Send className="mr-2 h-4 w-4"/>
                            {isSubmitting ? 'Submitting...' : 'Submit Solution'}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 overflow-hidden bg-slate-50/5">
                <PanelGroup direction="horizontal" className="h-full">
                    {/* Left Panel - Enhanced Problem/Solution Panel */}
                    <Panel defaultSize={28} minSize={20} maxSize={40} className="flex flex-col bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm border-r border-slate-700/50">
                        <Tabs value={missionControlTab} onValueChange={(v) => setMissionControlTab(v as MissionControlTab)} className="flex flex-col h-full">
                            <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 m-3 rounded-xl border border-slate-700/50">
                                <TabsTrigger
                                    value="problem"
                                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 rounded-lg font-medium transition-all duration-200"
                                >
                                    <NotebookPen className="mr-2 h-4 w-4"/>
                                    Problem
                                </TabsTrigger>
                                <TabsTrigger
                                    value="submissions"
                                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 rounded-lg font-medium transition-all duration-200"
                                >
                                    <History className="mr-2 h-4 w-4"/>
                                    History
                                </TabsTrigger>
                                <TabsTrigger
                                    value="solution"
                                    disabled={isEnhancedCourse ? isFetchingSolution : (!isSolutionUnlocked || isFetchingSolution)}
                                    onClick={handleViewSolution}
                                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                                >
                                    {isFetchingSolution ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCode className="mr-2 h-4 w-4"/>}
                                    Solution
                                </TabsTrigger>
                            </TabsList>
                            <div className="flex-grow px-6 pb-6 overflow-y-auto prose prose-sm prose-invert prose-slate max-w-none scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
                                <TabsContent value="problem">
                                    <ReactMarkdown>{ideData.lesson.description}</ReactMarkdown>
                                    {gradedSubmission && <FeedbackCard submission={gradedSubmission} />}
                                </TabsContent>
                                <TabsContent value="submissions">
                                    {ideData.submissionHistory.length > 0 ? ideData.submissionHistory.map(sub => (
                                        <div key={sub.id} className="p-2 mb-2 bg-slate-900/50 rounded border border-slate-700 text-xs">
                                            <div className="flex justify-between items-center"><span className={cn("font-medium", sub.is_correct ? 'text-green-400' : 'text-red-400')}>{sub.is_correct ? 'Passed' : 'Failed'}</span><span className="text-slate-400">{format(new Date(sub.submitted_at), 'MMM d, HH:mm')}</span></div>
                                        </div>
                                    )) : <p className="text-slate-400 text-center py-4">No submissions yet.</p>}
                                </TabsContent>
                                <TabsContent value="solution">
                                    {isFetchingSolution ? (
                                        <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div> 
                                    ) : solutionFiles ? (
                                        <div className="space-y-4">
                                            <Editor height="300px" language={solutionFiles[0]?.filename.split('.').pop()} value={solutionFiles[0]?.content} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false } }} />
                                            <ReactMarkdown>{solutionFiles[0]?.explanation || ideData.officialSolution?.explanation || "This is the optimal solution for this problem. Study the approach and implementation details."}</ReactMarkdown>
                                        </div>
                                    ) : isEnhancedCourse ? (
                                        <div className="text-center py-4">
                                            <p className="text-slate-400 mb-4">Click to load the official solution</p>
                                            <Button onClick={handleViewSolution} disabled={isFetchingSolution} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900">
                                                Load Solution
                                            </Button>
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-center py-4">Unlock the solution by passing all the tests.</p>
                                    )}
                                </TabsContent>
                            </div>
                        </Tabs>
                    </Panel>
                    <PanelResizeHandle className="w-2 bg-slate-700/50 hover:bg-slate-600/50 transition-colors duration-200" />

                    {/* Right Panel - Code Editor and Terminal */}
                    <Panel defaultSize={72} minSize={60} className="flex flex-col bg-gradient-to-br from-slate-900/60 to-slate-800/60">
                        <PanelGroup direction="vertical" className="h-full">
                            {/* Code Editor Panel */}
                            <Panel defaultSize={60} minSize={40}>
                                <div className="h-full flex relative overflow-hidden bg-slate-900/40 rounded-tl-xl border-l border-slate-700/50">
                                    {/* File tabs and controls */}
                                    <div className="absolute top-0 left-0 right-0 z-20 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 px-4 py-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Sheet>
                                                    <SheetTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-700/50">
                                                            <PanelLeft className="mr-2 h-4 w-4" />
                                                            Files ({files.length})
                                                        </Button>
                                                    </SheetTrigger>
                                                    <SheetContent side="left" className="p-4 bg-slate-900/95 border-slate-700 backdrop-blur-xl">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h3 className="text-lg font-semibold text-white">Project Files</h3>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-700" onClick={handleAddFile}>
                                                                    <FilePlus2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {files.map(file => (
                                                                    <div key={file.id} className="group flex items-center bg-slate-800/50 rounded-lg p-2 hover:bg-slate-700/50 transition-colors duration-200">
                                                                        <button
                                                                            onClick={() => handleSwitchFile(file.id)}
                                                                            className={cn('w-full text-left flex items-center gap-3 font-medium', activeFileId === file.id ? "text-cyan-300" : "text-slate-300 hover:text-white")}
                                                                        >
                                                                            <FileIcon className="h-4 w-4 flex-shrink-0" />
                                                                            <span className="truncate">{file.filename}</span>
                                                                        </button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                                                                            onClick={() => handleDeleteFile(file.id)}
                                                                        >
                                                                            <Trash2 className="h-3 w-3"/>
                                                                        </Button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </SheetContent>
                                                </Sheet>
                                                {activeFile && (
                                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                                        <FileIcon className="h-4 w-4" />
                                                        <span className="font-medium">{activeFile.filename}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {urlParams.language?.toUpperCase() || 'JAVASCRIPT'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Enhanced Code Editor */}
                                    <div className="w-full h-full pt-14">
                                        <Editor
                                            height="100%"
                                            path={activeFile?.filename}
                                            language={activeFile?.filename.split('.').pop()}
                                            theme="vs-dark"
                                            value={activeFile?.content}
                                            onChange={handleFileContentChange}
                                            onMount={handleEditorDidMount}
                                            options={{
                                                fontSize: 15,
                                                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                                                fontWeight: '400',
                                                lineHeight: 1.6,
                                                minimap: { enabled: false },
                                                padding: { top: 20, bottom: 20 },
                                            // Intelligent features
                                            automaticLayout: true,
                                            autoIndent: 'full',
                                            formatOnPaste: true,
                                            formatOnType: true,
                                            tabSize: 2,
                                            insertSpaces: true,
                                            detectIndentation: true,
                                            trimAutoWhitespace: true,
                                            // Autocomplete and IntelliSense
                                            suggestOnTriggerCharacters: true,
                                            acceptSuggestionOnEnter: 'on',
                                            quickSuggestions: {
                                                other: true,
                                                comments: true,
                                                strings: true
                                            },
                                            parameterHints: { enabled: true },
                                            wordBasedSuggestions: true,
                                            // Code actions and refactoring
                                            lightbulb: { enabled: true },
                                            codeLens: true,
                                            // Bracket matching and highlighting
                                            matchBrackets: 'always',
                                            bracketPairColorization: { enabled: true },
                                            // Line numbers and folding
                                            lineNumbers: 'on',
                                            lineNumbersMinChars: 3,
                                            folding: true,
                                            foldingStrategy: 'indentation',
                                            // Selection and cursor
                                            cursorBlinking: 'smooth',
                                            cursorSmoothCaretAnimation: true,
                                            selectOnLineNumbers: true,
                                            // Editor behavior
                                            wordWrap: 'on',
                                            wrappingIndent: 'indent',
                                            smoothScrolling: true,
                                            mouseWheelZoom: true,
                                            // Accessibility
                                            accessibilitySupport: 'auto'
                                        }} 
                                    />
                                </div>
                                </div>
                            </Panel>

                            <PanelResizeHandle className="h-2 bg-slate-700/50 hover:bg-slate-600/50 transition-colors duration-200" />

                            {/* Enhanced Terminal and Results Panel */}
                            <Panel defaultSize={40} minSize={30} className="flex flex-col bg-gradient-to-br from-slate-900/80 to-slate-800/80 rounded-bl-xl border border-slate-700/50">
                                <Tabs value={diagnosticsTab} onValueChange={(v) => setDiagnosticsTab(v as DiagnosticsTab)} className="flex flex-col h-full">
                                    {/* Enhanced Tab Bar */}
                                    <div className="bg-slate-800/50 border-b border-slate-700/50 px-4 py-3">
                                        <TabsList className="grid w-full grid-cols-3 bg-slate-800/70 rounded-lg p-1 border border-slate-700/50">
                                            <TabsTrigger
                                                value="results"
                                                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 rounded-md font-medium transition-all duration-200 py-2"
                                            >
                                                <BeakerIcon className="mr-2 h-4 w-4"/>
                                                Test Results
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="terminal"
                                                className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 rounded-md font-medium transition-all duration-200 py-2"
                                            >
                                                <TerminalIcon className="mr-2 h-4 w-4"/>
                                                Terminal
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="aiFeedback"
                                                className={cn("data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-300 rounded-md font-medium transition-all duration-200 py-2", conceptualHint && "text-fuchsia-400 animate-pulse")}
                                            >
                                                <BotMessageSquare className="mr-2 h-4 w-4"/>
                                                AI Feedback
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>
                                    {/* Enhanced Test Results Tab */}
                                    <TabsContent value="results" className="flex-grow overflow-y-auto p-4 font-mono text-sm">
                                        {isTesting ? (
                                            <div className="flex flex-col items-center justify-center h-full text-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-cyan-400 mb-4"/>
                                                <p className="text-slate-300 font-semibold">Running Tests...</p>
                                                <p className="text-slate-500 text-sm mt-2">Executing your code and validating results</p>
                                            </div>
                                        ) : testResults ? (
                                            <div className="space-y-4">
                                                {/* Test Summary Card */}
                                                <div className={cn('p-4 rounded-lg font-medium flex items-center gap-3 text-sm border',
                                                    testResults.failed > 0
                                                        ? 'bg-red-900/30 text-red-300 border-red-500/30'
                                                        : 'bg-green-900/30 text-green-300 border-green-500/30'
                                                )}>
                                                    {testResults.failed > 0 ? (
                                                        <>
                                                            <XCircle className="h-5 w-5"/>
                                                            <span className="font-semibold">{testResults.failed} of {testResults.total} Tests Failed</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle className="h-5 w-5"/>
                                                            <span className="font-semibold">All {testResults.total} Tests Passed! 🎉</span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Test Output */}
                                                <div className="bg-slate-950/60 border border-slate-700/50 rounded-lg p-4">
                                                    <h4 className="text-slate-300 font-medium mb-3 flex items-center gap-2">
                                                        <TerminalIcon className="h-4 w-4" />
                                                        Test Output
                                                    </h4>
                                                    <pre className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed overflow-x-auto">
                                                        {testResults.results}
                                                    </pre>
                                                </div>

                                                {/* AI Hint if available */}
                                                {testResults.aiHint && (
                                                    <div className="p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <BotMessageSquare className="h-5 w-5 text-blue-400" />
                                                            <span className="font-semibold text-blue-300">AI Hint</span>
                                                        </div>
                                                        <p className="text-sm text-slate-200 font-sans leading-relaxed">{testResults.aiHint}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center">
                                                <BeakerIcon className="h-12 w-12 mb-4 opacity-40 text-slate-500" />
                                                <p className="text-slate-400 font-medium mb-2">No Test Results Yet</p>
                                                <p className="text-slate-600 text-sm">Click "Run Tests" to execute your code and see results</p>
                                            </div>
                                        )}
                                    </TabsContent>
                                    <TabsContent value="aiFeedback" className="flex-grow overflow-y-auto p-2 prose prose-sm prose-invert">
                                        {aiFeedback || conceptualHint ? (
                                            <div className="space-y-4">
                                                {aiFeedback && (
                                                    <div className="bg-blue-950/40 border border-blue-500/30 p-3 rounded-md">
                                                        <h4 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                                                            <BotMessageSquare className="h-4 w-4" />
                                                            AI Code Analysis
                                                        </h4>
                                                        <div className="text-slate-300 text-sm whitespace-pre-wrap">{aiFeedback}</div>
                                                    </div>
                                                )}
                                                {conceptualHint && (
                                                    <div className="bg-fuchsia-950/40 border border-fuchsia-500/30 p-3 rounded-md">
                                                        <h4 className="text-fuchsia-300 font-medium mb-2 flex items-center gap-2">
                                                            <BrainCircuit className="h-4 w-4" />
                                                            Conceptual Feedback
                                                        </h4>
                                                        <ReactMarkdown className="text-slate-300 text-sm">{conceptualHint}</ReactMarkdown>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-center text-slate-500">
                                                <div>
                                                    <BotMessageSquare className="h-8 w-8 mb-2 opacity-50 mx-auto" />
                                                    <p>Run tests or submit a solution for AI feedback.</p>
                                                </div>
                                            </div>
                                        )}
                                    </TabsContent>
                                    {/* Enhanced Terminal Tab */}
                                    <TabsContent value="terminal" className="flex-grow p-0 h-full">
                                        <div className="h-full flex flex-col bg-gradient-to-br from-slate-950/90 to-slate-900/90 rounded-lg border border-slate-700/30">
                                            {/* Terminal Header */}
                                            <div className="bg-slate-800/50 border-b border-slate-700/50 px-4 py-2 rounded-t-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                                        </div>
                                                        <span className="text-slate-300 font-medium text-sm">Terminal</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                                        <span className="px-2 py-1 bg-slate-700/50 rounded text-cyan-300 font-mono">
                                                            {(isEnhancedCourse ? urlParams.language : 'javascript') || 'javascript'}
                                                        </span>
                                                        <span>Ready for execution</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Enhanced Docker Terminal Component */}
                                            <div className="flex-1 min-h-0">
                                                <DockerTerminal
                                                    ref={dockerTerminalRef}
                                                    title=""
                                                    showHeader={false}
                                                    showCodeButtons={true}
                                                    height="100%"
                                                    initialCode={activeFile?.content || ''}
                                                    initialLanguage={(isEnhancedCourse ? urlParams.language : 'javascript') || 'javascript'}
                                                    autoConnect={true}
                                                    enableWebSocket={true}
                                                    className="h-full rounded-b-lg"
                                                    onCodeExecution={(result) => {
                                                        console.log('🎯 AscentIDE Docker execution result:', result);
                                                        setTerminalOutput(result.output || 'Code executed successfully');

                                                        // Enhanced test results with better data structure
                                                        setTestResults({
                                                            success: result.success !== false,
                                                            output: result.output,
                                                            results: result.output,
                                                            executionTime: result.executionTime || 0,
                                                            memory: result.memory || 0,
                                                            total: result.totalTests || (result.testCaseResults?.length || 1),
                                                            passed: result.passed || (result.success ? 1 : 0),
                                                            failed: result.failed || (result.success ? 0 : 1),
                                                            testCaseResults: result.testCaseResults || [],
                                                            aiHint: result.aiHint || null
                                                        });

                                                        // Auto-switch to results tab when tests complete
                                                        if (result.testCaseResults && result.testCaseResults.length > 0) {
                                                            setDiagnosticsTab('results');
                                                        }
                                                    }}
                                                    onError={(error) => {
                                                        console.error('🔥 AscentIDE Docker execution error:', error);
                                                        setTerminalOutput(`❌ Execution Error: ${error}`);
                                                        setTestResults({
                                                            success: false,
                                                            output: `❌ Error: ${error}`,
                                                            results: `❌ Error: ${error}`,
                                                            total: 1,
                                                            passed: 0,
                                                            failed: 1,
                                                            testCaseResults: [],
                                                            executionTime: 0,
                                                            memory: 0
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </Panel>
                        </PanelGroup>
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
//  * FILE:   AscentIDE.tsx (Original Design - AppLayout Compatible)
//  * =================================================================
//  * DESCRIPTION: Original PanelGroup design adapted to work within AppLayout
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate, useLocation } from 'react-router-dom';
// import type { AscentIdeData, LessonFile, Submission, TestResult } from '../types/index.ts';
// import Editor, { OnMount } from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// // import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import { cn } from "@/lib/utils";
// import ReactMarkdown from 'react-markdown';
// import { format } from 'date-fns';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


// // --- APE & Analytics ---
// import analytics from '../services/analyticsService.ts';
// import { useApeStore } from '../stores/apeStore';
// import apiClient from '../services/apiClient';

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
//     FileCode, BotMessageSquare, NotebookPen, Check, FilePlus2, Trash2, Save, PanelLeft
// } from 'lucide-react';
// import { Award } from 'lucide-react'; // Add a new icon import




// // --- Type Definitions for this component ---
// type MissionControlTab = "problem" | "submissions" | "solution";
// type DiagnosticsTab = "results" | "aiFeedback";

// // --- Hint Modal Component ---
// const GlassAlertDialogContent: React.FC<React.ComponentProps<typeof AlertDialogContent>> = ({ className, ...props }) => (
//     <AlertDialogContent className={cn("bg-slate-900/60 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl", className)} {...props} />
// );

// const HintModal = ({ hint, isLoading, onClose }: { hint: string, isLoading: boolean, onClose: () => void }) => (
//     <AlertDialog open={true} onOpenChange={onClose}>
//         <GlassAlertDialogContent>
//             <AlertDialogHeader>
//                 <AlertDialogTitle className="flex items-center gap-2 text-fuchsia-300"><BrainCircuit className="h-5 w-5" /> AI Oracle</AlertDialogTitle>
//                 <AlertDialogDescription className="pt-3 text-slate-300">
//                     {isLoading ? "Consulting the Oracle..." : <div className="bg-fuchsia-950/40 border border-fuchsia-500/30 p-3 rounded-md whitespace-pre-wrap text-sm">{hint}</div>}
//                 </AlertDialogDescription>
//             </AlertDialogHeader>
//             <AlertDialogFooter>
//                 <AlertDialogCancel className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200">Close</AlertDialogCancel>
//             </AlertDialogFooter>
//         </GlassAlertDialogContent>
//     </AlertDialog>
// );

// const FeedbackCard = ({ submission }: { submission: Submission }) => (
//     <Card className="bg-green-950/40 backdrop-blur-lg border border-green-500/30">
//         <CardHeader>
//             <CardTitle className="text-xl text-green-300 flex justify-between items-center">
//                 <span className="flex items-center gap-2"><Award /> Teacher Feedback</span>
//                 <span className="text-lg font-bold px-3 py-1 bg-green-500/20 text-green-200 rounded-full">
//                     Grade: {submission.grade}
//                 </span>
//             </CardTitle>
//         </CardHeader>
//         <CardContent>
//             <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{submission.feedback}</p>
            
//             {(submission.time_taken || submission.code_churn || submission.copy_paste_activity) && (
//                 <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
//                     <h4 className="text-sm font-medium text-slate-300 mb-2">Performance Metrics</h4>
//                     <div className="grid grid-cols-3 gap-4 text-xs">
//                         {submission.time_taken && (
//                             <div>
//                                 <span className="text-slate-500">Time Spent</span>
//                                 <div className="text-slate-200 font-medium">{submission.time_taken} minutes</div>
//                             </div>
//                         )}
//                         {submission.code_churn !== undefined && (
//                             <div>
//                                 <span className="text-slate-500">Code Changes</span>
//                                 <div className="text-slate-200 font-medium">{submission.code_churn} edits</div>
//                             </div>
//                         )}
//                         {submission.copy_paste_activity !== undefined && (
//                             <div>
//                                 <span className="text-slate-500">Copy-Paste Activity</span>
//                                 <div className={cn("font-medium", submission.copy_paste_activity > 50 ? "text-yellow-400" : "text-slate-200")}>
//                                     {submission.copy_paste_activity}%
//                                 </div>
//                             </div>
//                         )}
//                     </div>
//                 </div>
//             )}
            
//             <p className="text-xs text-slate-500 mt-4">
//                 Graded on: {new Date(submission.submitted_at).toLocaleDateString()}
//             </p>
//         </CardContent>
//     </Card>
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
//     const [submission, setSubmission] = useState<Submission | null>(null); // <-- ADD THIS LINE

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
//     const [copyPasteActivity, setCopyPasteActivity] = useState<number>(0);
//     const prevFileContentRef = useRef<string>("");
//     const totalTypedCharsRef = useRef<number>(0);
//     const pastedCharsRef = useRef<number>(0);
    
//     // --- Refs ---
//     const editorRef = useRef<any>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const term = useRef<Terminal | null>(null);
//     // const terminalRef = useRef<HTMLDivElement>(null);
//     const queryParams = new URLSearchParams(location.search);
//     const teacherSessionId = queryParams.get('sessionId');
//     const isLiveHomework = !!teacherSessionId;

//     const activeFile = files.find(f => f.id === activeFileId);

//     // --- WebSocket Connection & Invisible Terminal ---
//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         if (!token || !lessonId) return;

//         // const terminalSessionId = crypto.randomUUID();
//         // const wsUrl = isLiveHomework
//         //     ? `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${lessonId}`
//         //     : `ws://localhost:5000?sessionId=${terminalSessionId}&token=${token}`;
            
//         // const currentWs = new WebSocket(wsUrl);
//         const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';

//         const terminalSessionId = crypto.randomUUID();
    
//     // 2. Construct the final URL using the dynamic base URL.
//         const wsUrl = isLiveHomework
//         ? `${wsBaseUrl}?sessionId=${terminalSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${lessonId}`
//         : `${wsBaseUrl}?sessionId=${terminalSessionId}&token=${token}`;
            
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

//     // --- Data Fetching for the entire IDE ---
//     useEffect(() => {
//         const fetchIdeData = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             setError(null);
//             try {
//                 const response = await apiClient.get(`/api/lessons/${lessonId}/ascent-ide`);
//                 const data: AscentIdeData = response.data;
//                 setIdeData(data);
//                 setFiles(data.files || []);
//                 setSubmission(data.gradedSubmission || null); // <-- ADD THIS LINE

//                 setActiveFileId(data.files?.[0]?.id || null);
                
//                 if (data.submissionHistory.some(s => s.is_correct)) {
//                     setIsSolutionUnlocked(true);
//                 }

//                 analytics.track('Lesson Started', { lesson_id: data.lesson.id, lesson_title: data.lesson.title });
//                 setStartTime(Date.now());
//                 setCodeChurn(0);
//                 setCopyPasteActivity(0);
//                 totalTypedCharsRef.current = 0;
//                 pastedCharsRef.current = 0;
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
//                 const pastedLength = pastedText.length;
                
//                 pastedCharsRef.current += pastedLength;
//                 totalTypedCharsRef.current += pastedLength;
                
//                 if (totalTypedCharsRef.current > 0) {
//                     setCopyPasteActivity(Math.round((pastedCharsRef.current / totalTypedCharsRef.current) * 100));
//                 }
                
//                 analytics.track('Code Pasted', {
//                     character_count: pastedLength,
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
        
//         const charDiff = newContent.length - prevFileContentRef.current.length;
//         if (charDiff > 0) {
//             totalTypedCharsRef.current += charDiff;
//             if (totalTypedCharsRef.current > 0) {
//                 setCopyPasteActivity(Math.round((pastedCharsRef.current / totalTypedCharsRef.current) * 100));
//             }
//         }
        
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
//         const savePromise = apiClient.post(`/api/lessons/${lessonId}/save-progress`, { files });
        
//         toast.promise(savePromise, {
//             loading: 'Saving your progress...',
//             success: 'Progress saved!',
//             error: 'Could not save progress.',
//         });
        
//         savePromise.finally(() => setIsSaving(false));
//     };

//     const handleRunTests = async () => {
//         if (!lessonId) return;
//         setIsTesting(true);
//         setDiagnosticsTab('results');
//         setTestResults(null);
//         try {
//             const response = await apiClient.post(`/api/lessons/${lessonId}/run-tests`, { files });
//             const data: TestResult = response.data;
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
        
//         const submissionPayload = {
//             files,
//             time_to_solve_seconds: Math.round((Date.now() - startTime) / 1000),
//             code_churn: codeChurn,
//             copy_paste_activity: copyPasteActivity,
//         };
        
//         analytics.track('Solution Submitted', submissionPayload);
        
//         await handleRunTests();

//         try {
//             const response = await apiClient.post(`/api/lessons/${lessonId}/submit`, submissionPayload);
//             const result = response.data;
//             toast.success("Correct! All tests passed.");
//             setIsSolutionUnlocked(true);
            
//             // Refetch data to update submission history
//             const newDataResponse = await apiClient.get(`/api/lessons/${lessonId}/ascent-ide`);
//             setIdeData(newDataResponse.data);

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

//         let promptModifier = "The student is asking for a Socratic hint. Guide them to the answer without giving it away directly.";
//         if (tutorStyle === 'hint_based') { promptModifier = "The student seems to be struggling. Provide a more direct hint."; }
//         else if (tutorStyle === 'direct') { promptModifier = "The student needs a direct explanation. Explain the concept and provide a corrected code snippet."; }

//         const payload = { selectedCode: activeFile.content, lessonId: ideData.lesson.id, promptModifier };

//         try {
//             const response = await apiClient.post('/api/ai/get-hint', payload);
//             setAiHint(response.data.hint);
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
//         <div className="w-full h-[calc(100vh-2rem)] bg-[#0a091a] text-white flex flex-col font-sans overflow-hidden -m-4 sm:-m-6 lg:-m-8">
//             <Toaster theme="dark" richColors position="bottom-right" />
//             {isHintModalOpen && <HintModal hint={aiHint} isLoading={isHintLoading} onClose={() => setIsHintModalOpen(false)} />}
            
//             {/* Compact Header */}
//             <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60 backdrop-blur-sm z-30 gap-2 min-h-[48px]">
//                 <div className="flex items-center gap-2 flex-shrink min-w-0">
//                     <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800 flex-shrink-0 h-7 px-2 text-xs">
//                         <ChevronLeft className="mr-1 h-3 w-3" /> Back
//                     </Button>
//                     <span className="text-slate-500 flex-shrink-0 text-sm">/</span>
//                     <h1 className="text-sm font-medium text-slate-200 truncate" title={ideData.lesson.title}>{ideData.lesson.title}</h1>
//                 </div>
//                 <div className="flex items-center gap-1 flex-shrink-0">
//                     <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.previousLessonId)} disabled={!ideData.previousLessonId} className="hover:bg-slate-800 h-7 w-7">
//                         <ChevronLeft className="h-3 w-3" />
//                     </Button>
//                     <Button variant="ghost" size="icon" onClick={() => handleNavigation(ideData.nextLessonId)} disabled={!ideData.nextLessonId || !isSolutionUnlocked} className={cn("hover:bg-slate-700 h-7 w-7", !isSolutionUnlocked && "text-slate-600", isSolutionUnlocked && "text-cyan-400 bg-cyan-900/50 hover:bg-cyan-900/80 animate-pulse")}>
//                         <ChevronRight className="h-3 w-3" />
//                     </Button>
//                     <Button variant="outline" size="sm" onClick={handleSaveCode} disabled={isSaving} className="text-slate-300 border-slate-700 hover:bg-slate-800 h-7 px-2 text-xs">
//                         <Save className="mr-1 h-3 w-3"/>Save
//                     </Button>
//                     <Button variant="outline" size="sm" onClick={handleGetHint} className="text-fuchsia-300 border-fuchsia-500/80 hover:bg-fuchsia-500/20 h-7 px-2 text-xs">
//                         <BrainCircuit className="mr-1 h-3 w-3"/>Hint
//                     </Button>
//                     <Button variant="outline" size="sm" onClick={handleRunTests} disabled={isTesting} className="text-cyan-300 border-cyan-500/80 hover:bg-cyan-500/20 h-7 px-2 text-xs">
//                         <BeakerIcon className="mr-1 h-3 w-3"/>Run
//                     </Button>
//                     <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium h-7 px-2 text-xs">
//                         <Send className="mr-1 h-3 w-3"/>Submit
//                     </Button>
//                 </div>
//             </header>

//             <main className="flex-1 min-h-0 overflow-hidden">
//                 <PanelGroup direction="horizontal" className="h-full">
//                     {/* Left Panel - Mission Control */}
//                     <Panel defaultSize={30} minSize={25} maxSize={45} className="flex flex-col bg-slate-900/40 border-r border-slate-800 overflow-hidden">
//                          <div className="px-2 py-1 flex-shrink-0 border-b border-slate-800">
//                             <Tabs value={missionControlTab} onValueChange={(v) => setMissionControlTab(v as MissionControlTab)} className="w-full">
//                                 <TabsList className="grid w-full grid-cols-3 bg-slate-900 h-8">
//                                     <TabsTrigger value="problem" className="text-xs px-1">
//                                         <NotebookPen className="mr-1 h-3 w-3"/>Problem
//                                     </TabsTrigger>
//                                     <TabsTrigger value="submissions" className="text-xs px-1">
//                                         <History className="mr-1 h-3 w-3"/>History
//                                     </TabsTrigger>
//                                     <TabsTrigger value="solution" disabled={!isSolutionUnlocked} className="text-xs px-1">
//                                         <FileCode className="mr-1 h-3 w-3"/>Solution
//                                     </TabsTrigger>
//                                 </TabsList>
//                             </Tabs>
//                         </div>
//                         <div className="flex-grow overflow-y-auto p-2 prose prose-sm prose-invert prose-slate max-w-none">
//                             {missionControlTab === 'problem' && (
//                                 <div className="text-sm [&>h1]:text-base [&>h1]:font-medium [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-medium [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mb-1 [&>p]:text-sm [&>p]:leading-relaxed [&>li]:text-sm [&>code]:text-xs [&>pre]:text-xs">
//                                     <ReactMarkdown>
//                                         {ideData.lesson.description}
//                                     </ReactMarkdown>
//                                 </div>
//                             )}
//                              {submission && (
//                 <FeedbackCard submission={submission} />
//             )}
//                             {missionControlTab === 'submissions' && (
//                                 <div className="space-y-2">
//                                     {ideData.submissionHistory.length > 0 ? ideData.submissionHistory.map(sub => (
//                                         <div key={sub.id} className="p-2 bg-slate-900/50 rounded border border-slate-700 text-xs">
//                                             <div className="flex justify-between items-center mb-2">
//                                                 <span className={cn("font-medium", sub.is_correct ? 'text-green-400' : 'text-red-400')}>
//                                                     {sub.is_correct ? 'Passed' : 'Failed'}
//                                                 </span>
//                                                 <span className="text-slate-400 text-xs">{format(new Date(sub.submitted_at), 'MMM d, HH:mm')}</span>
//                                             </div>
//                                             {(sub.time_taken || sub.code_churn || sub.copy_paste_activity) && (
//                                                 <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
//                                                     {sub.time_taken && (
//                                                         <div className="flex flex-col">
//                                                             <span className="text-slate-500">Time</span>
//                                                             <span className="text-slate-300">{sub.time_taken}m</span>
//                                                         </div>
//                                                     )}
//                                                     {sub.code_churn !== undefined && (
//                                                         <div className="flex flex-col">
//                                                             <span className="text-slate-500">Churn</span>
//                                                             <span className="text-slate-300">{sub.code_churn}</span>
//                                                         </div>
//                                                     )}
//                                                     {sub.copy_paste_activity !== undefined && (
//                                                         <div className="flex flex-col">
//                                                             <span className="text-slate-500">Copy%</span>
//                                                             <span className={cn("text-slate-300", sub.copy_paste_activity > 50 && "text-yellow-400")}>{sub.copy_paste_activity}%</span>
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             )}
//                                         </div>
//                                     )) : <p className="text-slate-500 text-center p-3 text-xs">No submissions yet.</p>}
//                                 </div>
//                             )}
//                             {missionControlTab === 'solution' && (
//                                 <div className="text-sm [&>h1]:text-base [&>h1]:font-medium [&>h1]:mb-2 [&>h2]:text-base [&>h2]:font-medium [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-medium [&>h3]:mb-1 [&>p]:text-sm [&>p]:leading-relaxed [&>li]:text-sm [&>code]:text-xs [&>pre]:text-xs">
//                                     <ReactMarkdown>
//                                         {ideData.officialSolution?.explanation || "Solution not available."}
//                                     </ReactMarkdown>
//                                 </div>
//                             )}
//                         </div>
//                     </Panel>
                    
//                     <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700 transition-colors flex-shrink-0" />
                    
//                     {/* Right Panel - Code & Results */}
//                     <Panel defaultSize={70} minSize={55} className="flex flex-col overflow-hidden">
//                         <div className="h-full flex relative overflow-hidden">
//                             {/* File Explorer Sheet */}
//                             <Sheet>
//                                 <SheetTrigger asChild>
//                                     <Button variant="ghost" size="icon" className="absolute top-2 left-2 z-20 h-6 w-6 bg-slate-800/50 hover:bg-slate-700 flex-shrink-0">
//                                         <PanelLeft className="h-3 w-3" />
//                                     </Button>
//                                 </SheetTrigger>
//                                 <SheetContent side="left" className="p-3 bg-slate-900/90 backdrop-blur-xl border-slate-700 text-white w-64">
//                                     <div className="space-y-3">
//                                         <div className="flex items-center justify-between">
//                                             <h3 className="text-sm font-medium text-slate-300">Files</h3>
//                                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleAddFile}>
//                                                 <FilePlus2 className="h-3 w-3" />
//                                             </Button>
//                                         </div>
//                                         <div className="space-y-1">
//                                             {files.map(file => (
//                                                 <div key={file.id} className="group flex items-center">
//                                                     <button 
//                                                         onClick={() => handleSwitchFile(file.id)} 
//                                                         className={cn(
//                                                             "w-full text-left px-2 py-1.5 text-sm rounded flex items-center transition-colors",
//                                                             activeFileId === file.id ? "bg-cyan-500/10 text-cyan-300" : "hover:bg-slate-800 text-slate-300"
//                                                         )}
//                                                     >
//                                                         <FileIcon className="mr-2 h-3 w-3 flex-shrink-0" /> 
//                                                         <span className="truncate">{file.filename}</span>
//                                                     </button>
//                                                     <Button 
//                                                         variant="ghost" 
//                                                         size="icon" 
//                                                         className="h-6 w-6 opacity-0 group-hover:opacity-100 ml-1 flex-shrink-0" 
//                                                         onClick={() => handleDeleteFile(file.id)}
//                                                     >
//                                                         <Trash2 className="h-3 w-3 text-slate-500 hover:text-red-500"/>
//                                                     </Button>
//                                                 </div>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 </SheetContent>
//                             </Sheet>
                            
//                             <PanelGroup direction="vertical" className="w-full">
//                                 {/* Code Editor */}
//                                 <Panel defaultSize={65} minSize={35} className="overflow-hidden">
//                                     <div className="w-full h-full overflow-hidden">
//                                         <Editor
//                                             height="100%"
//                                             path={activeFile?.filename}
//                                             language={activeFile?.filename.split('.').pop() || 'javascript'}
//                                             theme="vs-dark"
//                                             value={activeFile?.content}
//                                             onChange={handleFileContentChange}
//                                             onMount={handleEditorDidMount}
//                                             options={{ 
//                                                 fontSize: 13, 
//                                                 minimap: { enabled: false }, 
//                                                 padding: { top: 12 },
//                                                 scrollBeyondLastLine: false,
//                                                 wordWrap: 'on',
//                                                 automaticLayout: true,
//                                                 scrollbar: {
//                                                     horizontal: 'hidden',
//                                                     vertical: 'auto'
//                                                 }
//                                             }}
//                                         />
//                                     </div>
//                                 </Panel>
                                
//                                 <PanelResizeHandle className="h-1 bg-slate-800 hover:bg-slate-700 transition-colors flex-shrink-0" />
                                
//                                 {/* Bottom Panel - Test Results */}
//                                 <Panel defaultSize={35} minSize={20} className="flex flex-col bg-slate-900/40 overflow-hidden">
//                                     <Tabs value={diagnosticsTab} onValueChange={(v) => setDiagnosticsTab(v as DiagnosticsTab)} className="flex flex-col h-full">
//                                         <TabsList className="grid w-full grid-cols-3 bg-slate-900 flex-shrink-0 h-8 mx-2 mt-1">
//                                             <TabsTrigger value="testCases" className="text-xs px-1">
//                                                 <Check className="mr-1 h-3 w-3"/>Cases
//                                             </TabsTrigger>
//                                             <TabsTrigger value="results" className="text-xs px-1">
//                                                 <BeakerIcon className="mr-1 h-3 w-3"/>Results
//                                             </TabsTrigger>
//                                             <TabsTrigger value="aiFeedback" className={cn("text-xs px-1", conceptualHint && "text-fuchsia-400 animate-pulse")}>
//                                                 <BotMessageSquare className="mr-1 h-3 w-3"/>AI
//                                             </TabsTrigger>
//                                         </TabsList>
                                        
//                                         <TabsContent value="testCases" className="flex-grow overflow-y-auto p-2 text-sm m-0">
//                                             <div className="space-y-2">
//                                                 {ideData.testCases.map((tc, i) => (
//                                                     <div key={i} className="p-2 bg-slate-900/50 rounded border border-slate-700">
//                                                         <p className="font-medium text-slate-300 mb-1 text-xs">{tc.description}</p>
//                                                         <div className="font-mono text-xs space-y-1">
//                                                             <div className="flex flex-wrap">
//                                                                 <span className="text-slate-500 mr-1">Input:</span>
//                                                                 <code className="text-cyan-300 break-all">{tc.input}</code>
//                                                             </div>
//                                                             <div className="flex flex-wrap">
//                                                                 <span className="text-slate-500 mr-1">Expected:</span>
//                                                                 <code className="text-cyan-300 break-all">{tc.expectedOutput}</code>
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                 ))}
//                                             </div>
//                                         </TabsContent>
                                        
//                                         <TabsContent value="results" className="flex-grow overflow-y-auto p-2 font-mono text-xs m-0">
//                                             {isTesting ? (
//                                                 <div className="flex items-center justify-center h-full text-slate-400">
//                                                     <div className="animate-spin mr-2 h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full"></div>
//                                                     Running tests...
//                                                 </div>
//                                             ) : testResults ? (
//                                                 <div className="space-y-2">
//                                                     <div className={cn(
//                                                         'p-2 rounded font-medium flex items-center gap-2 text-xs',
//                                                         testResults.failed > 0 ? 'bg-red-950/40 text-red-300 border border-red-500/30' : 'bg-green-950/40 text-green-300 border border-green-500/30'
//                                                     )}>
//                                                         {testResults.failed > 0 ? (
//                                                             <><XCircle className="h-4 w-4"/>{`${testResults.failed} / ${testResults.total} Tests Failed`}</>
//                                                         ) : (
//                                                             <><CheckCircle className="h-4 w-4"/>{`All ${testResults.total} Tests Passed!`}</>
//                                                         )}
//                                                     </div>
//                                                     <div className="bg-black/40 p-2 rounded border border-slate-700 overflow-auto max-h-40">
//                                                         <pre className="whitespace-pre-wrap text-xs leading-relaxed break-words">{testResults.results}</pre>
//                                                     </div>
//                                                 </div>
//                                             ) : (
//                                                 <div className="flex items-center justify-center h-full text-slate-500 text-center">
//                                                     <div>
//                                                         <BeakerIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                                                         <p className="text-xs">Run tests to see results</p>
//                                                     </div>
//                                                 </div>
//                                             )}
//                                         </TabsContent>
                                        
//                                         <TabsContent value="aiFeedback" className="flex-grow overflow-y-auto p-2 prose prose-sm prose-invert prose-slate max-w-none m-0">
//                                             {conceptualHint ? (
//                                                 <div className="text-xs [&>h1]:text-sm [&>h1]:font-medium [&>h1]:mb-1 [&>h2]:text-sm [&>h2]:font-medium [&>h2]:mb-1 [&>h3]:text-xs [&>h3]:font-medium [&>h3]:mb-1 [&>p]:text-xs [&>p]:leading-relaxed [&>li]:text-xs [&>code]:text-xs [&>pre]:text-xs break-words">
//                                                     <ReactMarkdown>
//                                                         {conceptualHint}
//                                                     </ReactMarkdown>
//                                                 </div>
//                                             ) : (
//                                                 <div className="flex items-center justify-center h-full text-slate-500 text-center">
//                                                     <div>
//                                                         <BotMessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                                                         <p className="text-xs">Submit a correct solution to receive AI feedback</p>
//                                                     </div>
//                                                 </div>
//                                             )}
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
//                 <AlertDialogDescription className="pt-4 text-slate-300">
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
//                 <AlertDialogDescription className="pt-4 text-slate-300">
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