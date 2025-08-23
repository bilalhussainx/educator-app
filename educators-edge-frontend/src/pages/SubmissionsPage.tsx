/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   SubmissionsPage.tsx (UPDATED for CoreZenith)
 * =================================================================
 * DESCRIPTION: This is the teacher's Code Analysis Deck. It transforms
 * the review process into an immersive, application-like experience,
 * highlighting AI insights and providing a structured, efficient workflow.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Submission, LessonFile } from '../types/index.ts';
import Editor from '@monaco-editor/react';
import { cn } from "@/lib/utils";
import { Toaster, toast } from 'sonner';

// CoreZenith UI Components & Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { File as FileIcon, ChevronLeft, Lightbulb, User, Clock } from 'lucide-react';

// --- CoreZenith UI Primitives & Components ---

const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card 
        className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)}
        {...props} 
    />
);

// Type definition to include AI feedback
interface SubmissionWithFeedback extends Submission {
    ai_feedback: string | null;
    username: string;
}

// --- Main Component ---
const SubmissionsPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    // NOTE: All state management and functionality is preserved from the original file.
    const [allSubmissions, setAllSubmissions] = useState<SubmissionWithFeedback[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithFeedback | null>(null);
    const [activeFile, setActiveFile] = useState<LessonFile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState('');
    const [grade, setGrade] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const fetchSubmissions = useCallback(async () => {
        // ... Identical fetch logic as original file ...
        const token = localStorage.getItem('authToken');
        if (!lessonId || !token) { navigate('/login'); return; }
        setIsLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch submissions.');
            const data: SubmissionWithFeedback[] = await response.json();
            setAllSubmissions(data);

            if (data.length > 0) {
                const studentToSelect = selectedStudent && data.some(s => s.username === selectedStudent) ? selectedStudent : data[0].username;
                const studentSubmissions = data.filter(s => s.username === studentToSelect);
                const submissionToSelect = selectedSubmission && studentSubmissions.find(s => s.id === selectedSubmission.id) ? selectedSubmission : studentSubmissions[0];
                setSelectedStudent(studentToSelect);
                setSelectedSubmission(submissionToSelect);
            } else {
                setSelectedStudent(null);
                setSelectedSubmission(null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [lessonId, navigate, selectedStudent, selectedSubmission]);

    useEffect(() => {
        fetchSubmissions();
        const handleVisibilityChange = () => { if (document.visibilityState === 'visible') fetchSubmissions(); };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [fetchSubmissions]);

    const submissionsByStudent = useMemo(() => {
        return allSubmissions.reduce((acc, sub) => {
            (acc[sub.username] = acc[sub.username] || []).push(sub);
            return acc;
        }, {} as Record<string, SubmissionWithFeedback[]>);
    }, [allSubmissions]);

    useEffect(() => {
        if (selectedSubmission) {
        setFeedback(selectedSubmission.feedback || '');
        setGrade(selectedSubmission.grade || '');
        
        // Ensure submitted_code is an array before accessing it
        if (Array.isArray(selectedSubmission.submitted_code) && selectedSubmission.submitted_code.length > 0) {
            setActiveFile(selectedSubmission.submitted_code[0]);
        } else {
            setActiveFile(null); // Handle cases with no files
        }
    }
    }, [selectedSubmission]);

    // const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    //     // ... Identical save logic as original file ...
    //     e.preventDefault();
    //     if (!selectedSubmission) return;
    //     setIsSubmittingFeedback(true);
    //     const token = localStorage.getItem('authToken');
    //     try {
    //         const response = await fetch(`http://localhost:5000/api/submissions/${selectedSubmission.id}`, {
    //             method: 'PATCH',
    //             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //             body: JSON.stringify({ feedback, grade })
    //         });
    //         if (!response.ok) throw new Error('Failed to save feedback.');
    //         const updatedData = await response.json();
    //         const updatedSubmissionWithAI = { ...selectedSubmission, ...updatedData };
    //         setAllSubmissions(prev => prev.map(s => s.id === updatedSubmissionWithAI.id ? updatedSubmissionWithAI : s));
    //         setSelectedSubmission(updatedSubmissionWithAI);
    //     } catch (err) {
    //         console.error(err)
    //     } finally {
    //         setIsSubmittingFeedback(false);
    //     }
    // };
    const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedSubmission) return;
    setIsSubmittingFeedback(true);
    const token = localStorage.getItem('authToken');

    // Using toast.promise for clear user feedback
    toast.promise(
        fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ feedback, grade })
        }).then(async (res) => {
            if (!res.ok) {
                // Try to parse the error from the backend for a more specific message
                const errData = await res.json().catch(() => ({ error: 'An unknown error occurred while saving.' }));
                throw new Error(errData.error || 'Failed to save feedback.');
            }
            return res.json();
        }),
        {
            loading: 'Saving feedback...',
            success: (updatedSubmissionFromServer) => {
                // This logic is now safe because the promise was successful
                setFeedback(updatedSubmissionFromServer.feedback || '');
                setGrade(updatedSubmissionFromServer.grade || '');

                const updatedSubmissionWithAllData = { ...selectedSubmission, ...updatedSubmissionFromServer };

                setAllSubmissions(prev => prev.map(s => s.id === updatedSubmissionWithAllData.id ? updatedSubmissionWithAllData : s));
                setSelectedSubmission(updatedSubmissionWithAllData);
                
                return 'Feedback saved successfully!';
            },
            error: (err) => err.message, // Display the specific error message from the backend
            finally: () => setIsSubmittingFeedback(false)
        }
    );
};

    const renderEmptyState = (message: string) => (
         <div className="flex-grow flex items-center justify-center h-full text-slate-500">
            <p>{message}</p>
        </div>
    )

    if (isLoading || error) {
         return (
            <div className="min-h-screen bg-[#0a091a] w-full text-white font-sans flex items-center justify-center p-8">
                 <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
                 <div className="relative text-center">
                    {isLoading && <p>Loading Analysis Deck...</p>}
                    {error && <p className="text-red-400">Error: {error}</p>}
                 </div>
            </div>
        )
    }

    return (
        <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <header className="relative z-10 flex-shrink-0 flex items-center gap-4 p-4 border-b border-slate-800">
                <Button variant="ghost" onClick={() => navigate(-1)} className="hover:bg-slate-800 hover:text-white">
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Code Analysis Deck</h1>
                    <p className="text-sm text-slate-400">Lesson ID: {lessonId}</p>
                </div>
            </header>
            
            <main className="relative z-10 flex-grow grid md:grid-cols-4 gap-4 p-4 overflow-hidden">
                {/* --- Student Roster --- */}
                <GlassCard className="md:col-span-1 flex flex-col overflow-hidden">
                    <CardHeader className="flex-shrink-0">
                        <CardTitle className="text-xl text-white">Student Roster</CardTitle>
                        <CardDescription className="text-slate-400">Select a student to review.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow overflow-y-auto pr-2">
                        {Object.keys(submissionsByStudent).length === 0 ? renderEmptyState("No submissions found.") : (
                            <ul className="space-y-2">
                                {Object.keys(submissionsByStudent).map(username => (
                                    <li key={username}>
                                        <button 
                                            onClick={() => {
                                                setSelectedStudent(username);
                                                setSelectedSubmission(submissionsByStudent[username][0]);
                                            }}
                                            className={cn('w-full text-left p-3 rounded-md transition-colors duration-200 border-l-2',
                                                selectedStudent === username 
                                                ? 'bg-cyan-500/10 border-cyan-400' 
                                                : 'border-transparent hover:bg-slate-800/60'
                                            )}
                                        >
                                            <p className="font-semibold text-gray-200 flex items-center gap-2"><User size={16}/> {username}</p>
                                            <p className="text-xs text-slate-500 mt-1">{submissionsByStudent[username].length} submissions</p>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </GlassCard>

                {/* --- Main Analysis Area --- */}
                <div className="md:col-span-3 flex flex-col gap-4 overflow-hidden">
                    {!selectedStudent || !selectedSubmission ? renderEmptyState("Select a student from the roster to begin analysis.") : (
                        <div className="flex-grow grid lg:grid-cols-3 gap-4 overflow-hidden">
                           
                            {/* --- Code Terminal --- */}
                            <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
                                {selectedSubmission.ai_feedback && (
                                    <Alert className="bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-300 flex-shrink-0">
                                        <Lightbulb className="h-5 w-5 text-fuchsia-400" />
                                        <AlertTitle className="font-bold text-fuchsia-200">AI Insight</AlertTitle>
                                        <AlertDescription>{selectedSubmission.ai_feedback}</AlertDescription>
                                    </Alert>
                                )}
                                <GlassCard className="flex-grow flex flex-col overflow-hidden">
                                     <CardHeader className="p-3 border-b border-slate-700">
                                        <CardTitle className="text-lg">Code Terminal</CardTitle>
                                    </CardHeader>
                                    <div className="flex-grow flex overflow-hidden">
                                        <div className="w-1/3 border-r border-slate-700 flex flex-col overflow-hidden">
                                            <h4 className="font-semibold p-3 text-sm flex-shrink-0 border-b border-slate-700">Submission History</h4>
                                            <ul className="space-y-1 p-2 overflow-y-auto">
                                                {submissionsByStudent[selectedStudent].map(sub => (
                                                    <li key={sub.id}>
                                                        <button onClick={() => setSelectedSubmission(sub)} className={cn('w-full text-left p-2 rounded-md text-xs transition-colors', selectedSubmission?.id === sub.id ? 'bg-slate-700' : 'hover:bg-slate-800/60')}>
                                                            <div className="flex items-center gap-2"><Clock size={12}/>{new Date(sub.submitted_at).toLocaleString()}</div>
                                                            {sub.grade && <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs font-bold">Grade: {sub.grade}</span>}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="w-2/3 flex flex-col overflow-hidden">
                                            <div className="flex items-center gap-2 border-b border-slate-700 p-1 flex-shrink-0">
                                                {selectedSubmission?.submitted_code.map((file, index) => (
                                                    <Button key={file.id || index} variant={activeFile?.id === file.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveFile(file)} className="text-xs">
                                                        <FileIcon className="mr-2 h-4 w-4" />{file.filename}
                                                    </Button>
                                                ))}
                                            </div>
                                            <div className="flex-grow">
                                                <Editor height="100%" path={activeFile?.filename} value={activeFile?.content || ''} theme="vs-dark" options={{ readOnly: true, minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false }}/>
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            </div>
                           
                            {/* --- Feedback Matrix --- */}
                            <GlassCard className="lg:col-span-1 flex flex-col overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-xl">Feedback Matrix</CardTitle>
                                    <CardDescription>Provide your evaluation and grade.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow overflow-y-auto">
                                    <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
                                        <div className="space-y-2">
                                            <Label htmlFor="grade" className="text-slate-300">Grade</Label>
                                            <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., A+, 95/100" className="bg-black/30 border-slate-600 focus:border-cyan-400" />
                                        </div>
                                        <div className="space-y-2 flex-grow flex flex-col">
                                            <Label htmlFor="feedback" className="text-slate-300">Feedback</Label>
                                            <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} className="flex-grow bg-black/30 border-slate-600 focus:border-cyan-400 resize-none" placeholder="Provide constructive feedback..." />
                                        </div>
                                        <Button type="submit" disabled={isSubmittingFeedback} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                                            {isSubmittingFeedback ? 'Saving...' : 'Save & Finalize'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </GlassCard>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SubmissionsPage;

// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (V3 - AI Feedback Integration)
//  * =================================================================
//  * DESCRIPTION: This version is updated to display the AI-generated
//  * conceptual feedback alongside each student submission, giving
//  * teachers full context.
//  */
// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission, LessonFile } from '../types';
// import Editor from '@monaco-editor/react';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { File as FileIcon, ChevronLeft, Lightbulb } from 'lucide-react';

// // --- NEW: Define an enhanced submission type to include AI feedback ---
// interface SubmissionWithFeedback extends Submission {
//     ai_feedback: string | null;
//     username: string;
// }

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [allSubmissions, setAllSubmissions] = useState<SubmissionWithFeedback[]>([]);
//     const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
//     const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithFeedback | null>(null);
//     const [activeFile, setActiveFile] = useState<LessonFile | null>(null);
    
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     const fetchSubmissions = useCallback(async () => {
//         const token = localStorage.getItem('authToken');
//         if (!lessonId || !token) {
//             navigate('/login');
//             return;
//         }
//         setIsLoading(true);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to fetch submissions.');
//             }
//             const data: SubmissionWithFeedback[] = await response.json();
//             setAllSubmissions(data);

//             if (data.length > 0) {
//                 const currentSelectedStudentExists = data.some(s => s.username === selectedStudent);
//                 const studentToSelect = currentSelectedStudentExists ? selectedStudent : data[0].username;
                
//                 setSelectedStudent(studentToSelect);

//                 const studentSubmissions = data.filter(s => s.username === studentToSelect);
//                 const currentSelectedSubmissionExists = studentSubmissions.find(s => s.id === selectedSubmission?.id);
//                 setSelectedSubmission(currentSelectedSubmissionExists || studentSubmissions[0]);
//             } else {
//                 setSelectedStudent(null);
//                 setSelectedSubmission(null);
//             }
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         } finally {
//             setIsLoading(false);
//         }
//     }, [lessonId, navigate, selectedStudent, selectedSubmission?.id]);

//     useEffect(() => {
//         fetchSubmissions();

//         const handleVisibilityChange = () => {
//             if (document.visibilityState === 'visible') {
//                 fetchSubmissions();
//             }
//         };

//         document.addEventListener('visibilitychange', handleVisibilityChange);
//         return () => {
//             document.removeEventListener('visibilitychange', handleVisibilityChange);
//         };
//     }, [fetchSubmissions]);

//     const submissionsByStudent = useMemo(() => {
//         return allSubmissions.reduce((acc, sub) => {
//             (acc[sub.username] = acc[sub.username] || []).push(sub);
//             return acc;
//         }, {} as Record<string, SubmissionWithFeedback[]>);
//     }, [allSubmissions]);

//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//             if (Array.isArray(selectedSubmission.submitted_code) && selectedSubmission.submitted_code.length > 0) {
//                 setActiveFile(selectedSubmission.submitted_code[0]);
//             } else {
//                 setActiveFile(null);
//             }
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             // CORRECTED: The endpoint for updating a submission is /api/submissions/:id
//             const response = await fetch(`http://localhost:5000/api/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmissionData = await response.json();
            
//             // Create a new object that includes the ai_feedback from the original submission
//             const updatedSubmissionWithAI = { ...selectedSubmission, ...updatedSubmissionData };

//             setAllSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmissionWithAI.id ? updatedSubmissionWithAI : sub)
//             );
//             setSelectedSubmission(updatedSubmissionWithAI);
//             alert('Feedback saved successfully!');
//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading submissions...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <header className="flex-shrink-0 flex items-center gap-4 mb-6 pb-4 border-b">
//                 <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
//                     <ChevronLeft className="h-4 w-4" />
//                 </Button>
//                 <h1 className="text-3xl font-bold tracking-tight">Review Submissions</h1>
//             </header>
            
//             <div className="flex-grow grid md:grid-cols-4 gap-6 overflow-hidden">
//                 <Card className="md:col-span-1 flex flex-col">
//                     <CardHeader>
//                         <CardTitle>Students</CardTitle>
//                         <CardDescription>Select a student to review their work.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="flex-grow overflow-y-auto">
//                         {Object.keys(submissionsByStudent).length === 0 ? (
//                             <p className="text-muted-foreground">No submissions yet.</p>
//                         ) : (
//                             <ul className="space-y-2">
//                                 {Object.keys(submissionsByStudent).map(username => (
//                                     <li key={username}>
//                                         <button 
//                                             onClick={() => {
//                                                 setSelectedStudent(username);
//                                                 setSelectedSubmission(submissionsByStudent[username][0]);
//                                             }}
//                                             className={`w-full text-left p-3 rounded-md border ${selectedStudent === username ? 'bg-accent text-accent-foreground border-transparent' : 'hover:bg-accent'}`}
//                                         >
//                                             <p className="font-semibold">{username}</p>
//                                             <p className="text-xs text-muted-foreground">{submissionsByStudent[username].length} submission(s)</p>
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <main className="md:col-span-3 flex flex-col bg-background rounded-lg border overflow-hidden">
//                     {selectedStudent && selectedSubmission ? (
//                         <div className="flex-grow grid lg:grid-cols-3 gap-6 overflow-hidden p-4">
//                             <div className="lg:col-span-2 flex flex-col gap-4">
//                                 {/* --- NEW: Display AI Conceptual Feedback --- */}
//                                 {selectedSubmission.ai_feedback && (
//                                     <Alert className="bg-blue-50 border-blue-200">
//                                         <Lightbulb className="h-4 w-4 text-blue-600" />
//                                         <AlertTitle className="font-bold text-blue-800">AI Conceptual Hint Given</AlertTitle>
//                                         <AlertDescription className="text-blue-700">
//                                             {selectedSubmission.ai_feedback}
//                                         </AlertDescription>
//                                     </Alert>
//                                 )}
//                                 <div className="flex-grow flex flex-col border rounded-md">
//                                     <div className="p-2 border-b">
//                                         <p className="text-sm font-medium">Viewing Code</p>
//                                         <p className="text-xs text-muted-foreground">
//                                             From: <span className="font-bold">{selectedStudent}</span>
//                                         </p>
//                                     </div>
//                                     <div className="flex-grow flex gap-2 p-2">
//                                         <div className="w-1/3 border-r pr-2 overflow-y-auto">
//                                             <h4 className="font-semibold mb-2 text-sm">History</h4>
//                                             <ul className="space-y-1">
//                                                 {submissionsByStudent[selectedStudent].map(sub => (
//                                                     <li key={sub.id}>
//                                                         <button 
//                                                             onClick={() => setSelectedSubmission(sub)}
//                                                             className={`w-full text-left p-2 rounded-md text-xs ${selectedSubmission?.id === sub.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
//                                                         >
//                                                             {new Date(sub.submitted_at).toLocaleString()}
//                                                             {sub.grade && <span className="ml-2 font-bold text-green-600">({sub.grade})</span>}
//                                                         </button>
//                                                     </li>
//                                                 ))}
//                                             </ul>
//                                         </div>
//                                         <div className="w-2/3 flex flex-col gap-2">
//                                             <div className="flex items-center gap-2 border-b pb-1">
//                                                 {selectedSubmission?.submitted_code.map((file, index) => (
//                                                     <Button key={file.id || index} variant={activeFile?.id === file.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveFile(file)}>
//                                                         <FileIcon className="mr-2 h-4 w-4" />{file.filename}
//                                                     </Button>
//                                                 ))}
//                                             </div>
//                                             <div className="flex-grow rounded-md overflow-hidden">
//                                                 <Editor
//                                                     height="100%"
//                                                     path={activeFile?.filename}
//                                                     value={activeFile?.content}
//                                                     theme="vs-dark"
//                                                     options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
//                                                 />
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="lg:col-span-1">
//                                 <Card className="h-full">
//                                     <CardHeader>
//                                         <CardTitle>Feedback & Grade</CardTitle>
//                                     </CardHeader>
//                                     <CardContent>
//                                         <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="grade">Grade</Label>
//                                                 <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., A+, 95/100" />
//                                             </div>
//                                             <div className="space-y-2 flex-grow flex flex-col">
//                                                 <Label htmlFor="feedback">Feedback</Label>
//                                                 <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} className="flex-grow" placeholder="Provide constructive feedback..." rows={10} />
//                                             </div>
//                                             <Button type="submit" disabled={isSubmittingFeedback}>
//                                                 {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                             </Button>
//                                         </form>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full text-muted-foreground">
//                             <p>Select a student to view their submissions.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (V2 - Refetch on Focus)
//  * =================================================================
//  * DESCRIPTION: This version solves the "stale data" problem by
//  * implementing a "refetch on visibility change" strategy, ensuring
//  * teachers always see the latest student submissions.
//  */
// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission, LessonFile } from '../types';
// import Editor from '@monaco-editor/react';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { File as FileIcon, ChevronLeft } from 'lucide-react';

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
//     const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [activeFile, setActiveFile] = useState<LessonFile | null>(null);
    
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     const fetchSubmissions = useCallback(async () => {
//         const token = localStorage.getItem('authToken');
//         if (!lessonId || !token) {
//             navigate('/login');
//             return;
//         }
//         setIsLoading(true);
//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                 headers: { 'Authorization': `Bearer ${token}` }
//             });
//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to fetch submissions.');
//             }
//             const data: Submission[] = await response.json();
//             setAllSubmissions(data);

//             if (data.length > 0) {
//                 // Preserve the currently selected student if they still have submissions
//                 const currentSelectedStudentExists = data.some(s => s.username === selectedStudent);
//                 const studentToSelect = currentSelectedStudentExists ? selectedStudent : data[0].username;
                
//                 setSelectedStudent(studentToSelect);

//                 const studentSubmissions = data.filter(s => s.username === studentToSelect);
//                 // Try to preserve the selected submission, otherwise default to the latest
//                 const currentSelectedSubmissionExists = studentSubmissions.find(s => s.id === selectedSubmission?.id);
//                 setSelectedSubmission(currentSelectedSubmissionExists || studentSubmissions[0]);
//             } else {
//                 // If there are no submissions, clear the selections
//                 setSelectedStudent(null);
//                 setSelectedSubmission(null);
//             }
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//         } finally {
//             setIsLoading(false);
//         }
//     }, [lessonId, navigate, selectedStudent, selectedSubmission?.id]);

//     useEffect(() => {
//         fetchSubmissions(); // Fetch on initial mount

//         const handleVisibilityChange = () => {
//             if (document.visibilityState === 'visible') {
//                 fetchSubmissions();
//             }
//         };

//         document.addEventListener('visibilitychange', handleVisibilityChange);
//         return () => {
//             document.removeEventListener('visibilitychange', handleVisibilityChange);
//         };
//     }, [fetchSubmissions]);

//     const submissionsByStudent = useMemo(() => {
//         return allSubmissions.reduce((acc, sub) => {
//             (acc[sub.username] = acc[sub.username] || []).push(sub);
//             return acc;
//         }, {} as Record<string, Submission[]>);
//     }, [allSubmissions]);

//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//             if (Array.isArray(selectedSubmission.submitted_code) && selectedSubmission.submitted_code.length > 0) {
//                 setActiveFile(selectedSubmission.submitted_code[0]);
//             } else {
//                 setActiveFile(null);
//             }
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();
            
//             setAllSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? { ...sub, ...updatedSubmission } : sub)
//             );
//             setSelectedSubmission(prev => prev ? { ...prev, ...updatedSubmission } : null);
//             alert('Feedback saved successfully!');
//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading submissions...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <header className="flex-shrink-0 flex items-center gap-4 mb-6 pb-4 border-b">
//                 <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
//                     <ChevronLeft className="h-4 w-4" />
//                 </Button>
//                 <h1 className="text-3xl font-bold tracking-tight">Review Submissions</h1>
//             </header>
            
//             <div className="flex-grow grid md:grid-cols-4 gap-6 overflow-hidden">
//                 <Card className="md:col-span-1 flex flex-col">
//                     <CardHeader>
//                         <CardTitle>Students</CardTitle>
//                         <CardDescription>Select a student to review their work.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="flex-grow overflow-y-auto">
//                         {Object.keys(submissionsByStudent).length === 0 ? (
//                             <p className="text-muted-foreground">No submissions yet.</p>
//                         ) : (
//                             <ul className="space-y-2">
//                                 {Object.keys(submissionsByStudent).map(username => (
//                                     <li key={username}>
//                                         <button 
//                                             onClick={() => {
//                                                 setSelectedStudent(username);
//                                                 setSelectedSubmission(submissionsByStudent[username][0]);
//                                             }}
//                                             className={`w-full text-left p-3 rounded-md border ${selectedStudent === username ? 'bg-accent text-accent-foreground border-transparent' : 'hover:bg-accent'}`}
//                                         >
//                                             <p className="font-semibold">{username}</p>
//                                             <p className="text-xs text-muted-foreground">{submissionsByStudent[username].length} submission(s)</p>
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <main className="md:col-span-3 flex flex-col bg-background rounded-lg border overflow-hidden">
//                     {selectedStudent && selectedSubmission ? (
//                         <div className="flex-grow grid lg:grid-cols-3 gap-6 overflow-hidden p-4">
//                             <div className="lg:col-span-2 flex flex-col gap-4">
//                                 <div className="flex-grow flex flex-col border rounded-md">
//                                     <div className="p-2 border-b">
//                                         <p className="text-sm font-medium">Viewing Code</p>
//                                         <p className="text-xs text-muted-foreground">
//                                             From: <span className="font-bold">{selectedStudent}</span>
//                                         </p>
//                                     </div>
//                                     <div className="flex-grow flex gap-2 p-2">
//                                         <div className="w-1/3 border-r pr-2 overflow-y-auto">
//                                             <h4 className="font-semibold mb-2 text-sm">History</h4>
//                                             <ul className="space-y-1">
//                                                 {submissionsByStudent[selectedStudent].map(sub => (
//                                                     <li key={sub.id}>
//                                                         <button 
//                                                             onClick={() => setSelectedSubmission(sub)}
//                                                             className={`w-full text-left p-2 rounded-md text-xs ${selectedSubmission?.id === sub.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
//                                                         >
//                                                             {new Date(sub.submitted_at).toLocaleString()}
//                                                             {sub.grade && <span className="ml-2 font-bold text-green-600">({sub.grade})</span>}
//                                                         </button>
//                                                     </li>
//                                                 ))}
//                                             </ul>
//                                         </div>
//                                         <div className="w-2/3 flex flex-col gap-2">
//                                             <div className="flex items-center gap-2 border-b pb-1">
//                                                 {selectedSubmission?.submitted_code.map((file, index) => (
//                                                     <Button key={file.id || index} variant={activeFile?.id === file.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setActiveFile(file)}>
//                                                         <FileIcon className="mr-2 h-4 w-4" />{file.filename}
//                                                     </Button>
//                                                 ))}
//                                             </div>
//                                             <div className="flex-grow rounded-md overflow-hidden">
//                                                 <Editor
//                                                     height="100%"
//                                                     path={activeFile?.filename}
//                                                     value={activeFile?.content}
//                                                     theme="vs-dark"
//                                                     options={{ readOnly: true, minimap: { enabled: false }, fontSize: 12 }}
//                                                 />
//                                             </div>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                             <div className="lg:col-span-1">
//                                 <Card className="h-full">
//                                     <CardHeader>
//                                         <CardTitle>Feedback & Grade</CardTitle>
//                                     </CardHeader>
//                                     <CardContent>
//                                         <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="grade">Grade</Label>
//                                                 <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g., A+, 95/100" />
//                                             </div>
//                                             <div className="space-y-2 flex-grow flex flex-col">
//                                                 <Label htmlFor="feedback">Feedback</Label>
//                                                 <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} className="flex-grow" placeholder="Provide constructive feedback..." rows={10} />
//                                             </div>
//                                             <Button type="submit" disabled={isSubmittingFeedback}>
//                                                 {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                             </Button>
//                                         </form>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full text-muted-foreground">
//                             <p>Select a student to view their submissions.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This page is now refactored to correctly display the
//  * multi-file structure of a student's submission, allowing the
//  * teacher to navigate between files.
//  */
// import React, { useState, useEffect, useMemo } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission, LessonFile } from '../types';
// import Editor from '@monaco-editor/react';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { File as FileIcon } from 'lucide-react';

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
//     const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     // NEW: State to track the currently viewed file within a submission.
//     const [activeFile, setActiveFile] = useState<LessonFile | null>(null);
    
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchSubmissions = async () => {
//             if (!lessonId) return;
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data: Submission[] = await response.json();
//                 setAllSubmissions(data);
//                 if (data.length > 0) {
//                     const firstStudent = data[0].username;
//                     setSelectedStudent(firstStudent);
//                     // Select the most recent submission for the first student
//                     const studentSubmissions = data.filter(s => s.username === firstStudent);
//                     setSelectedSubmission(studentSubmissions[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     const submissionsByStudent = useMemo(() => {
//         return allSubmissions.reduce((acc, sub) => {
//             (acc[sub.username] = acc[sub.username] || []).push(sub);
//             return acc;
//         }, {} as Record<string, Submission[]>);
//     }, [allSubmissions]);

//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//             // When a new submission is selected, select its first file by default.
//             if (Array.isArray(selectedSubmission.submitted_code) && selectedSubmission.submitted_code.length > 0) {
//                 setActiveFile(selectedSubmission.submitted_code[0]);
//             } else {
//                 setActiveFile(null);
//             }
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();
            
//             setAllSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? { ...sub, ...updatedSubmission } : sub)
//             );
//             setSelectedSubmission(prev => prev ? { ...prev, ...updatedSubmission } : null);
//             alert('Feedback saved successfully!');
//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading submissions...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8">
//             <header className="flex-shrink-0 flex justify-between items-center mb-6 pb-4 border-b">
//                 <h1 className="text-3xl font-bold tracking-tight">Review Submissions</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>
            
//             <div className="flex-grow grid md:grid-cols-4 gap-6 overflow-hidden">
//                 <Card className="md:col-span-1 flex flex-col">
//                     <CardHeader>
//                         <CardTitle>Students</CardTitle>
//                         <CardDescription>Select a student to review their work.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="flex-grow overflow-y-auto">
//                         {Object.keys(submissionsByStudent).length === 0 ? (
//                             <p className="text-muted-foreground">No submissions yet.</p>
//                         ) : (
//                             <ul className="space-y-2">
//                                 {Object.keys(submissionsByStudent).map(username => (
//                                     <li key={username}>
//                                         <button 
//                                             onClick={() => {
//                                                 setSelectedStudent(username);
//                                                 setSelectedSubmission(submissionsByStudent[username][0]);
//                                             }}
//                                             className={`w-full text-left p-3 rounded-md border ${selectedStudent === username ? 'bg-accent text-accent-foreground border-transparent' : 'hover:bg-accent'}`}
//                                         >
//                                             <p className="font-semibold">{username}</p>
//                                             <p className="text-xs text-muted-foreground">{submissionsByStudent[username].length} submission(s)</p>
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <main className="md:col-span-3 flex flex-col bg-background rounded-lg">
//                     {selectedStudent && submissionsByStudent[selectedStudent] ? (
//                         <div className="flex-grow grid lg:grid-cols-3 gap-6 overflow-hidden">
//                             <div className="lg:col-span-2 flex flex-col">
//                                 <Card className="flex-grow flex flex-col">
//                                     <CardHeader>
//                                         <CardTitle>Viewing Code</CardTitle>
//                                         <CardDescription>
//                                             From: <span className="font-bold">{selectedStudent}</span>. 
//                                             Select a timestamp to view a specific version.
//                                         </CardDescription>
//                                     </CardHeader>
//                                     <CardContent className="flex-grow flex gap-4">
//                                         {/* Submission History Column */}
//                                         <div className="w-1/3 border-r pr-4 overflow-y-auto">
//                                             <h4 className="font-semibold mb-2">History</h4>
//                                             <ul className="space-y-2">
//                                                 {submissionsByStudent[selectedStudent].map(sub => (
//                                                     <li key={sub.id}>
//                                                         <button 
//                                                             onClick={() => setSelectedSubmission(sub)}
//                                                             className={`w-full text-left p-2 rounded-md text-sm ${selectedSubmission?.id === sub.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
//                                                         >
//                                                             {new Date(sub.submitted_at).toLocaleString()}
//                                                             {sub.grade && <span className="ml-2 text-xs font-bold text-green-600">({sub.grade})</span>}
//                                                         </button>
//                                                     </li>
//                                                 ))}
//                                             </ul>
//                                         </div>
//                                         {/* File Navigator and Editor */}
//                                         <div className="w-2/3 flex flex-col">
//                                             <h4 className="font-semibold mb-2">Files</h4>
//                                             <div className="flex-grow grid grid-cols-3 gap-2">
//                                                 <div className="col-span-1 border-r pr-2 overflow-y-auto">
//                                                     <ul className="space-y-1">
//                                                         {selectedSubmission?.submitted_code.map((file, index) => (
//                                                             <li key={file.id || index}>
//                                                                 <button 
//                                                                     onClick={() => setActiveFile(file)}
//                                                                     className={`w-full text-left p-2 rounded-md text-xs ${activeFile?.id === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}
//                                                                 >
//                                                                     <FileIcon className="inline-block mr-2 h-4 w-4" />
//                                                                     {file.filename}
//                                                                 </button>
//                                                             </li>
//                                                         ))}
//                                                     </ul>
//                                                 </div>
//                                                 <div className="col-span-2 border rounded-md">
//                                                     <Editor
//                                                         height="100%"
//                                                         path={activeFile?.filename}
//                                                         value={activeFile?.content}
//                                                         theme="vs-light"
//                                                         options={{ readOnly: true, minimap: { enabled: false } }}
//                                                     />
//                                                 </div>
//                                             </div>
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                             <div className="lg:col-span-1">
//                                 <Card>
//                                     <CardHeader>
//                                         <CardTitle>Feedback & Grade</CardTitle>
//                                     </CardHeader>
//                                     <CardContent>
//                                         <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="grade">Grade</Label>
//                                                 <Input 
//                                                     id="grade"
//                                                     value={grade}
//                                                     onChange={(e) => setGrade(e.target.value)}
//                                                     placeholder="e.g., A+, 95/100"
//                                                 />
//                                             </div>
//                                             <div className="space-y-2 flex-grow flex flex-col">
//                                                 <Label htmlFor="feedback">Feedback</Label>
//                                                 <Textarea 
//                                                     id="feedback"
//                                                     value={feedback}
//                                                     onChange={(e) => setFeedback(e.target.value)}
//                                                     className="flex-grow"
//                                                     placeholder="Provide constructive feedback..."
//                                                     rows={10}
//                                                 />
//                                             </div>
//                                             <Button 
//                                                 type="submit"
//                                                 disabled={isSubmittingFeedback}
//                                             >
//                                                 {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                             </Button>
//                                         </form>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full text-muted-foreground">
//                             <p>Select a student to view their submissions.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect, useMemo } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission, LessonFile } from '../types';
// import Editor from '@monaco-editor/react';

// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { File as FileIcon } from 'lucide-react';

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
//     const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [activeFile, setActiveFile] = useState<LessonFile | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchSubmissions = async () => {
//             if (!lessonId) return;
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data: Submission[] = await response.json();
//                 setAllSubmissions(data);
//                 if (data.length > 0) {
//                     const firstStudent = data[0].username;
//                     setSelectedStudent(firstStudent);
//                     setSelectedSubmission(data[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     const submissionsByStudent = useMemo(() => {
//         return allSubmissions.reduce((acc, sub) => {
//             (acc[sub.username] = acc[sub.username] || []).push(sub);
//             return acc;
//         }, {} as Record<string, Submission[]>);
//     }, [allSubmissions]);

//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//             if (Array.isArray(selectedSubmission.submitted_code) && selectedSubmission.submitted_code.length > 0) {
//                 setActiveFile(selectedSubmission.submitted_code[0]);
//             } else {
//                 setActiveFile(null);
//             }
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();
            
//             setAllSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? { ...sub, ...updatedSubmission } : sub)
//             );
//             setSelectedSubmission(prev => prev ? { ...prev, ...updatedSubmission } : null);
//             alert('Feedback saved successfully!');
//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading submissions...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8">
//             <header className="flex-shrink-0 flex justify-between items-center mb-6 pb-4 border-b">
//                 <h1 className="text-3xl font-bold tracking-tight">Review Submissions</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>
            
//             <div className="flex-grow grid md:grid-cols-4 gap-6 overflow-hidden">
//                 <Card className="md:col-span-1 flex flex-col">
//                     <CardHeader>
//                         <CardTitle>Students</CardTitle>
//                         <CardDescription>Select a student to review their work.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="flex-grow overflow-y-auto">
//                         {Object.keys(submissionsByStudent).length === 0 ? (
//                             <p className="text-muted-foreground">No submissions yet.</p>
//                         ) : (
//                             <ul className="space-y-2">
//                                 {Object.keys(submissionsByStudent).map(username => (
//                                     <li key={username}>
//                                         <button 
//                                             onClick={() => {
//                                                 setSelectedStudent(username);
//                                                 setSelectedSubmission(submissionsByStudent[username][0]);
//                                             }}
//                                             className={`w-full text-left p-3 rounded-md border ${selectedStudent === username ? 'bg-accent text-accent-foreground border-transparent' : 'hover:bg-accent'}`}
//                                         >
//                                             <p className="font-semibold">{username}</p>
//                                             <p className="text-xs text-muted-foreground">{submissionsByStudent[username].length} submission(s)</p>
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <main className="md:col-span-3 flex flex-col bg-background rounded-lg">
//                     {selectedStudent && submissionsByStudent[selectedStudent] ? (
//                         <div className="flex-grow grid lg:grid-cols-3 gap-6 overflow-hidden">
//                             <div className="lg:col-span-2 flex flex-col">
//                                 <Card className="flex-grow flex flex-col">
//                                     <CardHeader>
//                                         <CardTitle>Viewing Code</CardTitle>
//                                         <CardDescription>
//                                             From: <span className="font-bold">{selectedStudent}</span>. 
//                                             Select a timestamp to view a specific version.
//                                         </CardDescription>
//                                     </CardHeader>
//                                     <CardContent className="flex-grow flex gap-4">
//                                         <div className="w-1/3 border-r pr-4 overflow-y-auto">
//                                             <h4 className="font-semibold mb-2">History</h4>
//                                             <ul className="space-y-2">
//                                                 {submissionsByStudent[selectedStudent].map(sub => (
//                                                     <li key={sub.id}>
//                                                         <button 
//                                                             onClick={() => setSelectedSubmission(sub)}
//                                                             className={`w-full text-left p-2 rounded-md text-sm ${selectedSubmission?.id === sub.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
//                                                         >
//                                                             {new Date(sub.submitted_at).toLocaleString()}
//                                                             {sub.grade && <span className="ml-2 text-xs font-bold text-green-600">({sub.grade})</span>}
//                                                         </button>
//                                                     </li>
//                                                 ))}
//                                             </ul>
//                                         </div>
//                                         <div className="w-2/3 border rounded-md">
//                                             <Editor
//                                                 height="100%"
//                                                 path={activeFile?.filename}
//                                                 value={activeFile?.content}
//                                                 theme="vs-light"
//                                                 options={{ readOnly: true, minimap: { enabled: false } }}
//                                             />
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                             <div className="lg:col-span-1">
//                                 <Card>
//                                     <CardHeader>
//                                         <CardTitle>Feedback & Grade</CardTitle>
//                                     </CardHeader>
//                                     <CardContent>
//                                         <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="grade">Grade</Label>
//                                                 <Input 
//                                                     id="grade"
//                                                     value={grade}
//                                                     onChange={(e) => setGrade(e.target.value)}
//                                                     placeholder="e.g., A+, 95/100"
//                                                 />
//                                             </div>
//                                             <div className="space-y-2 flex-grow flex flex-col">
//                                                 <Label htmlFor="feedback">Feedback</Label>
//                                                 <Textarea 
//                                                     id="feedback"
//                                                     value={feedback}
//                                                     onChange={(e) => setFeedback(e.target.value)}
//                                                     className="flex-grow"
//                                                     placeholder="Provide constructive feedback..."
//                                                     rows={10}
//                                                 />
//                                             </div>
//                                             <Button 
//                                                 type="submit"
//                                                 disabled={isSubmittingFeedback}
//                                             >
//                                                 {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                             </Button>
//                                         </form>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full text-muted-foreground">
//                             <p>Select a student to view their submissions.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;



// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission, LessonFile } from '../types';
// import Editor from '@monaco-editor/react';

// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// // CORRECTED: Import the File icon and rename it to avoid collision.
// import { File as FileIcon } from 'lucide-react';

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [submissions, setSubmissions] = useState<Submission[]>([]);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [activeFile, setActiveFile] = useState<LessonFile | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchSubmissions = async () => {
//             if (!lessonId) return;
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data = await response.json();
//                 setSubmissions(data);
//                 if (data.length > 0) {
//                     setSelectedSubmission(data[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//             if (Array.isArray(selectedSubmission.submitted_code) && selectedSubmission.submitted_code.length > 0) {
//                 setActiveFile(selectedSubmission.submitted_code[0]);
//             } else {
//                 setActiveFile(null);
//             }
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();
//             setSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? { ...sub, ...updatedSubmission } : sub)
//             );
//             setSelectedSubmission(prev => prev ? { ...prev, ...updatedSubmission } : null);
//             alert('Feedback saved successfully!');
//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading submissions...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8">
//             <header className="flex-shrink-0 flex justify-between items-center mb-6 pb-4 border-b">
//                 <h1 className="text-3xl font-bold tracking-tight">Review Submissions</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>
            
//             <div className="flex-grow grid md:grid-cols-4 gap-6 overflow-hidden">
//                 <Card className="md:col-span-1 flex flex-col">
//                     <CardHeader>
//                         <CardTitle>Students</CardTitle>
//                         <CardDescription>Select a student to review their work.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="flex-grow overflow-y-auto">
//                         {submissions.length === 0 ? (
//                             <p className="text-muted-foreground">No submissions yet.</p>
//                         ) : (
//                             <ul className="space-y-2">
//                                 {submissions.map(sub => (
//                                     <li key={sub.id}>
//                                         <button 
//                                             onClick={() => setSelectedSubmission(sub)}
//                                             className={`w-full text-left p-3 rounded-md border ${selectedSubmission?.id === sub.id ? 'bg-accent text-accent-foreground border-transparent' : 'hover:bg-accent'}`}
//                                         >
//                                             <p className="font-semibold">{sub.username}</p>
//                                             <p className="text-xs text-muted-foreground">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
//                                             {sub.grade && <p className="text-xs font-bold text-green-600 mt-1">Graded: {sub.grade}</p>}
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <main className="md:col-span-3 flex flex-col bg-background rounded-lg">
//                     {selectedSubmission ? (
//                         <div className="flex-grow grid lg:grid-cols-3 gap-6 overflow-hidden">
//                             <div className="lg:col-span-2 flex flex-col">
//                                 <Card className="flex-grow flex flex-col">
//                                     <CardHeader>
//                                         <CardTitle>Submitted Code</CardTitle>
//                                         <CardDescription>From: {selectedSubmission.username}</CardDescription>
//                                     </CardHeader>
//                                     <CardContent className="flex-grow flex gap-4">
//                                         <div className="w-1/3 border-r pr-4 overflow-y-auto">
//                                             <h4 className="font-semibold mb-2">Files</h4>
//                                             <ul className="space-y-2">
//                                                 {Array.isArray(selectedSubmission.submitted_code) && selectedSubmission.submitted_code.map((file, index) => (
//                                                     <li key={file.id || index}>
//                                                         <button 
//                                                             onClick={() => setActiveFile(file)}
//                                                             className={`w-full text-left p-2 rounded-md text-sm ${activeFile?.id === file.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
//                                                         >
//                                                           {/* CORRECTED: Use the renamed FileIcon component */}
//                                                           <FileIcon className="inline-block mr-2 h-4 w-4" />
//                                                           {file.filename}
//                                                         </button>
//                                                     </li>
//                                                 ))}
//                                             </ul>
//                                         </div>
//                                         <div className="w-2/3 border rounded-md">
//                                             <Editor
//                                                 height="100%"
//                                                 path={activeFile?.filename}
//                                                 value={activeFile?.content}
//                                                 theme="vs-light"
//                                                 options={{ readOnly: true, minimap: { enabled: false } }}
//                                             />
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                             <div className="lg:col-span-1">
//                                 <Card>
//                                     <CardHeader>
//                                         <CardTitle>Feedback & Grade</CardTitle>
//                                     </CardHeader>
//                                     <CardContent>
//                                         <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="grade">Grade</Label>
//                                                 <Input 
//                                                     id="grade"
//                                                     value={grade}
//                                                     onChange={(e) => setGrade(e.target.value)}
//                                                     placeholder="e.g., A+, 95/100"
//                                                 />
//                                             </div>
//                                             <div className="space-y-2 flex-grow flex flex-col">
//                                                 <Label htmlFor="feedback">Feedback</Label>
//                                                 <Textarea 
//                                                     id="feedback"
//                                                     value={feedback}
//                                                     onChange={(e) => setFeedback(e.target.value)}
//                                                     className="flex-grow"
//                                                     placeholder="Provide constructive feedback..."
//                                                     rows={10}
//                                                 />
//                                             </div>
//                                             <Button 
//                                                 type="submit"
//                                                 disabled={isSubmittingFeedback}
//                                             >
//                                                 {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                             </Button>
//                                         </form>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full text-muted-foreground">
//                             <p>Select a submission to view the code.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;


// mvp
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This page is now updated to display a full history
//  * of submissions for each student, allowing the teacher to review
//  * each attempt.
//  */
// import React, { useState, useEffect, useMemo } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission } from '../types';
// import Editor from '@monaco-editor/react';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [allSubmissions, setAllSubmissions] = useState<Submission[]>([]);
//     const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchSubmissions = async () => {
//             if (!lessonId) return;
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data: Submission[] = await response.json();
//                 setAllSubmissions(data);
//                 // If there are submissions, select the first student by default.
//                 if (data.length > 0) {
//                     const firstStudent = data[0].username;
//                     setSelectedStudent(firstStudent);
//                     setSelectedSubmission(data[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     // This useMemo hook groups all submissions by username.
//     // It only recalculates when the list of all submissions changes.
//     const submissionsByStudent = useMemo(() => {
//         return allSubmissions.reduce((acc, sub) => {
//             (acc[sub.username] = acc[sub.username] || []).push(sub);
//             return acc;
//         }, {} as Record<string, Submission[]>);
//     }, [allSubmissions]);

//     // When a new submission is selected, update the form fields.
//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();
            
//             // Update the UI with the new feedback and grade.
//             setAllSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? { ...sub, ...updatedSubmission } : sub)
//             );
//             setSelectedSubmission(prev => prev ? { ...prev, ...updatedSubmission } : null);
//             alert('Feedback saved successfully!');

//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading submissions...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8">
//             <header className="flex-shrink-0 flex justify-between items-center mb-6 pb-4 border-b">
//                 <h1 className="text-3xl font-bold tracking-tight">Review Submissions</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>
            
//             <div className="flex-grow grid md:grid-cols-4 gap-6 overflow-hidden">
//                 <Card className="md:col-span-1 flex flex-col">
//                     <CardHeader>
//                         <CardTitle>Students</CardTitle>
//                     </CardHeader>
//                     <CardContent className="flex-grow overflow-y-auto">
//                         {Object.keys(submissionsByStudent).length === 0 ? (
//                             <p className="text-muted-foreground">No submissions yet.</p>
//                         ) : (
//                             <ul className="space-y-2">
//                                 {Object.keys(submissionsByStudent).map(username => (
//                                     <li key={username}>
//                                         <button 
//                                             onClick={() => {
//                                                 setSelectedStudent(username);
//                                                 // Select the most recent submission for this student by default
//                                                 setSelectedSubmission(submissionsByStudent[username][0]);
//                                             }}
//                                             className={`w-full text-left p-3 rounded-md border ${selectedStudent === username ? 'bg-accent text-accent-foreground border-transparent' : 'hover:bg-accent'}`}
//                                         >
//                                             <p className="font-semibold">{username}</p>
//                                             <p className="text-xs text-muted-foreground">{submissionsByStudent[username].length} submission(s)</p>
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <main className="md:col-span-3 flex flex-col bg-background rounded-lg">
//                     {selectedStudent && submissionsByStudent[selectedStudent] ? (
//                         <div className="flex-grow grid lg:grid-cols-3 gap-6 overflow-hidden">
//                             <div className="lg:col-span-2 flex flex-col">
//                                 <Card className="flex-grow flex flex-col">
//                                     <CardHeader>
//                                         <CardTitle>Viewing Code</CardTitle>
//                                         <CardDescription>
//                                             Submission from <span className="font-bold">{selectedStudent}</span>. 
//                                             Select a timestamp to view a specific version.
//                                         </CardDescription>
//                                     </CardHeader>
//                                     <CardContent className="flex-grow flex gap-4">
//                                         <div className="w-1/3 border-r pr-4 overflow-y-auto">
//                                             <h4 className="font-semibold mb-2">History</h4>
//                                             <ul className="space-y-2">
//                                                 {submissionsByStudent[selectedStudent].map(sub => (
//                                                     <li key={sub.id}>
//                                                         <button 
//                                                             onClick={() => setSelectedSubmission(sub)}
//                                                             className={`w-full text-left p-2 rounded-md text-sm ${selectedSubmission?.id === sub.id ? 'bg-muted font-semibold' : 'hover:bg-muted/50'}`}
//                                                         >
//                                                             {new Date(sub.submitted_at).toLocaleString()}
//                                                         </button>
//                                                     </li>
//                                                 ))}
//                                             </ul>
//                                         </div>
//                                         <div className="w-2/3 border rounded-md">
//                                             <Editor
//                                                 height="100%"
//                                                 value={selectedSubmission?.submitted_code || ''}
//                                                 language="javascript"
//                                                 theme="vs-light"
//                                                 options={{ readOnly: true, minimap: { enabled: false } }}
//                                             />
//                                         </div>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                             <div className="lg:col-span-1">
//                                 <Card>
//                                     <CardHeader>
//                                         <CardTitle>Feedback & Grade</CardTitle>
//                                     </CardHeader>
//                                     <CardContent>
//                                         <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
//                                             <div className="space-y-2">
//                                                 <Label htmlFor="grade">Grade</Label>
//                                                 <Input 
//                                                     id="grade"
//                                                     value={grade}
//                                                     onChange={(e) => setGrade(e.target.value)}
//                                                     placeholder="e.g., A+, 95/100"
//                                                 />
//                                             </div>
//                                             <div className="space-y-2 flex-grow flex flex-col">
//                                                 <Label htmlFor="feedback">Feedback</Label>
//                                                 <Textarea 
//                                                     id="feedback"
//                                                     value={feedback}
//                                                     onChange={(e) => setFeedback(e.target.value)}
//                                                     className="flex-grow"
//                                                     placeholder="Provide constructive feedback..."
//                                                     rows={10}
//                                                 />
//                                             </div>
//                                             <Button 
//                                                 type="submit"
//                                                 disabled={isSubmittingFeedback}
//                                             >
//                                                 {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                             </Button>
//                                         </form>
//                                     </CardContent>
//                                 </Card>
//                             </div>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full text-muted-foreground">
//                             <p>Select a student to view their submissions.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission } from '../types';
// import Editor from '@monaco-editor/react';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [submissions, setSubmissions] = useState<Submission[]>([]);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchSubmissions = async () => {
//             if (!lessonId) return;
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data = await response.json();
//                 setSubmissions(data);
//                 if (data.length > 0) {
//                     setSelectedSubmission(data[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();
//             setSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? updatedSubmission : sub)
//             );
//             setSelectedSubmission(updatedSubmission);
//             alert('Feedback saved successfully!');
//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-8">Loading submissions...</div>;
//     if (error) return <div className="p-8 text-destructive">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8">
//             <header className="flex-shrink-0 flex justify-between items-center mb-6 pb-4 border-b">
//                 <h1 className="text-3xl font-bold tracking-tight">Review Submissions</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </header>
            
//             <div className="flex-grow grid md:grid-cols-3 gap-6 overflow-hidden">
//                 <Card className="md:col-span-1 flex flex-col">
//                     <CardHeader>
//                         <CardTitle>Students</CardTitle>
//                         <CardDescription>Select a student to review their work.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="flex-grow overflow-y-auto">
//                         {submissions.length === 0 ? (
//                             <p className="text-muted-foreground">No submissions yet.</p>
//                         ) : (
//                             <ul className="space-y-2">
//                                 {submissions.map(sub => (
//                                     <li key={sub.id}>
//                                         <button 
//                                             onClick={() => setSelectedSubmission(sub)}
//                                             className={`w-full text-left p-3 rounded-md border ${selectedSubmission?.id === sub.id ? 'bg-accent text-accent-foreground border-transparent' : 'hover:bg-accent'}`}
//                                         >
//                                             <p className="font-semibold">{sub.username}</p>
//                                             <p className="text-xs text-muted-foreground">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
//                                             {sub.grade && <p className="text-xs font-bold text-green-600 mt-1">Graded: {sub.grade}</p>}
//                                         </button>
//                                     </li>
//                                 ))}
//                             </ul>
//                         )}
//                     </CardContent>
//                 </Card>

//                 <main className="md:col-span-2 flex flex-col bg-background rounded-lg">
//                     {selectedSubmission ? (
//                         <div className="flex-grow grid lg:grid-cols-2 gap-6 overflow-hidden">
//                             <Card className="flex flex-col">
//                                 <CardHeader>
//                                     <CardTitle>Submitted Code</CardTitle>
//                                     <CardDescription>From: {selectedSubmission.username}</CardDescription>
//                                 </CardHeader>
//                                 <CardContent className="flex-grow border-t pt-4">
//                                     <div className="h-full w-full border rounded-md">
//                                         <Editor
//                                             height="100%"
//                                             value={selectedSubmission.submitted_code}
//                                             language="javascript"
//                                             theme="vs-light"
//                                             options={{ readOnly: true, minimap: { enabled: false } }}
//                                         />
//                                     </div>
//                                 </CardContent>
//                             </Card>
//                             <Card>
//                                 <CardHeader>
//                                     <CardTitle>Feedback & Grade</CardTitle>
//                                 </CardHeader>
//                                 <CardContent>
//                                     <form onSubmit={handleSaveFeedback} className="flex flex-col gap-4 h-full">
//                                         <div className="space-y-2">
//                                             <Label htmlFor="grade">Grade</Label>
//                                             <Input 
//                                                 id="grade"
//                                                 value={grade}
//                                                 onChange={(e) => setGrade(e.target.value)}
//                                                 placeholder="e.g., A+, 95/100"
//                                             />
//                                         </div>
//                                         <div className="space-y-2 flex-grow flex flex-col">
//                                             <Label htmlFor="feedback">Feedback</Label>
//                                             <Textarea 
//                                                 id="feedback"
//                                                 value={feedback}
//                                                 onChange={(e) => setFeedback(e.target.value)}
//                                                 className="flex-grow"
//                                                 placeholder="Provide constructive feedback..."
//                                             />
//                                         </div>
//                                         <Button 
//                                             type="submit"
//                                             disabled={isSubmittingFeedback}
//                                         >
//                                             {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                         </Button>
//                                     </form>
//                                 </CardContent>
//                             </Card>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full text-muted-foreground">
//                             <p>Select a submission to view the code.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (FULLY IMPLEMENTED)
//  * =================================================================
//  * DESCRIPTION: This is the complete teacher-facing page for viewing
//  * and grading submissions, now using React Router for navigation.
//  */
// import React, { useState, useEffect } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { Submission } from '../types';
// import Editor from '@monaco-editor/react';

// const SubmissionsPage: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     const [submissions, setSubmissions] = useState<Submission[]>([]);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchSubmissions = async () => {
//             if (!lessonId) return;
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data = await response.json();
//                 setSubmissions(data);
//                 if (data.length > 0) {
//                     setSelectedSubmission(data[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();
//             setSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? updatedSubmission : sub)
//             );
//             setSelectedSubmission(updatedSubmission);
//             alert('Feedback saved successfully!');
//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <div className="p-4">Loading submissions...</div>;
//     if (error) return <div className="p-4 text-red-500">{error}</div>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <h1 className="text-3xl font-bold text-gray-800">Review Submissions</h1>
//                 <button onClick={() => navigate('/dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>
            
//             <div className="flex-grow flex gap-4 overflow-hidden">
//                 <aside className="w-1/4 flex-shrink-0 bg-white p-4 rounded-lg shadow-md overflow-y-auto">
//                     <h2 className="text-xl font-semibold mb-4">Students</h2>
//                     {submissions.length === 0 ? (
//                         <p>No submissions yet.</p>
//                     ) : (
//                         <ul className="space-y-2">
//                             {submissions.map(sub => (
//                                 <li key={sub.id}>
//                                     <button 
//                                         onClick={() => setSelectedSubmission(sub)}
//                                         className={`w-full text-left p-3 rounded-md ${selectedSubmission?.id === sub.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50'}`}
//                                     >
//                                         <p className="font-bold">{sub.username}</p>
//                                         <p className="text-xs text-gray-500">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
//                                         {sub.grade && <p className="text-xs font-bold text-green-600 mt-1">Graded: {sub.grade}</p>}
//                                     </button>
//                                 </li>
//                             ))}
//                         </ul>
//                     )}
//                 </aside>

//                 <main className="flex-grow flex flex-col bg-white p-4 rounded-lg shadow-md">
//                     {selectedSubmission ? (
//                         <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
//                             <div className="flex-1 flex flex-col">
//                                 <h3 className="text-lg font-semibold mb-2">Viewing submission from: {selectedSubmission.username}</h3>
//                                 <div className="flex-grow border border-gray-300 rounded-md overflow-hidden">
//                                     <Editor
//                                         height="100%"
//                                         value={selectedSubmission.submitted_code}
//                                         language="javascript"
//                                         theme="vs-light"
//                                         options={{ readOnly: true }}
//                                     />
//                                 </div>
//                             </div>
//                             <form onSubmit={handleSaveFeedback} className="w-full md:w-1/3 flex flex-col gap-4">
//                                 <h3 className="text-lg font-semibold">Feedback & Grade</h3>
//                                 <div>
//                                     <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Grade</label>
//                                     <input 
//                                         type="text" 
//                                         id="grade"
//                                         value={grade}
//                                         onChange={(e) => setGrade(e.target.value)}
//                                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
//                                         placeholder="e.g., A+, 95/100"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">Feedback</label>
//                                     <textarea 
//                                         id="feedback"
//                                         value={feedback}
//                                         onChange={(e) => setFeedback(e.target.value)}
//                                         rows={10}
//                                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
//                                         placeholder="Provide constructive feedback..."
//                                     />
//                                 </div>
//                                 <button 
//                                     type="submit"
//                                     disabled={isSubmittingFeedback}
//                                     className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
//                                 >
//                                     {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                 </button>
//                             </form>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full">
//                             <p className="text-gray-500">Select a submission to view the code.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { SubmissionsPageProps, Submission } from '../types';
// import Editor from '@monaco-editor/react';

// const SubmissionsPage: React.FC<SubmissionsPageProps> = ({ setRoute, lessonId }) => {
//     const [submissions, setSubmissions] = useState<Submission[]>([]);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     // NEW: State for the feedback form
//     const [feedback, setFeedback] = useState('');
//     const [grade, setGrade] = useState('');
//     const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

//     useEffect(() => {
//         const token = localStorage.getItem('authToken');
//         const fetchSubmissions = async () => {
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data = await response.json();
//                 setSubmissions(data);
//                 if (data.length > 0) {
//                     setSelectedSubmission(data[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     // NEW: When a new submission is selected, update the form fields.
//     useEffect(() => {
//         if (selectedSubmission) {
//             setFeedback(selectedSubmission.feedback || '');
//             setGrade(selectedSubmission.grade || '');
//         }
//     }, [selectedSubmission]);

//     const handleSaveFeedback = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!selectedSubmission) return;

//         setIsSubmittingFeedback(true);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch(`http://localhost:5000/api/lessons/submissions/${selectedSubmission.id}`, {
//                 method: 'PATCH',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ feedback, grade })
//             });

//             if (!response.ok) throw new Error('Failed to save feedback.');

//             const updatedSubmission = await response.json();

//             // Update the UI with the new feedback and grade without needing a full refetch.
//             setSubmissions(prev => 
//                 prev.map(sub => sub.id === updatedSubmission.id ? updatedSubmission : sub)
//             );
//             setSelectedSubmission(updatedSubmission);
//             alert('Feedback saved successfully!');

//         } catch (err) {
//             if (err instanceof Error) alert(err.message);
//         } finally {
//             setIsSubmittingFeedback(false);
//         }
//     };

//     if (isLoading) return <p>Loading submissions...</p>;
//     if (error) return <p className="text-red-500">{error}</p>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <h1 className="text-3xl font-bold text-gray-800">Review Submissions</h1>
//                 <button onClick={() => setRoute('dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>
            
//             <div className="flex-grow flex gap-4 overflow-hidden">
//                 <aside className="w-1/4 flex-shrink-0 bg-white p-4 rounded-lg shadow-md overflow-y-auto">
//                     <h2 className="text-xl font-semibold mb-4">Students</h2>
//                     {submissions.length === 0 ? (
//                         <p>No submissions yet.</p>
//                     ) : (
//                         <ul className="space-y-2">
//                             {submissions.map(sub => (
//                                 <li key={sub.id}>
//                                     <button 
//                                         onClick={() => setSelectedSubmission(sub)}
//                                         className={`w-full text-left p-3 rounded-md ${selectedSubmission?.id === sub.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50'}`}
//                                     >
//                                         <p className="font-bold">{sub.username}</p>
//                                         <p className="text-xs text-gray-500">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
//                                         {sub.grade && <p className="text-xs font-bold text-green-600 mt-1">Graded: {sub.grade}</p>}
//                                     </button>
//                                 </li>
//                             ))}
//                         </ul>
//                     )}
//                 </aside>

//                 <main className="flex-grow flex flex-col bg-white p-4 rounded-lg shadow-md">
//                     {selectedSubmission ? (
//                         <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
//                             {/* Code Editor Section */}
//                             <div className="flex-1 flex flex-col">
//                                 <h3 className="text-lg font-semibold mb-2">Viewing submission from: {selectedSubmission.username}</h3>
//                                 <div className="flex-grow border border-gray-300 rounded-md overflow-hidden">
//                                     <Editor
//                                         height="100%"
//                                         value={selectedSubmission.submitted_code}
//                                         language="javascript" // This should eventually come from the lesson object
//                                         theme="vs-light"
//                                         options={{ readOnly: true }}
//                                     />
//                                 </div>
//                             </div>
//                             {/* Feedback Form Section */}
//                             <form onSubmit={handleSaveFeedback} className="w-full md:w-1/3 flex flex-col gap-4">
//                                 <h3 className="text-lg font-semibold">Feedback & Grade</h3>
//                                 <div>
//                                     <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Grade</label>
//                                     <input 
//                                         type="text" 
//                                         id="grade"
//                                         value={grade}
//                                         onChange={(e) => setGrade(e.target.value)}
//                                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
//                                         placeholder="e.g., A+, 95/100"
//                                     />
//                                 </div>
//                                 <div>
//                                     <label htmlFor="feedback" className="block text-sm font-medium text-gray-700">Feedback</label>
//                                     <textarea 
//                                         id="feedback"
//                                         value={feedback}
//                                         onChange={(e) => setFeedback(e.target.value)}
//                                         rows={10}
//                                         className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
//                                         placeholder="Provide constructive feedback..."
//                                     />
//                                 </div>
//                                 <button 
//                                     type="submit"
//                                     disabled={isSubmittingFeedback}
//                                     className="w-full py-2 px-4 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400"
//                                 >
//                                     {isSubmittingFeedback ? 'Saving...' : 'Save Feedback'}
//                                 </button>
//                             </form>
//                         </div>
//                     ) : (
//                         <div className="flex items-center justify-center h-full">
//                             <p className="text-gray-500">Select a submission to view the code.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   SubmissionsPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useEffect } from 'react';
// import type { SubmissionsPageProps, Submission } from '../types';
// import Editor from '@monaco-editor/react';

// const SubmissionsPage: React.FC<SubmissionsPageProps> = ({ setRoute, lessonId }) => {
//     const [submissions, setSubmissions] = useState<Submission[]>([]);
//     const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);

//     useEffect(() => {
//         const fetchSubmissions = async () => {
//             const token = localStorage.getItem('authToken');
//             try {
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/submissions`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) {
//                     const data = await response.json();
//                     throw new Error(data.error || 'Failed to fetch submissions.');
//                 }
//                 const data = await response.json();
//                 setSubmissions(data);
//                 if (data.length > 0) {
//                     setSelectedSubmission(data[0]);
//                 }
//             } catch (err) {
//                 if (err instanceof Error) setError(err.message);
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchSubmissions();
//     }, [lessonId]);

//     if (isLoading) return <p>Loading submissions...</p>;
//     if (error) return <p className="text-red-500">{error}</p>;

//     return (
//         <div className="w-full h-screen flex flex-col p-4 bg-gray-100">
//             <header className="flex-shrink-0 flex justify-between items-center mb-4 pb-4 border-b">
//                 <h1 className="text-3xl font-bold text-gray-800">Review Submissions</h1>
//                 <button onClick={() => setRoute('dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </header>
            
//             <div className="flex-grow flex gap-4 overflow-hidden">
//                 <aside className="w-1/4 flex-shrink-0 bg-white p-4 rounded-lg shadow-md overflow-y-auto">
//                     <h2 className="text-xl font-semibold mb-4">Students</h2>
//                     {submissions.length === 0 ? <p>No submissions yet.</p> : (
//                         <ul className="space-y-2">
//                             {submissions.map(sub => (
//                                 <li key={sub.id}>
//                                     <button 
//                                         onClick={() => setSelectedSubmission(sub)}
//                                         className={`w-full text-left p-3 rounded-md ${selectedSubmission?.id === sub.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-50'}`}
//                                     >
//                                         <p className="font-bold">{sub.username}</p>
//                                         <p className="text-xs text-gray-500">Submitted: {new Date(sub.submitted_at).toLocaleString()}</p>
//                                     </button>
//                                 </li>
//                             ))}
//                         </ul>
//                     )}
//                 </aside>

//                 <main className="flex-grow flex flex-col bg-white p-4 rounded-lg shadow-md">
//                     {selectedSubmission ? (
//                         <>
//                             <h3 className="text-lg font-semibold mb-2">Viewing submission from: {selectedSubmission.username}</h3>
//                             <div className="flex-grow border border-gray-300 rounded-md overflow-hidden">
//                                 <Editor
//                                     height="100%"
//                                     value={selectedSubmission.submitted_code}
//                                     theme="vs-light"
//                                     options={{ readOnly: true }}
//                                 />
//                             </div>
//                         </>
//                     ) : (
//                         <div className="flex items-center justify-center h-full">
//                             <p className="text-gray-500">Select a submission to view the code.</p>
//                         </div>
//                     )}
//                 </main>
//             </div>
//         </div>
//     );
// };

// export default SubmissionsPage;
