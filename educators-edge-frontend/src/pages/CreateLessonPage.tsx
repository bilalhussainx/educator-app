/*
 * =================================================================
 * FOLDER: src/pages/
 * FILE:   CreateLessonPage.tsx (REDESIGNED - Final, Complete Code)
 * =================================================================
 * DESCRIPTION: This is the complete and fully functional Lesson Foundry.
 * It uses a robust PanelGroup layout to solve all scrolling issues and
 * integrates all original logic for a seamless creation experience.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import type { LessonFile } from '../types';
// import { cn } from "@/lib/utils";

// --- APE Component ---
import { ConceptTagger, TaggedConcept } from '../components/ConceptTagger';

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { FilePlus2, XCircle, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, Lightbulb, Play, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import apiClient from '../services/apiClient';

// --- Type Definitions ---
type DiagnosticsTabKey = 'tests' | 'terminal';

// =================================================================
// --- Sub-Components for the Foundry Layout ---
// =================================================================

const InspectorPanel: React.FC<{
    title: string; setTitle: (v: string) => void;
    description: string; setDescription: (v: string) => void;
    objective: string; setObjective: (v: string) => void;
    taggedConcepts: TaggedConcept[]; setTaggedConcepts: (v: TaggedConcept[]) => void;
}> = ({ title, setTitle, description, setDescription, objective, setObjective, taggedConcepts, setTaggedConcepts }) => {
    return (
        <div className="h-full flex flex-col gap-4 p-4">
            <h2 className="text-xl font-bold text-slate-200 flex-shrink-0">Inspector</h2>
            <Accordion type="multiple" defaultValue={['details', 'ai']} className="w-full">
                <AccordionItem value="details" className="border-slate-700">
                    <AccordionTrigger className="text-base hover:no-underline">Lesson Details</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-slate-300">Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Recursion" className="bg-black/30 border-slate-600 focus:border-cyan-400" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-slate-300">Instructions</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." className="bg-black/30 border-slate-600 focus:border-cyan-400 resize-none" rows={8} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="ai" className="border-slate-700">
                    <AccordionTrigger className="text-base hover:no-underline text-amber-300">AI & Concepts</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-6">
                         <div className="space-y-2">
                            <Label htmlFor="objective" className="text-slate-300 flex items-center gap-2"><Lightbulb size={16}/> AI Directive</Label>
                            <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g., The student must solve this problem by having a function call itself." className="bg-black/30 border-slate-600 focus:border-amber-400 resize-none" rows={4}/>
                        </div>
                        <ConceptTagger value={taggedConcepts} onChange={setTaggedConcepts} />
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="config" className="border-slate-700">
                    <AccordionTrigger className="text-base hover:no-underline">Configuration</AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                       <p className="text-sm text-slate-500">Advanced settings like difficulty and prerequisites will be available here in a future update.</p>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
};

const WorkspacePanel: React.FC<{
    files: LessonFile[]; setFiles: (v: LessonFile[]) => void;
    activeFileId: string | null; setActiveFileId: (id: string | null) => void;
}> = ({ files, setFiles, activeFileId, setActiveFileId }) => {
    const handleAddFile = () => {
        const newFileName = prompt("Enter new boilerplate file name (e.g., helpers.js):");
        if (newFileName && !files.some(f => f.filename === newFileName)) {
            const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
            setFiles([...files, newFile]);
            setActiveFileId(newFile.id);
        } else if (newFileName) {
            toast.error("A file with that name already exists.");
        }
    };

    const handleRemoveFile = (fileIdToRemove: string) => {
        if (files.length <= 1) {
            toast.warning("A lesson must have at least one boilerplate file.");
            return;
        }
        const newFiles = files.filter(f => f.id !== fileIdToRemove);
        setFiles(newFiles);
        if (activeFileId === fileIdToRemove) {
            setActiveFileId(newFiles[0].id);
        }
    };

    const activeFile = files.find(f => f.id === activeFileId);

    return (
        <div className="h-full flex flex-col bg-slate-950/20">
            <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800 px-2">
                <Tabs value={activeFileId || ''} onValueChange={setActiveFileId} className="w-full">
                    <TabsList className="bg-transparent border-none p-0 h-10">
                        {files.map(file => (
                            <TabsTrigger key={file.id} value={file.id} className="relative group data-[state=active]:bg-slate-800/50 data-[state=active]:text-cyan-300">
                                {file.filename}
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }} className="absolute top-1.5 right-1 p-0.5 rounded-full hover:bg-slate-600 opacity-0 group-hover:opacity-100"><X className="h-3 w-3"/></button>
                            </TabsTrigger>
                        ))}
                         <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={handleAddFile}><FilePlus2 className="h-4 w-4"/></Button>
                    </TabsList>
                </Tabs>
            </div>
            <div className="flex-grow overflow-hidden">
                 <Editor
                    height="100%"
                    path={activeFile?.filename}
                    value={activeFile?.content}
                    onChange={(content) => setFiles(files.map(f => f.id === activeFileId ? { ...f, content: content || '' } : f))}
                    theme="vs-dark"
                    options={{ fontSize: 14, minimap: { enabled: false } }}
                />
            </div>
        </div>
    );
};

const DiagnosticsPanel: React.FC<{
    testCode: string; setTestCode: (v: string) => void;
    terminalRef: React.RefObject<HTMLDivElement>;
    activeTab: DiagnosticsTabKey;
    setActiveTab: (tab: DiagnosticsTabKey) => void;
}> = ({ testCode, setTestCode, terminalRef, activeTab, setActiveTab }) => {
    return (
        <div className="h-full flex flex-col bg-slate-900/40 border-l border-slate-800">
             <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DiagnosticsTabKey)} className="flex flex-col h-full">
                <TabsList className="grid w-full grid-cols-2 bg-slate-900">
                    <TabsTrigger value="tests"><BeakerIcon className="mr-2 h-4 w-4"/>Tests</TabsTrigger>
                    <TabsTrigger value="terminal"><TerminalIcon className="mr-2 h-4 w-4"/>Terminal</TabsTrigger>
                </TabsList>
                <TabsContent value="tests" className="flex-grow overflow-hidden">
                    <Editor
                        height="100%"
                        path="tests.js"
                        value={testCode}
                        onChange={(content) => setTestCode(content || '')}
                        theme="vs-dark"
                        options={{ fontSize: 14, minimap: { enabled: false }, wordWrap: 'on' }}
                    />
                </TabsContent>
                <TabsContent value="terminal" className="flex-grow overflow-hidden">
                    <div ref={terminalRef} className="h-full w-full p-2 bg-[#0D1117]" />
                </TabsContent>
            </Tabs>
        </div>
    );
};


// =================================================================
// --- Main CreateLessonPage Component ---
// =================================================================
const CreateLessonPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get('courseId');

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [objective, setObjective] = useState('');
    const [files, setFiles] = useState<LessonFile[]>([{ id: crypto.randomUUID(), filename: 'index.js', content: 'function solve() {\n  // Your code here\n}' }]);
    const [testCode, setTestCode] = useState('// Use console.assert for testing\n// console.assert(solve() === "expected", "Test Case 1 Failed");');
    const [activeFileId, setActiveFileId] = useState<string | null>(files[0]?.id || null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [taggedConcepts, setTaggedConcepts] = useState<TaggedConcept[]>([]);
    const [diagnosticsTab, setDiagnosticsTab] = useState<DiagnosticsTabKey>('terminal');

    const terminalRef = useRef<HTMLDivElement>(null);
    const term = useRef<Terminal | null>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        const wsBaseUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
        const wsInstance = new WebSocket(`${wsBaseUrl}?sessionId=${crypto.randomUUID()}`);
        ws.current = wsInstance;

        wsInstance.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'TERMINAL_OUT') {
                    term.current?.write(message.payload);
                }
            } catch (error) { console.error('WS Error:', error); }
        };

        if (terminalRef.current && !term.current) {
            const fitAddon = new FitAddon();
            const newTerm = new Terminal({
                cursorBlink: true,
                theme: { background: '#0D1117', foreground: '#c9d1d9' },
                fontSize: 14,
                fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
            });
            newTerm.loadAddon(fitAddon);
            newTerm.open(terminalRef.current);
            fitAddon.fit();
            term.current = newTerm;
            
            const resizeObserver = new ResizeObserver(() => { setTimeout(() => fitAddon.fit(), 0); });
            if (terminalRef.current) {
                resizeObserver.observe(terminalRef.current);
            }

            return () => {
                resizeObserver.disconnect();
                wsInstance.close();
                newTerm.dispose();
                term.current = null;
            };
        }

        return () => { wsInstance.close(); };
    }, []);

    const handleRunCode = () => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
            toast.error("Connection to execution service not available.");
            return;
        }
        
        setDiagnosticsTab('terminal');
        term.current?.clear();
        
        const fullCode = files.map(f => f.content).join('\n\n') + '\n\n' + testCode;
        const language = files[0]?.filename.endsWith('.py') ? 'python' : 'javascript';
        
        ws.current.send(JSON.stringify({ 
            type: 'RUN_CODE', 
            payload: { language, code: fullCode } 
        }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!courseId) {
            setFormError("Missing course context. Please navigate from a course management page.");
            return;
        }
        if (taggedConcepts.length === 0) {
            toast.warning("For the best adaptive experience, please tag at least one concept.");
        }
        setIsLoading(true);
        setFormError(null);
        try {
            await apiClient.post('/api/lessons', { title, description, objective, files, courseId, testCode, concepts: taggedConcepts });
            toast.success("Lesson created successfully!");
            navigate(`/courses/${courseId}/manage`);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to create lesson';
            setFormError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
             <Toaster theme="dark" richColors position="bottom-right" />
             <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
            <form onSubmit={handleSubmit} className="relative z-10 flex-grow flex flex-col">
                <header className="flex-shrink-0 flex justify-between items-center p-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" type="button" size="sm" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')} className="hover:bg-slate-800 hover:text-white">
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back to Course
                        </Button>
                        <span className="text-slate-500">/</span>
                        <span className="text-md font-semibold text-slate-300">Lesson Foundry</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" type="button" onClick={handleRunCode} className="border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200">
                            <Play className="mr-2 h-4 w-4" /> Run Tests
                        </Button>
                        <Button type="submit" disabled={isLoading || !courseId} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
                            {isLoading ? 'Saving...' : 'Save & Finalize Lesson'}
                        </Button>
                    </div>
                </header>
                
                {formError && (
                    <Alert variant="destructive" className="m-2 bg-red-950/40 border-red-500/30 text-red-300">
                        <XCircle className="h-5 w-5 text-red-400" />
                        <AlertTitle>Creation Error</AlertTitle>
                        <AlertDescription>{formError}</AlertDescription>
                    </Alert>
                )}
                
                <div className="flex-grow flex overflow-hidden">
                    <PanelGroup direction="horizontal">
                        <Panel defaultSize={30} minSize={25} className="overflow-y-auto">
                           <InspectorPanel
                                title={title} setTitle={setTitle}
                                description={description} setDescription={setDescription}
                                objective={objective} setObjective={setObjective}
                                taggedConcepts={taggedConcepts} setTaggedConcepts={setTaggedConcepts}
                            />
                        </Panel>
                        <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700 transition-colors" />
                        <Panel defaultSize={45} minSize={30}>
                            <WorkspacePanel
                                files={files} setFiles={setFiles}
                                activeFileId={activeFileId} setActiveFileId={setActiveFileId}
                            />
                        </Panel>
                        <PanelResizeHandle className="w-1 bg-slate-800 hover:bg-slate-700 transition-colors" />
                        <Panel defaultSize={25} minSize={20}>
                            <DiagnosticsPanel
                                testCode={testCode} setTestCode={setTestCode}
                                terminalRef={terminalRef}
                                activeTab={diagnosticsTab}
                                setActiveTab={setDiagnosticsTab}
                            />
                        </Panel>
                    </PanelGroup>
                </div>
            </form>
        </div>
    );
};

export default CreateLessonPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (REDESIGNED - Final, Complete Code)
//  * =================================================================
//  * DESCRIPTION: This is the complete and fully functional Lesson Foundry.
//  * It fixes UI bugs related to scrolling and restores the WebSocket-based
//  * terminal functionality, ensuring the "Run Tests" button works as intended.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';
// import { cn } from "@/lib/utils";

// // --- APE Component ---
// import { ConceptTagger, TaggedConcept } from '../components/ConceptTagger';

// // --- UI Components & Icons ---
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
// import { FilePlus2, XCircle, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, Lightbulb, Code, Play, X } from 'lucide-react';
// import { toast, Toaster } from 'sonner';

// // --- Type Definitions ---
// type DiagnosticsTabKey = 'tests' | 'terminal';

// // =================================================================
// // --- Sub-Components for the Foundry Layout ---
// // =================================================================

// // --- Zone 1: The Inspector Panel ---
// const InspectorPanel: React.FC<{
//     title: string; setTitle: (v: string) => void;
//     description: string; setDescription: (v: string) => void;
//     objective: string; setObjective: (v: string) => void;
//     taggedConcepts: TaggedConcept[]; setTaggedConcepts: (v: TaggedConcept[]) => void;
// }> = ({ title, setTitle, description, setDescription, objective, setObjective, taggedConcepts, setTaggedConcepts }) => {
//     return (
//         <div className="h-full flex flex-col gap-4 overflow-y-auto bg-slate-900/40 p-4 border-r border-slate-800">
//             <h2 className="text-xl font-bold text-slate-200 flex-shrink-0">Inspector</h2>
//             <Accordion type="multiple" defaultValue={['details', 'ai']} className="w-full">
//                 <AccordionItem value="details" className="border-slate-700">
//                     <AccordionTrigger className="text-base hover:no-underline">Lesson Details</AccordionTrigger>
//                     <AccordionContent className="pt-4 space-y-4">
//                         <div className="space-y-2">
//                             <Label htmlFor="title" className="text-slate-300">Title</Label>
//                             <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Recursion" className="bg-black/30 border-slate-600 focus:border-cyan-400" />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="description" className="text-slate-300">Instructions</Label>
//                             <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." className="bg-black/30 border-slate-600 focus:border-cyan-400 resize-none" rows={8} />
//                         </div>
//                     </AccordionContent>
//                 </AccordionItem>
//                 <AccordionItem value="ai" className="border-slate-700">
//                     <AccordionTrigger className="text-base hover:no-underline text-amber-300">AI & Concepts</AccordionTrigger>
//                     <AccordionContent className="pt-4 space-y-6">
//                          <div className="space-y-2">
//                             <Label htmlFor="objective" className="text-slate-300 flex items-center gap-2"><Lightbulb size={16}/> AI Directive</Label>
//                             <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g., The student must solve this problem by having a function call itself." className="bg-black/30 border-slate-600 focus:border-amber-400 resize-none" rows={4}/>
//                         </div>
//                         <ConceptTagger value={taggedConcepts} onChange={setTaggedConcepts} />
//                     </AccordionContent>
//                 </AccordionItem>
//                  <AccordionItem value="config" className="border-slate-700">
//                     <AccordionTrigger className="text-base hover:no-underline">Configuration</AccordionTrigger>
//                     <AccordionContent className="pt-4 space-y-4">
//                        <p className="text-sm text-slate-500">Advanced settings like difficulty and prerequisites will be available here in a future update.</p>
//                     </AccordionContent>
//                 </AccordionItem>
//             </Accordion>
//         </div>
//     );
// };


// // --- Zone 2: The Code Workspace ---
// const WorkspacePanel: React.FC<{
//     files: LessonFile[]; setFiles: (v: LessonFile[]) => void;
//     activeFileId: string | null; setActiveFileId: (id: string | null) => void;
// }> = ({ files, setFiles, activeFileId, setActiveFileId }) => {
    
//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new boilerplate file name (e.g., helpers.js):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             toast.error("A file with that name already exists.");
//         }
//     };

//     const handleRemoveFile = (fileIdToRemove: string) => {
//         if (files.length <= 1) {
//             toast.warning("A lesson must have at least one boilerplate file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToRemove);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToRemove) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const activeFile = files.find(f => f.id === activeFileId);

//     return (
//         <div className="h-full flex flex-col bg-slate-950/20">
//             <div className="flex-shrink-0 flex items-center justify-between border-b border-slate-800 px-2">
//                 <Tabs value={activeFileId || ''} onValueChange={setActiveFileId} className="w-full">
//                     <TabsList className="bg-transparent border-none p-0 h-10">
//                         {files.map(file => (
//                             <TabsTrigger key={file.id} value={file.id} className="relative group data-[state=active]:bg-slate-800/50 data-[state=active]:text-cyan-300">
//                                 {file.filename}
//                                 <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(file.id); }} className="absolute top-1.5 right-1 p-0.5 rounded-full hover:bg-slate-600 opacity-0 group-hover:opacity-100"><X className="h-3 w-3"/></button>
//                             </TabsTrigger>
//                         ))}
//                          <Button variant="ghost" size="icon" className="h-8 w-8 ml-2" onClick={handleAddFile}><FilePlus2 className="h-4 w-4"/></Button>
//                     </TabsList>
//                 </Tabs>
//             </div>
//             <div className="flex-grow overflow-hidden">
//                  <Editor
//                     height="100%"
//                     path={activeFile?.filename}
//                     value={activeFile?.content}
//                     onChange={(content) => setFiles(files.map(f => f.id === activeFileId ? { ...f, content: content || '' } : f))}
//                     theme="vs-dark"
//                     options={{ fontSize: 14, minimap: { enabled: false } }}
//                 />
//             </div>
//         </div>
//     );
// };


// // --- Zone 3: The Diagnostics Panel ---
// const DiagnosticsPanel: React.FC<{
//     testCode: string; setTestCode: (v: string) => void;
//     terminalRef: React.RefObject<HTMLDivElement>;
//     activeTab: DiagnosticsTabKey;
//     setActiveTab: (tab: DiagnosticsTabKey) => void;
// }> = ({ testCode, setTestCode, terminalRef, activeTab, setActiveTab }) => {
//     return (
//         <div className="h-full flex flex-col bg-slate-900/40 border-l border-slate-800">
//              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as DiagnosticsTabKey)} className="flex flex-col h-full">
//                 <TabsList className="grid w-full grid-cols-2 bg-slate-900">
//                     <TabsTrigger value="tests"><BeakerIcon className="mr-2 h-4 w-4"/>Tests</TabsTrigger>
//                     <TabsTrigger value="terminal"><TerminalIcon className="mr-2 h-4 w-4"/>Terminal</TabsTrigger>
//                 </TabsList>
//                 <TabsContent value="tests" className="flex-grow overflow-hidden">
//                     <Editor
//                         height="100%"
//                         path="tests.js"
//                         value={testCode}
//                         onChange={(content) => setTestCode(content || '')}
//                         theme="vs-dark"
//                         options={{ fontSize: 14, minimap: { enabled: false }, wordWrap: 'on' }}
//                     />
//                 </TabsContent>
//                 <TabsContent value="terminal" className="flex-grow overflow-hidden">
//                     <div ref={terminalRef} className="h-full w-full p-2 bg-[#0D1117]" />
//                 </TabsContent>
//             </Tabs>
//         </div>
//     );
// };


// // =================================================================
// // --- Main CreateLessonPage Component ---
// // =================================================================
// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [objective, setObjective] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([{ id: crypto.randomUUID(), filename: 'index.js', content: 'function solve() {\n  // Your code here\n}' }]);
//     const [testCode, setTestCode] = useState('// Use console.assert for testing\n// console.assert(solve() === "expected", "Test Case 1 Failed");');
//     const [activeFileId, setActiveFileId] = useState<string | null>(files[0]?.id || null);
//     const [formError, setFormError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const [taggedConcepts, setTaggedConcepts] = useState<TaggedConcept[]>([]);
//     const [diagnosticsTab, setDiagnosticsTab] = useState<DiagnosticsTabKey>('terminal');

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     useEffect(() => {
//         const wsInstance = new WebSocket(`ws://localhost:5000?sessionId=${crypto.randomUUID()}`);
//         ws.current = wsInstance;

//         wsInstance.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') {
//                     term.current?.write(message.payload);
//                 }
//             } catch (error) { console.error('WS Error:', error); }
//         };

//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#0D1117', foreground: '#c9d1d9' },
//                 fontSize: 14,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
//             term.current = newTerm;
            
//             const resizeObserver = new ResizeObserver(() => { setTimeout(() => fitAddon.fit(), 0); });
//             if (terminalRef.current) {
//                 resizeObserver.observe(terminalRef.current);
//             }

//             return () => {
//                 resizeObserver.disconnect();
//                 wsInstance.close();
//                 newTerm.dispose();
//                 term.current = null;
//             };
//         }

//         return () => { wsInstance.close(); };
//     }, []);

//     const handleRunCode = () => {
//         if (ws.current?.readyState !== WebSocket.OPEN) {
//             toast.error("Connection to execution service not available.");
//             return;
//         }
        
//         setDiagnosticsTab('terminal');
//         term.current?.clear();
        
//         const fullCode = files.map(f => f.content).join('\n\n') + '\n\n' + testCode;
//         const language = files[0]?.filename.endsWith('.py') ? 'python' : 'javascript';
        
//         ws.current.send(JSON.stringify({ 
//             type: 'RUN_CODE', 
//             payload: { language, code: fullCode } 
//         }));
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) { setFormError("Missing course context."); return; }
//         if (taggedConcepts.length === 0) { toast.warning("For the best adaptive experience, please tag at least one concept."); }
//         setIsLoading(true); setFormError(null);
//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
//                 body: JSON.stringify({ title, description, objective, files, courseId, testCode, concepts: taggedConcepts })
//             });
//             if (!response.ok) throw new Error((await response.json()).error || 'Failed to create lesson');
//             toast.success("Lesson created successfully!");
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             setFormError(err instanceof Error ? err.message : 'An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };
    
//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//              <Toaster theme="dark" richColors position="bottom-right" />
//              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             <form onSubmit={handleSubmit} className="relative z-10 flex-grow flex flex-col">
//                 <header className="flex-shrink-0 flex justify-between items-center p-2 border-b border-slate-800">
//                     <div className="flex items-center gap-2">
//                         <Button variant="ghost" type="button" size="sm" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')} className="hover:bg-slate-800 hover:text-white">
//                             <ChevronLeft className="h-4 w-4 mr-1" /> Back to Course
//                         </Button>
//                         <span className="text-slate-500">/</span>
//                         <span className="text-md font-semibold text-slate-300">Lesson Foundry</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                         <Button variant="outline" type="button" onClick={handleRunCode} className="border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200">
//                             <Play className="mr-2 h-4 w-4" /> Run Tests
//                         </Button>
//                         <Button type="submit" disabled={isLoading || !courseId} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                             {isLoading ? 'Saving...' : 'Save & Finalize Lesson'}
//                         </Button>
//                     </div>
//                 </header>
                
//                 {formError && (
//                     <Alert variant="destructive" className="m-2 bg-red-950/40 border-red-500/30 text-red-300">
//                         <XCircle className="h-5 w-5 text-red-400" />
//                         <AlertTitle>Creation Error</AlertTitle>
//                         <AlertDescription>{formError}</AlertDescription>
//                     </Alert>
//                 )}
                
//                 <div className="flex-grow flex overflow-hidden">
//                     <div className="w-[30%] min-w-[350px] max-w-[450px]">
//                        <InspectorPanel
//                             title={title} setTitle={setTitle}
//                             description={description} setDescription={setDescription}
//                             objective={objective} setObjective={setObjective}
//                             taggedConcepts={taggedConcepts} setTaggedConcepts={setTaggedConcepts}
//                         />
//                     </div>
                   
//                     <div className="flex-grow">
//                         <WorkspacePanel
//                             files={files} setFiles={setFiles}
//                             activeFileId={activeFileId} setActiveFileId={setActiveFileId}
//                         />
//                     </div>
                  
//                     <div className="w-[25%] min-w-[300px]">
//                         <DiagnosticsPanel
//                             testCode={testCode} setTestCode={setTestCode}
//                             terminalRef={terminalRef}
//                             activeTab={diagnosticsTab}
//                             setActiveTab={setDiagnosticsTab}
//                         />
//                     </div>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// MVP2
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (Final - With Concept Tagging)
//  * =================================================================
//  * DESCRIPTION: This is the CoreZenith Lesson IDE, updated to include
//  * the ConceptTagger component. This allows teachers to seamlessly tag
//  * lessons with APE concepts during creation, eliminating the need for
//  * manual database work.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';
// import { cn } from "@/lib/utils";

// // --- APE: Import the new ConceptTagger component and its types ---
// import { ConceptTagger, TaggedConcept } from '../components/ConceptTagger';

// // CoreZenith UI Components & Icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, XCircle, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, Lightbulb, Code } from 'lucide-react';

// // --- CoreZenith Styled Components ---
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)} {...props} />
// );

// // --- Main Component ---
// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     // --- State Management ---
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [objective, setObjective] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([{ id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }]);
//     const [testCode, setTestCode] = useState('// Write your unit tests here\n// Example: assert(add(2, 2) === 4, "Test Case 1 Failed");');
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
//     const [formError, setFormError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
    
//     // --- NEW STATE for concepts ---
//     const [taggedConcepts, setTaggedConcepts] = useState<TaggedConcept[]>([]);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     const activeFile = files.find(f => f.id === activeFileId);
//     const isTestFileActive = activeFileId === 'test-file';

//     useEffect(() => {
//         if (!courseId) {
//             setFormError("No course selected. Please create a lesson from the course management page.");
//             setTimeout(() => navigate('/dashboard'), 3000);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const wsInstance = new WebSocket(`ws://localhost:5000?sessionId=${crypto.randomUUID()}`);
//         ws.current = wsInstance;
//         wsInstance.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') term.current?.write(message.payload);
//             } catch (error) { console.error('WS Error:', error); }
//         };
//         return () => { wsInstance.close(); };
//     }, []);

//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' },
//                 fontSize: 14,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//                 scrollback: 1000,
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
//             const resizeObserver = new ResizeObserver(() => { setTimeout(() => fitAddon.fit(), 0); });
//             resizeObserver.observe(terminalRef.current);
//             return () => { resizeObserver.disconnect(); newTerm.dispose(); term.current = null; };
//         }
//     }, []);

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && newFileName !== 'tests.js' && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFormError("A file with that name already exists or is reserved.");
//         }
//     };
    
//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length > 0) {
//             const newFiles = files.filter(f => f.id !== fileIdToDelete);
//             setFiles(newFiles);
//             if (activeFileId === fileIdToDelete) {
//                 setActiveFileId(newFiles.length > 0 ? newFiles[0].id : 'test-file');
//             }
//         }
//     };

//     const handleRunCode = () => {
//         const fileToRun = isTestFileActive ? { content: testCode, filename: 'tests.js' } : activeFile;
//         if (!fileToRun || ws.current?.readyState !== WebSocket.OPEN) return;
//         const extension = fileToRun.filename.split('.').pop() || 'js';
//         const language = { js: 'javascript', py: 'python' }[extension] || 'plaintext';
//         ws.current.send(JSON.stringify({ type: 'RUN_CODE', payload: { language, code: fileToRun.content } }));
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) { setFormError("Missing course context."); return; }
//         setIsLoading(true); setFormError(null);
//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
//                 // Add the taggedConcepts to the payload sent to the backend
//                 body: JSON.stringify({ title, description, objective, files, courseId, testCode, concepts: taggedConcepts })
//             });
//             if (!response.ok) throw new Error((await response.json()).error || 'Failed to create lesson');
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             setFormError(err instanceof Error ? err.message : 'An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             <form onSubmit={handleSubmit} className="relative z-10 flex-grow flex flex-col gap-4 p-4">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <div className="flex items-center gap-4">
//                         <Button variant="ghost" type="button" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')} className="hover:bg-slate-800 hover:text-white">
//                             <ChevronLeft className="h-5 w-5" />
//                         </Button>
//                         <div>
//                             <h1 className="text-2xl font-bold tracking-tight">Lesson IDE</h1>
//                             <p className="text-sm text-slate-400">Constructing lesson for Course ID: {courseId || 'N/A'}</p>
//                         </div>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" type="button" onClick={handleRunCode} className="border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200">
//                             <Play className="mr-2 h-4 w-4" /> Run Active File
//                         </Button>
//                         <Button type="submit" size="lg" disabled={isLoading || !courseId} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                             {isLoading ? 'Saving...' : 'Save & Finalize Lesson'}
//                         </Button>
//                     </div>
//                 </header>
                
//                 {formError && (
//                     <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300">
//                         <XCircle className="h-5 w-5 text-red-400" />
//                         <AlertTitle className="font-bold text-red-200">Creation Error</AlertTitle>
//                         <AlertDescription>{formError}</AlertDescription>
//                     </Alert>
//                 )}

//                 <div className="flex-grow grid grid-cols-1 xl:grid-cols-4 gap-4 overflow-hidden">
//                     <aside className="xl:col-span-1 h-full flex flex-col gap-4 overflow-y-auto pr-2">
//                         <GlassCard>
//                             <CardHeader>
//                                 <CardTitle className="text-xl">Lesson Details</CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <div className="space-y-2">
//                                     <Label htmlFor="title" className="text-slate-300">Title</Label>
//                                     <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Recursion" className="bg-black/30 border-slate-600 focus:border-cyan-400" />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="description" className="text-slate-300">Instructions</Label>
//                                     <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." className="bg-black/30 border-slate-600 focus:border-cyan-400 resize-none" rows={6} />
//                                 </div>
//                             </CardContent>
//                         </GlassCard>
//                          <GlassCard className="border-fuchsia-500/30">
//                             <CardHeader>
//                                 <CardTitle className="text-xl flex items-center gap-2 text-fuchsia-300"><Lightbulb size={20}/> AI Directive</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="objective" className="text-slate-400 text-sm">Define the core concept for the AI to analyze.</Label>
//                                     <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g., The student must solve this problem by having a function call itself." className="bg-black/30 border-slate-600 focus:border-fuchsia-400 resize-none" rows={4}/>
//                                 </div>
//                             </CardContent>
//                         </GlassCard>
                        
//                         {/* --- ADD the new ConceptTagger component --- */}
//                         <ConceptTagger value={taggedConcepts} onChange={setTaggedConcepts} />

