// =================================================================
// FILE: src/components/DockerTerminal.tsx
// =================================================================
// DESCRIPTION: Reusable Docker terminal component for code execution
// Can be used in LiveTutorialPage, AscentIDE, and AscentWebIDE

import { useEffect, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    Terminal as TerminalIcon, 
    Play, 
    Square, 
    Trash2, 
    RefreshCw,
    Code,
    Maximize2
} from 'lucide-react';
import { useDockerTerminal } from '../hooks/useDockerTerminal';
import { cn } from '@/lib/utils';

interface DockerTerminalProps {
    className?: string;
    title?: string;
    showHeader?: boolean;
    showCodeButtons?: boolean;
    onCodeExecution?: (result: any) => void;
    onError?: (error: string) => void;
    autoConnect?: boolean;
    initialCode?: string;
    initialLanguage?: string;
    height?: string | number;
    enableWebSocket?: boolean;
}

export interface DockerTerminalRef {
    executeCode: (code: string, language: string, options?: { testCases?: any[] }) => Promise<any>;
    quickExecute: (code: string, language: string) => Promise<any>;
    sendInput: (input: string) => void;
    createSession: () => Promise<void>;
    terminateSession: () => Promise<void>;
    clearTerminal: () => void;
    isConnected: boolean;
    sessionId: string | null;
}

const DockerTerminal = forwardRef<DockerTerminalRef, DockerTerminalProps>(({
    className,
    title = "Docker Terminal",
    showHeader = true,
    showCodeButtons = true,
    onCodeExecution,
    onError,
    autoConnect = true,
    initialCode = '',
    height = 400,
    enableWebSocket = true
}, ref) => {
    const {
        terminalRef,
        session,
        isConnected,
        createSession,
        terminateSession,
        executeCode,
        quickExecute,
        sendInput,
        isLoading,
        error,
        clearTerminal,
        resizeTerminal
    } = useDockerTerminal({
        autoConnect,
        enableWebSocket,
        terminalOptions: {
            fontSize: 13,
            rows: 20,
            cols: 80,
            fontFamily: 'Menlo, Monaco, "Courier New", monospace'
        }
    });

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
        executeCode: async (code: string, language: string, options?: { testCases?: any[] }) => {
            try {
                const result = await executeCode(code, language, options);
                onCodeExecution?.(result);
                return result;
            } catch (err: any) {
                onError?.(err.message);
                throw err;
            }
        },
        quickExecute: async (code: string, language: string) => {
            try {
                const result = await quickExecute(code, language);
                onCodeExecution?.(result);
                return result;
            } catch (err: any) {
                onError?.(err.message);
                throw err;
            }
        },
        sendInput,
        createSession,
        terminateSession,
        clearTerminal,
        isConnected,
        sessionId: session?.sessionId || null
    }), [
        executeCode, 
        quickExecute, 
        sendInput, 
        createSession, 
        terminateSession, 
        clearTerminal, 
        isConnected, 
        session,
        onCodeExecution,
        onError
    ]);

    // Handle resize on mount and window resize
    useEffect(() => {
        const handleResize = () => {
            setTimeout(resizeTerminal, 100);
        };
        
        window.addEventListener('resize', handleResize);
        
        // Initial resize
        setTimeout(resizeTerminal, 500);
        
        return () => window.removeEventListener('resize', handleResize);
    }, [resizeTerminal]);

    // Handle errors
    useEffect(() => {
        if (error) {
            onError?.(error);
        }
    }, [error, onError]);

    const handleQuickRun = async (language: string) => {
        if (!initialCode.trim()) return;
        
        try {
            await executeCode(initialCode, language);
        } catch (err: any) {
            console.error('Quick run failed:', err);
        }
    };

    const getConnectionStatus = () => {
        if (isLoading) return { text: 'Connecting...', color: 'text-yellow-400' };
        if (isConnected && session) return { text: `Connected (${session.sessionId.slice(-8)})`, color: 'text-green-400' };
        if (error) return { text: 'Error', color: 'text-red-400' };
        return { text: 'Disconnected', color: 'text-gray-400' };
    };

    const status = getConnectionStatus();

    return (
        <Card className={cn("bg-slate-950/60 backdrop-blur-lg border-slate-700", className)}>
            {showHeader && (
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                        <div className="flex items-center gap-2">
                            <TerminalIcon className="h-5 w-5 text-cyan-400" />
                            <span>{title}</span>
                            <div className={cn("text-sm font-normal", status.color)}>
                                {status.text}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {showCodeButtons && (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleQuickRun('javascript')}
                                        disabled={!initialCode.trim() || isLoading}
                                        className="h-7 text-xs border-green-500/50 text-green-300 hover:bg-green-500/10"
                                    >
                                        <Play className="h-3 w-3 mr-1" />
                                        JS
                                    </Button>
                                    
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleQuickRun('python')}
                                        disabled={!initialCode.trim() || isLoading}
                                        className="h-7 text-xs border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
                                    >
                                        <Code className="h-3 w-3 mr-1" />
                                        PY
                                    </Button>
                                </>
                            )}
                            
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={clearTerminal}
                                className="h-7 text-xs border-slate-500/50 text-slate-300 hover:bg-slate-500/10"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                            
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={resizeTerminal}
                                className="h-7 text-xs border-slate-500/50 text-slate-300 hover:bg-slate-500/10"
                            >
                                <Maximize2 className="h-3 w-3" />
                            </Button>
                            
                            {!isConnected ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={createSession}
                                    disabled={isLoading}
                                    className="h-7 text-xs border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                                >
                                    <RefreshCw className={cn("h-3 w-3 mr-1", isLoading && "animate-spin")} />
                                    Connect
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={terminateSession}
                                    disabled={isLoading}
                                    className="h-7 text-xs border-red-500/50 text-red-300 hover:bg-red-500/10"
                                >
                                    <Square className="h-3 w-3 mr-1" />
                                    Stop
                                </Button>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
            )}
            
            <CardContent className={showHeader ? "pt-0" : "p-4"}>
                <div 
                    ref={terminalRef}
                    className="w-full bg-slate-950 rounded-md border border-slate-800"
                    style={{ 
                        height: typeof height === 'number' ? `${height}px` : height,
                        minHeight: '200px'
                    }}
                />
                
                {error && (
                    <div className="mt-2 p-2 bg-red-950/40 border border-red-500/30 rounded text-red-200 text-sm">
                        <strong>Error:</strong> {error}
                    </div>
                )}
                
                {!isConnected && !isLoading && !error && (
                    <div className="mt-2 p-4 bg-slate-800/30 border border-slate-700 rounded-md text-center">
                        <TerminalIcon className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm mb-3">
                            Docker terminal not connected. Click "Connect" to start a new session.
                        </p>
                        <Button
                            size="sm"
                            onClick={createSession}
                            disabled={isLoading}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white"
                        >
                            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                            Connect to Terminal
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

DockerTerminal.displayName = 'DockerTerminal';

export default DockerTerminal;