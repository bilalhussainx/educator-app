/*
 * =================================================================
 * FOLDER: src/components/classroom/
 * FILE:   LeetCodeHomeworkView.tsx
 * =================================================================
 * DESCRIPTION: Component for rendering LeetCode homework inline within
 * a live session. Maintains WebSocket connection to teacher and sends
 * real-time code updates via HOMEWORK_CODE_UPDATE messages.
 */
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RefreshCw, ArrowLeft, CheckCircle, XCircle, Clock, Target } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';
import { getWebSocketUrl } from '../../config/websocket';

interface Problem {
    id: string;
    number: string;
    title: string;
    description: string;
    difficulty: 'easy' | 'medium' | 'hard';
    pattern: string;
    examples: Array<{
        input: string;
        output: string;
        explanation?: string;
    }>;
    constraints: string[];
    hints: string[];
    starterCode: {
        javascript: string;
        python: string;
        java: string;
    };
    solutions: {
        javascript: string;
        python: string;
        java: string;
    };
    testCases: Array<{
        input: string;
        expected: string;
        hidden?: boolean;
    }>;
}

interface LeetCodeHomeworkViewProps {
    courseId: string;
    lessonId: string;
    problemId: string;
    teacherSessionId: string;
    token: string | null;
    onLeave: () => void;
    currentUserId: string | null;
}

const languageConfigs = {
    javascript: {
        name: 'JavaScript',
        icon: '🟨',
        monacoLang: 'javascript',
        extension: '.js',
        runCommand: 'node'
    },
    python: {
        name: 'Python',
        icon: '🐍',
        monacoLang: 'python',
        extension: '.py',
        runCommand: 'python3'
    },
    java: {
        name: 'Java',
        icon: '☕',
        monacoLang: 'java',
        extension: '.java',
        runCommand: 'javac'
    }
};