//                     </aside>
                    
//                     <main className="xl:col-span-3 h-full flex gap-4 overflow-hidden">
//                         <GlassCard className="w-1/4 flex flex-col">
//                            <CardHeader className="flex-shrink-0">
//                                 <CardTitle className="text-xl">File Navigator</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4 border-slate-600 hover:bg-slate-800" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                                 </Button>
//                                 <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mb-2">BOILERPLATE</p>
//                                 <ul className="space-y-1">
//                                     {files.map(file => (
//                                         <li key={file.id} className={cn('group flex items-center justify-between p-2 rounded-md cursor-pointer', activeFileId === file.id ? 'bg-cyan-500/10 text-cyan-300' : 'hover:bg-slate-800/60')}>
//                                             <div className="flex-grow flex items-center gap-2" onClick={() => setActiveFileId(file.id)}>
//                                                 <Code size={16} /><span>{file.filename}</span>
//                                             </div>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-red-500" /></Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                                 <div className="h-px bg-slate-700 my-4" />
//                                 <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mb-2">ASSESSMENT</p>
//                                 <ul>
//                                     <li className={cn('flex items-center p-2 rounded-md cursor-pointer', isTestFileActive ? 'bg-cyan-500/10 text-cyan-300' : 'hover:bg-slate-800/60')} onClick={() => setActiveFileId('test-file')}>
//                                         <div className="flex items-center gap-2"><BeakerIcon size={16} /><span>tests.js</span></div>
//                                     </li>
//                                 </ul>
//                             </CardContent>
//                         </GlassCard>

