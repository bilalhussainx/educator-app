// src/components/classroom/MainWorkspace.tsx

import React from 'react';
import Editor from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Terminal as TerminalIcon, Play, FilePlus, File as FileIcon } from 'lucide-react';
import { UserRole, ViewingMode, CodeFile } from '../../types';

interface MainWorkspaceProps {
    role: UserRole;
    viewingMode: ViewingMode;
    displayedWorkspace: { files: CodeFile[], activeFileName: string };
    isEditorReadOnly: boolean;
    activeFile: CodeFile | undefined;
    handleAddFile: () => void;
    handleActiveFileChange: (fileName: string) => void;
    handleLanguageChange: (language: string) => void;
    handleEditorChange: (value: string | undefined) => void;
    handleRunCode: () => void;
    terminalRef: React.RefObject<HTMLDivElement>;
}

export const MainWorkspace: React.FC<MainWorkspaceProps> = ({
    role,
    viewingMode,
    displayedWorkspace,
    isEditorReadOnly,
    activeFile,
    handleAddFile,
    handleActiveFileChange,
    handleLanguageChange,
    handleEditorChange,
    handleRunCode,
    terminalRef,
}) => {
    return (
        <main className="flex-grow flex flex-row overflow-hidden">
            <PanelGroup direction="horizontal">
                <Panel defaultSize={15} minSize={12} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
                    <div className="p-3 border-b flex justify-between items-center">
                        <h2 className="font-semibold text-sm uppercase">Explorer</h2>
                        {role === 'teacher' && viewingMode === 'teacher' && <Button variant="ghost" size="icon" onClick={handleAddFile}><FilePlus className="h-4 w-4" /></Button>}
                    </div>
                    <div className="flex-grow overflow-y-auto py-1">
                        {displayedWorkspace.files.map(file => (
                            <div key={file.name} onClick={() => handleActiveFileChange(file.name)} className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isEditorReadOnly ? 'cursor-default' : 'cursor-pointer'} ${displayedWorkspace.activeFileName === file.name ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}>
                                <FileIcon className="h-4 w-4 mr-2.5" />
                                <span className="truncate">{file.name}</span>
                            </div>
                        ))}
                    </div>
                </Panel>
                <PanelResizeHandle className="w-1.5 bg-slate-200" />
                <Panel defaultSize={60} minSize={30}>
                    <PanelGroup direction="vertical">
                        <Panel defaultSize={70} minSize={20}>
                            <div className="h-full flex flex-col">
                                <div className="p-2 flex justify-between items-center bg-white border-b">
                                    <Select value={activeFile?.language || 'plaintext'} onValueChange={handleLanguageChange} disabled={isEditorReadOnly}>
                                        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="javascript">JavaScript</SelectItem>
                                            <SelectItem value="python">Python</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {role === 'teacher' && viewingMode === 'teacher' && <Button onClick={handleRunCode} size="sm" disabled={!activeFile}><Play className="mr-2 h-4 w-4" /> Run Code</Button>}
                                </div>
                                <Editor height="100%" theme="vs-dark" path={activeFile?.name} language={activeFile?.language} value={activeFile?.content} onChange={handleEditorChange} options={{ readOnly: isEditorReadOnly }} />
                            </div>
                        </Panel>
                        <PanelResizeHandle className="h-1.5 bg-slate-200" />
                        <Panel defaultSize={30} minSize={10}>
                            <div className="h-full flex flex-col bg-[#1e1e1e]">
                                <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t"><TerminalIcon className="h-4 w-4 mr-2" />Terminal</div>
                                <div ref={terminalRef} className="flex-grow p-2 overflow-hidden" />
                            </div>
                        </Panel>
                    </PanelGroup>
                </Panel>
            </PanelGroup>
        </main>
    );
};