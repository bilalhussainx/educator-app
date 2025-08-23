import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { AscentIdeData, Submission } from '../types/index.ts';
import Editor from '@monaco-editor/react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import analytics from '../services/analyticsService.ts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toaster, toast } from 'sonner';
import { ChevronLeft, Send, Save, Award } from 'lucide-react';

const AscentWebIDE: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    const navigate = useNavigate();

    const [ideData, setIdeData] = useState<AscentIdeData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [htmlCode, setHtmlCode] = useState('');
    const [cssCode, setCssCode] = useState('');
    const [jsCode, setJsCode] = useState('');

    const [activeFile, setActiveFile] = useState<'html' | 'css' | 'js'>('html');
    const [previewSrcDoc, setPreviewSrcDoc] = useState('');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submission, setSubmission] = useState<Submission | null>(null);

    const [startTime, setStartTime] = useState<number>(Date.now());
    const [codeChurn, setCodeChurn] = useState<number>(0);
    const prevCodeRef = useRef({ html: '', css: '', js: '' });

    useEffect(() => {
        const fetchIdeData = async () => {
            if (!lessonId) return;
            setIsLoading(true);
            const token = localStorage.getItem('authToken');
            try {
                const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/ascent-ide`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to load lesson data.');
                
                const data: AscentIdeData = await response.json();
                setIdeData(data);

                const html = data.files.find(f => f.filename === 'index.html')?.content || '';
                const css = data.files.find(f => f.filename === 'styles.css')?.content || '';
                const js = data.files.find(f => f.filename === 'script.js')?.content || '';

                setHtmlCode(html);
                setCssCode(css);
                setJsCode(js);

                prevCodeRef.current = { html, css, js };
                setStartTime(Date.now());
                setCodeChurn(0);
                analytics.track('Lesson Started', { lesson_id: data.lesson.id, lesson_title: data.lesson.title });

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setIsLoading(false);
            }
        };
        fetchIdeData();
    }, [lessonId]);
    
    useEffect(() => {
        const handler = setTimeout(() => {
            setPreviewSrcDoc(
                `<!DOCTYPE html><html><head><style>${cssCode}</style></head><body>${htmlCode}<script type="module">${jsCode}</script></body></html>`
            );

            const newTotalLines = (htmlCode.split('\n').length) + (cssCode.split('\n').length) + (jsCode.split('\n').length);
            const prevTotalLines = (prevCodeRef.current.html.split('\n').length) + (prevCodeRef.current.css.split('\n').length) + (prevCodeRef.current.js.split('\n').length);
            const churn = Math.abs(newTotalLines - prevTotalLines);
            
            if (churn > 0) {
                setCodeChurn(prev => prev + churn);
            }
            prevCodeRef.current = { html: htmlCode, css: cssCode, js: jsCode };

        }, 300); 

        return () => clearTimeout(handler);
    }, [htmlCode, cssCode, jsCode]);

    const handleSaveCode = async () => {
        if (!lessonId) return;
        setIsSaving(true);
        const token = localStorage.getItem('authToken');

        const filesPayload = [
            { filename: 'index.html', content: htmlCode },
            { filename: 'styles.css', content: cssCode },
            { filename: 'script.js', content: jsCode },
        ];
        
        const savePromise = fetch(`http://localhost:5000/api/lessons/${lessonId}/save-progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ files: filesPayload })
        }).then(res => {
            if (!res.ok) throw new Error('Failed to save progress.');
            return res.json();
        });
        
        toast.promise(savePromise, {
            loading: 'Saving your work...',
            success: 'Progress saved!',
            error: (err) => err.message,
        });
        
        savePromise.finally(() => setIsSaving(false));
    };

    const handleSubmit = async () => {
        if (!lessonId) return;
        setIsSubmitting(true);
        const token = localStorage.getItem('authToken');

        const filesPayload = [
            { filename: 'index.html', content: htmlCode },
            { filename: 'styles.css', content: cssCode },
            { filename: 'script.js', content: jsCode },
        ];

        const submissionPayload = {
            files: filesPayload,
            time_to_solve_seconds: Math.round((Date.now() - startTime) / 1000),
            code_churn: codeChurn,
        };
        
        analytics.track('Solution Submitted', { ...submissionPayload, lesson_id: lessonId });
        
        const submitPromise = fetch(`http://localhost:5000/api/lessons/${lessonId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(submissionPayload)
        }).then(async (res) => {
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Submission failed.');
            }
            return res.json();
        });
        
        toast.promise(submitPromise, {
            loading: 'Submitting your solution...',
            success: (data) => data.message || "Project submitted successfully!",
            error: (err) => err.message,
        });
        
        submitPromise.finally(() => setIsSubmitting(false));
    };

    const renderActiveEditor = () => {
        switch (activeFile) {
            case 'html':
                return <Editor language="html" theme="vs-dark" value={htmlCode} onChange={(val) => setHtmlCode(val || '')} options={{ minimap: { enabled: false }, padding: { top: 12 } }} />;
            case 'css':
                return <Editor language="css" theme="vs-dark" value={cssCode} onChange={(val) => setCssCode(val || '')} options={{ minimap: { enabled: false }, padding: { top: 12 } }} />;
            case 'js':
                return <Editor language="javascript" theme="vs-dark" value={jsCode} onChange={(val) => setJsCode(val || '')} options={{ minimap: { enabled: false }, padding: { top: 12 } }} />;
        }
    };

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
                <p className="text-xs text-slate-500 mt-4">
                    Graded on: {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
            </CardContent>
        </Card>
    );
    
    if (isLoading) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Initializing Web IDE...</div>;
    if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;
    
    return (
        <div className="w-full h-[calc(100vh-2rem)] bg-[#0a091a] text-white flex flex-col font-sans overflow-hidden -m-4 sm:-m-6 lg:-m-8">
            <Toaster theme="dark" richColors position="bottom-right" />
            
            <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60 z-30">
                 <div className="flex items-center gap-2">
                     <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800 h-7 text-xs">
                         <ChevronLeft className="mr-1 h-3 w-3" /> Back
                     </Button>
                     <span className="text-slate-500 text-sm">/</span>
                     <h1 className="text-sm font-medium text-slate-200 truncate">{ideData.lesson.title}</h1>
                 </div>
                 <div className="flex items-center gap-2">
                     <Button onClick={handleSaveCode} disabled={isSaving} variant="outline" size="sm" className="text-slate-300 border-slate-700 hover:bg-slate-800 h-7 text-xs">
                         <Save className="mr-1 h-3 w-3"/>Save
                     </Button>
                     <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium h-7 text-xs">
                         <Send className="mr-1 h-3 w-3"/>Submit
                     </Button>
                 </div>
            </header>

            <main className="flex-1 min-h-0">
                <PanelGroup direction="horizontal" className="h-full">
                    <Panel defaultSize={35} minSize={25} className="flex flex-col bg-slate-900/40 border-r border-slate-800">
                         <div className="p-4 flex-grow overflow-y-auto prose prose-sm prose-invert prose-slate max-w-none">
                            <ReactMarkdown>
                                {ideData.lesson.description}
                            </ReactMarkdown>
                        </div>
                    </Panel>

                    {submission && (
                <FeedbackCard submission={submission} />
            )}
                    
                    <PanelResizeHandle className="w-1 bg-slate-800" />
                    
                    <Panel defaultSize={65} minSize={35}>
                        <PanelGroup direction="vertical">
                            <Panel defaultSize={60} minSize={20} className="flex flex-col">
                                <div className="px-2 py-1 border-b border-slate-800 bg-slate-900">
                                    <button onClick={() => setActiveFile('html')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'html' ? "bg-slate-800 text-white" : "text-slate-400")}>index.html</button>
                                    <button onClick={() => setActiveFile('css')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'css' ? "bg-slate-800 text-white" : "text-slate-400")}>styles.css</button>
                                    <button onClick={() => setActiveFile('js')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'js' ? "bg-slate-800 text-white" : "text-slate-400")}>script.js</button>
                                </div>
                                <div className="flex-grow overflow-hidden">
                                    {renderActiveEditor()}
                                </div>
                            </Panel>

                            <PanelResizeHandle className="h-1 bg-slate-800" />

                            <Panel defaultSize={40} minSize={20}>
                                <iframe
                                    srcDoc={previewSrcDoc}
                                    title="Live Preview"
                                    sandbox="allow-scripts"
                                    width="100%"
                                    height="100%"
                                    className="bg-white"
                                />
                            </Panel>
                        </PanelGroup>
                    </Panel>
                </PanelGroup>
            </main>
        </div>
    );
};

export default AscentWebIDE;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   AscentWebIDE.tsx (NEW FILE for Frontend Projects)
//  * =================================================================
//  * DESCRIPTION: A three-panel IDE for HTML/CSS/JS projects with a live preview.
//  *              Modeled after the original AscentIDE.tsx.
//  */
// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import type { AscentIdeData, LessonFile } from '../types/index.ts'; // Re-use your existing types
// import Editor from '@monaco-editor/react';
// import { cn } from "@/lib/utils";
// import ReactMarkdown from 'react-markdown';

// // --- UI Components & Icons (re-used from your original IDE) ---
// import { Button } from "@/components/ui/button";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Toaster, toast } from 'sonner';
// import { ChevronLeft, NotebookPen, FileCode, BeakerIcon, Send, Save } from 'lucide-react';

// // --- Main Ascent Web IDE Component ---
// const AscentWebIDE: React.FC = () => {
//     const { lessonId } = useParams<{ lessonId: string }>();
//     const navigate = useNavigate();

//     // --- State Management ---
//     const [/, setIdeData] = useState<AscentIdeData | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
    
//     // State for each language's code content
//     const [htmlCode, setHtmlCode] = useState('');
//     const [cssCode, setCssCode] = useState('');
//     const [jsCode, setJsCode] = useState('');

//     const [activeFile, setActiveFile] = useState<'html' | 'css' | 'js'>('html');
//     const [previewSrcDoc, setPreviewSrcDoc] = useState('');

//     // --- Data Fetching ---
//     useEffect(() => {
//         const fetchIdeData = async () => {
//             if (!lessonId) return;
//             setIsLoading(true);
//             const token = localStorage.getItem('authToken');
//             try {
//                 // We use the SAME endpoint. The backend will provide the correct data.
//                 const response = await fetch(`http://localhost:5000/api/lessons/${lessonId}/ascent-ide`, {
//                     headers: { 'Authorization': `Bearer ${token}` }
//                 });
//                 if (!response.ok) throw new Error('Failed to load lesson data.');
                
//                 const data: AscentIdeData = await response.json();
//                 setIdeData(data);

//                 // Initialize code states from the fetched files
//                 setHtmlCode(data.files.find(f => f.filename === 'index.html')?.content || '');
//                 setCssCode(data.files.find(f => f.filename === 'styles.css')?.content || '');
//                 setJsCode(data.files.find(f => f.filename === 'script.js')?.content || '');

//             } catch (err) {
//                 setError(err instanceof Error ? err.message : 'Unknown error');
//             } finally {
//                 setIsLoading(false);
//             }
//         };
//         fetchIdeData();
//     }, [lessonId]);

//     // --- Live Preview Logic ---
//     useEffect(() => {
//         const handler = setTimeout(() => {
//             setPreviewSrcDoc(`
//                 <!DOCTYPE html>
//                 <html>
//                   <head>
//                     <style>${cssCode}</style>
//                   </head>
//                   <body>
//                     ${htmlCode}
//                     <script type="module">${jsCode}</script>
//                   </body>
//                 </html>
//             `);
//         }, 300); // Debounce to improve performance

//         return () => clearTimeout(handler);
//     }, [htmlCode, cssCode, jsCode]);

//     // --- Handlers (Simplified for this IDE) ---
//     const handleRunTests = () => {
//         // In a web IDE, "running tests" often means refreshing the preview and checking manually.
//         // Or, you could inject a test runner like Jest-DOM into the iframe, which is a more advanced feature.
//         toast.info("Preview updated! Check the results in the right panel.");
//     };

//     const handleSubmit = () => {
//         toast.success("Project submitted for review!");
//         // Here you would POST the htmlCode, cssCode, and jsCode to your submission endpoint.
//     };

//     const renderActiveEditor = () => {
//         switch (activeFile) {
//             case 'html':
//                 return <Editor language="html" theme="vs-dark" value={htmlCode} onChange={(val) => setHtmlCode(val || '')} options={{ minimap: { enabled: false } }} />;
//             case 'css':
//                 return <Editor language="css" theme="vs-dark" value={cssCode} onChange={(val) => setCssCode(val || '')} options={{ minimap: { enabled: false } }} />;
//             case 'js':
//                 return <Editor language="javascript" theme="vs-dark" value={jsCode} onChange={(val) => setJsCode(val || '')} options={{ minimap: { enabled: false } }} />;
//         }
//     };
    
//     if (isLoading) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-white">Initializing Web IDE...</div>;
//     if (error || !ideData) return <div className="h-screen bg-[#0a091a] flex items-center justify-center text-red-400">{error || 'Lesson data could not be loaded.'}</div>;
    
//     return (
//         <div className="w-full h-[calc(100vh-2rem)] bg-[#0a091a] text-white flex flex-col font-sans overflow-hidden -m-4 sm:-m-6 lg:-m-8">
//             <Toaster theme="dark" richColors position="bottom-right" />
            
//             {/* Header - A simplified version of your original */}
//             <header className="flex-shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-950/60 z-30">
//                 <div className="flex items-center gap-2">
//                     <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${ideData.courseId}/learn`)} className="hover:bg-slate-800 h-7 text-xs">
//                         <ChevronLeft className="mr-1 h-3 w-3" /> Back
//                     </Button>
//                     <span className="text-slate-500 text-sm">/</span>
//                     <h1 className="text-sm font-medium text-slate-200 truncate">{ideData.lesson.title}</h1>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {/* Simplified controls for the web IDE */}
//                     <Button variant="outline" size="sm" className="text-slate-300 border-slate-700 hover:bg-slate-800 h-7 text-xs">
//                         <Save className="mr-1 h-3 w-3"/>Save
//                     </Button>
//                     <Button variant="outline" size="sm" onClick={handleRunTests} className="text-cyan-300 border-cyan-500/80 hover:bg-cyan-500/20 h-7 text-xs">
//                         <BeakerIcon className="mr-1 h-3 w-3"/>Run
//                     </Button>
//                     <Button onClick={handleSubmit} className="bg-cyan-400 hover:bg-cyan-300 text-slate-900 font-medium h-7 text-xs">
//                         <Send className="mr-1 h-3 w-3"/>Submit
//                     </Button>
//                 </div>
//             </header>

//             <main className="flex-1 min-h-0">
//                 <PanelGroup direction="horizontal" className="h-full">
//                     {/* Left Panel - Problem Description */}
//                     <Panel defaultSize={35} minSize={25} className="flex flex-col bg-slate-900/40 border-r border-slate-800">
//                          <div className="p-4 flex-grow overflow-y-auto prose prose-sm prose-invert prose-slate max-w-none">
//                             <ReactMarkdown>
//                                 {ideData.lesson.description}
//                             </ReactMarkdown>
//                         </div>
//                     </Panel>
                    
//                     <PanelResizeHandle className="w-1 bg-slate-800" />
                    
//                     {/* Right Panel - Code & Live Preview */}
//                     <Panel defaultSize={65} minSize={35}>
//                         <PanelGroup direction="vertical">
//                             {/* Code Editor with Tabs */}
//                             <Panel defaultSize={60} minSize={20} className="flex flex-col">
//                                 <div className="px-2 py-1 border-b border-slate-800 bg-slate-900">
//                                     <button onClick={() => setActiveFile('html')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'html' ? "bg-slate-800 text-white" : "text-slate-400")}>index.html</button>
//                                     <button onClick={() => setActiveFile('css')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'css' ? "bg-slate-800 text-white" : "text-slate-400")}>styles.css</button>
//                                     <button onClick={() => setActiveFile('js')} className={cn("px-3 py-1 text-xs rounded-t-md", activeFile === 'js' ? "bg-slate-800 text-white" : "text-slate-400")}>script.js</button>
//                                 </div>
//                                 <div className="flex-grow overflow-hidden">
//                                     {renderActiveEditor()}
//                                 </div>
//                             </Panel>

//                             <PanelResizeHandle className="h-1 bg-slate-800" />

//                             {/* Live Preview Iframe */}
//                             <Panel defaultSize={40} minSize={20}>
//                                 <iframe
//                                     srcDoc={previewSrcDoc}
//                                     title="Live Preview"
//                                     sandbox="allow-scripts"
//                                     width="100%"
//                                     height="100%"
//                                     className="bg-white"
//                                 />
//                             </Panel>
//                         </PanelGroup>
//                     </Panel>
//                 </PanelGroup>
//             </main>
//         </div>
//     );
// };

// export default AscentWebIDE;