//                         <div className="w-3/4 flex flex-col border border-slate-700/80 rounded-lg overflow-hidden bg-slate-900/40">
//                            <PanelGroup direction="vertical">
//                                 <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                     <Editor
//                                         height="100%"
//                                         path={isTestFileActive ? 'tests.js' : activeFile?.filename}
//                                         value={isTestFileActive ? testCode : activeFile?.content}
//                                         onChange={(content) => { if (isTestFileActive) setTestCode(content || ''); else setFiles(files.map(f => f.id === activeFileId ? { ...f, content: content || '' } : f)); }}
//                                         theme="vs-dark"
//                                         options={{ fontSize: 14, minimap: { enabled: false } }}
//                                     />
//                                 </Panel>
//                                 <PanelResizeHandle className="h-2 bg-slate-800 hover:bg-slate-700 transition-colors" />
//                                 <Panel defaultSize={30} minSize={10} className="flex flex-col">
//                                     <div className="flex-shrink-0 px-3 py-1 bg-slate-800 text-sm font-semibold flex items-center text-slate-300">
//                                         <TerminalIcon className="h-4 w-4 mr-2" /><span>Terminal</span>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2" />
//                                 </Panel>
//                             </PanelGroup>
//                         </div>
//                     </main>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;
// MVP TERMINAL DOESN"T WORK
// // /*
// //  * =================================================================
// //  * FOLDER: src/pages/
// //  * FILE:   CreateLessonPage.tsx (UPDATED for CoreZenith)
// //  * =================================================================
// //  * DESCRIPTION: This is the CoreZenith Lesson IDE, a professional-grade
// //  * environment for creating lessons. It features an integrated file
// //  * navigator, editor, and terminal, with a prominent "AI Directive"
// //  * field to guide the platform's intelligence.
// //  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';
// import { cn } from "@/lib/utils";
// import { ConceptTagger, TaggedConcept } from '../components/ConceptTagger'; // Import the new component


// // CoreZenith UI Components & Icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, XCircle, Terminal as TerminalIcon, ChevronLeft, BeakerIcon, Lightbulb, Code } from 'lucide-react';

// // --- CoreZenith Styled Components ---
// const GlassCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
//     <Card className={cn("bg-slate-900/40 backdrop-blur-lg border border-slate-700/80 text-white", className)} {...props} />
// );

// // --- Main Component ---
// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     // NOTE: All state and functionality is preserved from the original file.
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [objective, setObjective] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([{ id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }]);
//     const [testCode, setTestCode] = useState('// Write your unit tests here\n// Example: assert(add(2, 2) === 4, "Test Case 1 Failed");');
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
//     const [formError, setFormError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//         // --- NEW STATE for concepts ---
//     const [taggedConcepts, setTaggedConcepts] = useState<TaggedConcept[]>([]);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);

//     const activeFile = files.find(f => f.id === activeFileId);
//     const isTestFileActive = activeFileId === 'test-file';

//     useEffect(() => {
//         if (!courseId) {
//             setFormError("No course selected. Please create a lesson from the course management page.");
//             setTimeout(() => navigate('/dashboard'), 3000);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const wsInstance = new WebSocket(`ws://localhost:5000?sessionId=${crypto.randomUUID()}`);
//         ws.current = wsInstance;
//         wsInstance.onmessage = (event) => {
//             try {
//                 const message = JSON.parse(event.data);
//                 if (message.type === 'TERMINAL_OUT') term.current?.write(message.payload);
//             } catch (error) { console.error('WS Error:', error); }
//         };
//         return () => { wsInstance.close(); };
//     }, []);

//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { background: '#0D1117', foreground: '#c9d1d9', cursor: '#c9d1d9' },
//                 fontSize: 14,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//                 scrollback: 1000,
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
//             const resizeObserver = new ResizeObserver(() => { setTimeout(() => fitAddon.fit(), 0); });
//             resizeObserver.observe(terminalRef.current);
//             return () => { resizeObserver.disconnect(); newTerm.dispose(); term.current = null; };
//         }
//     }, []);

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && newFileName !== 'tests.js' && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = { id: crypto.randomUUID(), filename: newFileName, content: `// ${newFileName}\n` };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFormError("A file with that name already exists or is reserved.");
//         }
//     };
    
//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length > 0) { // Allow deleting last file if necessary, default to test file
//             const newFiles = files.filter(f => f.id !== fileIdToDelete);
//             setFiles(newFiles);
//             if (activeFileId === fileIdToDelete) {
//                 setActiveFileId(newFiles.length > 0 ? newFiles[0].id : 'test-file');
//             }
//         }
//     };

