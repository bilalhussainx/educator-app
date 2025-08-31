// =================================================================
// FILE: src/hooks/useDockerTerminal.ts
// =================================================================
// DESCRIPTION: React hook for Docker-based terminal functionality
// Provides terminal session management and real-time communication

import { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import apiClient from '../services/apiClient';

interface TerminalSession {
  sessionId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  createdAt: Date;
}

interface CodeExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  language: string;
}

interface UseDockerTerminalOptions {
  autoConnect?: boolean;
  enableWebSocket?: boolean;
  terminalOptions?: any;
}

interface UseDockerTerminalReturn {
  // Terminal instance and DOM management
  terminal: Terminal | null;
  terminalRef: React.RefObject<HTMLDivElement>;
  
  // Session management
  session: TerminalSession | null;
  isConnected: boolean;
  
  // Actions
  createSession: () => Promise<void>;
  connectToSession: (sessionId: string) => Promise<void>;
  terminateSession: () => Promise<void>;
  executeCode: (code: string, language: string) => Promise<CodeExecutionResult>;
  quickExecute: (code: string, language: string) => Promise<CodeExecutionResult>;
  sendInput: (input: string) => void;
  
  // State
  isLoading: boolean;
  error: string | null;
  output: string;
  
  // Utilities
  clearTerminal: () => void;
  resizeTerminal: () => void;
}

