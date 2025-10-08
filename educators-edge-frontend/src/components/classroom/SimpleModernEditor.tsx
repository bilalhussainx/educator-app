import React, { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';

// Liveblocks integration
import {
  useLiveblocksExtension,
  FloatingToolbar,
  Toolbar,
} from '@liveblocks/react-tiptap';
import { RoomProvider } from '@/lib/liveblocks';
import { useOthers, useMyPresence, useStatus } from '@liveblocks/react';
import { useUser } from '@/hooks/useUser';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    FileText, Download, Save, Bot, MessageCircle, Users,
    Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
    Undo, Redo, Palette, Edit3, Sparkles, Eye, EyeOff, Target, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Import AI and inline comments functionality
import InlineCommentSystem, { InlineComment } from '../analysis/InlineCommentSystem';
import apiClient from '../../services/apiClient';

interface SimpleModernEditorProps {
    sessionId: string;
    userId: string;
    username: string;
    userRole: 'teacher' | 'student';
    initialContent?: string;
    uploadedDocument?: {
        name: string;
        url: string;
        content?: string;
        instructions?: string;
    } | null;
    onContentChange?: (content: string) => void;
    onCollaboratorsChange?: (collaborators: any[]) => void;
    sendWsMessage: (type: string, payload: any) => void;
    students: any[];
    handsRaised: Set<string>;
    onRaiseHand: () => void;
    onAssignHomework?: (assignment: any) => void;
    onSave: (content: string) => void;
}

function SimpleModernEditorInner({
    sessionId,
    userId,
    username,
    userRole,
    initialContent = '',
    uploadedDocument,
    onContentChange,
    sendWsMessage,
    students,
    onSave,
}: SimpleModernEditorProps) {
    const { user } = useUser();
    const others = useOthers();
    const [myPresence, updateMyPresence] = useMyPresence();
    const status = useStatus();

    const [wordCount, setWordCount] = useState(0);
    const [showAIChat, setShowAIChat] = useState(false);

    // AI and inline comments state
    const [inlineComments, setInlineComments] = useState<InlineComment[]>([]);
    const [showInlineComments, setShowInlineComments] = useState(false);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [inlineCommentMode, setInlineCommentMode] = useState<'basic' | 'dense' | 'very_dense'>('dense');

    // Liveblocks extension
    const liveblocks = useLiveblocksExtension({
        field: 'document',
    });

    // Editor configuration
    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            liveblocks,
        ],
        content: uploadedDocument?.content || initialContent || '<h1>🚀 Modern Essay Editor</h1><p>Start writing your collaborative essay here...</p>',
        onCreate: ({ editor }) => {
            console.log('✅ Editor created');
        },
        onUpdate: ({ editor }) => {
            const content = editor.getHTML();
            const text = editor.getText();
            setWordCount(text.split(/\s+/).filter(word => word.length > 0).length);

            if (onContentChange) {
                onContentChange(content);
            }

            // Send real-time updates to collaborators
            sendWsMessage('ESSAY_CONTENT_UPDATE', {
                content,
                userId,
                timestamp: new Date().toISOString()
            });
        },
        onSelectionUpdate: ({ editor }) => {
            const { from, to } = editor.state.selection;
            updateMyPresence({
                cursor: {
                    anchor: from,
                    head: to,
                },
            });
        },
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-lg max-w-none focus:outline-none',
                    'min-h-[600px] mx-auto bg-white shadow-lg rounded-lg',
                    'px-16 py-12', // A4-like margins
                    'border border-gray-200'
                ),
                spellcheck: 'true',
            },
        },
    });

    // Update content when uploadedDocument changes
    useEffect(() => {
        if (editor && uploadedDocument?.content) {
            console.log('📝 Setting uploaded document content');
            editor.commands.setContent(uploadedDocument.content);
            toast.success(`Document "${uploadedDocument.name}" loaded!`);
        }
    }, [editor, uploadedDocument?.content]);

    // AI inline comments functionality
    const generateInlineComments = async (content: string, mode: 'basic' | 'dense' | 'very_dense') => {
        if (!content || content.trim().length < 50) {
            toast.error('Please write at least 50 characters to generate inline comments');
            return;
        }

        setAiAnalyzing(true);
        try {
            const response = await apiClient.post('/api/ai/scribe/claude-inline-analysis', {
                documentContent: content,
                config: {
                    documentType: 'college_essay',
                    analysisDepth: mode,
                    focusAreas: ['structure', 'clarity', 'style', 'engagement'],
                    userLevel: 'intermediate'
                },
                analysisType: 'inline_comments'
            });

            if (response.data.success) {
                const claudeComments = response.data.comments || [];
                const generatedComments = claudeComments.map((comment: any, index: number) => ({
                    id: comment.id || `claude_${index}`,
                    startOffset: comment.startOffset || 0,
                    endOffset: comment.endOffset || 50,
                    text: comment.originalText || content.substring(comment.startOffset || 0, comment.endOffset || 50),
                    highlightedText: comment.highlightedText || content.substring(comment.startOffset || 0, comment.endOffset || 50),
                    type: comment.commentType || 'suggestion',
                    severity: comment.severity || 'moderate',
                    message: comment.message || 'Claude suggests reviewing this section',
                    suggestion: comment.suggestion || comment.explanation || 'Consider the suggested improvement',
                    explanation: comment.explanation || 'This will enhance your writing',
                    alternatives: comment.alternatives || [],
                    confidence: comment.confidence || 0.8,
                    category: comment.category || 'General Improvement',
                    timestamp: new Date(),
                    isVisible: true
                }));

                setInlineComments(generatedComments);
                setShowInlineComments(true);
                toast.success(`✨ Generated ${generatedComments.length} AI-powered inline comments!`);
            } else {
                toast.error('Failed to generate comments');
            }
        } catch (error) {
            console.error('Error generating inline comments:', error);
            toast.error('Failed to generate AI comments');
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleInlineCommentAction = async (commentId: string, action: 'apply' | 'dismiss' | 'like' | 'dislike') => {
        const comment = inlineComments.find(c => c.id === commentId);
        if (!comment || !editor) return;

        try {
            switch (action) {
                case 'apply':
                    const textToApply = comment.suggestion;
                    if (textToApply) {
                        // Apply the suggested text to the document
                        editor.commands.focus();
                        editor.commands.setTextSelection({
                            from: comment.startOffset,
                            to: comment.endOffset
                        });
                        editor.commands.insertContent(textToApply);

                        // Hide applied comment
                        setInlineComments(prev => prev.map(c =>
                            c.id === commentId ? { ...c, isVisible: false } : c
                        ));

                        toast.success('Suggestion applied successfully!');
                    }
                    break;

                case 'dismiss':
                    setInlineComments(prev => prev.map(c =>
                        c.id === commentId ? { ...c, isVisible: false } : c
                    ));
                    toast.info('Comment dismissed');
                    break;

                case 'like':
                    toast.success('Thanks for the feedback! 👍');
                    break;

                case 'dislike':
                    toast.info('Feedback noted. We\'ll improve our suggestions.');
                    break;
            }
        } catch (error) {
            console.error('Error handling inline comment action:', error);
            toast.error('Failed to process comment action');
        }
    };

    const toggleInlineComments = () => {
        if (showInlineComments) {
            setShowInlineComments(false);
            setInlineComments([]);
            toast.info('Inline comments hidden');
        } else if (editor) {
            const content = editor.getHTML();
            generateInlineComments(content, inlineCommentMode);
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Modern Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                {/* Top menu bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">
                                    {uploadedDocument?.name || 'Collaborative Essay'}
                                </h1>
                                <div className="flex items-center space-x-3 text-sm text-gray-500">
                                    <span>{userRole === 'teacher' ? '👨‍🏫' : '👨‍🎓'} {username}</span>
                                    <span>•</span>
                                    <span>{students.length} participants</span>
                                    <span>•</span>
                                    <span>{wordCount} words</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAIChat(!showAIChat)}
                            className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                            <Bot className="w-4 h-4 mr-1" />
                            AI Assistant
                        </Button>

                        <Button
                            variant={showInlineComments ? "default" : "outline"}
                            size="sm"
                            onClick={toggleInlineComments}
                            disabled={aiAnalyzing}
                            className={cn(
                                showInlineComments
                                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                                    : "text-orange-600 border-orange-200 hover:bg-orange-50"
                            )}
                        >
                            {aiAnalyzing ? (
                                <div className="animate-spin w-4 h-4 mr-1 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            {aiAnalyzing ? 'Analyzing...' : showInlineComments ? 'Hide Comments' : 'AI Comments'}
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => {
                                if (editor) {
                                    onSave(editor.getHTML());
                                    toast.success('Essay saved successfully!');
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                        </Button>
                    </div>
                </div>

                {/* Toolbar */}
                {editor && (
                    <div className="flex items-center justify-between px-6 py-2">
                        <div className="flex items-center space-x-1">
                            {/* Basic formatting */}
                            <Button
                                variant={editor.isActive('bold') ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => editor.commands.toggleBold()}
                            >
                                <Bold className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={editor.isActive('italic') ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => editor.commands.toggleItalic()}
                            >
                                <Italic className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={editor.isActive('underline') ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => editor.commands.toggleUnderline()}
                            >
                                <UnderlineIcon className="w-4 h-4" />
                            </Button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            {/* Text alignment */}
                            <Button
                                variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => editor.commands.setTextAlign('left')}
                            >
                                <AlignLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => editor.commands.setTextAlign('center')}
                            >
                                <AlignCenter className="w-4 h-4" />
                            </Button>
                            <Button
                                variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => editor.commands.setTextAlign('right')}
                            >
                                <AlignRight className="w-4 h-4" />
                            </Button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            {/* Undo/Redo */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.commands.undo()}
                            >
                                <Undo className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.commands.redo()}
                            >
                                <Redo className="w-4 h-4" />
                            </Button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            {/* Highlight */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editor.commands.toggleHighlight({ color: '#FEF3C7' })}
                                title="Highlight text"
                            >
                                <Palette className="w-4 h-4" />
                            </Button>

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            {/* AI Comments Mode Selector */}
                            {showInlineComments && (
                                <select
                                    value={inlineCommentMode}
                                    onChange={(e) => setInlineCommentMode(e.target.value as 'basic' | 'dense' | 'very_dense')}
                                    className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                                    title="Comment density"
                                >
                                    <option value="basic">Basic</option>
                                    <option value="dense">Dense</option>
                                    <option value="very_dense">Very Dense</option>
                                </select>
                            )}

                            <div className="w-px h-6 bg-gray-300 mx-2" />

                            {/* Diagram Tool Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toast.info('Diagram tool opening...')}
                                title="Draw diagram or sketch"
                                className="text-green-600 hover:bg-green-50"
                            >
                                <Edit3 className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Live collaboration indicators */}
                        <div className="flex items-center space-x-3">
                            {others.length > 0 && (
                                <div className="flex items-center space-x-2">
                                    <Users className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm text-gray-600">{others.length + 1} editing</span>
                                    <div className="flex -space-x-1">
                                        {others.slice(0, 3).map((other) => (
                                            <div
                                                key={other.id}
                                                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                                                style={{ backgroundColor: other.presence?.user?.color || '#6B7280' }}
                                                title={other.presence?.user?.name || 'Unknown User'}
                                            >
                                                {(other.presence?.user?.name || 'U')[0].toUpperCase()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                                )} />
                                <span className="text-sm text-gray-600 capitalize">{status}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main editor area */}
            <div className="flex-1 overflow-auto bg-gray-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <EditorContent editor={editor} />

                    {/* Floating features */}
                    {editor && (
                        <>
                            <FloatingToolbar editor={editor} />

                            {/* Inline Comments System */}
                            {showInlineComments && (
                                <InlineCommentSystem
                                    comments={inlineComments.filter(c => c.isVisible)}
                                    onCommentAction={handleInlineCommentAction}
                                    documentContent={editor.getHTML()}
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Status bar */}
            <div className="bg-white border-t border-gray-200 px-6 py-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                        <span>Words: {wordCount}</span>
                        <span>Document: {uploadedDocument?.name || 'Untitled'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span>Session: {sessionId}</span>
                    </div>
                </div>
            </div>

            {/* Simple AI Chat Panel */}
            {showAIChat && (
                <div className="fixed bottom-4 right-4 w-80 h-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50">
                    <div className="p-4 border-b bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-t-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <Bot className="w-5 h-5" />
                                <span className="font-semibold">AI Writing Assistant</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAIChat(false)}
                                className="text-white hover:bg-white/20"
                            >
                                ×
                            </Button>
                        </div>
                    </div>
                    <div className="p-4 h-full overflow-auto">
                        <div className="text-center text-gray-500 py-8">
                            <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-sm">AI Assistant Ready</p>
                            <p className="text-xs mt-2">Advanced AI features coming soon!</p>
                            <Button
                                size="sm"
                                className="mt-4"
                                onClick={() => toast.info('AI analysis feature coming soon!')}
                            >
                                Analyze Document
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function SimpleModernEditor(props: SimpleModernEditorProps) {
    const { user } = useUser();
    const roomId = `essay-${props.sessionId}`;

    // Determine initial content - prioritize uploaded document content
    const getInitialContent = () => {
        if (props.uploadedDocument?.content) {
            return props.uploadedDocument.content;
        }
        if (props.initialContent) {
            return props.initialContent;
        }
        return '<h1>🚀 Welcome to Modern Essay Editor</h1><p>Start writing your collaborative essay here...</p>';
    };

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
                document: getInitialContent(),
                version: 1,
                metadata: {
                    documentId: props.sessionId,
                    documentName: props.uploadedDocument?.name || 'Collaborative Essay',
                    createdBy: user?.id,
                    createdAt: new Date().toISOString(),
                },
            }}
            shouldInitiallyConnect={true}
        >
            <SimpleModernEditorInner {...props} />
        </RoomProvider>
    );
}