//     const handleRunCode = () => {
//         const fileToRun = isTestFileActive ? { content: testCode, filename: 'tests.js' } : activeFile;
//         if (!fileToRun || ws.current?.readyState !== WebSocket.OPEN) return;
//         const extension = fileToRun.filename.split('.').pop() || 'js';
//         const language = { js: 'javascript', py: 'python' }[extension] || 'plaintext';
//         ws.current.send(JSON.stringify({ type: 'RUN_CODE', payload: { language, code: fileToRun.content } }));
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) { setFormError("Missing course context."); return; }
//         setIsLoading(true); setFormError(null);
//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('authToken')}` },
//                 body: JSON.stringify({ title, description, objective, files, courseId, testCode })
//             });
//             if (!response.ok) throw new Error((await response.json()).error || 'Failed to create lesson');
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             setFormError(err instanceof Error ? err.message : 'An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col bg-[#0a091a] text-white font-sans overflow-hidden">
//              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,white,transparent_70%)]"></div>
            
//             <form onSubmit={handleSubmit} className="relative z-10 flex-grow flex flex-col gap-4 p-4">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <div className="flex items-center gap-4">
//                         <Button variant="ghost" type="button" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')} className="hover:bg-slate-800 hover:text-white">
//                             <ChevronLeft className="h-5 w-5" />
//                         </Button>
//                         <div>
//                             <h1 className="text-2xl font-bold tracking-tight">Lesson IDE</h1>
//                             <p className="text-sm text-slate-400">Constructing lesson for Course ID: {courseId || 'N/A'}</p>
//                         </div>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" type="button" onClick={handleRunCode} className="border-fuchsia-400/50 text-fuchsia-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200">
//                             <Play className="mr-2 h-4 w-4" /> Run Active File
//                         </Button>
//                         <Button type="submit" size="lg" disabled={isLoading || !courseId} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold">
//                             {isLoading ? 'Saving...' : 'Save & Finalize Lesson'}
//                         </Button>
//                     </div>
//                 </header>
                
//                 {formError && (
//                     <Alert variant="destructive" className="bg-red-950/40 border-red-500/30 text-red-300">
//                         <XCircle className="h-5 w-5 text-red-400" />
//                         <AlertTitle className="font-bold text-red-200">Creation Error</AlertTitle>
//                         <AlertDescription>{formError}</AlertDescription>
//                     </Alert>
//                 )}

//                 <div className="flex-grow grid grid-cols-1 xl:grid-cols-4 gap-4 overflow-hidden">
//                     {/* --- LEFT COLUMN: METADATA --- */}
//                     <aside className="xl:col-span-1 h-full flex flex-col gap-4 overflow-y-auto pr-2">
//                         <GlassCard>
//                             <CardHeader>
//                                 <CardTitle className="text-xl">Lesson Details</CardTitle>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <div className="space-y-2">
//                                     <Label htmlFor="title" className="text-slate-300">Title</Label>
//                                     <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Recursion" className="bg-black/30 border-slate-600 focus:border-cyan-400" />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="description" className="text-slate-300">Instructions</Label>
//                                     <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." className="bg-black/30 border-slate-600 focus:border-cyan-400 resize-none" rows={6} />
//                                 </div>
//                             </CardContent>
//                         </GlassCard>
//                          <GlassCard className="border-fuchsia-500/30">
//                             <CardHeader>
//                                 <CardTitle className="text-xl flex items-center gap-2 text-fuchsia-300"><Lightbulb size={20}/> AI Directive</CardTitle>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="objective" className="text-slate-400 text-sm">Define the core concept for the AI to analyze.</Label>
//                                     <Textarea id="objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="e.g., The student must solve this problem by having a function call itself." className="bg-black/30 border-slate-600 focus:border-fuchsia-400 resize-none" rows={4}/>
//                                 </div>
//                             </CardContent>
//                         </GlassCard>
//                     </aside>
                    
//                     {/* --- RIGHT COLUMN: IDE --- */}
//                     <main className="xl:col-span-3 h-full flex gap-4 overflow-hidden">
//                         <GlassCard className="w-1/4 flex flex-col">
//                            <CardHeader className="flex-shrink-0">
//                                 <CardTitle className="text-xl">File Navigator</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4 border-slate-600 hover:bg-slate-800" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add File
//                                 </Button>
//                                 <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mb-2">BOILERPLATE</p>
//                                 <ul className="space-y-1">
//                                     {files.map(file => (
//                                         <li key={file.id} className={cn('group flex items-center justify-between p-2 rounded-md cursor-pointer', activeFileId === file.id ? 'bg-cyan-500/10 text-cyan-300' : 'hover:bg-slate-800/60')}>
//                                             <div className="flex-grow flex items-center gap-2" onClick={() => setActiveFileId(file.id)}>
//                                                 <Code size={16} /><span>{file.filename}</span>
//                                             </div>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)} className="h-6 w-6 opacity-0 group-hover:opacity-100"><Trash2 className="h-4 w-4 text-red-500" /></Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                                 <div className="h-px bg-slate-700 my-4" />
//                                 <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mb-2">ASSESSMENT</p>
//                                 <ul>
//                                     <li className={cn('flex items-center p-2 rounded-md cursor-pointer', isTestFileActive ? 'bg-cyan-500/10 text-cyan-300' : 'hover:bg-slate-800/60')} onClick={() => setActiveFileId('test-file')}>
//                                         <div className="flex items-center gap-2"><BeakerIcon size={16} /><span>tests.js</span></div>
//                                     </li>
//                                 </ul>
//                             </CardContent>
//                         </GlassCard>

//                         <div className="w-3/4 flex flex-col border border-slate-700/80 rounded-lg overflow-hidden bg-slate-900/40">
//                            <PanelGroup direction="vertical">
//                                 <Panel defaultSize={70} minSize={20} className="overflow-hidden">
//                                     <Editor
//                                         height="100%"
//                                         path={isTestFileActive ? 'tests.js' : activeFile?.filename}
//                                         value={isTestFileActive ? testCode : activeFile?.content}
//                                         onChange={(content) => { if (isTestFileActive) setTestCode(content || ''); else setFiles(files.map(f => f.id === activeFileId ? { ...f, content: content || '' } : f)); }}
//                                         theme="vs-dark"
//                                         options={{ fontSize: 14, minimap: { enabled: false } }}
//                                     />
//                                 </Panel>
//                                 <PanelResizeHandle className="h-2 bg-slate-800 hover:bg-slate-700 transition-colors" />
//                                 <Panel defaultSize={30} minSize={10} className="flex flex-col">
//                                     <div className="flex-shrink-0 px-3 py-1 bg-slate-800 text-sm font-semibold flex items-center text-slate-300">
//                                         <TerminalIcon className="h-4 w-4 mr-2" /><span>Terminal</span>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2" />
//                                 </Panel>
//                             </PanelGroup>
//                         </div>
//                     </main>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

/* MVP
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (V8.0 - Conceptual Objective)
//  * =================================================================
//  * DESCRIPTION: This version integrates a new "Lesson Objective" field,
//  * allowing teachers to specify the pedagogical goal for the AI
//  * conceptual feedback system.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Separator } from "@/components/ui/separator";
// import { FilePlus2, Trash2, Play, X, Terminal as TerminalIcon, ChevronLeft, BeakerIcon } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     // --- NEW: State for the lesson's pedagogical objective ---
//     const [objective, setObjective] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     const [testCode, setTestCode] = useState('// Write your unit tests here\n// Example: assert(add(2, 2) === 4, "Test Case 1 Failed");');
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [formError, setFormError] = useState<string | null>(null);
//     const [fileError, setFileError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);
//     const isTestFileActive = activeFileId === 'test-file';

//     useEffect(() => {
//         if (!courseId) {
//             setFormError("No course selected. Please create a lesson from the course management page.");
//             setTimeout(() => navigate('/dashboard'), 3000);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         const initializeWebSocketEvents = (wsInstance: WebSocket) => {
//             wsInstance.onopen = () => console.log('Terminal WebSocket connection opened.');
//             wsInstance.onclose = () => console.log('Terminal WebSocket connection closed.');
//             wsInstance.onerror = (error) => console.error('Terminal WebSocket error:', error);
//             wsInstance.onmessage = (event) => {
//                 try {
//                     const message = JSON.parse(event.data);
//                     if (message.type === 'TERMINAL_OUT') {
//                         term.current?.write(message.payload);
//                     }
//                 } catch (error) {
//                     console.error('Error processing WebSocket message:', error);
//                 }
//             };
//         };

//         initializeWebSocketEvents(currentWs);

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
            
//             newTerm.onData(onTerminalData);
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

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleAddFile = () => {
//         setFileError(null);
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && newFileName !== 'tests.js' && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFileError("A file with that name already exists or is reserved.");
//         }
//     };

//     const handleFileContentChange = (content: string | undefined) => {
//         if (isTestFileActive) {
//             setTestCode(content || '');
//         } else {
//             setFiles(files.map(file => 
//                 file.id === activeFileId ? { ...file, content: content || '' } : file
//             ));
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         setFileError(null);
//         if (files.length < 1) { 
//             setFileError("Cannot delete the last file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId('test-file'); 
//         }
//     };

//     const handleRunCode = async () => {
//         const fileToRun = isTestFileActive ? { content: testCode, filename: 'tests.js' } : activeFile;
//         if (!fileToRun || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//             console.error('Cannot run code. WebSocket not connected or no active file.');
//             return;
//         }
//         setIsExecuting(true);
        
//         const extension = fileToRun.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript', py: 'python'
//         };
//         const language = languageMap[extension] || 'plaintext';
        
//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: fileToRun.content }
//         }));
        
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) {
//             setFormError("Cannot create a lesson without a course context.");
//             return;
//         }
//         setIsLoading(true);
//         setFormError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 // --- UPDATED: Added the new 'objective' field to the payload ---
//                 body: JSON.stringify({ title, description, objective, files, courseId, testCode })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             if (err instanceof Error) setFormError(err.message);
//             else setFormError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" size="icon" type="button" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')}>
//                             <ChevronLeft className="h-4 w-4" />
//                         </Button>
//                         <div>
//                             <h1 className="text-2xl font-bold tracking-tight">Create New Lesson</h1>
//                             <p className="text-sm text-muted-foreground">For Course ID: {courseId || 'N/A'}</p>
//                         </div>
//                     </div>
//                 </header>
                
//                 {(formError || fileError) && (
//                     <Alert variant="destructive">
//                         <X className="h-4 w-4" />
//                         <AlertTitle>Error</AlertTitle>
//                         <AlertDescription>
//                             {formError || fileError}
//                             <Button variant="ghost" size="sm" onClick={() => { setFormError(null); setFileError(null); }} className="ml-4">Dismiss</Button>
//                         </AlertDescription>
//                     </Alert>
//                 )}

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                         <Label htmlFor="title">Lesson Title</Label>
//                         <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Recursion" />
//                     </div>
//                     <div className="space-y-2">
//                         <Label htmlFor="description">Lesson Instructions</Label>
//                         <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                     </div>
//                     {/* --- NEW: Textarea for the Lesson Objective --- */}
//                     <div className="space-y-2">
//                         <Label htmlFor="objective">Lesson Objective (for AI Analysis)</Label>
//                         <Textarea 
//                             id="objective" 
//                             value={objective} 
//                             onChange={(e) => setObjective(e.target.value)} 
//                             placeholder="e.g., Solve the problem by having the function call itself, demonstrating recursion." 
//                         />
//                     </div>
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Lesson Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add Boilerplate File
//                                 </Button>
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">BOILERPLATE</p>
//                                 <ul className="space-y-1">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                                 <Separator className="my-4" />
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">ASSESSMENT</p>
//                                 <ul>
//                                     <li className={`flex items-center justify-between p-2 rounded-md ${isTestFileActive ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                         <button type="button" className="flex-grow text-left flex items-center gap-2" onClick={() => setActiveFileId('test-file')}>
//                                             <BeakerIcon className="h-4 w-4 text-blue-500" />
//                                             tests.js
//                                         </button>
//                                     </li>
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col border rounded-md overflow-hidden">
//                        <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={isTestFileActive ? 'tests.js' : activeFile?.filename}
//                                     value={isTestFileActive ? testCode : activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20 transition-colors" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                     <div className="flex-shrink-0 px-3 py-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t border-slate-700 text-slate-300 tracking-wider uppercase">
//                                         <div className="flex items-center gap-2">
//                                             <TerminalIcon className="h-4 w-4" />
//                                             <span>Terminal</span>
//                                         </div>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4 pt-4 border-t">
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading || !courseId}>
//                         {isLoading ? 'Saving Lesson...' : 'Save Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (V7.1 - Import Hotfix)
//  * =================================================================
//  * DESCRIPTION: This version fixes a crash caused by a missing import
//  * for the Separator component.
//  *
//  * KEY UPGRADES:
//  * 1. Fixed Missing Import: Added the import for the `Separator`
//  * component to resolve the ReferenceError.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Separator } from "@/components/ui/separator"; // NEW: Added missing import
// import { FilePlus2, Trash2, Play, X, Terminal as TerminalIcon, ChevronLeft, BeakerIcon } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     // NEW: State for the dedicated test file content
//     const [testCode, setTestCode] = useState('// Write your unit tests here\n// Example: assert(add(2, 2) === 4, "Test Case 1 Failed");');
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [formError, setFormError] = useState<string | null>(null);
//     const [fileError, setFileError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);
//     const isTestFileActive = activeFileId === 'test-file';

//     useEffect(() => {
//         if (!courseId) {
//             setFormError("No course selected. Please create a lesson from the course management page.");
//             setTimeout(() => navigate('/dashboard'), 3000);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         const initializeWebSocketEvents = (wsInstance: WebSocket) => {
//             wsInstance.onopen = () => console.log('Terminal WebSocket connection opened.');
//             wsInstance.onclose = () => console.log('Terminal WebSocket connection closed.');
//             wsInstance.onerror = (error) => console.error('Terminal WebSocket error:', error);
//             wsInstance.onmessage = (event) => {
//                 try {
//                     const message = JSON.parse(event.data);
//                     if (message.type === 'TERMINAL_OUT') {
//                         term.current?.write(message.payload);
//                     }
//                 } catch (error) {
//                     console.error('Error processing WebSocket message:', error);
//                 }
//             };
//         };

//         initializeWebSocketEvents(currentWs);

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
            