export const useDockerTerminal = (
  options: UseDockerTerminalOptions = {}
): UseDockerTerminalReturn => {
  const {
    autoConnect = false,
    enableWebSocket = true,
    terminalOptions = {}
  } = options;

  // State
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [session, setSession] = useState<TerminalSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  // Refs
  const terminalRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current || terminal) return;

    const newTerminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a091a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#ffffff40',
      },
      ...terminalOptions
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    newTerminal.loadAddon(fitAddon);
    newTerminal.loadAddon(webLinksAddon);
    
    newTerminal.open(terminalRef.current);
    fitAddon.fit();
    
    fitAddonRef.current = fitAddon;
    setTerminal(newTerminal);

    // Handle terminal input
    newTerminal.onData((data) => {
      if (enableWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'TERMINAL_INPUT',
          payload: { input: data }
        }));
      }
    });

    // Auto-connect if requested
    if (autoConnect) {
      createSession();
    }

    return () => {
      newTerminal.dispose();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [terminalRef, autoConnect, enableWebSocket]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'TERMINAL_OUTPUT':
          if (terminal) {
            terminal.write(message.payload.output);
          }
          setOutput(prev => prev + message.payload.output);
          break;

        case 'TERMINAL_SESSION_CONNECTED':
          setSession(prev => prev ? { ...prev, status: 'connected' } : null);
          setIsConnected(true);
          setError(null);
          if (terminal) {
            terminal.write(`\r\n✅ Connected to Docker terminal session\r\n$ `);
          }
          break;

        case 'CODE_EXECUTION_RESULT':
          const result = message.payload.result;
          if (terminal) {
            terminal.write(`\r\n${result.output}\r\n$ `);
          }
          break;

        case 'TERMINAL_ERROR':
          setError(message.payload.error);
          if (terminal) {
            terminal.write(`\r\n❌ Error: ${message.payload.error}\r\n$ `);
          }
          break;

        case 'TERMINAL_SESSION_CREATED':
          const newSession: TerminalSession = {
            sessionId: message.payload.sessionId,
            status: 'connected',
            createdAt: new Date()
          };
          setSession(newSession);
          setIsConnected(true);
          break;

        default:
          console.log('Unknown WebSocket message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }, [terminal]);

  // WebSocket connection management
  const connectWebSocket = useCallback((sessionId?: string) => {
    if (!enableWebSocket) return;

    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token not found');
      return;
    }

    const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:10000'}/terminal?token=${encodeURIComponent(token)}${sessionId ? `&sessionId=${sessionId}` : ''}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ Terminal WebSocket connected');
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = handleWebSocketMessage;
      
      ws.onclose = (event) => {
        console.log('🔌 Terminal WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        if (event.code !== 1000) { // Not a normal closure
          setError(`Connection lost: ${event.reason || 'Unknown error'}`);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ Terminal WebSocket error:', error);
        setError('WebSocket connection error');
        setIsConnected(false);
      };
      
      wsRef.current = ws;
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setError('Failed to establish real-time connection');
    }
  }, [enableWebSocket, handleWebSocketMessage]);

  // Create new terminal session
  const createSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (enableWebSocket) {
        // Create session via WebSocket
        connectWebSocket();
        
        // Wait for connection and then request session creation
        if (wsRef.current) {
          wsRef.current.addEventListener('open', () => {
            wsRef.current?.send(JSON.stringify({
              type: 'CREATE_TERMINAL_SESSION',
              payload: {}
            }));
          });
        }
      } else {
        // Create session via REST API
        const response = await apiClient.post('/api/terminal/session');
        
        if (response.data.success) {
          const newSession: TerminalSession = {
            sessionId: response.data.sessionId,
            status: 'connected',
            createdAt: new Date()
          };
          setSession(newSession);
          setIsConnected(true);
          
          if (terminal) {
            terminal.write(`✅ Session ${response.data.sessionId} created\r\n$ `);
          }
        } else {
          throw new Error(response.data.error || 'Failed to create session');
        }
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create terminal session';
      setError(errorMessage);
      
      if (terminal) {
        terminal.write(`❌ ${errorMessage}\r\n`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [terminal, enableWebSocket, connectWebSocket]);

  // Connect to existing session
  const connectToSession = useCallback(async (sessionId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      if (enableWebSocket) {
        connectWebSocket(sessionId);
      }
      
      // Verify session exists
      const response = await apiClient.get(`/api/terminal/session/${sessionId}/status`);
      
      if (response.data.success) {
        const existingSession: TerminalSession = {
          sessionId,
          status: 'connected',
          createdAt: new Date(response.data.status.createdAt)
        };
        setSession(existingSession);
        setIsConnected(true);
        
        if (terminal) {
          terminal.write(`✅ Connected to session ${sessionId}\r\n$ `);
        }
      } else {
        throw new Error('Session not found or access denied');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to connect to session';
      setError(errorMessage);
      
      if (terminal) {
        terminal.write(`❌ ${errorMessage}\r\n`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [terminal, enableWebSocket, connectWebSocket]);

  // Terminate session
  const terminateSession = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    
    try {
      await apiClient.delete(`/api/terminal/session/${session.sessionId}`);
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Session terminated by user');
      }
      
      setSession(null);
      setIsConnected(false);
      setError(null);
      
      if (terminal) {
        terminal.write('\r\n✅ Session terminated\r\n');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to terminate session';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [session, terminal]);

  // Execute code in session
  const executeCode = useCallback(async (code: string, language: string): Promise<CodeExecutionResult> => {
    if (!session) {
      throw new Error('No active session');
    }

    if (enableWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Execution timeout'));
        }, 30000);

        const handleResult = (event: MessageEvent) => {
          const message = JSON.parse(event.data);
          if (message.type === 'CODE_EXECUTION_RESULT') {
            clearTimeout(timeout);
            wsRef.current?.removeEventListener('message', handleResult);
            resolve(message.payload.result);
          } else if (message.type === 'CODE_EXECUTION_ERROR') {
            clearTimeout(timeout);
            wsRef.current?.removeEventListener('message', handleResult);
            reject(new Error(message.payload.error));
          }
        };

        wsRef.current?.addEventListener('message', handleResult);
        
        wsRef.current?.send(JSON.stringify({
          type: 'EXECUTE_CODE',
          payload: { code, language }
        }));
      });
    } else {
      // Fallback to REST API
      const response = await apiClient.post('/api/terminal/execute', {
        sessionId: session.sessionId,
        code,
        language
      });

      if (response.data.success) {
        return response.data.result;
      } else {
        throw new Error(response.data.error || 'Execution failed');
      }
    }
  }, [session, enableWebSocket]);

  // Quick execute (no session required)
  const quickExecute = useCallback(async (code: string, language: string): Promise<CodeExecutionResult> => {
    const response = await apiClient.post('/api/execute', {
      code,
      language
    });

    if (response.data.success) {
      return response.data.result;
    } else {
      throw new Error(response.data.error || 'Execution failed');
    }
  }, []);

  // Send input to terminal
  const sendInput = useCallback((input: string) => {
    if (enableWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'TERMINAL_INPUT',
        payload: { input }
      }));
    } else if (session) {
      apiClient.post('/api/terminal/input', {
        sessionId: session.sessionId,
        input
      }).catch((error) => {
        console.error('Failed to send input:', error);
        setError('Failed to send input to terminal');
      });
    }
  }, [session, enableWebSocket]);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    if (terminal) {
      terminal.clear();
    }
    setOutput('');
    setError(null);
  }, [terminal]);

  // Resize terminal
  const resizeTerminal = useCallback(() => {
    if (fitAddonRef.current) {
      fitAddonRef.current.fit();
    }
  }, []);

  return {
    terminal,
    terminalRef,
    session,
    isConnected,
    createSession,
    connectToSession,
    terminateSession,
    executeCode,
    quickExecute,
    sendInput,
    isLoading,
    error,
    output,
    clearTerminal,
    resizeTerminal
  };
};

export default useDockerTerminal;