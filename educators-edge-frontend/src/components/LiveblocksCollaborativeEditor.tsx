import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import {
  useLiveblocksExtension,
  FloatingToolbar,
  Toolbar,
  FloatingThreads,
  AnchoredThreads
} from '@liveblocks/react-tiptap';
import { RoomProvider } from '@/lib/liveblocks';
import { useOthers, useMyPresence, useStatus, useErrorListener } from '@liveblocks/react';
import { useUser } from '@/hooks/useUser';
import { Users, MessageCircle, Eye, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface CollaborativeEditorProps {
  roomId: string;
  documentId: string;
  initialContent?: string;
  userRole: 'teacher' | 'student';
  onContentChange?: (content: string) => void;
  isReadOnly?: boolean;
}

function CollaborativeEditorInner({
  roomId,
  documentId,
  initialContent = '',
  userRole,
  onContentChange,
  isReadOnly = false,
}: CollaborativeEditorProps) {
  const { user } = useUser();
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const status = useStatus();
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'syncing' | 'error'>('connecting');

  // Add debug logging function
  const addDebugLog = useCallback((message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}${data ? ': ' + JSON.stringify(data) : ''}`;
    console.log('🔄 Collaborative Editor:', logMessage);
    setDebugLogs(prev => [...prev.slice(-9), logMessage]); // Keep last 10 logs
  }, []);

  // Enhanced permissions: Both teacher and student can edit in live sessions
  // For live collaborative sessions, both users should be able to edit
  const canEdit = true; // Always allow editing in collaborative sessions regardless of role

  // Log permission decision
  useEffect(() => {
    addDebugLog('Permission check', {
      userRole,
      isReadOnly,
      canEdit,
      calculatedAccess: 'Both teacher and student can edit in live sessions'
    });
  }, [userRole, isReadOnly, canEdit, addDebugLog]);

  // Error listener for Liveblocks
  useErrorListener((error) => {
    console.error('❌ Liveblocks Error:', error);
    addDebugLog('Liveblocks Error', {
      error: error.message,
      roomId,
      documentId,
      userRole,
      userId: user?.id,
      userName: user?.username
    });
    setSyncStatus('error');
  });

  // Monitor connection status
  useEffect(() => {
    addDebugLog('Status changed', { status, others: others.length });
    switch (status) {
      case 'initial':
      case 'connecting':
        setSyncStatus('connecting');
        break;
      case 'connected':
        setSyncStatus('connected');
        break;
      case 'reconnecting':
        setSyncStatus('connecting');
        break;
      case 'disconnected':
        setSyncStatus('error');
        break;
    }
  }, [status, others.length, addDebugLog]);

  // Use Liveblocks extension for TipTap with enhanced settings
  const liveblocks = useLiveblocksExtension({
    // Enable editing for both teacher and student in collaborative sessions
    readOnly: !canEdit,
    // Enable collaborative cursors and use a consistent field name
    field: 'document', // Use consistent field name instead of documentId
    // Add debugging
    onLoadDocument: (doc) => {
      addDebugLog('Document loaded', { docLength: doc?.length || 0 });
    },
    onSaveDocument: (doc) => {
      addDebugLog('Document saved', { docLength: doc?.length || 0 });
      setSyncStatus('connected');
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
      liveblocks,
    ],
    content: initialContent,
    onCreate: ({ editor }) => {
      addDebugLog('Editor created', {
        hasContent: !!editor.getHTML(),
        contentLength: editor.getHTML().length
      });
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      addDebugLog('Editor updated', {
        contentLength: content.length,
        wordCount: editor.storage.characterCount?.words || 0
      });
      setSyncStatus('syncing');

      if (onContentChange) {
        onContentChange(content);
      }

      // Reset to connected after a brief delay
      setTimeout(() => setSyncStatus('connected'), 500);
    },
    onTransaction: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        addDebugLog('Document changed', {
          steps: transaction.steps.length,
          selection: transaction.selection.toJSON()
        });
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-6 py-4',
        spellcheck: 'false',
      },
    },
  });

  // Update presence when cursor moves
  useEffect(() => {
    if (editor) {
      const updateCursor = () => {
        const selection = editor.state.selection;
        updateMyPresence({
          cursor: {
            anchor: selection.anchor,
            head: selection.head,
          },
        });
        addDebugLog('Cursor updated', {
          anchor: selection.anchor,
          head: selection.head
        });
      };

      editor.on('selectionUpdate', updateCursor);
      return () => editor.off('selectionUpdate', updateCursor);
    }
  }, [editor, updateMyPresence, addDebugLog]);

  // Log when others join/leave
  useEffect(() => {
    addDebugLog('Others changed', {
      count: others.length,
      users: others.map(other => other.presence?.user?.name || 'Unknown')
    });
  }, [others, addDebugLog]);

  // Debug room and document info
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    addDebugLog('Room initialized', {
      roomId,
      documentId,
      userRole,
      canEdit,
      userId: user?.id,
      userName: user?.username,
      hasToken: !!token,
      tokenLength: token?.length || 0
    });

    // Add global debug function for manual testing
    (window as any).testLiveblocksAuth = async () => {
      console.log('🧪 Manual Liveblocks Auth Test');
      try {
        const token = localStorage.getItem('authToken') || 'dev-token-for-testing';
        const response = await fetch('http://localhost:10000/api/liveblocks/auth', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: roomId,
          }),
        });

        const result = await response.json();
        console.log('✅ Auth Result:', {
          status: response.status,
          ok: response.ok,
          result,
        });
        return result;
      } catch (error) {
        console.error('❌ Auth Error:', error);
        return error;
      }
    };
  }, [roomId, documentId, userRole, canEdit, user, addDebugLog]);

  // User info for Liveblocks presence
  const userInfo = useMemo(() => ({
    id: user?.id || 'anonymous',
    name: user?.username || 'Anonymous',
    avatar: user?.avatar,
    color: userRole === 'teacher' ? '#3B82F6' : '#10B981', // Blue for teacher, green for student
  }), [user, userRole]);

  // Count active collaborators
  const activeUsers = others.length + 1; // +1 for current user

  return (
    <div className="relative h-full flex flex-col">
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full shadow-sm ${
                userRole === 'teacher' ? 'bg-blue-500' : 'bg-green-500'
              }`}
            />
            <span className="text-sm font-semibold text-gray-800">
              {userRole === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}: {user?.username}
            </span>
          </div>

          {/* Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border shadow-sm ${
            syncStatus === 'connected' ? 'bg-green-100 border-green-200 text-green-800' :
            syncStatus === 'connecting' ? 'bg-yellow-100 border-yellow-200 text-yellow-800' :
            syncStatus === 'syncing' ? 'bg-blue-100 border-blue-200 text-blue-800' :
            'bg-red-100 border-red-200 text-red-800'
          }`}>
            {syncStatus === 'connected' && <CheckCircle className="w-4 h-4" />}
            {syncStatus === 'connecting' && <Loader className="w-4 h-4 animate-spin" />}
            {syncStatus === 'syncing' && <Loader className="w-4 h-4 animate-spin" />}
            {syncStatus === 'error' && <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium capitalize">{syncStatus}</span>
          </div>

          {/* Active Users Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm">
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">{activeUsers} active</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {!canEdit && (
            <div className="flex items-center space-x-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">View Only</span>
            </div>
          )}

          {canEdit && (
            <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-800 rounded-full">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Collaborative</span>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {canEdit && editor && (
        <div className="border-b border-gray-200 bg-white">
          <Toolbar editor={editor} />
        </div>
      )}

      {/* Editor Container */}
      <div className="flex-1 relative bg-white">
        <div className="h-full overflow-auto">
          <EditorContent
            editor={editor}
            className="h-full"
          />
        </div>

        {/* Floating Features */}
        {editor && (
          <>
            {canEdit && <FloatingToolbar editor={editor} />}
            <FloatingThreads editor={editor} />
            <AnchoredThreads editor={editor} />
          </>
        )}
      </div>

      {/* Enhanced Footer with Debug Info */}
      <div className="p-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <div className="flex items-center space-x-4">
            <span>📄 Document: {documentId}</span>
            <span>🏠 Room: {roomId}</span>
            <span>🔗 Status: {status}</span>
          </div>
          <div className="flex items-center space-x-2">
            {others.map((other) => (
              <div
                key={other.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm"
                style={{ backgroundColor: other.presence?.user?.color || '#6B7280' }}
                title={other.presence?.user?.name || 'Unknown User'}
              >
                {(other.presence?.user?.name || 'U')[0].toUpperCase()}
              </div>
            ))}
          </div>
        </div>

        {/* Debug Logs */}
        {debugLogs.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              Debug Logs ({debugLogs.length})
            </summary>
            <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 max-h-32 overflow-y-auto">
              {debugLogs.map((log, index) => (
                <div key={index} className="truncate">{log}</div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export default function CollaborativeEditor(props: CollaborativeEditorProps) {
  const { user } = useUser();

  // Room ID should be unique per session/document
  const roomId = `${props.roomId}`;

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: null,
        user: {
          id: user?.id || 'anonymous',
          name: user?.username || 'Anonymous',
          color: props.userRole === 'teacher' ? '#3B82F6' : '#10B981',
          role: props.userRole,
        },
      }}
      initialStorage={{
        // Use consistent field name for document storage
        document: props.initialContent || '<p>Start writing together...</p>',
        version: 1,
        metadata: {
          documentId: props.documentId,
          createdBy: user?.id,
          createdAt: new Date().toISOString(),
        },
      }}
      shouldInitiallyConnect={true}
    >
      <CollaborativeEditorInner {...props} />
    </RoomProvider>
  );
}