//             newTerm.onData(onTerminalData);
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

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleAddFile = () => {
//         setFileError(null);
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && newFileName !== 'tests.js' && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFileError("A file with that name already exists or is reserved.");
//         }
//     };

//     const handleFileContentChange = (content: string | undefined) => {
//         if (isTestFileActive) {
//             setTestCode(content || '');
//         } else {
//             setFiles(files.map(file => 
//                 file.id === activeFileId ? { ...file, content: content || '' } : file
//             ));
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         setFileError(null);
//         if (files.length < 1) { 
//             setFileError("Cannot delete the last file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId('test-file'); 
//         }
//     };

//     const handleRunCode = async () => {
//         const fileToRun = isTestFileActive ? { content: testCode, filename: 'tests.js' } : activeFile;
//         if (!fileToRun || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//             console.error('Cannot run code. WebSocket not connected or no active file.');
//             return;
//         }
//         setIsExecuting(true);
        
//         const extension = fileToRun.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript', py: 'python'
//         };
//         const language = languageMap[extension] || 'plaintext';
        
//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: fileToRun.content }
//         }));
        
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) {
//             setFormError("Cannot create a lesson without a course context.");
//             return;
//         }
//         setIsLoading(true);
//         setFormError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ title, description, files, courseId, testCode })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             if (err instanceof Error) setFormError(err.message);
//             else setFormError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" size="icon" type="button" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')}>
//                             <ChevronLeft className="h-4 w-4" />
//                         </Button>
//                         <div>
//                             <h1 className="text-2xl font-bold tracking-tight">Create New Lesson</h1>
//                             <p className="text-sm text-muted-foreground">For Course ID: {courseId || 'N/A'}</p>
//                         </div>
//                     </div>
//                 </header>
                
//                 {(formError || fileError) && (
//                     <Alert variant="destructive">
//                         <X className="h-4 w-4" />
//                         <AlertTitle>Error</AlertTitle>
//                         <AlertDescription>
//                             {formError || fileError}
//                             <Button variant="ghost" size="sm" onClick={() => { setFormError(null); setFileError(null); }} className="ml-4">Dismiss</Button>
//                         </AlertDescription>
//                     </Alert>
//                 )}

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                         <Label htmlFor="title">Lesson Title</Label>
//                         <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Variables" />
//                     </div>
//                     <div className="space-y-2 lg:col-span-2">
//                         <Label htmlFor="description">Lesson Instructions</Label>
//                         <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                     </div>
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Lesson Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add Boilerplate File
//                                 </Button>
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">BOILERPLATE</p>
//                                 <ul className="space-y-1">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                                 <Separator className="my-4" />
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">ASSESSMENT</p>
//                                 <ul>
//                                     <li className={`flex items-center justify-between p-2 rounded-md ${isTestFileActive ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                         <button type="button" className="flex-grow text-left flex items-center gap-2" onClick={() => setActiveFileId('test-file')}>
//                                             <BeakerIcon className="h-4 w-4 text-blue-500" />
//                                             tests.js
//                                         </button>
//                                     </li>
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col border rounded-md overflow-hidden">
//                        <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={isTestFileActive ? 'tests.js' : activeFile?.filename}
//                                     value={isTestFileActive ? testCode : activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20 transition-colors" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                     <div className="flex-shrink-0 px-3 py-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t border-slate-700 text-slate-300 tracking-wider uppercase">
//                                         <div className="flex items-center gap-2">
//                                             <TerminalIcon className="h-4 w-4" />
//                                             <span>Terminal</span>
//                                         </div>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4 pt-4 border-t">
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading || !courseId}>
//                         {isLoading ? 'Saving Lesson...' : 'Save Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;
// MVP
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (V7.1 - Import Hotfix)
//  * =================================================================
//  * DESCRIPTION: This version fixes a crash caused by a missing import
//  * for the Separator component.
//  *
//  * KEY UPGRADES:
//  * 1. Fixed Missing Import: Added the import for the `Separator`
//  * component to resolve the ReferenceError.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { Separator } from "@/components/ui/separator"; // NEW: Added missing import
// import { FilePlus2, Trash2, Play, X, Terminal as TerminalIcon, ChevronLeft, BeakerIcon } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     // NEW: State for the dedicated test file content
//     const [testCode, setTestCode] = useState('// Write your unit tests here\n// Example: assert(add(2, 2) === 4, "Test Case 1 Failed");');
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [formError, setFormError] = useState<string | null>(null);
//     const [fileError, setFileError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);
//     const isTestFileActive = activeFileId === 'test-file';

//     useEffect(() => {
//         if (!courseId) {
//             setFormError("No course selected. Please create a lesson from the course management page.");
//             setTimeout(() => navigate('/dashboard'), 3000);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         const initializeWebSocketEvents = (wsInstance: WebSocket) => {
//             wsInstance.onopen = () => console.log('Terminal WebSocket connection opened.');
//             wsInstance.onclose = () => console.log('Terminal WebSocket connection closed.');
//             wsInstance.onerror = (error) => console.error('Terminal WebSocket error:', error);
//             wsInstance.onmessage = (event) => {
//                 try {
//                     const message = JSON.parse(event.data);
//                     if (message.type === 'TERMINAL_OUT') {
//                         term.current?.write(message.payload);
//                     }
//                 } catch (error) {
//                     console.error('Error processing WebSocket message:', error);
//                 }
//             };
//         };

//         initializeWebSocketEvents(currentWs);

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
            
//             newTerm.onData(onTerminalData);
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

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleAddFile = () => {
//         setFileError(null);
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && newFileName !== 'tests.js' && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFileError("A file with that name already exists or is reserved.");
//         }
//     };

//     const handleFileContentChange = (content: string | undefined) => {
//         if (isTestFileActive) {
//             setTestCode(content || '');
//         } else {
//             setFiles(files.map(file => 
//                 file.id === activeFileId ? { ...file, content: content || '' } : file
//             ));
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         setFileError(null);
//         if (files.length < 1) { 
//             setFileError("Cannot delete the last file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId('test-file'); 
//         }
//     };

//     const handleRunCode = async () => {
//         const fileToRun = isTestFileActive ? { content: testCode, filename: 'tests.js' } : activeFile;
//         if (!fileToRun || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//             console.error('Cannot run code. WebSocket not connected or no active file.');
//             return;
//         }
//         setIsExecuting(true);
        
//         const extension = fileToRun.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript', py: 'python'
//         };
//         const language = languageMap[extension] || 'plaintext';
        
//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: fileToRun.content }
//         }));
        
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) {
//             setFormError("Cannot create a lesson without a course context.");
//             return;
//         }
//         setIsLoading(true);
//         setFormError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ title, description, files, courseId, testCode })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             if (err instanceof Error) setFormError(err.message);
//             else setFormError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" size="icon" type="button" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')}>
//                             <ChevronLeft className="h-4 w-4" />
//                         </Button>
//                         <div>
//                             <h1 className="text-2xl font-bold tracking-tight">Create New Lesson</h1>
//                             <p className="text-sm text-muted-foreground">For Course ID: {courseId || 'N/A'}</p>
//                         </div>
//                     </div>
//                 </header>
                
//                 {(formError || fileError) && (
//                     <Alert variant="destructive">
//                         <X className="h-4 w-4" />
//                         <AlertTitle>Error</AlertTitle>
//                         <AlertDescription>
//                             {formError || fileError}
//                             <Button variant="ghost" size="sm" onClick={() => { setFormError(null); setFileError(null); }} className="ml-4">Dismiss</Button>
//                         </AlertDescription>
//                     </Alert>
//                 )}

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                         <Label htmlFor="title">Lesson Title</Label>
//                         <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Variables" />
//                     </div>
//                     <div className="space-y-2 lg:col-span-2">
//                         <Label htmlFor="description">Lesson Instructions</Label>
//                         <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                     </div>
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Lesson Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add Boilerplate File
//                                 </Button>
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">BOILERPLATE</p>
//                                 <ul className="space-y-1">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                                 <Separator className="my-4" />
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">ASSESSMENT</p>
//                                 <ul>
//                                     <li className={`flex items-center justify-between p-2 rounded-md ${isTestFileActive ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                         <button type="button" className="flex-grow text-left flex items-center gap-2" onClick={() => setActiveFileId('test-file')}>
//                                             <BeakerIcon className="h-4 w-4 text-blue-500" />
//                                             tests.js
//                                         </button>
//                                     </li>
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col border rounded-md overflow-hidden">
//                        <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={isTestFileActive ? 'tests.js' : activeFile?.filename}
//                                     value={isTestFileActive ? testCode : activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20 transition-colors" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                     <div className="flex-shrink-0 px-3 py-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t border-slate-700 text-slate-300 tracking-wider uppercase">
//                                         <div className="flex items-center gap-2">
//                                             <TerminalIcon className="h-4 w-4" />
//                                             <span>Terminal</span>
//                                         </div>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4 pt-4 border-t">
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading || !courseId}>
//                         {isLoading ? 'Saving Lesson...' : 'Save Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (V7 - Unit Testing)
//  * =================================================================
//  * DESCRIPTION: This version integrates the first part of our AI
//  * Testing feature, allowing teachers to add a dedicated test file
//  * to their lessons.
//  *
//  * KEY UPGRADES:
//  * 1. Dedicated Test File: A special, non-deletable 'tests.js' file
//  * is now part of the boilerplate, providing a clear place for tests.
//  * 2. Test Code State: A new state variable manages the content of the
//  * test file separately from the other boilerplate files.
//  * 3. Backend Payload Update: The handleSubmit function now sends the
//  * test code to the backend to be saved with the lesson.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, X, Terminal as TerminalIcon, ChevronLeft, BeakerIcon } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     // NEW: State for the dedicated test file content
//     const [testCode, setTestCode] = useState('// Write your unit tests here\n// Example: assert(add(2, 2) === 4, "Test Case 1 Failed");');
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [formError, setFormError] = useState<string | null>(null);
//     const [fileError, setFileError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);

//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);
//     const isTestFileActive = activeFileId === 'test-file';

//     useEffect(() => {
//         if (!courseId) {
//             setFormError("No course selected. Please create a lesson from the course management page.");
//             setTimeout(() => navigate('/dashboard'), 3000);
//         }
//     }, [courseId, navigate]);

//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         const initializeWebSocketEvents = (wsInstance: WebSocket) => {
//             wsInstance.onopen = () => console.log('Terminal WebSocket connection opened.');
//             wsInstance.onclose = () => console.log('Terminal WebSocket connection closed.');
//             wsInstance.onerror = (error) => console.error('Terminal WebSocket error:', error);
//             wsInstance.onmessage = (event) => {
//                 try {
//                     const message = JSON.parse(event.data);
//                     if (message.type === 'TERMINAL_OUT') {
//                         term.current?.write(message.payload);
//                     }
//                 } catch (error) {
//                     console.error('Error processing WebSocket message:', error);
//                 }
//             };
//         };

//         initializeWebSocketEvents(currentWs);

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
            
//             newTerm.onData(onTerminalData);
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

//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleAddFile = () => {
//         setFileError(null);
//         const newFileName = prompt("Enter new file name (e.g., helpers.js):");
//         if (newFileName && newFileName !== 'tests.js' && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFileError("A file with that name already exists or is reserved.");
//         }
//     };

//     const handleFileContentChange = (content: string | undefined) => {
//         if (isTestFileActive) {
//             setTestCode(content || '');
//         } else {
//             setFiles(files.map(file => 
//                 file.id === activeFileId ? { ...file, content: content || '' } : file
//             ));
//         }
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         setFileError(null);
//         if (files.length < 1) { // Can delete down to zero boilerplate files
//             setFileError("Cannot delete the last file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId('test-file'); // Default to test file on deletion
//         }
//     };

//     const handleRunCode = async () => {
//         const fileToRun = isTestFileActive ? { content: testCode, filename: 'tests.js' } : activeFile;
//         if (!fileToRun || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//             console.error('Cannot run code. WebSocket not connected or no active file.');
//             return;
//         }
//         setIsExecuting(true);
        
//         const extension = fileToRun.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript', py: 'python'
//         };
//         const language = languageMap[extension] || 'plaintext';
        
//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: fileToRun.content }
//         }));
        
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) {
//             setFormError("Cannot create a lesson without a course context.");
//             return;
//         }
//         setIsLoading(true);
//         setFormError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 // UPDATED PAYLOAD: Send both boilerplate files and the test code
//                 body: JSON.stringify({ title, description, files, courseId, testCode })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             if (err instanceof Error) setFormError(err.message);
//             else setFormError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     {/* ... header content ... */}
//                 </header>
                
//                 {/* ... error banners ... */}

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     {/* ... lesson details form ... */}
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Lesson Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add Boilerplate File
//                                 </Button>
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">BOILERPLATE</p>
//                                 <ul className="space-y-1">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                                 <Separator className="my-4" />
//                                 <p className="text-xs text-muted-foreground mb-2 px-2">ASSESSMENT</p>
//                                 <ul>
//                                     <li className={`flex items-center justify-between p-2 rounded-md ${isTestFileActive ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                         <button type="button" className="flex-grow text-left flex items-center gap-2" onClick={() => setActiveFileId('test-file')}>
//                                             <BeakerIcon className="h-4 w-4 text-blue-500" />
//                                             tests.js
//                                         </button>
//                                     </li>
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col border rounded-md overflow-hidden">
//                        <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={isTestFileActive ? 'tests.js' : activeFile?.filename}
//                                     value={isTestFileActive ? testCode : activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20 transition-colors" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                     <div className="flex-shrink-0 px-3 py-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t border-slate-700 text-slate-300 tracking-wider uppercase">
//                                         <div className="flex items-center gap-2">
//                                             <TerminalIcon className="h-4 w-4" />
//                                             <span>Terminal</span>
//                                         </div>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4 pt-4 border-t">
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading || !courseId}>
//                         {isLoading ? 'Saving Lesson...' : 'Save Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (V6 - Course Aware)
//  * =================================================================
//  * DESCRIPTION: This version makes the lesson creation process
//  * course-aware by reading the courseId from the URL and including it
//  * in the API request.
//  *
//  * KEY UPGRADES:
//  * 1. Course ID Integration: Uses the `useSearchParams` hook to read
//  * the `courseId` from the URL query parameters.
//  * 2. Backend Payload Update: The `handleSubmit` function now includes
//  * the `courseId` in the payload sent to the backend, correctly
//  * associating the new lesson with its parent course.
//  * 3. Contextual Navigation: The "Back" button now navigates the user
//  * back to the specific Course Management page they came from.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, X, Terminal as TerminalIcon, ChevronLeft } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const courseId = searchParams.get('courseId');

//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [formError, setFormError] = useState<string | null>(null);
//     const [fileError, setFileError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);

