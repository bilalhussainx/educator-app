// =================================================================
// FILE: src/hooks/useDockerTerminal.ts
// =================================================================
// DESCRIPTION: React hook for Docker-based terminal functionality
// Provides terminal session management and real-time communication

import { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
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

    console.log('🔧 DockerTerminal: Initializing terminal instance');
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
    console.log('✅ DockerTerminal: Terminal instance initialized and set');

    // Handle terminal input
    newTerminal.onData((data) => {
      if (enableWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'TERMINAL_INPUT',
          payload: { input: data }
        }));
      }
    });

    // Auto-connect if requested - delay to ensure terminal is ready
    if (autoConnect) {
      console.log('🚀 DockerTerminal: Auto-connecting with options:', { autoConnect, enableWebSocket });
      // Small delay to ensure terminal is fully initialized before WebSocket connects
      setTimeout(() => {
        console.log('🚀 DockerTerminal: Starting delayed auto-connect');
        createSession();
      }, 100);
    } else {
      console.log('❌ DockerTerminal: Auto-connect disabled:', { autoConnect, enableWebSocket });
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
    console.log('🎯 DockerTerminal: Received WebSocket message:', event.data.substring(0, 200));
    
    try {
      const message = JSON.parse(event.data);
      console.log('📨 DockerTerminal: Parsed message type:', message.type, 'payload:', message.payload);
      
      switch (message.type) {
        case 'TERMINAL_OUTPUT':
          console.log('📺 DockerTerminal: Processing TERMINAL_OUTPUT:', message.payload.output);
          console.log('🔍 DockerTerminal: Current terminal instance:', !!terminal);
          console.log('🔍 DockerTerminal: Terminal ref current:', !!terminalRef.current);
          
          // Try to get terminal from current state or wait briefly for initialization
          const currentTerminal = terminal;
          if (currentTerminal) {
            console.log('✅ DockerTerminal: Writing to terminal:', message.payload.output.length, 'characters');
            currentTerminal.write(message.payload.output);
            console.log('✅ DockerTerminal: TERMINAL_OUTPUT written to terminal');
          } else {
            console.error('❌ DockerTerminal: No terminal instance available for TERMINAL_OUTPUT');
            // Queue the message for when terminal becomes available
            console.log('🔄 DockerTerminal: Queuing TERMINAL_OUTPUT for later processing');
            setTimeout(() => {
              if (terminal) {
                console.log('🔄 DockerTerminal: Retrying queued TERMINAL_OUTPUT');
                terminal.write(message.payload.output);
              }
            }, 100);
          }
          setOutput(prev => prev + message.payload.output);
          break;

        case 'TERMINAL_SESSION_CONNECTED':
          console.log('🔗 DockerTerminal: Terminal session connected');
          setSession(prev => prev ? { ...prev, status: 'connected' } : null);
          setIsConnected(true);
          setError(null);
          if (terminal) {
            terminal.write(`\r\n✅ Connected to Docker terminal session\r\n$ `);
            console.log('✅ DockerTerminal: Connection message written to terminal');
          }
          break;

        case 'CODE_EXECUTION_RESULT':
          console.log('🚀 DockerTerminal: Processing CODE_EXECUTION_RESULT:', message.payload);
          const result = message.payload.result;
          console.log('📋 DockerTerminal: Execution result:', result);
          console.log('🔍 DockerTerminal: Current terminal instance for CODE_EXECUTION_RESULT:', !!terminal);
          
          const currentTerminal = terminal;
          if (currentTerminal && result && result.output) {
            console.log('✅ DockerTerminal: Writing execution result to terminal:', result.output.length, 'characters');
            currentTerminal.write(`\r\n${result.output}\r\n$ `);
            console.log('✅ DockerTerminal: CODE_EXECUTION_RESULT written to terminal');
          } else {
            console.error('❌ DockerTerminal: Cannot write execution result - terminal:', !!terminal, 'result:', !!result, 'output:', !!(result?.output));
            // Queue for retry
            if (result && result.output) {
              setTimeout(() => {
                if (terminal) {
                  console.log('🔄 DockerTerminal: Retrying queued CODE_EXECUTION_RESULT');
                  terminal.write(`\r\n${result.output}\r\n$ `);
                }
              }, 100);
            }
          }
          break;

        case 'CONNECTION_ESTABLISHED':
          console.log('🎊 DockerTerminal: Connection established message received');
          setIsConnected(true);
          setError(null);
          if (terminal) {
            terminal.write(`\r\n🎊 Terminal connection established\r\n$ `);
          }
          break;

        case 'TERMINAL_ERROR':
          console.log('❌ DockerTerminal: Terminal error received:', message.payload.error);
          setError(message.payload.error);
          if (terminal) {
            terminal.write(`\r\n❌ Error: ${message.payload.error}\r\n$ `);
          }
          break;

        case 'TERMINAL_SESSION_CREATED':
          console.log('✨ DockerTerminal: Terminal session created:', message.payload.sessionId);
          const newSession: TerminalSession = {
            sessionId: message.payload.sessionId,
            status: 'connected',
            createdAt: new Date()
          };
          setSession(newSession);
          setIsConnected(true);
          break;

        default:
          console.log('❓ DockerTerminal: Unknown WebSocket message type:', message.type, 'full message:', message);
      }
    } catch (error) {
      console.error('❌ DockerTerminal: Error handling WebSocket message:', error);
      console.error('❌ DockerTerminal: Raw message data:', event.data);
    }
  }, [terminal]);

  // WebSocket connection management
  const connectWebSocket = useCallback((sessionId?: string) => {
    if (!enableWebSocket) {
      console.log('❌ DockerTerminal: WebSocket disabled');
      return;
    }

    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('❌ DockerTerminal: No auth token found');
      setError('Authentication token not found');
      return;
    }

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:10000'}/terminal?token=${encodeURIComponent(token)}${sessionId ? `&sessionId=${sessionId}` : ''}`;
    console.log('🔗 DockerTerminal: Attempting WebSocket connection to:', wsUrl);
    
    try {
      const ws = new WebSocket(wsUrl);
      console.log('✅ DockerTerminal: WebSocket object created');
      
      ws.onopen = () => {
        console.log('✅ DockerTerminal: Terminal WebSocket connected successfully');
        console.log('🔗 DockerTerminal: WebSocket readyState:', ws.readyState);
        console.log('🔗 DockerTerminal: WebSocket URL:', wsUrl);
        setIsConnected(true);
        setError(null);
        
        // Send a test message to confirm connection
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'HEALTH_CHECK',
            payload: { timestamp: Date.now() }
          }));
          console.log('📤 DockerTerminal: Sent HEALTH_CHECK message');
        }
      };
      
      ws.onmessage = (event) => {
        console.log('📨 DockerTerminal: Raw WebSocket message received');
        console.log('📨 DockerTerminal: Message data length:', event.data.length);
        console.log('📨 DockerTerminal: Terminal instance exists:', !!terminal);
        handleWebSocketMessage(event);
      };
      
      ws.onclose = (event) => {
        console.log('🔌 DockerTerminal: Terminal WebSocket disconnected');
        console.log('🔌 DockerTerminal: Close code:', event.code);
        console.log('🔌 DockerTerminal: Close reason:', event.reason);
        console.log('🔌 DockerTerminal: Was clean close:', event.wasClean);
        setIsConnected(false);
        
        if (event.code !== 1000) { // Not a normal closure
          setError(`Connection lost: ${event.reason || 'Unknown error'}`);
          console.error('❌ DockerTerminal: Abnormal WebSocket closure');
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ DockerTerminal: Terminal WebSocket error:', error);
        console.error('❌ DockerTerminal: WebSocket readyState:', ws.readyState);
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
    console.log('🎯 DockerTerminal: createSession called with enableWebSocket:', enableWebSocket);
    setIsLoading(true);
    setError(null);

    try {
      if (enableWebSocket) {
        console.log('🔗 DockerTerminal: Creating session via WebSocket');
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
    console.log('🚀 DockerTerminal: executeCode called with:', { code: code.substring(0, 50), language });
    console.log('🔍 DockerTerminal: Session exists:', !!session);
    console.log('🔍 DockerTerminal: EnableWebSocket:', enableWebSocket);
    console.log('🔍 DockerTerminal: WebSocket state:', wsRef.current?.readyState);
    
    if (!session) {
      console.error('❌ DockerTerminal: No active session for executeCode');
      throw new Error('No active session');
    }

    if (enableWebSocket && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('📡 DockerTerminal: Using WebSocket for code execution');
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('❌ DockerTerminal: Code execution timeout');
          reject(new Error('Execution timeout'));
        }, 30000);

        const handleResult = (event: MessageEvent) => {
          console.log('📨 DockerTerminal: executeCode received message:', event.data.substring(0, 100));
          try {
            const message = JSON.parse(event.data);
            console.log('📋 DockerTerminal: executeCode message type:', message.type);
            
            if (message.type === 'CODE_EXECUTION_RESULT') {
              console.log('✅ DockerTerminal: CODE_EXECUTION_RESULT received in executeCode');
              clearTimeout(timeout);
              wsRef.current?.removeEventListener('message', handleResult);
              resolve(message.payload.result);
            } else if (message.type === 'CODE_EXECUTION_ERROR') {
              console.log('❌ DockerTerminal: CODE_EXECUTION_ERROR received in executeCode');
              clearTimeout(timeout);
              wsRef.current?.removeEventListener('message', handleResult);
              reject(new Error(message.payload.error));
            }
          } catch (parseError) {
            console.error('❌ DockerTerminal: Error parsing executeCode result:', parseError);
          }
        };

        wsRef.current?.addEventListener('message', handleResult);
        
        const executeMessage = {
          type: 'EXECUTE_CODE',
          payload: { code, language }
        };
        
        console.log('📤 DockerTerminal: Sending EXECUTE_CODE message:', executeMessage);
        wsRef.current?.send(JSON.stringify(executeMessage));
        console.log('✅ DockerTerminal: EXECUTE_CODE message sent');
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