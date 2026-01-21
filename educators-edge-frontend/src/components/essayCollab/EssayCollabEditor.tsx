/**
 * Essay Collaboration Real-time Editor
 *
 * Liveblocks-powered collaborative editor for real-time essay editing
 * between teacher and student during the multi-agent writing process.
 *
 * Features:
 * - Real-time collaboration via Liveblocks
 * - Programmatic text find & replace for AI suggestions
 * - Word count tracking
 * - Auto-sync with draft content
 */

import React, { useCallback, useEffect, useMemo, useState, Suspense, useRef, useImperativeHandle, forwardRef } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  useLiveblocksExtension,
  FloatingToolbar,
  Toolbar
} from '@liveblocks/react-tiptap';
import {
  RoomProvider,
  useRoomOthers as useOthers,
  useRoomMyPresence as useMyPresence,
  useRoomStatus as useStatus,
  useRoomErrorListener as useErrorListener
} from '@/lib/liveblocks';
import { useUser } from '@/hooks/useUser';
import {
  Users,
  CheckCircle,
  AlertCircle,
  Loader,
  Save,
  FileText,
  Target,
  Sparkles
} from 'lucide-react';

// Editor methods exposed to parent components
export interface EditorMethods {
  findAndReplace: (searchText: string, replaceText: string) => boolean;
  setContent: (content: string) => void;
  getContent: () => string;
  getPlainText: () => string;
  highlightText: (text: string) => void;
}

interface EssayCollabEditorProps {
  sessionId: string;
  initialContent?: string;
  targetWordCount?: number;
  isTeacher: boolean;
  onContentChange?: (content: string) => void;
  onSave?: (content: string) => void;
  onEditorReady?: (methods: EditorMethods) => void;
}