//     // Refs for the integrated terminal and WebSocket connection
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     useEffect(() => {
//         if (!courseId) {
//             // If a teacher somehow lands here without a course context,
//             // send them back to the dashboard to start the proper flow.
//             setFormError("No course selected. Please create a lesson from the course management page.");
//             setTimeout(() => navigate('/dashboard'), 3000);
//         }
//     }, [courseId, navigate]);

//     // Effect to establish and manage the WebSocket connection for the terminal
//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         initializeWebSocketEvents(currentWs);

//         return () => {
//             if (currentWs.readyState === WebSocket.OPEN) {
//                 currentWs.close();
//             }
//             term.current?.dispose();
//         };
//     }, []);

//     // Effect to initialize the xterm.js terminal instance
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { 
//                     background: '#1e1e1e',
//                     foreground: '#d4d4d4',
//                     cursor: '#d4d4d4',
//                     selection: '#264f78',
//                 },
//                 scrollback: 1000,
//                 convertEol: true, 
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
            
//             newTerm.onData(onTerminalData);
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

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => console.log('Terminal WebSocket connection opened.');
//         currentWs.onclose = () => console.log('Terminal WebSocket connection closed.');
//         currentWs.onerror = (error) => console.error('Terminal WebSocket error:', error);

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
//     };
    
//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleAddFile = () => {
//         setFileError(null);
//         const newFileName = prompt("Enter new file name (e.g., style.css):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFileError("A file with that name already exists.");
//         }
//     };

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         setFileError(null);
//         if (files.length <= 1) {
//             setFileError("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//             console.error('Cannot run code. WebSocket not connected or no active file.');
//             return;
//         }
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript', py: 'python', html: 'html', css: 'css', java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';
        
//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
        
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         if (!courseId) {
//             setFormError("Cannot create a lesson without a course context.");
//             return;
//         }
//         setIsLoading(true);
//         setFormError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 // Include the courseId in the payload
//                 body: JSON.stringify({ title, description, files, courseId })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             // Navigate back to the specific course management page
//             navigate(`/courses/${courseId}/manage`);
//         } catch (err) {
//             if (err instanceof Error) setFormError(err.message);
//             else setFormError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" size="icon" type="button" onClick={() => navigate(courseId ? `/courses/${courseId}/manage` : '/dashboard')}>
//                             <ChevronLeft className="h-4 w-4" />
//                         </Button>
//                         <div>
//                             <h1 className="text-2xl font-bold tracking-tight">Create New Lesson</h1>
//                             <p className="text-sm text-muted-foreground">For Course ID: {courseId || 'N/A'}</p>
//                         </div>
//                     </div>
//                 </header>
                
//                 {(formError || fileError) && (
//                     <Alert variant="destructive">
//                         <X className="h-4 w-4" />
//                         <AlertTitle>Error</AlertTitle>
//                         <AlertDescription>
//                             {formError || fileError}
//                             <Button variant="ghost" size="sm" onClick={() => { setFormError(null); setFileError(null); }} className="ml-4">Dismiss</Button>
//                         </AlertDescription>
//                     </Alert>
//                 )}

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                         <Label htmlFor="title">Lesson Title</Label>
//                         <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Understanding Variables" />
//                     </div>
//                     <div className="space-y-2 lg:col-span-2">
//                         <Label htmlFor="description">Lesson Instructions</Label>
//                         <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                     </div>
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Boilerplate Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
//                                 </Button>
//                                 <ul className="space-y-2">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col border rounded-md overflow-hidden">
//                        <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename}
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20 transition-colors" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                     <div className="flex-shrink-0 px-3 py-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t border-slate-700 text-slate-300 tracking-wider uppercase">
//                                         <div className="flex items-center gap-2">
//                                             <TerminalIcon className="h-4 w-4" />
//                                             <span>Terminal</span>
//                                         </div>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4 pt-4 border-t">
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading || !courseId}>
//                         {isLoading ? 'Saving Lesson...' : 'Save Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (V5 - UI/UX Overhaul)
//  * =================================================================
//  * DESCRIPTION: This version introduces a major UI/UX redesign,
//  * transforming the page into a polished, professional, and highly

//  * intuitive authoring environment for teachers.
//  *
//  * KEY UPGRADES:
//  * 1. Professional Layout: Implements a two-column layout that
//  * separates lesson metadata ("The Lesson Plan") from the coding
//  * environment ("The Workspace"), creating a clear visual hierarchy.
//  * 2. Enhanced Component Design: Leverages shadcn UI components more
//  * effectively, wrapping the IDE in a Card and refining the file
//  * explorer for a more polished, application-like feel.
//  * 3. Improved User Flow: The design guides the teacher through the
//  * process of setting up the lesson details and then focusing on
//  * the core task of writing the boilerplate code.
//  * 4. Consistent Aesthetics: Adopts a consistent design language with
//  * improved spacing, separators, and background colors, aligning
//  * with the high-quality standard set by LiveTutorialPage.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, X, Terminal as TerminalIcon, File as FileIcon, ChevronLeft } from 'lucide-react';
// import { Separator } from '@/components/ui/separator';

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [formError, setFormError] = useState<string | null>(null);
//     const [fileError, setFileError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     // Refs for the integrated terminal and WebSocket connection
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     // Effect to establish and manage the WebSocket connection for the terminal
//     useEffect(() => {
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         initializeWebSocketEvents(currentWs);

//         return () => {
//             if (currentWs.readyState === WebSocket.OPEN) {
//                 currentWs.close();
//             }
//             term.current?.dispose();
//         };
//     }, []);

//     // Effect to initialize the xterm.js terminal instance
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { 
//                     background: '#1e1e1e',
//                     foreground: '#d4d4d4',
//                     cursor: '#d4d4d4',
//                     selection: '#264f78',
//                 },
//                 scrollback: 1000,
//                 convertEol: true, 
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
            
//             newTerm.onData(onTerminalData);
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

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => console.log('Terminal WebSocket connection opened.');
//         currentWs.onclose = () => console.log('Terminal WebSocket connection closed.');
//         currentWs.onerror = (error) => console.error('Terminal WebSocket error:', error);

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
//     };
    
//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleAddFile = () => {
//         setFileError(null);
//         const newFileName = prompt("Enter new file name (e.g., style.css):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFileError("A file with that name already exists.");
//         }
//     };

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         setFileError(null);
//         if (files.length <= 1) {
//             setFileError("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//             console.error('Cannot run code. WebSocket not connected or no active file.');
//             return;
//         }
//         setIsExecuting(true);
        
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript', py: 'python', html: 'html', css: 'css', java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';
        
//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: { language, code: activeFile.content }
//         }));
        
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setFormError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
//                 body: JSON.stringify({ title, description, files })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate('/dashboard');
//         } catch (err) {
//             if (err instanceof Error) setFormError(err.message);
//             else setFormError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col bg-muted/40">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col">
//                 {/* Page Header */}
//                 <header className="flex-shrink-0 bg-background border-b p-4 flex justify-between items-center">
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" size="icon" type="button" onClick={() => navigate('/dashboard')}>
//                             <ChevronLeft className="h-4 w-4" />
//                         </Button>
//                         <h1 className="text-2xl font-bold tracking-tight">Create New Lesson</h1>
//                     </div>
//                     <div className="flex items-center gap-4">
//                         <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                             <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                         </Button>
//                         <Button type="submit" size="lg" disabled={isLoading}>
//                             {isLoading ? 'Saving...' : 'Save and Create Lesson'}
//                         </Button>
//                     </div>
//                 </header>

//                 {/* Main Content Area */}
//                 <div className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
                    
//                     {/* Left Column: Lesson Plan & Metadata */}
//                     <div className="lg:col-span-1 flex flex-col gap-6">
//                         <Card>
//                             <CardHeader>
//                                 <CardTitle>Lesson Details</CardTitle>
//                                 <CardDescription>Provide the title and instructions for this lesson.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="space-y-4">
//                                 <div className="space-y-2">
//                                     <Label htmlFor="title">Title</Label>
//                                     <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Introduction to Functions" />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="description">Description</Label>
//                                     <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." rows={5} />
//                                 </div>
//                             </CardContent>
//                         </Card>
//                         <Card className="flex-grow flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Project Files</CardTitle>
//                                 <CardDescription>Manage the boilerplate files for this lesson.</CardDescription>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
//                                 </Button>
//                                 <ul className="space-y-1">
//                                     {files.map(file => (
//                                         <li key={file.id}>
//                                             <button type="button" onClick={() => setActiveFileId(file.id)} className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${activeFileId === file.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}`}>
//                                                 <span className="flex items-center gap-2">
//                                                     <FileIcon className="h-4 w-4" />
//                                                     {file.filename}
//                                                 </span>
//                                                 <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDeleteFile(file.id); }}>
//                                                     <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
//                                                 </Button>
//                                             </button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Right Column: The IDE Workspace */}
//                     <main className="lg:col-span-2 h-full flex flex-col rounded-lg border bg-background overflow-hidden">
//                        <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename}
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                     options={{ minimap: { enabled: false }, fontSize: 14 }}
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20 transition-colors" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                     <div className="flex-shrink-0 px-3 py-2 bg-slate-800 text-xs font-semibold flex items-center border-b border-slate-700 text-slate-300 tracking-wider uppercase">
//                                         <div className="flex items-center gap-2">
//                                             <TerminalIcon className="h-4 w-4" />
//                                             <span>Terminal</span>
//                                         </div>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>

//                 {/* Error Banner Area */}
//                 {(formError || fileError) && (
//                     <div className="px-6 pb-4">
//                         <Alert variant="destructive">
//                             <X className="h-4 w-4" />
//                             <AlertTitle>An Error Occurred</AlertTitle>
//                             <AlertDescription>
//                                 {formError || fileError}
//                                 <Button variant="ghost" size="sm" onClick={() => { setFormError(null); setFileError(null); }} className="ml-4">Dismiss</Button>
//                             </AlertDescription>
//                         </Alert>
//                     </div>
//                 )}
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (V4 - Fully Integrated IDE)
//  * =================================================================
//  * DESCRIPTION: This version fully integrates the terminal by adding a
//  * dedicated WebSocket connection, making it interactive and aligning
//  * its functionality with the LiveTutorialPage.
//  *
//  * KEY UPGRADES:
//  * 1. Integrated Interactive Terminal: The terminal is now connected
//  * via a WebSocket, allowing for interactive commands and making the
//  * "Run Code" button use the same execution pipeline as the live session.
//  * 2. Replicated Logic: The WebSocket setup, terminal initialization,
//  * and event handling logic from LiveTutorialPage.tsx have been
//  * carefully replicated for a consistent developer experience.
//  */
// import React, { useState, useRef, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import { Terminal } from 'xterm';
// import { FitAddon } from 'xterm-addon-fit';
// import 'xterm/css/xterm.css';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, X, Terminal as TerminalIcon } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [formError, setFormError] = useState<string | null>(null);
//     const [fileError, setFileError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     // Refs for the integrated terminal and WebSocket connection
//     const terminalRef = useRef<HTMLDivElement>(null);
//     const term = useRef<Terminal | null>(null);
//     const ws = useRef<WebSocket | null>(null);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     // Effect to establish and manage the WebSocket connection for the terminal
//     useEffect(() => {
//         // Each lesson creation page gets its own temporary terminal session.
//         const terminalSessionId = crypto.randomUUID();
//         const wsUrl = `ws://localhost:5000?sessionId=${terminalSessionId}`;
//         const currentWs = new WebSocket(wsUrl);
//         ws.current = currentWs;

//         initializeWebSocketEvents(currentWs);

//         return () => {
//             if (currentWs.readyState === WebSocket.OPEN) {
//                 currentWs.close();
//             }
//             term.current?.dispose();
//         };
//     }, []);

//     // Effect to initialize the xterm.js terminal instance
//     useEffect(() => {
//         if (terminalRef.current && !term.current) {
//             const fitAddon = new FitAddon();
//             const newTerm = new Terminal({
//                 cursorBlink: true,
//                 theme: { 
//                     background: '#1e1e1e',
//                     foreground: '#d4d4d4',
//                     cursor: '#d4d4d4',
//                     selection: '#264f78',
//                 },
//                 scrollback: 1000,
//                 convertEol: true, 
//                 fontSize: 13,
//                 fontFamily: 'Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
//             });
//             newTerm.loadAddon(fitAddon);
//             newTerm.open(terminalRef.current);
//             fitAddon.fit();
            
//             // Connect terminal input to the WebSocket
//             newTerm.onData(onTerminalData);
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

//     const initializeWebSocketEvents = (currentWs: WebSocket) => {
//         currentWs.onopen = () => console.log('Terminal WebSocket connection opened.');
//         currentWs.onclose = () => console.log('Terminal WebSocket connection closed.');
//         currentWs.onerror = (error) => console.error('Terminal WebSocket error:', error);

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
//     };
    
//     // Function to send terminal input data over the WebSocket
//     const onTerminalData = (data: string) => {
//         if (ws.current?.readyState === WebSocket.OPEN) {
//             ws.current.send(JSON.stringify({ type: 'TERMINAL_IN', payload: data }));
//         }
//     };

//     const handleAddFile = () => {
//         setFileError(null);
//         const newFileName = prompt("Enter new file name (e.g., style.css):");
//         if (newFileName && !files.some(f => f.filename === newFileName)) {
//             const newFile: LessonFile = {
//                 id: crypto.randomUUID(),
//                 filename: newFileName,
//                 content: `// ${newFileName}\n`
//             };
//             setFiles([...files, newFile]);
//             setActiveFileId(newFile.id);
//         } else if (newFileName) {
//             setFileError("A file with that name already exists.");
//         }
//     };

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         setFileError(null);
//         if (files.length <= 1) {
//             setFileError("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleRunCode = async () => {
//         if (!activeFile || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
//             console.error('Cannot run code. WebSocket not connected or no active file.');
//             return;
//         }
//         setIsExecuting(true);
        
//         // FIX: Map file extensions to the full language name the backend expects.
//         const extension = activeFile.filename.split('.').pop() || 'javascript';
//         const languageMap: { [key: string]: string } = {
//             js: 'javascript',
//             py: 'python',
//             html: 'html',
//             css: 'css',
//             java: 'java'
//         };
//         const language = languageMap[extension] || 'plaintext';
        
//         // Send the code to be executed via the WebSocket, just like in the live session
//         ws.current.send(JSON.stringify({
//             type: 'RUN_CODE',
//             payload: {
//                 language,
//                 code: activeFile.content
//             }
//         }));
        
//         // We set a timeout to reset the button state, as we don't get a specific "execution finished" event
//         setTimeout(() => setIsExecuting(false), 1000);
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setFormError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ title, description, files })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate('/dashboard');
//         } catch (err) {
//             if (err instanceof Error) setFormError(err.message);
//             else setFormError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <h1 className="text-3xl font-bold tracking-tight">Create New Lesson</h1>
//                     <Button variant="outline" type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//                 </header>
                
//                 {fileError && (
//                     <Alert variant="destructive">
//                         <X className="h-4 w-4" />
//                         <AlertTitle>File Error</AlertTitle>
//                         <AlertDescription>
//                             {fileError}
//                             <Button variant="ghost" size="sm" onClick={() => setFileError(null)} className="ml-4">Dismiss</Button>
//                         </AlertDescription>
//                     </Alert>
//                 )}

//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                         <Label htmlFor="title">Title</Label>
//                         <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., My First Web Page" />
//                     </div>
//                     <div className="space-y-2 lg:col-span-2">
//                         <Label htmlFor="description">Description</Label>
//                         <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                     </div>
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Project Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
//                                 </Button>
//                                 <ul className="space-y-2">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col border rounded-md overflow-hidden">
//                        <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename}
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20 transition-colors" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-[#1e1e1e]">
//                                     <div className="flex-shrink-0 px-3 py-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t border-slate-700 text-slate-300 tracking-wider uppercase">
//                                         <div className="flex items-center gap-2">
//                                             <TerminalIcon className="h-4 w-4" />
//                                             <span>Terminal</span>
//                                         </div>
//                                     </div>
//                                     <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4 pt-4 border-t">
//                     {formError && <p className="text-sm text-destructive mr-auto">{formError}</p>}
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading}>
//                         {isLoading ? 'Creating Lesson...' : 'Save and Create Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (CORRECTED)
//  * =================================================================
//  * DESCRIPTION: This version combines the multi-file project structure
//  * with the resizable editor and console for a complete IDE experience.
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, X } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., style.css):");
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

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
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

