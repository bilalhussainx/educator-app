import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Play, RefreshCw, BookOpen, Code, Terminal, CheckCircle, XCircle, Clock, Target, TrendingUp } from 'lucide-react';
import { getWebSocketUrl } from '../config/websocket';
import { toast } from 'sonner';

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

interface CourseInfo {
    courseId: string;
    title: string;
    pattern: string;
    totalProblems: number;
    currentProblem: number;
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

const LeetCodeIDE: React.FC = () => {
    const { courseId, lessonId, problemNumber } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [problem, setProblem] = useState<Problem | null>(null);
    const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
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
    const [showSolution, setShowSolution] = useState(false);
    const [showHints, setShowHints] = useState(false);
    const [currentHint, setCurrentHint] = useState(0);
    const [activeTab, setActiveTab] = useState<'description' | 'hints' | 'solution' | 'submissions'>('description');
    const [executionTime, setExecutionTime] = useState<number | null>(null);
    const [memoryUsage, setMemoryUsage] = useState<string | null>(null);

    // Live homework session state
    const wsRef = useRef<WebSocket | null>(null);
    const [isLiveHomework, setIsLiveHomework] = useState(false);
    const [teacherSessionId, setTeacherSessionId] = useState<string | null>(null);
    const [teacherViewing, setTeacherViewing] = useState(false);

    // Check if opened as live homework and connect to WebSocket
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const sessionId = params.get('sessionId');

        if (sessionId) {
            setIsLiveHomework(true);
            setTeacherSessionId(sessionId);
            connectToLiveSession(sessionId);
            toast.info('Connected to live session');
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [location.search]);

    // Load problem data
    useEffect(() => {
        loadProblem();
        if (courseId) {
            loadCourseInfo();
        }
    }, [courseId, lessonId, problemNumber]);

    // Update code when language changes
    useEffect(() => {
        if (problem && problem.starterCode[currentLanguage]) {
            setCode(problem.starterCode[currentLanguage]);
        }
    }, [currentLanguage, problem]);

    const loadProblem = async () => {
        try {
            let endpoint = '';
            if (courseId && lessonId) {
                // Load from course lesson
                endpoint = `/api/enhanced-courses/${courseId}/lessons/${lessonId}/problem`;
            } else if (problemNumber) {
                // Load specific problem
                endpoint = `/api/leetcode/problem/${problemNumber}`;
            }

            const response = await fetch(endpoint);
            const problemData = await response.json();
            
            setProblem(problemData);
            setCode(problemData.starterCode[currentLanguage] || '// Start coding here...');
        } catch (error) {
            console.error('Failed to load problem:', error);
            // Fallback mock data for development
            loadMockProblem();
        }
    };

    const loadCourseInfo = async () => {
        try {
            const response = await fetch(`/api/enhanced-courses/${courseId}`);
            const data = await response.json();
            setCourseInfo(data);
        } catch (error) {
            console.error('Failed to load course info:', error);
        }
    };

    const loadMockProblem = () => {
        const mockProblem: Problem = {
            id: '1',
            number: problemNumber || '0001',
            title: 'Two Sum',
            description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
            difficulty: 'easy',
            pattern: 'Hash Map',
            examples: [
                {
                    input: 'nums = [2,7,11,15], target = 9',
                    output: '[0,1]',
                    explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
                },
                {
                    input: 'nums = [3,2,4], target = 6',
                    output: '[1,2]'
                },
                {
                    input: 'nums = [3,3], target = 6',
                    output: '[0,1]'
                }
            ],
            constraints: [
                '2 <= nums.length <= 10⁴',
                '-10⁹ <= nums[i] <= 10⁹',
                '-10⁹ <= target <= 10⁹',
                'Only one valid answer exists.'
            ],
            hints: [
                'A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, the best way to approach this problem is to think about the data structures.',
                'The best data structure that comes to mind would be a hash table. With this data structure, we can reduce the search time from O(n) to O(1).',
                'A simple implementation uses two iterations. In the first iteration, we add each element\'s value as a key and its index as a value to the hash table. In the second iteration, we check if each element\'s complement (target - nums[i]) exists in the hash table.'
            ],
            starterCode: {
                javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    // TODO: Implement solution
};`,
                python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # TODO: Implement solution
        pass`,
                java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // TODO: Implement solution
    }
}`
            },
            solutions: {
                javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
var twoSum = function(nums, target) {
    const map = new Map();
    
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        
        map.set(nums[i], i);
    }
    
    return [];
};`,
                python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        num_map = {}
        
        for i, num in enumerate(nums):
            complement = target - num
            
            if complement in num_map:
                return [num_map[complement], i]
            
            num_map[num] = i
        
        return []`,
                java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            
            map.put(nums[i], i);
        }
        
        return new int[0];
    }
}`
            },
            testCases: [
                { input: '[2,7,11,15], 9', expected: '[0,1]' },
                { input: '[3,2,4], 6', expected: '[1,2]' },
                { input: '[3,3], 6', expected: '[0,1]' }
            ]
        };

        setProblem(mockProblem);
        setCode(mockProblem.starterCode[currentLanguage]);
    };

    // WebSocket connection for live homework sessions
    const connectToLiveSession = (teacherSessionId: string) => {
        const wsUrl = getWebSocketUrl();
        const token = localStorage.getItem('authToken');

        if (!token) {
            console.error('[LeetCode IDE] No auth token found for live session');
            return;
        }

        // Generate a unique sessionId for this student's homework connection
        // Use all required parameters: sessionId, token, teacherSessionId, and lessonId
        const homeworkSessionId = crypto.randomUUID();
        const actualLessonId = lessonId || problemNumber || '1';
        const wsUrlWithParams = `${wsUrl}?sessionId=${homeworkSessionId}&token=${token}&teacherSessionId=${teacherSessionId}&lessonId=${actualLessonId}`;
        console.log('[LeetCode IDE] Connecting to WebSocket:', wsUrlWithParams);
        const ws = new WebSocket(wsUrlWithParams);

        ws.onopen = () => {
            console.log('[LeetCode IDE] Connected to live session:', teacherSessionId);
            // Notify server that student joined LeetCode homework
            ws.send(JSON.stringify({
                type: 'LEETCODE_HOMEWORK_JOIN',
                payload: {
                    sessionId: teacherSessionId,
                    problemId: problemNumber || lessonId
                }
            }));
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('[LeetCode IDE] Received message:', message.type);

                switch (message.type) {
                    case 'TEACHER_TAKE_CONTROL':
                        setTeacherViewing(message.payload.isControlling);
                        toast.info(message.payload.isControlling ?
                            'Teacher is now viewing your work' :
                            'Teacher stopped viewing');
                        break;

                    case 'TEACHER_CODE_UPDATE':
                        // Teacher updated the code
                        if (message.payload.code) {
                            setCode(message.payload.code);
                        }
                        if (message.payload.language) {
                            setCurrentLanguage(message.payload.language);
                        }
                        break;
                }
            } catch (error) {
                console.error('[LeetCode IDE] Failed to parse WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('[LeetCode IDE] WebSocket error:', error);
            toast.error('Connection error with live session');
        };

        ws.onclose = () => {
            console.log('[LeetCode IDE] Disconnected from live session');
        };

        wsRef.current = ws;
    };

    // Broadcast code changes to teacher in live session
    useEffect(() => {
        console.log('[LeetCode IDE] Update check:', {
            isLiveHomework,
            wsReady: wsRef.current?.readyState === WebSocket.OPEN,
            hasProblem: !!problem,
            wsReadyState: wsRef.current?.readyState
        });

        if (isLiveHomework && wsRef.current?.readyState === WebSocket.OPEN && problem) {
            const updatePayload = {
                type: 'LEETCODE_HOMEWORK_UPDATE',
                payload: {
                    code,
                    language: currentLanguage,
                    problemId: problem.id,
                    problemTitle: problem.title,
                    testResults
                }
            };

            console.log('[LeetCode IDE] Sending workspace update:', updatePayload);
            wsRef.current.send(JSON.stringify(updatePayload));
        } else {
            console.log('[LeetCode IDE] Not sending update - conditions not met');
        }
    }, [code, currentLanguage, testResults, isLiveHomework, problem]);

    const runCode = async () => {
        if (!problem) return;
        
        setIsRunning(true);
        const startTime = Date.now();
        
        try {
            const response = await fetch('/api/leetcode/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language: currentLanguage,
                    problemId: problem.id,
                    testCases: problem.testCases
                })
            });

            const result = await response.json();
            const endTime = Date.now();
            
            setExecutionTime(endTime - startTime);
            setMemoryUsage(result.memoryUsage || '14.2 MB');
            setTestResults(result.testResults);
        } catch (error) {
            console.error('Failed to run code:', error);
            // Mock test results for development
            setTestResults([
                { passed: true, input: '[2,7,11,15], 9', expected: '[0,1]', actual: '[0,1]' },
                { passed: true, input: '[3,2,4], 6', expected: '[1,2]', actual: '[1,2]' },
                { passed: false, input: '[3,3], 6', expected: '[0,1]', actual: '[1,0]', error: 'Wrong order' }
            ]);
            setExecutionTime(142);
            setMemoryUsage('14.2 MB');
        } finally {
            setIsRunning(false);
        }
    };

    const submitCode = async () => {
        if (!problem) return;
        
        setIsRunning(true);
        try {
            const response = await fetch('/api/leetcode/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    language: currentLanguage,
                    problemId: problem.id,
                    courseId,
                    lessonId
                })
            });

            const result = await response.json();
            if (result.success) {
                alert('🎉 Accepted! Great job!');
                // Navigate to next problem if in course
                if (courseId && lessonId) {
                    // Could navigate to next lesson
                }
            }
        } catch (error) {
            console.error('Failed to submit code:', error);
        } finally {
            setIsRunning(false);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'text-green-500 bg-green-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'hard': return 'text-red-500 bg-red-50';
            default: return 'text-gray-500 bg-gray-50';
        }
    };

    const getPassedCount = () => {
        if (!testResults) return 0;
        return testResults.filter(t => t.passed).length;
    };

    if (!problem) {
        return (
            <div className="h-screen bg-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading problem...</div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <header className="px-4 py-3 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold">
                            {problem.number}. {problem.title}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(problem.difficulty)}`}>
                            {problem.difficulty.toUpperCase()}
                        </span>
                        <span className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">
                            {problem.pattern}
                        </span>
                    </div>
                </div>
                
                {courseInfo && (
                    <div className="flex items-center gap-4 text-sm text-slate-300">
                        <span>{courseInfo.title}</span>
                        <span>{courseInfo.currentProblem}/{courseInfo.totalProblems}</span>
                    </div>
                )}
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Problem Description */}
                <div className="w-1/2 border-r border-slate-700 flex flex-col">
                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-700">
                        {['description', 'hints', 'solution', 'submissions'].map(tab => (
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
                    <div className="flex-1 overflow-y-auto p-4">
                        {activeTab === 'description' && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Problem Description</h3>
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                                        {problem.description}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Examples</h3>
                                    {problem.examples.map((example, idx) => (
                                        <div key={idx} className="mb-4 bg-slate-800 p-4 rounded">
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

                                <div>
                                    <h3 className="text-lg font-semibold mb-3">Constraints</h3>
                                    <ul className="space-y-1 text-slate-300">
                                        {problem.constraints.map((constraint, idx) => (
                                            <li key={idx} className="font-mono text-sm">• {constraint}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {activeTab === 'hints' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">Hints</h3>
                                    <div className="text-sm text-slate-400">
                                        {currentHint + 1} / {problem.hints.length}
                                    </div>
                                </div>
                                
                                {problem.hints.slice(0, currentHint + 1).map((hint, idx) => (
                                    <div key={idx} className="bg-slate-800 p-4 rounded">
                                        <div className="font-medium text-yellow-400 mb-2">Hint {idx + 1}:</div>
                                        <div className="text-slate-300">{hint}</div>
                                    </div>
                                ))}
                                
                                {currentHint < problem.hints.length - 1 && (
                                    <button
                                        onClick={() => setCurrentHint(currentHint + 1)}
                                        className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                                    >
                                        Show Next Hint
                                    </button>
                                )}
                            </div>
                        )}

                        {activeTab === 'solution' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Solution</h3>
                                {!showSolution ? (
                                    <div className="text-center py-8">
                                        <div className="text-slate-400 mb-4">
                                            Are you sure you want to view the solution?
                                        </div>
                                        <button
                                            onClick={() => setShowSolution(true)}
                                            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors"
                                        >
                                            Show Solution
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="mb-4">
                                            <h4 className="font-medium mb-2">{languageConfigs[currentLanguage].name} Solution:</h4>
                                            <div className="bg-slate-800 p-4 rounded font-mono text-sm overflow-x-auto">
                                                <pre className="text-slate-200">
                                                    {problem.solutions[currentLanguage]}
                                                </pre>
                                            </div>
                                        </div>
                                        
                                        <div className="text-slate-300">
                                            <h4 className="font-medium mb-2">Explanation:</h4>
                                            <p>This solution uses a hash map to store the numbers we've seen along with their indices. 
                                            For each number, we calculate its complement (target - current number) and check if 
                                            it exists in our hash map. If it does, we've found our answer!</p>
                                            <div className="mt-3 text-sm">
                                                <strong>Time Complexity:</strong> O(n) - We traverse the list once<br/>
                                                <strong>Space Complexity:</strong> O(n) - Hash map can contain up to n elements
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'submissions' && (
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Submission History</h3>
                                <div className="text-slate-400">
                                    Your submission history will appear here after you submit solutions.
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Code Editor */}
                <div className="w-1/2 flex flex-col">
                    {/* Language Selector and Controls */}
                    <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <select
                                value={currentLanguage}
                                onChange={(e) => setCurrentLanguage(e.target.value as any)}
                                className="bg-slate-700 text-white px-3 py-1 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
                            >
                                {Object.entries(languageConfigs).map(([key, config]) => (
                                    <option key={key} value={key}>
                                        {config.icon} {config.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={runCode}
                                disabled={isRunning}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded transition-colors flex items-center gap-2"
                            >
                                {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                Run
                            </button>
                            
                            <button
                                onClick={submitCode}
                                disabled={isRunning}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded transition-colors flex items-center gap-2"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Submit
                            </button>
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1">
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
                                cursorStyle: 'line',
                                multiCursorModifier: 'alt'
                            }}
                        />
                    </div>

                    {/* Test Results */}
                    {testResults && (
                        <div className="border-t border-slate-700 bg-slate-800">
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
                            
                            <div className="max-h-40 overflow-y-auto">
                                {testResults.map((result, idx) => (
                                    <div key={idx} className={`px-4 py-3 border-b border-slate-700 last:border-b-0 ${
                                        result.passed ? 'bg-green-900/20' : 'bg-red-900/20'
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

export default LeetCodeIDE;