function EditorContent_Internal({
  sessionId,
  initialContent = '',
  targetWordCount = 650,
  isTeacher,
  onContentChange,
  onSave,
  onEditorReady
}: EssayCollabEditorProps) {
  const { user } = useUser();
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const status = useStatus();
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'connected' | 'syncing' | 'error'>('connecting');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [lastAppliedChange, setLastAppliedChange] = useState<{ from: string; to: string } | null>(null);
  const editorMethodsRef = useRef<EditorMethods | null>(null);

  const userRole = isTeacher ? 'teacher' : 'student';

  // Error listener for Liveblocks
  useErrorListener((error) => {
    console.error('[EssayCollabEditor] Liveblocks Error:', error);
    setSyncStatus('error');
  });

  // Monitor connection status
  useEffect(() => {
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
  }, [status]);

  // Use Liveblocks extension for TipTap
  const liveblocks = useLiveblocksExtension();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false // Liveblocks handles history
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your essay here...',
      }),
      CharacterCount.configure({
        limit: targetWordCount * 10 // Character limit based on word count estimate
      }),
      liveblocks,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      const words = editor.storage.characterCount?.words() || 0;
      setWordCount(words);
      setSyncStatus('syncing');

      if (onContentChange) {
        onContentChange(content);
      }

      // Reset to connected after a brief delay
      setTimeout(() => setSyncStatus('connected'), 500);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[400px] px-6 py-4 bg-white',
        spellcheck: 'true',
      },
    },
  });

  // Create editor methods for external access (e.g., applying AI suggestions)
  useEffect(() => {
    if (!editor) return;

    const methods: EditorMethods = {
      // Find and replace text in the editor - simplified and more reliable approach
      findAndReplace: (searchText: string, replaceText: string): boolean => {
        console.log('[EssayCollabEditor] findAndReplace called');
        console.log('[EssayCollabEditor] Search (first 80):', searchText.slice(0, 80));
        console.log('[EssayCollabEditor] Replace (first 80):', replaceText.slice(0, 80));

        const currentHtml = editor.getHTML();
        const plainText = editor.getText();

        console.log('[EssayCollabEditor] Editor HTML length:', currentHtml.length);
        console.log('[EssayCollabEditor] Editor text length:', plainText.length);

        // Helper to normalize whitespace for comparison
        const normalizeWs = (s: string) => s.replace(/\s+/g, ' ').trim();
        const normalizedSearch = normalizeWs(searchText);

        // Method 1: Direct HTML replacement (exact match)
        if (currentHtml.includes(searchText)) {
          const newHtml = currentHtml.replace(searchText, replaceText);
          editor.commands.setContent(newHtml, false); // false = don't add to history
          console.log('[EssayCollabEditor] SUCCESS: Direct HTML replacement');
          setLastAppliedChange({ from: searchText, to: replaceText });
          setTimeout(() => setLastAppliedChange(null), 2000);
          return true;
        }

        // Method 2: Plain text exact match
        if (plainText.includes(searchText)) {
          const newText = plainText.replace(searchText, replaceText);
          // Convert to HTML paragraphs
          const paragraphs = newText.split(/\n\n+/).filter(p => p.trim());
          const newHtml = paragraphs.length > 0
            ? paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
            : `<p>${newText}</p>`;
          editor.commands.setContent(newHtml, false);
          console.log('[EssayCollabEditor] SUCCESS: Plain text replacement');
          setLastAppliedChange({ from: searchText, to: replaceText });
          setTimeout(() => setLastAppliedChange(null), 2000);
          return true;
        }

        // Method 3: Whitespace-normalized match in plain text
        const normalizedPlainText = normalizeWs(plainText);
        if (normalizedPlainText.includes(normalizedSearch)) {
          // Find where it appears in the original to do the replacement
          // Build a mapping from normalized index to original index
          let normalizedIdx = 0;
          let originalIdx = 0;
          const plainTextArr = plainText.split('');
          let matchStart = -1;

          while (originalIdx < plainText.length && normalizedIdx < normalizedPlainText.length) {
            // Skip whitespace runs in original to match with normalized
            while (originalIdx < plainText.length && /\s/.test(plainText[originalIdx])) {
              originalIdx++;
            }

            if (normalizedIdx === normalizedPlainText.indexOf(normalizedSearch) && matchStart === -1) {
              matchStart = originalIdx;
            }

            if (/\s/.test(normalizedPlainText[normalizedIdx])) {
              normalizedIdx++;
              continue;
            }

            normalizedIdx++;
            originalIdx++;
          }

          if (matchStart !== -1) {
            // Find end by counting through the original
            const searchWords = searchText.split(/\s+/);
            let wordsFound = 0;
            let matchEnd = matchStart;

            for (let i = matchStart; i < plainText.length && wordsFound < searchWords.length; i++) {
              if (/\s/.test(plainText[i])) {
                if (i > matchStart && !/\s/.test(plainText[i-1])) {
                  wordsFound++;
                }
              }
              matchEnd = i;
            }
            matchEnd++; // Include last character

            const before = plainText.slice(0, matchStart);
            const after = plainText.slice(matchEnd);
            const newText = before + replaceText + after;

            const paragraphs = newText.split(/\n\n+/).filter(p => p.trim());
            const newHtml = paragraphs.length > 0
              ? paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
              : `<p>${newText}</p>`;
            editor.commands.setContent(newHtml, false);
            console.log('[EssayCollabEditor] SUCCESS: Normalized whitespace replacement');
            setLastAppliedChange({ from: searchText, to: replaceText });
            setTimeout(() => setLastAppliedChange(null), 2000);
            return true;
          }
        }

        // Method 4: Regex replacement with flexible whitespace in HTML
        try {
          const escapedSearch = searchText
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex chars
            .replace(/\s+/g, '\\s+'); // Make whitespace flexible
          const regex = new RegExp(escapedSearch, 'i');

          if (regex.test(currentHtml)) {
            const newHtml = currentHtml.replace(regex, replaceText);
            editor.commands.setContent(newHtml, false);
            console.log('[EssayCollabEditor] SUCCESS: Regex HTML replacement');
            setLastAppliedChange({ from: searchText, to: replaceText });
            setTimeout(() => setLastAppliedChange(null), 2000);
            return true;
          }
        } catch (e) {
          console.warn('[EssayCollabEditor] Regex replacement failed:', e);
        }

        // Method 5: Fuzzy match - try first 30 chars
        if (normalizedSearch.length > 30) {
          const shortSearch = normalizedSearch.slice(0, 30);
          const shortIdx = normalizedPlainText.indexOf(shortSearch);

          if (shortIdx !== -1) {
            console.log('[EssayCollabEditor] Found partial match at normalized index:', shortIdx);
            // Attempt replacement by finding approximate position
            let charCount = 0;
            let startPos = 0;
            for (let i = 0; i < plainText.length && charCount < shortIdx; i++) {
              if (!/\s/.test(plainText[i]) || (i > 0 && !/\s/.test(plainText[i-1]))) {
                charCount++;
              }
              startPos = i;
            }

            // Find a reasonable end position
            const approxLength = searchText.length;
            const endPos = Math.min(startPos + approxLength + 20, plainText.length);

            const before = plainText.slice(0, startPos);
            const after = plainText.slice(endPos);
            const newText = before + replaceText + after;

            const paragraphs = newText.split(/\n\n+/).filter(p => p.trim());
            const newHtml = paragraphs.length > 0
              ? paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
              : `<p>${newText}</p>`;
            editor.commands.setContent(newHtml, false);
            console.log('[EssayCollabEditor] SUCCESS: Fuzzy partial match replacement');
            setLastAppliedChange({ from: searchText, to: replaceText });
            setTimeout(() => setLastAppliedChange(null), 2000);
            return true;
          }
        }

        console.warn('[EssayCollabEditor] FAILED: All replacement methods failed');
        console.log('[EssayCollabEditor] Search text:', searchText);
        console.log('[EssayCollabEditor] Plain text (first 500):', plainText.slice(0, 500));
        return false;
      },

      // Set the entire content of the editor
      setContent: (content: string) => {
        console.log('[EssayCollabEditor] setContent called, length:', content.length);
        // Handle plain text vs HTML
        if (content.startsWith('<')) {
          editor.commands.setContent(content);
        } else {
          // Convert plain text to HTML paragraphs
          const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
          const html = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
          editor.commands.setContent(html);
        }
      },

      // Get the current HTML content
      getContent: () => {
        return editor.getHTML();
      },

      // Get plain text content
      getPlainText: () => {
        return editor.getText();
      },

      // Highlight specific text (for showing what will be changed)
      highlightText: (text: string) => {
        console.log('[EssayCollabEditor] Highlight requested for:', text.slice(0, 50));
      }
    };

    editorMethodsRef.current = methods;

    // Notify parent that editor is ready
    if (onEditorReady) {
      onEditorReady(methods);
    }
  }, [editor, onEditorReady]);

  // Update presence when cursor moves
  useEffect(() => {
    if (!editor) return;

    const updateCursor = () => {
      const selection = editor.state.selection;
      updateMyPresence({
        cursor: {
          anchor: selection.anchor,
          head: selection.head,
        },
      } as any);
    };

    editor.on('selectionUpdate', updateCursor);
    return () => {
      editor.off('selectionUpdate', updateCursor);
    };
  }, [editor, updateMyPresence]);

  // Handle manual save
  const handleSave = useCallback(() => {
    if (editor && onSave) {
      onSave(editor.getHTML());
      setLastSaved(new Date());
    }
  }, [editor, onSave]);

  // Count active collaborators
  const activeUsers = others.length + 1;

  // Word count progress
  const wordCountProgress = Math.min((wordCount / targetWordCount) * 100, 100);
  const wordCountColor = wordCount > targetWordCount ? 'text-red-600' : wordCount >= targetWordCount * 0.9 ? 'text-green-600' : 'text-gray-600';

  return (
    <div className="h-full flex flex-col border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <div className="flex items-center gap-4">
          {/* User role indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isTeacher ? 'bg-blue-500' : 'bg-green-500'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {isTeacher ? 'Teacher' : 'Student'}: {user?.username}
            </span>
          </div>

          {/* Connection status */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            syncStatus === 'connected' ? 'bg-green-100 text-green-700' :
            syncStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
            syncStatus === 'syncing' ? 'bg-blue-100 text-blue-700' :
            'bg-red-100 text-red-700'
          }`}>
            {syncStatus === 'connected' && <CheckCircle className="w-3.5 h-3.5" />}
            {syncStatus === 'connecting' && <Loader className="w-3.5 h-3.5 animate-spin" />}
            {syncStatus === 'syncing' && <Loader className="w-3.5 h-3.5 animate-spin" />}
            {syncStatus === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
            <span className="capitalize">{syncStatus}</span>
          </div>

          {/* Active users */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
            <Users className="w-3.5 h-3.5" />
            <span>{activeUsers} editing</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Word count */}
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className={`text-sm font-medium ${wordCountColor}`}>
              {wordCount} / {targetWordCount} words
            </span>
            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  wordCount > targetWordCount ? 'bg-red-500' : 'bg-purple-500'
                }`}
                style={{ width: `${wordCountProgress}%` }}
              />
            </div>
          </div>

          {/* Save button */}
          {onSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="border-b bg-white">
          <Toolbar editor={editor} />
        </div>
      )}

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
        {editor && <FloatingToolbar editor={editor} />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-2 bg-gray-50 border-t text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            Session: {sessionId.slice(0, 8)}...
          </span>
          {lastSaved && (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>

        {/* Collaborator avatars */}
        <div className="flex items-center gap-1">
          {others.map((other: any) => (
            <div
              key={other.connectionId}
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold bg-purple-500"
              title="Collaborator"
            >
              C
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function EditorLoading() {
  return (
    <div className="h-full flex items-center justify-center bg-gray-50 border rounded-lg">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <Loader className="w-8 h-8 animate-spin" />
        <span>Loading collaborative editor...</span>
      </div>
    </div>
  );
}

// Main component with RoomProvider wrapper
export default function EssayCollabEditor(props: EssayCollabEditorProps) {
  const { user } = useUser();
  const roomId = `essay-collab-${props.sessionId}`;

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: undefined,
        selection: undefined,
      }}
      initialStorage={{
        document: props.initialContent || '',
        version: 1,
      }}
    >
      <Suspense fallback={<EditorLoading />}>
        <EditorContent_Internal {...props} />
      </Suspense>
    </RoomProvider>
  );
}