//     const handleRunCode = async () => {
//         if (!activeFile) return;
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

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ title, description, files })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate('/dashboard');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <h1 className="text-3xl font-bold tracking-tight">Create New Lesson</h1>
//                     <Button variant="outline" type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//                 </header>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                         <Label htmlFor="title">Title</Label>
//                         <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., My First Web Page" />
//                     </div>
//                     <div className="space-y-2 lg:col-span-2">
//                         <Label htmlFor="description">Description</Label>
//                         <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                     </div>
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Project Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
//                                 </Button>
//                                 <ul className="space-y-2">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col">
//                          <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename}
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-black text-white">
//                                     <div className="p-2 bg-gray-800 text-sm font-semibold flex justify-between items-center">
//                                         <span>Console</span>
//                                         <Button variant="ghost" size="icon" type="button" onClick={() => setConsoleOutput([])} className="text-white hover:bg-gray-700 hover:text-white">
//                                             <X className="h-4 w-4" />
//                                         </Button>
//                                     </div>
//                                     <pre className="flex-grow p-2 text-xs overflow-y-auto whitespace-pre-wrap">
//                                         {consoleOutput.join('\n')}
//                                     </pre>
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4">
//                     {error && <p className="text-sm text-destructive mr-auto">{error}</p>}
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading}>
//                         {isLoading ? 'Creating Lesson...' : 'Save and Create Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED)
//  * =================================================================
//  * DESCRIPTION: This version combines the multi-file project structure
//  * with the resizable editor and console for a complete IDE experience.
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
// import { FilePlus2, Trash2, Play, X } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
//     const [isExecuting, setIsExecuting] = useState(false);

//     const activeFile = files.find(f => f.id === activeFileId);

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., style.css):");
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

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
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

//     const handleRunCode = async () => {
//         if (!activeFile) return;
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

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({ title, description, files })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate('/dashboard');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full h-screen flex flex-col p-4 sm:p-6 lg:p-8">
//             <form onSubmit={handleSubmit} className="flex-grow flex flex-col gap-6">
//                 <header className="flex-shrink-0 flex justify-between items-center">
//                     <h1 className="text-3xl font-bold tracking-tight">Create New Lesson</h1>
//                     <Button variant="outline" type="button" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//                 </header>
                
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     <div className="space-y-2">
//                         <Label htmlFor="title">Title</Label>
//                         <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., My First Web Page" />
//                     </div>
//                     <div className="space-y-2 lg:col-span-2">
//                         <Label htmlFor="description">Description</Label>
//                         <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                     </div>
//                 </div>

//                 <div className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
//                     <aside className="lg:col-span-1 h-full">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader>
//                                 <CardTitle>Project Files</CardTitle>
//                             </CardHeader>
//                             <CardContent className="flex-grow overflow-y-auto">
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
//                                 </Button>
//                                 <ul className="space-y-2">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </aside>

//                     <main className="lg:col-span-3 h-full flex flex-col">
//                          <PanelGroup direction="vertical">
//                             <Panel defaultSize={70} minSize={20}>
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename}
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </Panel>
//                             <PanelResizeHandle className="h-2 bg-muted hover:bg-muted-foreground/20" />
//                             <Panel defaultSize={30} minSize={10}>
//                                 <div className="h-full flex flex-col bg-black text-white">
//                                     <div className="p-2 bg-gray-800 text-sm font-semibold flex justify-between items-center">
//                                         <span>Console</span>
//                                         <Button variant="ghost" size="icon" type="button" onClick={() => setConsoleOutput([])} className="text-white hover:bg-gray-700 hover:text-white">
//                                             <X className="h-4 w-4" />
//                                         </Button>
//                                     </div>
//                                     <pre className="flex-grow p-2 text-xs overflow-y-auto whitespace-pre-wrap">
//                                         {consoleOutput.join('\n')}
//                                     </pre>
//                                 </div>
//                             </Panel>
//                         </PanelGroup>
//                     </main>
//                 </div>
                
//                 <footer className="flex-shrink-0 flex justify-end items-center gap-4">
//                     {error && <p className="text-sm text-destructive mr-auto">{error}</p>}
//                     <Button variant="outline" type="button" onClick={handleRunCode} disabled={isExecuting}>
//                         <Play className="mr-2 h-4 w-4" /> {isExecuting ? 'Running...' : 'Run Code'}
//                     </Button>
//                     <Button type="submit" size="lg" disabled={isLoading}>
//                         {isLoading ? 'Creating Lesson...' : 'Save and Create Lesson'}
//                     </Button>
//                 </footer>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;


// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';
// import type { LessonFile } from '../types';

// // Import shadcn components and icons
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { FilePlus2, Trash2 } from 'lucide-react';

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     // NEW: State now manages an array of file objects.
//     const [files, setFiles] = useState<LessonFile[]>([
//         { id: crypto.randomUUID(), filename: 'index.js', content: 'console.log("Hello, World!");' }
//     ]);
//     // NEW: State to track the currently active file for the editor.
//     const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
    
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const activeFile = files.find(f => f.id === activeFileId);

//     const handleAddFile = () => {
//         const newFileName = prompt("Enter new file name (e.g., style.css):");
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

//     const handleFileContentChange = (content: string | undefined) => {
//         setFiles(files.map(file => 
//             file.id === activeFileId ? { ...file, content: content || '' } : file
//         ));
//     };

//     const handleDeleteFile = (fileIdToDelete: string) => {
//         if (files.length <= 1) {
//             alert("You must have at least one file.");
//             return;
//         }
//         const newFiles = files.filter(f => f.id !== fileIdToDelete);
//         setFiles(newFiles);
//         // If the deleted file was the active one, set the first file as active.
//         if (activeFileId === fileIdToDelete) {
//             setActiveFileId(newFiles[0].id);
//         }
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 // The body now sends the array of files.
//                 body: JSON.stringify({ title, description, files })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }
//             navigate('/dashboard');
//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-3xl font-bold tracking-tight">Create New Lesson</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </div>
//             <form onSubmit={handleSubmit}>
//                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//                     {/* Lesson Details Column */}
//                     <div className="lg:col-span-1 space-y-6">
//                         <Card>
//                             <CardHeader><CardTitle>Lesson Details</CardTitle></CardHeader>
//                             <CardContent className="space-y-4">
//                                 <div className="space-y-2">
//                                     <Label htmlFor="title">Title</Label>
//                                     <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., My First Web Page" />
//                                 </div>
//                                 <div className="space-y-2">
//                                     <Label htmlFor="description">Description</Label>
//                                     <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task..." />
//                                 </div>
//                             </CardContent>
//                         </Card>
//                         <Card>
//                             <CardHeader><CardTitle>Project Files</CardTitle></CardHeader>
//                             <CardContent>
//                                 <Button type="button" variant="outline" className="w-full mb-4" onClick={handleAddFile}>
//                                     <FilePlus2 className="mr-2 h-4 w-4" /> Add New File
//                                 </Button>
//                                 <ul className="space-y-2">
//                                     {files.map(file => (
//                                         <li key={file.id} className={`flex items-center justify-between p-2 rounded-md ${activeFileId === file.id ? 'bg-accent' : 'hover:bg-accent/50'}`}>
//                                             <button type="button" className="flex-grow text-left" onClick={() => setActiveFileId(file.id)}>
//                                                 {file.filename}
//                                             </button>
//                                             <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)}>
//                                                 <Trash2 className="h-4 w-4 text-destructive" />
//                                             </Button>
//                                         </li>
//                                     ))}
//                                 </ul>
//                             </CardContent>
//                         </Card>
//                     </div>

//                     {/* Editor Column */}
//                     <div className="lg:col-span-2">
//                         <Card className="h-full flex flex-col">
//                             <CardHeader><CardTitle>Code Editor</CardTitle></CardHeader>
//                             <CardContent className="flex-grow border rounded-md overflow-hidden">
//                                 <Editor
//                                     height="100%"
//                                     path={activeFile?.filename} // Use path to help Monaco identify the file type
//                                     defaultValue={activeFile?.content}
//                                     value={activeFile?.content}
//                                     onChange={handleFileContentChange}
//                                     theme="vs-dark"
//                                 />
//                             </CardContent>
//                         </Card>
//                     </div>
//                 </div>
                
//                 <div className="mt-6">
//                     {error && <p className="text-sm text-destructive mb-4">{error}</p>}
//                     <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
//                         {isLoading ? 'Creating Lesson...' : 'Save and Create Lesson'}
//                     </Button>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// mvp
// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// // NEW: A map of boilerplate code for different languages.
// const boilerplateTemplates: { [key: string]: string } = {
//     javascript: '// Add your starter code here\nconsole.log("Hello, JavaScript!");',
//     python: '# Add your starter code here\nprint("Hello, Python!")',
//     java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n        System.out.println("Hello, Java!");\n    }\n}',
//     typescript: '// Add your starter code here\nconsole.log("Hello, TypeScript!");',
//     html: '<!DOCTYPE html>\n<html>\n  <head>\n    <title>Page Title</title>\n  </head>\n  <body>\n    <h1>My First Heading</h1>\n    <p>My first paragraph.</p>\n  </body>\n</html>',
//     css: '/* Add your CSS code here */\nbody {\n  background-color: lightblue;\n}'
// };

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [language, setLanguage] = useState('javascript');
//     // The initial boilerplate code is now set from our templates map.
//     const [boilerplateCode, setBoilerplateCode] = useState(boilerplateTemplates[language]);
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     // NEW: This function now handles both setting the language and updating the boilerplate.
//     const handleLanguageChange = (newLanguage: string) => {
//         setLanguage(newLanguage);
//         setBoilerplateCode(boilerplateTemplates[newLanguage] || '');
//     };

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     title,
//                     description,
//                     boilerplate_code: boilerplateCode,
//                     language
//                 })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }

