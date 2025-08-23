import React from 'react';
import Editor from '@monaco-editor/react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Terminal as TerminalIcon, File as FileIcon } from 'lucide-react';
import { StudentHomeworkState, CodeFile } from '../../types/index.ts';

interface StudentWorkspaceViewProps {
    workspace: StudentHomeworkState | undefined;
    studentName: string;
    isReadOnly: boolean;
    onCodeChange: (newCode: string) => void;
    onActiveFileChange: (newFileName: string) => void;
}

export const StudentWorkspaceView: React.FC<StudentWorkspaceViewProps> = ({
    workspace,
    studentName,
    isReadOnly,
    onCodeChange,
    onActiveFileChange,
}) => {
    if (!workspace) {
        return <div className="p-4">Waiting for student's workspace data...</div>;
    }

    const activeFile = workspace.files.find((f: CodeFile) => f.filename === workspace.activeFileName);

    return (
        <PanelGroup direction="horizontal" className="w-full h-full">
            <Panel defaultSize={20} minSize={15} className="flex flex-col bg-white dark:bg-slate-800/50 border-r">
                <div className="p-3 border-b">
                    <h2 className="font-semibold text-sm uppercase">Explorer</h2>
                </div>
                <div className="flex-grow overflow-y-auto py-1">
                    {workspace.files.map((file: CodeFile) => (
                        <div 
                            key={file.filename} 
                            onClick={() => onActiveFileChange(file.filename)}
                            className={`flex items-center px-3 py-1.5 mx-1 rounded-md text-sm ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'} ${workspace.activeFileName === file.filename ? 'bg-blue-100 font-medium' : 'hover:bg-slate-100'}`}
                        >
                            <FileIcon className="h-4 w-4 mr-2.5" />
                            <span className="truncate">{file.filename}</span>
                        </div>
                    ))}
                </div>
            </Panel>
            <PanelResizeHandle className="w-1.5 bg-slate-200" />
            <Panel defaultSize={80} minSize={30}>
                <PanelGroup direction="vertical">
                    <Panel defaultSize={70} minSize={20}>
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            path={activeFile?.filename}
                            language={activeFile?.language}
                            value={activeFile?.content}
                            onChange={(value) => onCodeChange(value || '')}
                            options={{ readOnly: isReadOnly }}
                        />
                    </Panel>
                    <PanelResizeHandle className="h-1.5 bg-slate-200" />
                    <Panel defaultSize={30} minSize={10}>
                         <div className="h-full flex flex-col bg-[#1e1e1e]">
                            <div className="p-2 bg-slate-700/50 text-xs font-semibold flex items-center border-b border-t">
                                <TerminalIcon className="h-4 w-4 mr-2" />
                                {studentName}'s Terminal
                            </div>
                            <div className="flex-grow p-2 overflow-hidden whitespace-pre-wrap">
                                {workspace.terminalOutput || `Watching ${studentName}'s terminal...`}
                            </div>
                        </div>
                    </Panel>
                </PanelGroup>
            </Panel>
        </PanelGroup>
    );
};