export const LeetCodeHomeworkView: React.FC<LeetCodeHomeworkViewProps> = ({
    courseId,
    lessonId,
    problemId,
    teacherSessionId,
    token,
    onLeave,
    currentUserId
}) => {
    const [problem, setProblem] = useState<Problem | null>(null);
    const [currentLanguage, setCurrentLanguage] = useState<keyof typeof languageConfigs>('javascript');
    const [code, setCode] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [testResults, setTestResults] = useState<Array<{
        passed: boolean;
        input: string;
        expected: string;
        actual: string;
        error?: string;
    }> | null>(null);
    const [activeTab, setActiveTab] = useState<'description' | 'hints' | 'solution'>('description');
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [memoryUsage, setMemoryUsage] = useState<string | null>(null);
    const [showSolution, setShowSolution] = useState(false);
    const [currentHint, setCurrentHint] = useState(0);

    // WebSocket connection for homework session
    const wsRef = useRef<WebSocket | null>(null);

    // Load problem data on mount
    useEffect(() => {
        loadProblem();
    }, [courseId, lessonId]);

    // Initialize WebSocket connection to homework session
    useEffect(() => {
        console.log('[LeetCodeHomeworkView] Initializing homework WebSocket connection');
        connectToHomeworkSession();

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                console.log('[LeetCodeHomeworkView] Disconnecting from homework session');
                wsRef.current.send(JSON.stringify({
                    type: 'LEETCODE_HOMEWORK_LEAVE',
                    payload: {
                        sessionId: teacherSessionId,
                        problemId: problemId || lessonId
                    }
                }));
                wsRef.current.close();
            }
        };
    }, [teacherSessionId, token]);

    // Send initial workspace update when both WebSocket and problem are ready
    useEffect(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && problem && code) {
            // Wait a bit to ensure JOIN message was processed by backend
            const timer = setTimeout(() => {
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    console.log('[LeetCodeHomeworkView] Sending initial workspace update to teacher');
                    wsRef.current.send(JSON.stringify({
                        type: 'LEETCODE_HOMEWORK_UPDATE',
                        payload: {
                            code,
                            language: currentLanguage,
                            problemId: problem.id,
                            problemTitle: problem.title,
                            problemDescription: problem.description,
                            problemExamples: problem.examples,
                            problemConstraints: problem.constraints,
                            testResults: null,
                            difficulty: problem.difficulty,
                            pattern: problem.pattern
                        }
                    }));
                }
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [problem]); // Only run when problem loads

    // Broadcast code changes to teacher
    useEffect(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN && problem) {
            const updatePayload = {
                type: 'LEETCODE_HOMEWORK_UPDATE',
                payload: {
                    code,
                    language: currentLanguage,
                    problemId: problem.id,
                    problemTitle: problem.title,
                    problemDescription: problem.description,
                    problemExamples: problem.examples,
                    problemConstraints: problem.constraints,
                    testResults,
                    difficulty: problem.difficulty,
                    pattern: problem.pattern
                }
            };

            console.log('[LeetCodeHomeworkView] Broadcasting code update to teacher');
            console.log('[LeetCodeHomeworkView] Update payload:', {
                hasProblemDescription: !!updatePayload.payload.problemDescription,
                descriptionLength: updatePayload.payload.problemDescription?.length,
                hasExamples: !!updatePayload.payload.problemExamples,
                examplesCount: updatePayload.payload.problemExamples?.length,
                hasConstraints: !!updatePayload.payload.problemConstraints,
                constraintsCount: updatePayload.payload.problemConstraints?.length,
                difficulty: updatePayload.payload.difficulty,
                pattern: updatePayload.payload.pattern
            });
            wsRef.current.send(JSON.stringify(updatePayload));
        }
    }, [code, currentLanguage, testResults, problem]);

    // Update code when language changes
    useEffect(() => {
        if (problem && problem.starterCode[currentLanguage]) {
            setCode(problem.starterCode[currentLanguage]);
        }
    }, [currentLanguage, problem]);

    const loadProblem = async () => {
        try {
            console.log('[LeetCodeHomeworkView] Loading problem:', { courseId, lessonId, problemId });

            // Parse lessonId to extract moduleIndex and lessonIndex
            // Format: courseId-moduleIndex-lessonIndex
            const parts = lessonId.split('-');
            console.log('[LeetCodeHomeworkView] Parsed lessonId parts:', parts);

            const moduleIndex = parts[parts.length - 2];
            const lessonIndex = parts[parts.length - 1];

            console.log('[LeetCodeHomeworkView] Module index:', moduleIndex, 'Lesson index:', lessonIndex);

            // Fetch data for all supported languages
            const languages = ['javascript', 'python', 'java'];
            const languageData: any = {};

            for (const lang of languages) {
                try {
                    const apiUrl = `/api/enhanced-courses/${courseId}/lessons?moduleIndex=${moduleIndex}&lessonIndex=${lessonIndex}&language=${lang}`;
                    const response = await apiClient.get(apiUrl);
                    languageData[lang] = response.data;
                } catch (err) {
                    console.warn(`[LeetCodeHomeworkView] Failed to load ${lang} data:`, err);
                }
            }

            // Use the first successfully loaded language data as base
            const baseData = languageData[currentLanguage] || languageData['javascript'] || Object.values(languageData)[0];

            if (!baseData || !baseData.lesson) {
                throw new Error('Invalid problem data received from API');
            }

            console.log('[LeetCodeHomeworkView] Base data:', baseData);

            // Transform AscentIDE format to LeetCode Problem format
            const transformedProblem: Problem = {
                id: baseData.lesson.id,
                number: baseData.lesson.metadata?.lessonIndex?.toString() || '1',
                title: baseData.lesson.title,
                description: baseData.lesson.description || baseData.lesson.instructions || '',
                difficulty: (baseData.lesson.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
                pattern: baseData.lesson.metadata?.patterns?.[0] || 'General',
                examples: baseData.testCases?.map((tc: any, idx: number) => ({
                    input: tc.input || tc.description || '',
                    output: tc.expectedOutput || tc.expected || '',
                    explanation: tc.explanation || ''
                })) || [],
                constraints: baseData.lesson.metadata?.constraints || [],
                hints: baseData.hints || [],
                starterCode: {
                    javascript: languageData['javascript']?.starterCode || '// Start coding here...',
                    python: languageData['python']?.starterCode || '# Start coding here...',
                    java: languageData['java']?.starterCode || '// Start coding here...'
                },
                solutions: {
                    javascript: languageData['javascript']?.solution || '',
                    python: languageData['python']?.solution || '',
                    java: languageData['java']?.solution || ''
                },
                testCases: baseData.testCases?.map((tc: any) => ({
                    input: tc.input || tc.description || '',
                    expected: tc.expectedOutput || tc.expected || '',
                    hidden: tc.hidden || false
                })) || []
            };

            console.log('[LeetCodeHomeworkView] Transformed problem:', transformedProblem);
            console.log('[LeetCodeHomeworkView] Problem details check:', {
                hasDescription: !!transformedProblem.description,
                descriptionLength: transformedProblem.description?.length,
                descriptionPreview: transformedProblem.description?.substring(0, 100),
                hasExamples: !!transformedProblem.examples,
                examplesCount: transformedProblem.examples?.length,
                firstExample: transformedProblem.examples?.[0],
                hasConstraints: !!transformedProblem.constraints,
                constraintsCount: transformedProblem.constraints?.length,
                firstConstraint: transformedProblem.constraints?.[0],
                difficulty: transformedProblem.difficulty,
                pattern: transformedProblem.pattern
            });

            setProblem(transformedProblem);
            setCode(transformedProblem.starterCode[currentLanguage] || '// Start coding here...');
        } catch (error: any) {
            console.error('[LeetCodeHomeworkView] Failed to load problem:', error);
            console.error('[LeetCodeHomeworkView] Error details:', error.response?.data || error.message);
            toast.error('Failed to load homework problem');
        }
    };

    const connectToHomeworkSession = () => {
        if (!token) {
            console.error('[LeetCodeHomeworkView] No auth token found');
            toast.error('Authentication required');
            return;
        }

        const wsUrl = getWebSocketUrl();
        console.log('[LeetCodeHomeworkView] Raw wsUrl from getWebSocketUrl():', wsUrl);
        console.log('[LeetCodeHomeworkView] wsUrl has trailing slash?:', wsUrl.endsWith('/'));

        // Use teacherSessionId as the sessionId - this is the existing live session
        // URL encode all parameters to handle special characters in JWT token
        const wsUrlWithParams = `${wsUrl}?sessionId=${encodeURIComponent(teacherSessionId)}&token=${encodeURIComponent(token)}&teacherSessionId=${encodeURIComponent(teacherSessionId)}&lessonId=${encodeURIComponent(lessonId)}`;

        console.log('[LeetCodeHomeworkView] Connecting to homework WebSocket');
        console.log('[LeetCodeHomeworkView] - Full wsUrlWithParams:', wsUrlWithParams);
        console.log('[LeetCodeHomeworkView] - teacherSessionId:', teacherSessionId);
        console.log('[LeetCodeHomeworkView] - lessonId:', lessonId);
        const ws = new WebSocket(wsUrlWithParams);

        ws.onopen = () => {
            console.log('[LeetCodeHomeworkView] Connected to homework session');
            console.log('[LeetCodeHomeworkView] Sending LEETCODE_HOMEWORK_JOIN');

            // Join LeetCode homework session
            ws.send(JSON.stringify({
                type: 'LEETCODE_HOMEWORK_JOIN',
                payload: {
                    sessionId: teacherSessionId,
                    problemId: problemId || lessonId
                }
            }));

            toast.success('Connected to live session');
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[LeetCodeHomeworkView] Received message:', message.type);

                switch (message.type) {
                    case 'TEACHER_TAKE_CONTROL':
                        toast.info(message.payload.isControlling ?
                            'Teacher is viewing your workspace' :
                            'Teacher stopped viewing'
                        );
                        break;

                    case 'TEACHER_CODE_UPDATE':
                        // Teacher sent code changes (e.g., helping student)
                        if (message.payload.code) {
                            setCode(message.payload.code);
                        }
                        if (message.payload.language) {
                            setCurrentLanguage(message.payload.language);
                        }
                        toast.info('Teacher updated your code');
                        break;
                }
            } catch (error) {
                console.error('[LeetCodeHomeworkView] Failed to parse WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('[LeetCodeHomeworkView] WebSocket error:', error);
            toast.error('Connection error with live session');
        };

        ws.onclose = () => {
            console.log('[LeetCodeHomeworkView] Disconnected from homework session');
        };

        wsRef.current = ws;
    };

    const runCode = async () => {
        if (!problem) return;

        setIsRunning(true);
        const startTime = Date.now();

        try {
            // Parse lessonId to get moduleIndex and lessonIndex
            const parts = lessonId.split('-');
            const moduleIndex = parts[parts.length - 2];
            const lessonIndex = parts[parts.length - 1];

            // Format files as expected by backend
            const files = [{
                id: '1',
                filename: `main.${currentLanguage === 'javascript' ? 'js' : currentLanguage === 'python' ? 'py' : 'java'}`,
                content: code,
                type: 'main'
            }];

            const response = await apiClient.post(`/api/enhanced-courses/${courseId}/run-tests`, {
                files,
                moduleIndex: parseInt(moduleIndex),
                lessonIndex: parseInt(lessonIndex),
                language: currentLanguage
            });

            const result = response.data;
            const endTime = Date.now();

            setExecutionTime(endTime - startTime);
            setMemoryUsage(result.memoryUsage || '14.2 MB');

            // Transform backend test results to our format
            const transformedResults = result.testCaseResults?.map((tc: any) => ({
                passed: tc.passed || tc.status === 'passed',
                input: tc.input || tc.description || '',
                expected: tc.expected || tc.expectedOutput || '',
                actual: tc.actual || tc.actualOutput || '',
                error: tc.error || tc.errorMessage || ''
            })) || [];

            setTestResults(transformedResults);

            if (result.success && result.passed === result.total) {
                toast.success(`All ${result.total} test cases passed!`);
            } else {
                toast.error(`${result.failed || 0} test cases failed`);
            }
        } catch (error: any) {
            console.error('[LeetCodeHomeworkView] Failed to run code:', error);
            toast.error(error.response?.data?.error || 'Failed to run tests');
        } finally {
            setIsRunning(false);
        }
    };

    const submitCode = async () => {
        if (!problem) return;

        setIsRunning(true);
        try {
            // Parse lessonId to get moduleIndex and lessonIndex
            const parts = lessonId.split('-');
            const moduleIndex = parts[parts.length - 2];
            const lessonIndex = parts[parts.length - 1];

            // Format files as expected by backend
            const files = [{
                id: '1',
                filename: `main.${currentLanguage === 'javascript' ? 'js' : currentLanguage === 'python' ? 'py' : 'java'}`,
                content: code,
                type: 'main'
            }];

            const response = await apiClient.post(`/api/enhanced-courses/${courseId}/submit`, {
                files,
                moduleIndex: parseInt(moduleIndex),
                lessonIndex: parseInt(lessonIndex),
                language: currentLanguage
            });

            const result = response.data;
            if (result.success) {
                toast.success(result.message || 'Submission accepted!');
            } else {
                toast.error(result.error || 'Submission failed - some tests did not pass');
            }
        } catch (error: any) {
            console.error('[LeetCodeHomeworkView] Failed to submit code:', error);
            toast.error(error.response?.data?.error || 'Failed to submit solution');
        } finally {
            setIsRunning(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-500 bg-green-900/30';
            case 'medium': return 'text-yellow-500 bg-yellow-900/30';
            case 'hard': return 'text-red-500 bg-red-900/30';
            default: return 'text-gray-500 bg-gray-900/30';
        }
    };

    const getPassedCount = () => {
        if (!testResults) return 0;
        return testResults.filter(t => t.passed).length;
    };

    if (!problem) {
        return (
            <div className="h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-white text-xl">Loading homework problem...</div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-950 text-white flex flex-col">
            {/* Header */}
            <header className="px-4 py-3 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={onLeave}
                        variant="ghost"
                        size="sm"
                        className="text-blue-400 hover:text-blue-300"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Return to Classroom
                    </Button>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">
                            {problem?.number || ''}. {problem?.title || 'Loading...'}
                        </span>
                        {problem?.difficulty && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                                {problem.difficulty.toUpperCase()}
                            </span>
                        )}
                        {problem?.pattern && (
                            <span className="px-2 py-1 bg-blue-900/50 text-blue-200 rounded text-xs">
                                {problem.pattern}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                    <div className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-500/30">
                        Live Homework Session
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Problem Description */}
                <div className="w-1/2 border-r border-slate-700 flex flex-col">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-700 bg-slate-900">
                        {['description', 'hints', 'solution'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                                    activeTab === tab
                                        ? 'border-blue-500 text-blue-400 bg-slate-800'
                                        : 'border-transparent text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-900">
                        {activeTab === 'description' && problem && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Problem Description</h3>
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                                        {problem.description || 'Loading description...'}
                                    </div>
                                </div>

                                {problem.examples && problem.examples.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Examples</h3>
                                    {problem.examples.map((example, idx) => (
                                        <div key={idx} className="mb-4 bg-slate-800 p-4 rounded border border-slate-700">
                                            <div className="font-medium text-slate-200 mb-1">Example {idx + 1}:</div>
                                            <div className="font-mono text-sm text-slate-300">
                                                <div><strong>Input:</strong> {example.input}</div>
                                                <div><strong>Output:</strong> {example.output}</div>
                                                {example.explanation && (
                                                    <div className="mt-2 text-slate-400">
                                                        <strong>Explanation:</strong> {example.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                )}

                                {problem.constraints && problem.constraints.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Constraints</h3>
                                    <ul className="space-y-1 text-slate-300">
                                        {problem.constraints.map((constraint, idx) => (
                                            <li key={idx} className="font-mono text-sm">• {constraint}</li>
                                        ))}
                                    </ul>
                                </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'hints' && problem && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Hints</h3>
                                    {problem.hints && problem.hints.length > 0 && (
                                    <div className="text-sm text-slate-400">
                                        {currentHint + 1} / {problem.hints.length}
                                    </div>
                                    )}
                                </div>

                                {problem.hints && problem.hints.slice(0, currentHint + 1).map((hint, idx) => (
                                    <div key={idx} className="bg-slate-800 p-4 rounded border border-slate-700">
                                        <div className="font-medium text-yellow-400 mb-2">Hint {idx + 1}:</div>
                                        <div className="text-slate-300">{hint}</div>
                                    </div>
                                ))}

                                {currentHint < problem.hints.length - 1 && (
                                    <Button
                                        onClick={() => setCurrentHint(currentHint + 1)}
                                        className="mt-4"
                                        variant="outline"
                                    >
                                        Show Next Hint
                                    </Button>
                                )}
                            </div>
                        )}

                        {activeTab === 'solution' && problem && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Solution</h3>
                                {!showSolution ? (
                                    <div className="text-center py-8">
                                        <div className="text-slate-400 mb-4">
                                            Are you sure you want to view the solution?
                                        </div>
                                        <Button
                                            onClick={() => setShowSolution(true)}
                                            variant="outline"
                                            className="border-orange-500 text-orange-400 hover:bg-orange-900/20"
                                        >
                                            Show Solution
                                        </Button>
                                    </div>
                                ) : (
                                    <div>
                                        {problem.solutions && problem.solutions[currentLanguage] && (
                                        <div className="mb-4">
                                            <h4 className="font-medium mb-2">{languageConfigs[currentLanguage].name} Solution:</h4>
                                            <div className="bg-slate-800 p-4 rounded font-mono text-sm overflow-x-auto border border-slate-700">
                                                <pre className="text-slate-200">
                                                    {problem.solutions[currentLanguage]}
                                                </pre>
                                            </div>
                                        </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Code Editor */}
                <div className="w-1/2 flex flex-col">
                    {/* Language Selector and Controls */}
                    <div className="px-4 py-3 border-b border-slate-700 bg-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <select
                                value={currentLanguage}
                                onChange={(e) => setCurrentLanguage(e.target.value as any)}
                                className="bg-slate-800 text-white px-3 py-1 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                            >
                                {Object.entries(languageConfigs).map(([key, config]) => (
                                    <option key={key} value={key}>
                                        {config.icon} {config.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                onClick={runCode}
                                disabled={isRunning}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-green-800"
                                size="sm"
                            >
                                {isRunning ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                Run Tests
                            </Button>

                            <Button
                                onClick={submitCode}
                                disabled={isRunning}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800"
                                size="sm"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Submit
                            </Button>
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 bg-slate-900">
                        <Editor
                            height="100%"
                            language={languageConfigs[currentLanguage].monacoLang}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                fontSize: 14,
                                minimap: { enabled: false },
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                tabSize: 2,
                                insertSpaces: true,
                                wordWrap: 'on',
                                contextmenu: true,
                                selectOnLineNumbers: true,
                                roundedSelection: false,
                                readOnly: false,
                                cursorStyle: 'line'
                            }}
                        />
                    </div>

                    {/* Test Results */}
                    {testResults && (
                        <div className="border-t border-slate-700 bg-slate-900 max-h-64">
                            <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {getPassedCount() === testResults.length ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                        <span className="font-medium">
                                            {getPassedCount()}/{testResults.length} Test Cases Passed
                                        </span>
                                    </div>

                                    {executionTime && (
                                        <div className="flex items-center gap-4 text-sm text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                {executionTime}ms
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Target className="w-4 h-4" />
                                                {memoryUsage}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="max-h-48 overflow-y-auto">
                                {testResults.map((result, idx) => (
                                    <div key={idx} className={`px-4 py-3 border-b border-slate-700 last:border-b-0 ${
                                        result.passed ? 'bg-green-900/10' : 'bg-red-900/10'
                                    }`}>
                                        <div className="flex items-center gap-2 mb-2">
                                            {result.passed ? (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            <span className="font-medium">Test Case {idx + 1}</span>
                                        </div>

                                        <div className="font-mono text-sm space-y-1">
                                            <div><span className="text-slate-400">Input:</span> {result.input}</div>
                                            <div><span className="text-slate-400">Expected:</span> {result.expected}</div>
                                            <div><span className="text-slate-400">Actual:</span> {result.actual}</div>
                                            {result.error && (
                                                <div className="text-red-400"><span className="text-slate-400">Error:</span> {result.error}</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