//             navigate('/dashboard');

//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-3xl font-bold tracking-tight">Create New Lesson</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </div>
//             <form onSubmit={handleSubmit}>
//                 <Card>
//                     <CardHeader>
//                         <CardTitle>Lesson Details</CardTitle>
//                         <CardDescription>Fill out the information for your new assignment.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="space-y-6">
//                         <div className="space-y-2">
//                             <Label htmlFor="title">Title</Label>
//                             <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Java Loops and Arrays" />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="description">Description</Label>
//                             <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                         </div>
//                         <div className="space-y-2">
//                             <Label>Language</Label>
//                             {/* The Select component now calls our new handler function. */}
//                             <Select value={language} onValueChange={handleLanguageChange}>
//                                 <SelectTrigger>
//                                     <SelectValue placeholder="Select a language" />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                     <SelectItem value="javascript">JavaScript</SelectItem>
//                                     <SelectItem value="typescript">TypeScript</SelectItem>
//                                     <SelectItem value="python">Python</SelectItem>
//                                     <SelectItem value="java">Java</SelectItem>
//                                     <SelectItem value="html">HTML</SelectItem>
//                                     <SelectItem value="css">CSS</SelectItem>
//                                 </SelectContent>
//                             </Select>
//                         </div>
//                         <div className="space-y-2">
//                             <Label>Boilerplate Code</Label>
//                             <div className="h-64 border rounded-md overflow-hidden">
//                                 <Editor
//                                     height="100%"
//                                     language={language}
//                                     value={boilerplateCode}
//                                     onChange={(value) => setBoilerplateCode(value || '')}
//                                     theme="vs-light"
//                                 />
//                             </div>
//                         </div>
//                         {error && <p className="text-sm text-destructive">{error}</p>}
//                         <Button type="submit" className="w-full" disabled={isLoading}>
//                             {isLoading ? 'Creating...' : 'Create Lesson'}
//                         </Button>
//                     </CardContent>
//                 </Card>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [boilerplateCode, setBoilerplateCode] = useState('// Add your starter code here');
//     const [language, setLanguage] = useState('javascript');
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     title,
//                     description,
//                     boilerplate_code: boilerplateCode,
//                     language
//                 })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }

//             navigate('/dashboard');

//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-3xl font-bold tracking-tight">Create New Lesson</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </div>
//             <form onSubmit={handleSubmit}>
//                 <Card>
//                     <CardHeader>
//                         <CardTitle>Lesson Details</CardTitle>
//                         <CardDescription>Fill out the information for your new assignment.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="space-y-6">
//                         <div className="space-y-2">
//                             <Label htmlFor="title">Title</Label>
//                             <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., JavaScript Functions" />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="description">Description</Label>
//                             <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="language">Language</Label>
//                             <Select value={language} onValueChange={setLanguage}>
//                                 <SelectTrigger>
//                                     <SelectValue placeholder="Select a language" />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                     <SelectItem value="javascript">JavaScript</SelectItem>
//                                     <SelectItem value="python">Python</SelectItem>
//                                     <SelectItem value="java">Java</SelectItem>
//                                 </SelectContent>
//                             </Select>
//                         </div>
//                         <div className="space-y-2">
//                             <Label>Boilerplate Code</Label>
//                             <div className="h-64 border rounded-md overflow-hidden">
//                                 <Editor
//                                     height="100%"
//                                     language={language}
//                                     value={boilerplateCode}
//                                     onChange={(value) => setBoilerplateCode(value || '')}
//                                     theme="vs-light"
//                                 />
//                             </div>
//                         </div>
//                         {error && <p className="text-sm text-destructive">{error}</p>}
//                         <Button type="submit" className="w-full" disabled={isLoading}>
//                             {isLoading ? 'Creating...' : 'Create Lesson'}
//                         </Button>
//                     </CardContent>
//                 </Card>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';

// // Import shadcn components
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [boilerplateCode, setBoilerplateCode] = useState('// Add your starter code here');
//     const [language, setLanguage] = useState('javascript');
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     title,
//                     description,
//                     boilerplate_code: boilerplateCode,
//                     language
//                 })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }

//             navigate('/dashboard');

//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-3xl font-bold tracking-tight">Create New Lesson</h1>
//                 <Button variant="outline" onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
//             </div>
//             <form onSubmit={handleSubmit}>
//                 <Card>
//                     <CardHeader>
//                         <CardTitle>Lesson Details</CardTitle>
//                         <CardDescription>Fill out the information for your new assignment.</CardDescription>
//                     </CardHeader>
//                     <CardContent className="space-y-6">
//                         <div className="space-y-2">
//                             <Label htmlFor="title">Title</Label>
//                             <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., JavaScript Functions" />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="description">Description</Label>
//                             <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explain the task for the student..." />
//                         </div>
//                         <div className="space-y-2">
//                             <Label htmlFor="language">Language</Label>
//                             <Select value={language} onValueChange={setLanguage}>
//                                 <SelectTrigger>
//                                     <SelectValue placeholder="Select a language" />
//                                 </SelectTrigger>
//                                 <SelectContent>
//                                     <SelectItem value="javascript">JavaScript</SelectItem>
//                                     <SelectItem value="typescript">TypeScript</SelectItem>
//                                     <SelectItem value="python">Python</SelectItem>
//                                     <SelectItem value="html">HTML</SelectItem>
//                                     <SelectItem value="css">CSS</SelectItem>
//                                 </SelectContent>
//                             </Select>
//                         </div>
//                         <div className="space-y-2">
//                             <Label>Boilerplate Code</Label>
//                             <div className="h-64 border rounded-md overflow-hidden">
//                                 <Editor
//                                     height="100%"
//                                     language={language}
//                                     value={boilerplateCode}
//                                     onChange={(value) => setBoilerplateCode(value || '')}
//                                     theme="vs-light"
//                                 />
//                             </div>
//                         </div>
//                         {error && <p className="text-sm text-destructive">{error}</p>}
//                         <Button type="submit" className="w-full" disabled={isLoading}>
//                             {isLoading ? 'Creating...' : 'Create Lesson'}
//                         </Button>
//                     </CardContent>
//                 </Card>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED with full UI)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [boilerplateCode, setBoilerplateCode] = useState('// Add your starter code here');
//     const [language, setLanguage] = useState('javascript');
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     title,
//                     description,
//                     boilerplate_code: boilerplateCode,
//                     language
//                 })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }

//             navigate('/dashboard');

//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-3xl font-bold text-gray-800">Create New Lesson</h1>
//                 <button onClick={() => navigate('/dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </div>
//             <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
//                 <div>
//                     <label htmlFor="title" className="block text-lg font-medium text-gray-700">Title</label>
//                     <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full text-lg px-3 py-2 border border-gray-300 rounded-md" />
//                 </div>
//                 <div>
//                     <label htmlFor="description" className="block text-lg font-medium text-gray-700">Description</label>
//                     <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
//                 </div>
//                 <div>
//                     <label htmlFor="language" className="block text-lg font-medium text-gray-700">Language</label>
//                     <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
//                         <option value="javascript">JavaScript</option>
//                         <option value="typescript">TypeScript</option>
//                         <option value="python">Python</option>
//                         <option value="html">HTML</option>
//                         <option value="css">CSS</option>
//                     </select>
//                 </div>
//                 <div>
//                     <label className="block text-lg font-medium text-gray-700">Boilerplate Code</label>
//                     <div className="mt-1 h-64 border border-gray-300 rounded-md overflow-hidden">
//                         <Editor
//                             height="100%"
//                             language={language}
//                             value={boilerplateCode}
//                             onChange={(value) => setBoilerplateCode(value || '')}
//                             theme="vs-light"
//                         />
//                     </div>
//                 </div>
//                 {error && <p className="text-red-600">{error}</p>}
//                 <div>
//                     <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
//                         {isLoading ? 'Creating...' : 'Create Lesson'}
//                     </button>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED with full UI)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import Editor from '@monaco-editor/react';

// const CreateLessonPage: React.FC = () => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [boilerplateCode, setBoilerplateCode] = useState('// Add your starter code here');
//     const [language, setLanguage] = useState('javascript');
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);
//     const navigate = useNavigate();

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);
//         const token = localStorage.getItem('authToken');

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     title,
//                     description,
//                     boilerplate_code: boilerplateCode,
//                     language
//                 })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }

//             navigate('/dashboard');

//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-3xl font-bold text-gray-800">Create New Lesson</h1>
//                 <button onClick={() => navigate('/dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </div>
//             <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
//                 <div>
//                     <label htmlFor="title" className="block text-lg font-medium text-gray-700">Title</label>
//                     <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full text-lg px-3 py-2 border border-gray-300 rounded-md" />
//                 </div>
//                 <div>
//                     <label htmlFor="description" className="block text-lg font-medium text-gray-700">Description</label>
//                     <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
//                 </div>
//                 <div>
//                     <label htmlFor="language" className="block text-lg font-medium text-gray-700">Language</label>
//                     <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
//                         <option value="javascript">JavaScript</option>
//                         <option value="typescript">TypeScript</option>
//                         <option value="python">Python</option>
//                         <option value="html">HTML</option>
//                         <option value="css">CSS</option>
//                     </select>
//                 </div>
//                 <div>
//                     <label className="block text-lg font-medium text-gray-700">Boilerplate Code</label>
//                     <div className="mt-1 h-64 border border-gray-300 rounded-md overflow-hidden">
//                         <Editor
//                             height="100%"
//                             language={language}
//                             value={boilerplateCode}
//                             onChange={(value) => setBoilerplateCode(value || '')}
//                             theme="vs-light"
//                         />
//                     </div>
//                 </div>
//                 {error && <p className="text-red-600">{error}</p>}
//                 <div>
//                     <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
//                         {isLoading ? 'Creating...' : 'Create Lesson'}
//                     </button>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;

// /*
//  * =================================================================
//  * FOLDER: src/pages/
//  * FILE:   CreateLessonPage.tsx (UPDATED)
//  * =================================================================
//  */
// import React, { useState } from 'react';
// import type { CreateLessonPageProps } from '../types';
// import Editor from '@monaco-editor/react';

// const CreateLessonPage: React.FC<CreateLessonPageProps> = ({ setRoute }) => {
//     const [title, setTitle] = useState('');
//     const [description, setDescription] = useState('');
//     const [boilerplateCode, setBoilerplateCode] = useState('// Add your starter code here');
//     const [language, setLanguage] = useState('javascript');
//     const [error, setError] = useState<string | null>(null);
//     const [isLoading, setIsLoading] = useState(false);

//     const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
//         e.preventDefault();
//         setIsLoading(true);
//         setError(null);

//         // Read the token directly from localStorage right before the API call.
//         const token = localStorage.getItem('authToken');
//         if (!token) {
//             setError('Authentication error. Please log in again.');
//             setIsLoading(false);
//             return;
//         }

//         try {
//             const response = await fetch('http://localhost:5000/api/lessons', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token}`
//                 },
//                 body: JSON.stringify({
//                     title,
//                     description,
//                     boilerplate_code: boilerplateCode,
//                     language
//                 })
//             });

//             if (!response.ok) {
//                 const data = await response.json();
//                 throw new Error(data.error || 'Failed to create lesson');
//             }

//             setRoute('dashboard');

//         } catch (err) {
//             if (err instanceof Error) setError(err.message);
//             else setError('An unknown error occurred');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     return (
//         <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
//             <div className="flex justify-between items-center mb-6">
//                 <h1 className="text-3xl font-bold text-gray-800">Create New Lesson</h1>
//                 <button onClick={() => setRoute('dashboard')} className="py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600">Back to Dashboard</button>
//             </div>
//             <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-lg shadow-md">
//                 {/* Form fields remain the same */}
//                  <div>
//                     <label htmlFor="title" className="block text-lg font-medium text-gray-700">Title</label>
//                     <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full text-lg px-3 py-2 border border-gray-300 rounded-md" />
//                 </div>
//                 <div>
//                     <label htmlFor="description" className="block text-lg font-medium text-gray-700">Description</label>
//                     <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" />
//                 </div>
//                 <div>
//                     <label htmlFor="language" className="block text-lg font-medium text-gray-700">Language</label>
//                     <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white">
//                         <option value="javascript">JavaScript</option>
//                         <option value="typescript">TypeScript</option>
//                         <option value="python">Python</option>
//                         <option value="html">HTML</option>
//                         <option value="css">CSS</option>
//                     </select>
//                 </div>
//                 <div>
//                     <label className="block text-lg font-medium text-gray-700">Boilerplate Code</label>
//                     <div className="mt-1 h-64 border border-gray-300 rounded-md overflow-hidden">
//                         <Editor
//                             height="100%"
//                             language={language}
//                             value={boilerplateCode}
//                             onChange={(value) => setBoilerplateCode(value || '')}
//                             theme="vs-light"
//                         />
//                     </div>
//                 </div>
//                 {error && <p className="text-red-600">{error}</p>}
//                 <div>
//                     <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
//                         {isLoading ? 'Creating...' : 'Create Lesson'}
//                     </button>
//                 </div>
//             </form>
//         </div>
//     );
// };

// export default CreateLessonPage;
