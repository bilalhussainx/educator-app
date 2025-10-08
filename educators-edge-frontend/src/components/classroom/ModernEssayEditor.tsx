import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';

// --- AGORA SDK IMPORT ---
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Link from '@tiptap/extension-link';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Image from '@tiptap/extension-image';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import Placeholder from '@tiptap/extension-placeholder';
import Focus from '@tiptap/extension-focus';
import Gapcursor from '@tiptap/extension-gapcursor';
import HardBreak from '@tiptap/extension-hard-break';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import PageBreak from './PageBreakExtension';
import EnhancedAIChatPanel from './EnhancedAIChatPanel';
import EnhancedAICommentPanel from '../analysis/EnhancedAICommentPanel';
import MozartStrokePanel from '../scribe/MozartStrokePanel';
import ComprehensiveAIWritingCoach from '../analysis/ComprehensiveAIWritingCoach';
import GeminiWritingAssistant from '../ai/GeminiWritingAssistant';
import InlineCommentSystem, { InlineComment } from '../analysis/InlineCommentSystem';
import { cn } from '@/lib/utils';

// Liveblocks integration
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

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
    Users, User, FileText, Download, Save, Eye, MessageCircle, Hand, BookOpen, Send,
    Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Quote, Undo, Redo, Type, Palette, Zap, Bot,
    MessageSquare, ThumbsUp, ThumbsDown, Edit3, Sparkles, Brain, Target,
    Clock, CheckCircle, AlertCircle, Lightbulb, Star, Wand2, Plus, X,
    Link as LinkIcon, Table as TableIcon, Image as ImageIcon, Strikethrough,
    Paintbrush as PaintBucket, Highlighter, Maximize, Minimize, Heading1, Heading2,
    Heading3, Code, ChevronDown, Settings, Filter, SortAsc, MousePointer,
    Subscript as SubscriptIcon, Superscript as SuperscriptIcon, Hash,
    BarChart3, Timer, TrendingUp, Volume2, Play, Pause, Search,
    History, Bookmark as BookMarked, RefreshCw, Share2, Monitor, Smartphone, Menu,
    MoreHorizontal, Printer, Copy, Scissors, Clipboard, RotateCcw,
    ZoomIn, ZoomOut, Grid, Layout, AlignJustify as Rulers, CheckCircle2 as Spellcheck, Minus,
    Mic, MicOff, Video, VideoOff, Loader, Upload
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';

// Professional color palette
const HIGHLIGHT_COLORS = {
    yellow: { bg: '#FEF3C7', text: '#92400E', name: 'Yellow' },
    green: { bg: '#D1FAE5', text: '#065F46', name: 'Green' },
    blue: { bg: '#DBEAFE', text: '#1E40AF', name: 'Blue' },
    purple: { bg: '#E9D5FF', text: '#7C2D12', name: 'Purple' },
    pink: { bg: '#FCE7F3', text: '#BE185D', name: 'Pink' },
    red: { bg: '#FEE2E2', text: '#DC2626', name: 'Red' },
    orange: { bg: '#FED7AA', text: '#EA580C', name: 'Orange' },
    gray: { bg: '#F3F4F6', text: '#374151', name: 'Gray' }
};

const COMMENT_TYPES = {
    // Original types for backwards compatibility
    suggestion: { color: '#3B82F6', icon: Lightbulb, name: 'Suggestion' },
    grammar: { color: '#EF4444', icon: Edit3, name: 'Grammar' },
    style: { color: '#8B5CF6', icon: Sparkles, name: 'Style' },
    content: { color: '#10B981', icon: BookMarked, name: 'Content' },
    question: { color: '#F59E0B', icon: MessageCircle, name: 'Question' },
    praise: { color: '#06B6D4', icon: Star, name: 'Praise' },

    // New sophisticated comment types
    thematic_insight: { color: '#7C3AED', icon: Brain, name: 'Theme Development' },
    rhetorical_strategy: { color: '#DC2626', icon: Target, name: 'Rhetorical Strategy' },
    stylistic_craft: { color: '#059669', icon: Wand2, name: 'Prose Craft' },
    structural_coherence: { color: '#EA580C', icon: BookMarked, name: 'Structure' },
    intellectual_depth: { color: '#1E40AF', icon: Brain, name: 'Critical Analysis' },
    reader_engagement: { color: '#BE185D', icon: Star, name: 'Reader Impact' },
    praise_excellence: { color: '#0891B2', icon: CheckCircle, name: 'Excellence' },
    contextual_connection: { color: '#7C2D12', icon: Lightbulb, name: 'Broader Context' }
};

const FONT_FAMILIES = [
    'Inter', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana',
    'Courier New', 'Lucida Console', 'Comic Sans MS', 'Impact', 'Trebuchet MS'
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

interface Comment {
    id: string;
    type: keyof typeof COMMENT_TYPES;
    text: string;
    comment: string;
    author: string;
    timestamp: Date;
    resolved: boolean;
    position: { from: number; to: number };
    replies?: Comment[];
    priority: 'low' | 'medium' | 'high';
}

interface AIFeedback {
    id: string;
    type: 'grammar' | 'style' | 'clarity' | 'structure' | 'vocabulary' | 'tone' | 'flow';
    severity: 'low' | 'medium' | 'high';
    message: string;
    suggestion: string;
    explanation?: string;
    highlightedText?: string;
    originalText?: string;
    replacementText?: string;
    position: { from: number; to: number };
    autoApply?: boolean;
}

interface ModernEssayEditorProps {
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
    reviewAnnotations?: any[];  // Array of review annotations to highlight in document
    activeAnnotationId?: string | null;  // Currently active annotation ID
    onAnnotationClick?: (id: string) => void;  // Callback when annotation is clicked
}

function ModernEssayEditorInner({
    sessionId,
    userId,
    username,
    userRole,
    initialContent = '',
    uploadedDocument,
    onContentChange,
    onCollaboratorsChange,
    sendWsMessage,
    students,
    handsRaised,
    onRaiseHand,
    onAssignHomework,
    onSave,
    reviewAnnotations = [],
    activeAnnotationId = null,
    onAnnotationClick,
}: ModernEssayEditorProps) {
    const { user } = useUser();
    const others = useOthers();
    const [myPresence, updateMyPresence] = useMyPresence();
    const status = useStatus();

    // Editor state
    const [isRichTextMode, setIsRichTextMode] = useState(true);
    const [zoom, setZoom] = useState(100);
    const [showRulers, setShowRulers] = useState(false);
    const [showGrid, setShowGrid] = useState(false);
    const [wordCount, setWordCount] = useState(0);
    const [characterCount, setCharacterCount] = useState(0);

    // AI and feedback state
    const [comments, setComments] = useState<Comment[]>([]);
    const [aiFeedback, setAiFeedback] = useState<AIFeedback[]>([]);
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [aiAnalysisInProgress, setAiAnalysisInProgress] = useState(false);
    const [showAIChatPanel, setShowAIChatPanel] = useState(false);
    const [showEnhancedAIComments, setShowEnhancedAIComments] = useState(false);

    // UI state
    const [showCommentPanel, setShowCommentPanel] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [showSuggestionMode, setShowSuggestionMode] = useState(false);
    const [currentSelection, setCurrentSelection] = useState<{ from: number; to: number; text: string } | null>(null);

    // --- AGORA VIDEO/AUDIO STATE ---
    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localTracks = useRef<{ videoTrack: ILocalVideoTrack, audioTrack: ILocalAudioTrack } | null>(null);
    const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isVideoCollapsed, setIsVideoCollapsed] = useState(false);
    const localVideoRef = useRef<HTMLVideoElement>(null);

    // Video panel dragging state
    const [videoPanelPosition, setVideoPanelPosition] = useState({ x: 16, y: 80 }); // right-4 = 16px, top-20 = 80px
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const videoPanelRef = useRef<HTMLDivElement>(null);

    // Note: sendWsMessage is passed as a prop from parent component

    // --- AI CHATBOT STATE ---
    const [aiChatMessages, setAiChatMessages] = useState<Array<{
        id: string;
        type: 'user' | 'ai';
        content: string;
        timestamp: Date;
        isVoice?: boolean;
    }>>([]);
    const [showAIChatWindow, setShowAIChatWindow] = useState(false);
    const [aiVoiceEnabled, setAiVoiceEnabled] = useState(false);
    const [teacherVoicePermission, setTeacherVoicePermission] = useState(false);
    const [currentAIInput, setCurrentAIInput] = useState('');

    // --- MOZARTSTROKE PANEL STATE ---
    const [showMozartStrokePanel, setShowMozartStrokePanel] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [mozartReviewProgress, setMozartReviewProgress] = useState({ current: 0, total: 0 });
    const [mozartAnnotations, setMozartAnnotations] = useState<any[]>([]);
    const [activeMozartAnnotation, setActiveMozartAnnotation] = useState<string | null>(null);
    const [mozartInlineComments, setMozartInlineComments] = useState<InlineComment[]>([]);
    const [showMozartInlineComments, setShowMozartInlineComments] = useState(false);

    // --- COMPREHENSIVE AI WRITING COACH STATE ---
    const [showComprehensiveAICoach, setShowComprehensiveAICoach] = useState(false);

    // Liveblocks extension
    const liveblocks = useLiveblocksExtension({
        field: 'document',
        onLoadDocument: (doc) => {
            console.log('Document loaded:', doc?.length || 0);
        },
        onSaveDocument: (doc) => {
            console.log('Document saved:', doc?.length || 0);
            if (onContentChange) {
                onContentChange(doc);
            }
        },
    });

    // Editor configuration
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Disable History extension since Liveblocks provides its own
                history: false,
                // Configure other extensions that might conflict
                bulletList: false,
                orderedList: false,
                listItem: false,
                gapcursor: false,
                hardBreak: false,
                horizontalRule: false,
            }),
            Highlight.configure({
                multicolor: true,
            }),
            Typography,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Underline,
            Subscript,
            Superscript,
            TextStyle,
            Color,
            FontFamily.configure({
                types: ['textStyle'],
            }),
            Link.configure({
                openOnClick: false,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
            Image,
            BulletList,
            OrderedList,
            ListItem,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            CharacterCount,
            Placeholder.configure({
                placeholder: 'Start writing your essay...',
            }),
            Focus.configure({
                className: 'has-focus',
                mode: 'all',
            }),
            Gapcursor,
            HardBreak,
            HorizontalRule,
            PageBreak,
            liveblocks,
        ],
        content: uploadedDocument?.content || initialContent,
        onCreate: ({ editor }) => {
            console.log('Editor created');
        },
        onUpdate: ({ editor }) => {
            const content = editor.getHTML();
            const stats = editor.storage.characterCount || {};
            setWordCount(stats.words || 0);
            setCharacterCount(stats.characters || 0);

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
            const text = editor.state.doc.textBetween(from, to, '').trim();
            setSelectedText(text);

            // Update current selection state
            if (from !== to && text.length > 0) {
                setCurrentSelection({ from, to, text });
                console.log('✅ Selection updated:', { from, to, text: text.substring(0, 50) });
            } else {
                setCurrentSelection(null);
                console.log('❌ Selection cleared');
            }

            updateMyPresence({
                cursor: {
                    anchor: from,
                    head: to,
                },
            });
        },
        onDestroy: () => {
            console.log('Editor destroyed');
        },
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-lg max-w-none focus:outline-none',
                    'min-h-[297mm] mx-auto bg-white shadow-lg',
                    'px-[2.5cm] py-[2cm]', // A4 page margins
                    isRichTextMode ? 'prose-headings:font-bold prose-p:mb-4' : 'font-mono text-sm'
                ),
                style: `
                    width: ${21 * zoom / 100}cm;
                    max-width: ${21 * zoom / 100}cm;
                    transform-origin: top center;
                    transform: scale(${zoom / 100});
                `,
                spellcheck: 'true',
            },
        },
    });

    // Update content when uploadedDocument changes
    useEffect(() => {
        if (editor && uploadedDocument?.content) {
            // Force update the content in the editor
            editor.commands.setContent(uploadedDocument.content);

            // Broadcast the document content to all collaborators
            sendWsMessage('ESSAY_DOCUMENT_CONTENT_UPDATED', {
                content: uploadedDocument.content,
                documentName: uploadedDocument.name,
                userId,
                timestamp: new Date().toISOString()
            });
        }
    }, [editor, uploadedDocument?.content, sendWsMessage, userId]);

    // Apply highlights for review annotations
    useEffect(() => {
        if (!editor || !reviewAnnotations || reviewAnnotations.length === 0) {
            return;
        }

        console.log('🎨 Applying highlights for', reviewAnnotations.length, 'annotations');

        // Get the full text content
        const fullText = editor.getText();

        // Apply highlights for each annotation
        reviewAnnotations.forEach((annotation, index) => {
            const startIndex = annotation.start ?? annotation.startIndex ?? 0;
            const endIndex = annotation.end ?? annotation.endIndex ?? 0;

            // Skip if indices are invalid
            if (startIndex < 0 || endIndex <= startIndex || endIndex > fullText.length) {
                console.warn('⚠️ Invalid annotation indices:', { id: annotation.id, start: startIndex, end: endIndex, textLength: fullText.length });
                return;
            }

            // Determine highlight color based on severity
            let highlightColor = '#FEF3C7'; // default yellow
            if (annotation.severity === 'high') {
                highlightColor = '#FEE2E2'; // red
            } else if (annotation.severity === 'medium') {
                highlightColor = '#FFEDD5'; // orange
            } else if (annotation.severity === 'low') {
                highlightColor = '#DBEAFE'; // blue
            } else if (annotation.severity === 'positive') {
                highlightColor = '#D1FAE5'; // green
            }

            // If this is the active annotation, use a stronger highlight
            if (annotation.id === activeAnnotationId) {
                highlightColor = '#C7D2FE'; // purple for active
            }

            try {
                // Apply highlight using TipTap's setMark command
                editor.chain()
                    .focus(null, { scrollIntoView: false })  // Don't scroll, just apply
                    .setTextSelection({ from: startIndex, to: endIndex })
                    .setHighlight({ color: highlightColor })
                    .run();

                // Debug log first 3 highlights
                if (index < 3) {
                    console.log(`✨ Highlight ${index} applied:`, {
                        id: annotation.id,
                        start: startIndex,
                        end: endIndex,
                        text: fullText.substring(startIndex, endIndex),
                        color: highlightColor
                    });
                }
            } catch (error) {
                console.error('Error applying highlight:', error, { annotation });
            }
        });

        // Clear selection after highlighting
        editor.commands.setTextSelection(0);
        editor.commands.blur();

    }, [editor, reviewAnnotations, activeAnnotationId]);

    // Note: WebSocket initialization is handled by parent component (EssaySessionPage)

    // --- AGORA INITIALIZATION ---
    useEffect(() => {
        const initializeAgora = async () => {
            if (!sessionId || !userId) return;

            try {
                // Create Agora client
                const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
                agoraClient.current = client;

                // CRITICAL FIX: Set up event listeners BEFORE joining channel
                console.log('🔧 Setting up Agora event listeners BEFORE joining...');

                client.on('user-joined', (user) => {
                    console.log(`🟢 User ${user.uid} joined the channel`);
                    setRemoteUsers(prev => {
                        const filtered = prev.filter(u => u.uid !== user.uid);
                        console.log(`Adding user ${user.uid} to remote users list`);
                        return [...filtered, user];
                    });
                });

                client.on('user-published', async (user, mediaType) => {
                    try {
                        console.log(`📹 User ${user.uid} published ${mediaType} - subscribing...`);
                        await client.subscribe(user, mediaType);
                        console.log(`✅ Successfully subscribed to ${user.uid} ${mediaType}`);

                        if (mediaType === 'audio' && user.audioTrack) {
                            await user.audioTrack.play();
                            user.audioTrack.setVolume(100);
                            console.log(`🔊 Playing audio for user ${user.uid} at full volume`);
                        }

                        setRemoteUsers(prev => {
                            const filtered = prev.filter(u => u.uid !== user.uid);
                            const updatedUser = { ...user };
                            console.log(`📺 Updated ${mediaType} for user ${user.uid}`);
                            return [...filtered, updatedUser];
                        });
                    } catch (error) {
                        console.error(`❌ Failed to subscribe to user ${user.uid} ${mediaType}:`, error);
                        setTimeout(async () => {
                            try {
                                console.log(`🔄 Retrying subscription for ${user.uid} ${mediaType}`);
                                await client.subscribe(user, mediaType);
                                console.log(`✅ Retry successful for ${user.uid} ${mediaType}`);
                            } catch (retryError) {
                                console.error(`❌ Retry failed for ${user.uid} ${mediaType}:`, retryError);
                            }
                        }, 1000);
                    }
                });

                client.on('user-unpublished', (user, mediaType) => {
                    console.log(`📤 User ${user.uid} unpublished ${mediaType}`);
                    setRemoteUsers(prev => {
                        const filtered = prev.filter(u => u.uid !== user.uid);
                        return [...filtered, user];
                    });
                });

                client.on('user-left', (user) => {
                    console.log(`👋 User ${user.uid} left the channel`);
                    setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
                });

                client.on('connection-state-change', (curState, revState) => {
                    console.log(`🔗 Connection state changed: ${revState} -> ${curState}`);
                });

                client.on('published-user-list', (users) => {
                    console.log(`📋 Published user list received:`, users);
                    if (users && users.length > 0) {
                        setRemoteUsers(users);
                        console.log(`Added ${users.length} published users to list`);
                    }
                });

                // Get Agora token from backend (same as LiveTutorialPage)
                const agoraAppId = import.meta.env.VITE_AGORA_APP_ID;
                if (!agoraAppId) {
                    throw new Error("Agora App ID is not configured in environment variables.");
                }
                const response = await apiClient.get(`/api/sessions/${sessionId}/generate-token`);
                const { token: agoraToken, uid } = response.data;

                // Join channel AFTER setting up event listeners
                console.log('🚀 Joining Agora channel with proper event listeners...');
                await client.join(agoraAppId, sessionId, agoraToken, uid);

                // Create local tracks with optimized settings for teacher-student sessions
                console.log('Creating microphone and camera tracks with optimized settings...');
                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
                    // Audio config optimized for education
                    {
                        sampleRate: 48000,
                        sampleSize: 16,
                        stereo: false,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    // Video config optimized for one-to-one teacher-student sessions
                    {
                        encoderConfig: {
                            width: 640,
                            height: 360,
                            frameRate: 15,
                            bitrateMin: 200,
                            bitrateMax: 400
                        },
                        optimizationMode: "detail", // Better for educational content
                        facingMode: "user"
                    }
                );
                localTracks.current = { videoTrack, audioTrack };
                console.log('Local tracks created successfully:', {
                    hasAudio: !!audioTrack,
                    hasVideo: !!videoTrack,
                    audioEnabled: audioTrack.enabled,
                    videoEnabled: videoTrack.enabled
                });

                // Play local video (same as LiveTutorialPage)
                if (localVideoRef.current) {
                    await videoTrack.play(localVideoRef.current);
                    console.log('Local video track started playing');
                } else {
                    console.warn('Local video ref is null');
                }

                // Publish tracks
                await client.publish([audioTrack, videoTrack]);
                console.log('Local tracks published successfully');

                // Immediately enable audio output for better local testing
                audioTrack.setVolume(100);
                console.log('Audio volume set to 100%');

                // Note: Event listeners are now set up above BEFORE joining the channel

                // Enable browser audio context if needed
                try {
                    if (window.AudioContext || (window as any).webkitAudioContext) {
                        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                        const audioContext = new AudioContext();
                        if (audioContext.state === 'suspended') {
                            await audioContext.resume();
                            console.log('Audio context resumed');
                        }
                    }
                } catch (error) {
                    console.warn('Could not resume audio context:', error);
                }

                // Check for existing users in the channel and subscribe to their streams
                const existingUsers = client.remoteUsers;
                console.log(`📊 Existing users in channel: ${existingUsers.length}`);
                if (existingUsers.length > 0) {
                    console.log('🔍 Processing existing users:', existingUsers.map(u => `${u.uid}(v:${!!u.videoTrack},a:${!!u.audioTrack})`));

                    // Subscribe to existing users' published tracks
                    for (const user of existingUsers) {
                        try {
                            if (user.videoTrack) {
                                console.log(`📹 Subscribing to existing user ${user.uid} video`);
                                await client.subscribe(user, 'video');
                            }
                            if (user.audioTrack) {
                                console.log(`🔊 Subscribing to existing user ${user.uid} audio`);
                                await client.subscribe(user, 'audio');
                                user.audioTrack.play();
                                user.audioTrack.setVolume(100);
                            }
                        } catch (error) {
                            console.error(`❌ Failed to subscribe to existing user ${user.uid}:`, error);
                        }
                    }

                    setRemoteUsers(existingUsers);
                    console.log(`✅ Added ${existingUsers.length} existing users to remote users list`);
                }

                console.log('✅ Agora client initialized for essay session');
                toast.success('Video/Audio connected successfully!');

            } catch (error) {
                console.error('Failed to initialize Agora:', error);
                toast.error('Failed to connect video/audio');
            }
        };

        initializeAgora();

        // Cleanup
        return () => {
            if (localTracks.current) {
                localTracks.current.videoTrack?.close();
                localTracks.current.audioTrack?.close();
            }
            if (agoraClient.current) {
                agoraClient.current.leave();
            }
        };
    }, [sessionId, userId]);

    // Cleanup effect for editor and tippy instances
    useEffect(() => {
        return () => {
            // Clean up tippy instances before component unmounts
            if (typeof window !== 'undefined') {
                try {
                    // Use a more targeted approach to clean up tippy instances
                    const tippyElements = document.querySelectorAll('[data-tippy-root]');
                    tippyElements.forEach((element) => {
                        try {
                            // Get the tippy instance from the element
                            const instance = (element as any)._tippy;
                            if (instance && typeof instance.destroy === 'function') {
                                instance.destroy();
                            }
                        } catch (error) {
                            console.warn('Error destroying individual tippy instance:', error);
                        }
                    });

                    // Also try to clean up any orphaned tippy instances
                    if (window.tippy && window.tippy.hideAll) {
                        window.tippy.hideAll();
                    }
                } catch (error) {
                    console.warn('Error during tippy cleanup:', error);
                }
            }

            // Ensure editor is properly destroyed
            if (editor) {
                try {
                    // First clear any selections or highlights that might be using tippy
                    editor.commands.setTextSelection(0);
                    editor.commands.blur();

                    // Then destroy the editor
                    setTimeout(() => {
                        if (editor && !editor.isDestroyed) {
                            editor.destroy();
                        }
                    }, 100);
                } catch (error) {
                    console.warn('Error destroying editor:', error);
                }
            }
        };
    }, [editor]);

    // --- AGORA CONTROL FUNCTIONS ---
    const toggleMute = useCallback(async () => {
        if (localTracks.current?.audioTrack) {
            await localTracks.current.audioTrack.setEnabled(!isMuted);
            setIsMuted(!isMuted);
        }
    }, [isMuted]);

    const toggleCamera = useCallback(async () => {
        if (localTracks.current?.videoTrack) {
            await localTracks.current.videoTrack.setEnabled(!isCameraOff);
            setIsCameraOff(!isCameraOff);
        }
    }, [isCameraOff]);

    // --- AI CHATBOT FUNCTIONS ---
    const sendAIMessage = useCallback(async (message: string) => {
        if (!message.trim()) return;

        const userMessage = {
            id: crypto.randomUUID(),
            type: 'user' as const,
            content: message,
            timestamp: new Date(),
        };

        setAiChatMessages(prev => [...prev, userMessage]);
        setCurrentAIInput('');

        try {
            // Call AI service (mock for now, replace with actual API)
            const response = await apiClient.post('/api/ai/chat', {
                message,
                context: {
                    sessionId,
                    userRole,
                    essayContent: editor?.getHTML() || '',
                    userId
                }
            });

            const aiMessage = {
                id: crypto.randomUUID(),
                type: 'ai' as const,
                content: response.data.message,
                timestamp: new Date(),
                isVoice: teacherVoicePermission && aiVoiceEnabled,
            };

            setAiChatMessages(prev => [...prev, aiMessage]);

            // If voice is enabled and teacher allows, synthesize speech
            if (teacherVoicePermission && aiVoiceEnabled) {
                await synthesizeAIVoice(response.data.message);
            }

            // Send to all participants via WebSocket
            sendWsMessage('AI_CHAT_MESSAGE', {
                message: aiMessage,
                sessionId,
                userId
            });

        } catch (error) {
            console.error('Failed to get AI response:', error);
            toast.error('Failed to get AI response');
        }
    }, [editor, sessionId, userRole, userId, teacherVoicePermission, aiVoiceEnabled, sendWsMessage]);

    const synthesizeAIVoice = useCallback(async (text: string) => {
        try {
            // Future implementation: Text-to-speech synthesis
            // This will integrate with Web Speech API or external TTS service
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
                utterance.voice = speechSynthesis.getVoices().find(voice =>
                    voice.name.includes('Female') || voice.name.includes('Google')
                ) || speechSynthesis.getVoices()[0];

                speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error('Failed to synthesize speech:', error);
        }
    }, []);

    const toggleAIVoice = useCallback(() => {
        if (userRole === 'teacher') {
            setTeacherVoicePermission(!teacherVoicePermission);
            setAiVoiceEnabled(!teacherVoicePermission);

            // Broadcast permission change to all participants
            sendWsMessage('AI_VOICE_PERMISSION_CHANGED', {
                enabled: !teacherVoicePermission,
                sessionId,
                teacherId: userId
            });
        }
    }, [userRole, teacherVoicePermission, sendWsMessage, sessionId, userId]);

    // --- VIDEO PANEL DRAGGING FUNCTIONS ---
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!videoPanelRef.current) return;

        const rect = videoPanelRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsDragging(true);

        // Prevent text selection while dragging
        e.preventDefault();
    }, []);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging) return;

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // Constrain to viewport with padding
        const panelWidth = 256; // 256px is panel width
        const panelHeight = 400; // Approximate panel height
        const padding = 10;

        const maxX = window.innerWidth - panelWidth - padding;
        const maxY = window.innerHeight - panelHeight - padding;

        let constrainedX = Math.max(padding, Math.min(newX, maxX));
        let constrainedY = Math.max(padding, Math.min(newY, maxY));

        // Snap to edges when close (within 20px)
        const snapDistance = 20;
        if (constrainedX < snapDistance) {
            constrainedX = padding;
        } else if (constrainedX > maxX - snapDistance) {
            constrainedX = maxX;
        }

        if (constrainedY < snapDistance) {
            constrainedY = padding;
        } else if (constrainedY > maxY - snapDistance) {
            constrainedY = maxY;
        }

        setVideoPanelPosition({
            x: constrainedX,
            y: constrainedY
        });
    }, [isDragging, dragOffset]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Add event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'grabbing';
            document.body.style.userSelect = 'none';

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };
        }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // --- REMOTE USER VIDEO COMPONENT ---
    const RemoteUserVideo: React.FC<{ user: IAgoraRTCRemoteUser }> = ({ user }) => {
        const videoRef = useRef<HTMLVideoElement>(null);

        useEffect(() => {
            const playTracks = async () => {
                try {
                    console.log(`Setting up tracks for user ${user.uid}:`, {
                        hasVideo: !!user.videoTrack,
                        hasAudio: !!user.audioTrack,
                        videoEnabled: user.videoTrack?.enabled,
                        audioEnabled: user.audioTrack?.enabled
                    });

                    // Play video track
                    if (videoRef.current && user.videoTrack) {
                        await user.videoTrack.play(videoRef.current);
                        console.log(`✅ Video playing for user ${user.uid}`);
                    }

                    // Play audio track (this is crucial for audio)
                    if (user.audioTrack) {
                        await user.audioTrack.play();
                        user.audioTrack.setVolume(100);
                        console.log(`✅ Audio playing for user ${user.uid} at volume 100%`);

                        // Debug audio track details
                        console.log(`Audio track details for ${user.uid}:`, {
                            enabled: user.audioTrack.enabled,
                            muted: user.audioTrack.muted,
                            volume: user.audioTrack.getVolumeLevel()
                        });
                    }
                } catch (error) {
                    console.error(`❌ Error playing tracks for user ${user.uid}:`, error);
                }
            };

            playTracks();

            return () => {
                // Clean up
                if (user.videoTrack) {
                    user.videoTrack.stop();
                }
                // Note: Don't stop audio track as it may be used elsewhere
            };
        }, [user.videoTrack, user.audioTrack, user.uid]);

        return (
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    Participant {user.uid}
                </div>
                {!user.videoTrack && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                        <div className="text-white text-center">
                            <User className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-xs">No Video</p>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // AI Analysis function - Real Claude API integration
    const analyzeWithAI = useCallback(async () => {
        if (!editor) return;

        setAiAnalysisInProgress(true);
        try {
            const content = editor.getHTML();
            const plainText = editor.getText();

            if (!plainText.trim()) {
                toast.error('Please write some content first before analyzing');
                return;
            }

            console.log('🧠 Sending document to Enhanced AI Comment System for intelligent analysis...');

            // Call the NEW Enhanced AI Comment System with memory and learning
            const response = await apiClient.post('/api/ai-comments/generate', {
                documentContent: plainText,
                documentType: 'essay',
                sessionId: sessionId,
                targetComments: 50, // Generate 50 comprehensive comments
                promptTemplate: 'Essay Coach - Comprehensive',
                customPrompt: null,
                rememberPrevious: true,
                excludeCommentIds: []
            });

            if (response.data.success) {
                // Convert Enhanced AI comments to AI feedback format for the UI
                const enhancedComments = response.data.comments || [];
                console.log(`✅ Enhanced AI System generated ${enhancedComments.length} comprehensive comments`);

                const aiFeedbackItems: AIFeedback[] = enhancedComments.map((comment: any, index: number) => {
                    // Create enhanced suggestion with concrete replacements
                    let enhancedSuggestion = comment.suggestion || comment.explanation || 'AI suggests reviewing this section';

                    // Add concrete replacement text if available
                    if (comment.highlighted_text && comment.replacement_text && comment.highlighted_text !== comment.replacement_text) {
                        enhancedSuggestion += `\n\n🔄 Suggested Replacement:\n"${comment.highlighted_text}" → "${comment.replacement_text}"`;
                    }

                    // Add alternatives if available (alternatives is stored as JSONB string)
                    const alternatives = typeof comment.alternatives === 'string'
                        ? JSON.parse(comment.alternatives)
                        : (comment.alternatives || []);

                    if (alternatives.length > 0) {
                        enhancedSuggestion += `\n\n💡 Alternatives:\n${alternatives.map((alt: string) => `• ${alt}`).join('\n')}`;
                    }

                    return {
                        id: comment.id || `ai_${index}`,
                        type: mapCommentTypeToAIFeedbackType(comment.comment_type),
                        severity: comment.severity === 'positive' ? 'low' : comment.severity,
                        message: comment.message || 'AI suggests reviewing this section',
                        suggestion: enhancedSuggestion,
                        position: {
                            from: comment.start_offset || 0,
                            to: comment.end_offset || 50
                        },
                        autoApply: false
                    };
                });

                setAiFeedback(aiFeedbackItems);

                // Also create actual inline comments for the editor
                const inlineComments = enhancedComments.map((comment: any) => {
                    // Create enhanced comment with concrete replacements
                    let enhancedComment = comment.message || 'AI Coach suggests reviewing this section';

                    // Add the suggestion
                    if (comment.suggestion) {
                        enhancedComment += `\n\n${comment.suggestion}`;
                    }

                    // Add concrete replacement text if available
                    if (comment.highlighted_text && comment.replacement_text && comment.highlighted_text !== comment.replacement_text) {
                        enhancedComment += `\n\n🔄 Replace:\n"${comment.highlighted_text}"\n\nWith:\n"${comment.replacement_text}"`;
                    }

                    return {
                        id: comment.id || `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: comment.comment_type || 'suggestion',
                        text: comment.highlighted_text || plainText.substring(comment.start_offset || 0, comment.end_offset || 50),
                        comment: enhancedComment,
                        author: 'AI Coach',
                        timestamp: new Date(),
                        resolved: false,
                        position: { from: comment.start_offset || 0, to: comment.end_offset || 50 },
                        priority: comment.severity === 'major' ? 'high' : comment.severity === 'moderate' ? 'medium' : 'low'
                    };
                });

                setComments(prev => [...prev, ...inlineComments]);

                // Show the comments panel so users can see the inline comments
                setShowCommentPanel(true);

                // Show success message with metadata
                const metadata = response.data.metadata || {};
                const usingFallback = metadata.fallbackMode;

                if (usingFallback) {
                    toast.info(`📝 Analysis complete using sophisticated AI fallback! Generated ${enhancedComments.length} comprehensive insights`, {
                        description: 'Claude API not configured - using advanced local analysis',
                        duration: 4000
                    });
                    console.log(`✅ Sophisticated fallback provided ${enhancedComments.length} comments`);
                } else {
                    toast.success(`🧠 AI Coach analyzed your essay and generated ${enhancedComments.length} comprehensive insights!`, {
                        description: `Using ${metadata.promptUsed || 'Essay Coach - Comprehensive'}`,
                        duration: 5000
                    });
                    console.log(`✅ Enhanced AI System provided ${enhancedComments.length} sophisticated comments with memory and learning`);
                }
            } else {
                throw new Error(response.data.error || 'Claude analysis failed');
            }

        } catch (error) {
            console.error('Claude AI analysis error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to analyze document';

            if (errorMessage.includes('rate limit')) {
                toast.error('Claude API rate limit reached. Please wait a moment and try again.');
            } else if (errorMessage.includes('API key')) {
                toast.error('Claude API configuration issue. Please check with your administrator.');
            } else {
                toast.error(`Claude analysis failed: ${errorMessage}`);
            }
        } finally {
            setAiAnalysisInProgress(false);
        }
    }, [editor]);

    // Helper function to map Claude comment types to AI feedback types
    const mapCommentTypeToAIFeedbackType = (claudeType: string): AIFeedback['type'] => {
        const typeMapping: { [key: string]: AIFeedback['type'] } = {
            'thematic_insight': 'structure',
            'rhetorical_strategy': 'clarity',
            'stylistic_craft': 'style',
            'structural_coherence': 'structure',
            'intellectual_depth': 'clarity',
            'reader_engagement': 'flow',
            'praise_excellence': 'style',
            'contextual_connection': 'structure',
            'suggestion': 'clarity',
            'grammar': 'grammar',
            'style': 'style',
            'content': 'structure'
        };

        return typeMapping[claudeType] || 'clarity';
    };

    // Claude Interactive Review function
    const startClaudeInteractiveReview = useCallback(async () => {
        if (!editor) return;

        setAiAnalysisInProgress(true);
        try {
            const content = editor.getHTML();
            const plainText = editor.getText();

            if (!plainText.trim()) {
                toast.error('Please write some content first before starting the interactive review');
                return;
            }

            console.log('🚀 Starting Claude Interactive Review...');

            // Call Claude with higher density for interactive review - request maximum comments
            const response = await apiClient.post('/api/ai/scribe/claude-inline-analysis', {
                documentContent: plainText,
                config: {
                    documentType: 'college_essay',
                    analysisDepth: 'very_dense', // More comprehensive analysis
                    focusAreas: [
                        'thematic_development',
                        'rhetorical_strategy',
                        'stylistic_craft',
                        'structural_coherence',
                        'intellectual_depth',
                        'reader_engagement',
                        'contextual_connections',
                        'word_choice',
                        'sentence_variety',
                        'transitions',
                        'evidence_analysis',
                        'voice_tone'
                    ],
                    userLevel: 'advanced', // Expect more sophisticated feedback
                    provideConcreteSuggestions: true, // Request concrete replacements
                    minimumComments: 10, // Request at least 10 comments
                    maximumComments: 20 // Allow up to 20 comments
                },
                analysisType: 'interactive_review'
            });

            if (response.data.success) {
                const claudeComments = response.data.comments || [];

                // Clear existing comments first
                setComments([]);
                setAiFeedback([]);

                // Helper to map Claude comment types to COMMENT_TYPES keys
                const mapToCommentType = (claudeType: string): keyof typeof COMMENT_TYPES => {
                    const typeMapping: { [key: string]: keyof typeof COMMENT_TYPES } = {
                        'thematic_insight': 'insight',
                        'rhetorical_strategy': 'suggestion',
                        'stylistic_craft': 'style',
                        'structural_coherence': 'structure',
                        'intellectual_depth': 'insight',
                        'reader_engagement': 'engagement',
                        'praise_excellence': 'praise',
                        'contextual_connection': 'connection',
                        'suggestion': 'suggestion',
                        'question': 'question',
                        'correction': 'error',
                        'grammar': 'error',
                        'enhancement': 'enhancement'
                    };

                    return typeMapping[claudeType] || 'suggestion';
                };

                // Convert Claude comments to inline comments with enhanced interactivity
                const interactiveComments = claudeComments.map((comment: any) => {
                    // Create enhanced interactive comment with concrete replacements
                    let enhancedComment = comment.message || 'Claude suggests reviewing this section';

                    // Add the suggestion
                    if (comment.suggestion) {
                        enhancedComment += `\n\n${comment.suggestion}`;
                    }

                    // Add concrete replacement text if available
                    if (comment.originalText && comment.replacementText && comment.originalText !== comment.replacementText) {
                        enhancedComment += `\n\n🔄 Replace:\n"${comment.originalText}"\n\nWith:\n"${comment.replacementText}"`;
                    }

                    // Add alternatives if available
                    if (comment.alternatives && comment.alternatives.length > 0) {
                        enhancedComment += `\n\n💡 Other options:\n${comment.alternatives.map((alt: string) => `• ${alt}`).join('\n')}`;
                    }

                    return {
                        id: comment.id || `claude_interactive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: mapToCommentType(comment.commentType || 'suggestion'),
                        text: comment.highlightedText || plainText.substring(comment.startOffset || 0, comment.endOffset || 50),
                        comment: enhancedComment,
                        author: 'Claude AI (Interactive)',
                        timestamp: new Date(),
                        resolved: false,
                        position: { from: comment.startOffset || 0, to: comment.endOffset || 50 },
                        priority: comment.severity === 'major' ? 'high' : comment.severity === 'moderate' ? 'medium' : 'low',
                        // Enhanced properties for interactive review
                        explanation: comment.explanation,
                        alternatives: comment.alternatives || [],
                        suggestion: comment.suggestion,
                        category: comment.category
                    };
                });

                // Add comments to the interface
                setComments(interactiveComments);

                // Also update AI feedback panel with concrete replacements
                const aiFeedbackItems: AIFeedback[] = claudeComments.map((comment: any, index: number) => {
                    // Create enhanced suggestion for interactive review
                    let enhancedSuggestion = comment.suggestion || comment.explanation || 'Consider the suggested improvement';

                    // Add concrete replacement text if available
                    if (comment.originalText && comment.replacementText && comment.originalText !== comment.replacementText) {
                        enhancedSuggestion = `Replace:\n"${comment.originalText}"\n\nWith:\n"${comment.replacementText}"\n\n${enhancedSuggestion}`;
                    }

                    // Add alternatives if available
                    if (comment.alternatives && comment.alternatives.length > 0) {
                        enhancedSuggestion += `\n\n💡 Alternatives:\n${comment.alternatives.map((alt: string) => `• ${alt}`).join('\n')}`;
                    }

                    return {
                        id: comment.id || `claude_feedback_${index}`,
                        type: mapCommentTypeToAIFeedbackType(comment.commentType),
                        severity: comment.severity === 'positive' ? 'low' : comment.severity === 'major' ? 'high' : comment.severity === 'moderate' ? 'medium' : 'low',
                        message: comment.message || 'Claude suggests reviewing this section',
                        suggestion: enhancedSuggestion,
                        explanation: comment.explanation,
                        highlightedText: comment.highlightedText || plainText.substring(comment.startOffset || 0, comment.endOffset || 50),
                        originalText: comment.originalText,
                        replacementText: comment.replacementText,
                        position: {
                            from: comment.startOffset || 0,
                            to: comment.endOffset || 50
                        },
                        autoApply: false
                    };
                });

                setAiFeedback(aiFeedbackItems);

                // Show the AI panel and comments panel
                setShowAIPanel(true);
                setShowCommentPanel(true);

                // Check if we're using fallback mode
                const usingFallback = response.data.analysisMetadata?.usingFallback;
                if (usingFallback) {
                    toast.info(`📝 Interactive Review complete using sophisticated AI! Found ${claudeComments.length} insights`, {
                        description: 'Claude API not configured - using advanced interactive analysis',
                        duration: 4000
                    });
                    console.log(`✅ Sophisticated Interactive Review provided ${claudeComments.length} detailed comments`);
                } else {
                    toast.success(`🧠 Claude Interactive Review complete! Found ${claudeComments.length} sophisticated insights`, {
                        duration: 4000
                    });
                    console.log(`✅ Claude Interactive Review provided ${claudeComments.length} detailed comments`);
                }
            } else {
                throw new Error(response.data.error || 'Claude Interactive Review failed');
            }

        } catch (error) {
            console.error('Claude Interactive Review error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to start interactive review';

            if (errorMessage.includes('rate limit')) {
                toast.error('Claude API rate limit reached. Please wait a moment and try again.');
            } else if (errorMessage.includes('API key')) {
                toast.error('Claude API not configured. Using fallback analysis.');
                // Fall back to basic analysis
                await analyzeWithAI();
            } else {
                toast.error(`Interactive Review failed: ${errorMessage}`);
            }
        } finally {
            setAiAnalysisInProgress(false);
        }
    }, [editor, mapCommentTypeToAIFeedbackType, analyzeWithAI]);

    // MozartStroke AI Review - Enhanced paragraph-by-paragraph analysis
    const startMozartStrokeReview = useCallback(async () => {
        if (!editor) return;

        const content = editor.getText();

        if (!content.trim() || content.trim().length < 50) {
            toast.error('Please write at least 50 characters before starting Mozart Stroke review');
            return;
        }

        // Open the panel immediately
        setShowMozartStrokePanel(true);
        setAiAnalysisInProgress(true);

        try {
            console.log('🎵 Starting MozartStroke AI Review...');

            // Call Mozart Stroke analysis API (FIXED: correct endpoint)
            const response = await apiClient.post('/api/ai/scribe/analyze-document', {
                documentContent: content,
                documentType: 'essay',
                analysisType: 'mozart_stroke_review',
                sessionId: sessionId,
                requirements: {
                    type: 'college_essay',
                    focusAreas: ['personal_growth', 'storytelling', 'authenticity', 'impact']
                }
            });

            if (response.data.success) {
                // Backend returns annotations directly, not under analysis.paragraphAnalysis
                const backendAnnotations = response.data.annotations || [];
                console.log(`✅ MozartStroke Review complete with ${backendAnnotations.length} annotations`);

                // Convert backend annotations to frontend format
                const annotations: any[] = backendAnnotations.map((annotation: any) => ({
                    id: annotation.id || `mozart_${Math.random().toString(36).substr(2, 9)}`,
                    category: annotation.category || 'Style',
                    severity: annotation.severity || 'medium',
                    text: annotation.message || annotation.suggestion || 'Consider improving this section',
                    howToFind: annotation.explanation || annotation.howToFind || annotation.message,
                    position: {
                        from: annotation.startOffset || annotation.start || 0,
                        to: annotation.endOffset || annotation.end || 50
                    }
                }));

                // Convert to AI feedback format as well
                const feedbackItems: AIFeedback[] = annotations.map(annotation => ({
                    id: annotation.id,
                    type: 'style',
                    severity: annotation.severity === 'high' ? 'high' : 'medium',
                    message: annotation.text,
                    suggestion: annotation.howToFind,
                    position: annotation.position,
                    autoApply: false
                }));

                // Convert to InlineComment format for the inline comment system
                const inlineComments: InlineComment[] = annotations.map((annotation) => ({
                    id: annotation.id,
                    startOffset: annotation.position.from,
                    endOffset: annotation.position.to,
                    text: content.substring(annotation.position.from, annotation.position.to),
                    highlightedText: content.substring(annotation.position.from, annotation.position.to),
                    type: annotation.severity === 'high' ? 'correction' : 'suggestion',
                    severity: annotation.severity === 'high' ? 'major' : annotation.severity === 'medium' ? 'moderate' : 'minor',
                    message: annotation.text,
                    suggestion: annotation.howToFind,
                    explanation: annotation.howToFind,
                    confidence: 0.85,
                    category: annotation.category || 'General',
                    isVisible: true,
                    timestamp: new Date()
                }));

                setMozartAnnotations(annotations);
                setMozartInlineComments(inlineComments);
                setMozartReviewProgress({ current: 0, total: annotations.length });
                setIsReviewMode(true);
                setShowMozartInlineComments(true);
                setAiFeedback(feedbackItems);

                toast.success(`🎵 MozartStroke Review complete! Found ${annotations.length} insights. Click highlighted text to see details.`, {
                    duration: 5000
                });
            } else {
                throw new Error(response.data.error || 'Mozart Stroke review failed');
            }

        } catch (error: any) {
            console.error('MozartStroke Review error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to start Mozart Stroke review';
            toast.error(`Mozart Stroke Review failed: ${errorMessage}`);
        } finally {
            setAiAnalysisInProgress(false);
        }
    }, [editor, sessionId]);

    // Exit MozartStroke Review Mode
    const exitReviewMode = useCallback(() => {
        setIsReviewMode(false);
        setShowMozartStrokePanel(false);
        setShowMozartInlineComments(false);
        setMozartAnnotations([]);
        setMozartInlineComments([]);
        setMozartReviewProgress({ current: 0, total: 0 });
        setActiveMozartAnnotation(null);
        // Clear AI feedback as well
        setAiFeedback([]);
        toast.info('Review mode exited');
    }, []);

    // Handle inline comment actions
    const handleMozartCommentAction = useCallback((commentId: string, action: 'apply' | 'dismiss' | 'like' | 'dislike') => {
        const comment = mozartInlineComments.find(c => c.id === commentId);
        if (!comment) return;

        switch (action) {
            case 'apply':
                // Apply the suggestion if available
                if (comment.suggestion && editor) {
                    const content = editor.getText();
                    const newContent = content.substring(0, comment.startOffset) +
                                     comment.suggestion +
                                     content.substring(comment.endOffset);
                    editor.commands.setContent(newContent);
                    toast.success('Suggestion applied!');
                }
                // Remove the comment after applying
                setMozartInlineComments(prev => prev.filter(c => c.id !== commentId));
                break;

            case 'dismiss':
                // Hide the comment
                setMozartInlineComments(prev => prev.map(c =>
                    c.id === commentId ? { ...c, isVisible: false } : c
                ));
                toast.info('Comment dismissed');
                break;

            case 'like':
                toast.success('Feedback noted!');
                break;

            case 'dislike':
                toast.info('Thanks for the feedback!');
                break;
        }
    }, [mozartInlineComments, editor]);

    // Handle comment hover
    const handleMozartCommentHover = useCallback((commentId: string | null) => {
        setActiveMozartAnnotation(commentId);
    }, []);

    // Smart Prompts - User-driven AI assistance
    const openSmartPrompts = useCallback(() => {
        if (!editor) return;

        const content = editor.getText();

        if (!content.trim() || content.trim().length < 50) {
            toast.error('Please write at least 50 characters before using Smart Prompts');
            return;
        }

        // Show a dialog for smart prompt input
        const promptText = window.prompt('Ask AI for help with your essay:\n\nExamples:\n- "Make my introduction more engaging"\n- "Help me improve the flow between paragraphs"\n- "Suggest stronger evidence for my argument"');

        if (!promptText || !promptText.trim()) {
            return;
        }

        handleSmartPrompt(promptText);
    }, [editor]);

    const handleSmartPrompt = useCallback(async (promptText: string) => {
        if (!editor) return;

        setAiAnalysisInProgress(true);
        try {
            const content = editor.getText();
            const wordCount = content.trim().split(/\s+/).length;

            console.log('💡 Sending Smart Prompt to AI:', promptText);

            const response = await apiClient.post('/api/ai/smart-prompts', {
                prompt: promptText,
                documentContent: content,
                documentType: 'essay',
                wordCount: wordCount,
                requirements: {
                    type: 'college_essay',
                    length: 'medium',
                    audience: 'college_admissions',
                    purpose: 'personal_statement',
                    tone: 'authentic'
                }
            });

            if (response.data.success) {
                const aiResponse = response.data.response || '';
                const comments = response.data.comments || [];

                // Show AI response in a toast or dialog
                if (aiResponse) {
                    console.log('✅ Smart Prompt response received');
                    toast.success('AI response ready! Check your AI Chat for details', {
                        duration: 4000
                    });

                    // Add AI response to chat messages
                    setAiChatMessages(prev => [
                        ...prev,
                        {
                            id: Date.now().toString(),
                            sender: 'ai',
                            text: `**Your question:** ${promptText}\n\n**AI Response:**\n${aiResponse}`,
                            timestamp: new Date(),
                            userRole: 'teacher'
                        }
                    ]);

                    // Show chat window
                    setShowAIChatWindow(true);
                }

                // If AI provided inline comments, add them
                if (comments.length > 0) {
                    const feedbackItems: AIFeedback[] = comments.map((comment: any, index: number) => ({
                        id: `smart_prompt_${Date.now()}_${index}`,
                        type: 'suggestion',
                        severity: comment.severity || 'medium',
                        message: comment.message || comment.suggestion,
                        suggestion: comment.replacementText || comment.suggestion,
                        position: {
                            from: comment.startOffset || 0,
                            to: comment.endOffset || 50
                        },
                        autoApply: false
                    }));

                    setAiFeedback(prev => [...prev, ...feedbackItems]);
                }
            }

        } catch (error: any) {
            console.error('Smart Prompt error:', error);
            toast.error('Failed to process Smart Prompt');
        } finally {
            setAiAnalysisInProgress(false);
        }
    }, [editor]);

    // Add comment function
    const addComment = useCallback((type: keyof typeof COMMENT_TYPES, comment: string, forcedSelection?: { from: number; to: number }) => {
        if (!editor) return;

        // Use forced selection if provided, otherwise use current selection
        const selection = forcedSelection || editor.state.selection;
        const { from, to } = selection;
        const currentSelectedText = editor.state.doc.textBetween(from, to, '').trim();

        console.log('Adding comment:', {
            from,
            to,
            currentSelectedText,
            hasSelection: from !== to,
            forcedSelection
        });

        if (!currentSelectedText || from === to) {
            toast.error('Please select some text to comment on');
            return;
        }

        const newComment: Comment = {
            id: Date.now().toString(),
            type,
            text: currentSelectedText,
            comment,
            author: username,
            timestamp: new Date(),
            resolved: false,
            position: { from, to },
            priority: 'medium'
        };

        setComments(prev => [...prev, newComment]);

        // Ensure we have the correct selection and highlight the commented text
        editor.commands.setTextSelection({ from, to });
        editor.commands.setHighlight({ color: COMMENT_TYPES[type].color });

        // Show comments panel if not already visible
        if (!showCommentPanel) {
            setShowCommentPanel(true);
        }

        // Send comment to other collaborators via WebSocket
        sendWsMessage('ESSAY_COMMENT_ADDED', {
            comment: newComment,
            sessionId,
            userId,
            timestamp: new Date().toISOString()
        });

        toast.success(`${COMMENT_TYPES[type].name} comment added!`);

        // Clear selection to hide bubble menu after a delay
        setTimeout(() => {
            editor.commands.setTextSelection(to);
        }, 200);
    }, [editor, username, showCommentPanel, setShowCommentPanel, sendWsMessage, sessionId, userId]);

    // AI inline comments functionality - now uses the enhanced AI comment system
    const generateInlineComments = async () => {
        if (!editor) return;

        const plainText = editor.getText();
        if (!plainText || plainText.trim().length < 50) {
            toast.error('Please write at least 50 characters to generate inline comments');
            return;
        }

        // Toggle the enhanced AI comment panel - it will handle the API call
        setShowEnhancedAIComments(true);
        setShowAIPanel(false); // Hide old panel if visible
    };

    // Callback for applying AI suggestions to the editor
    const handleApplyAISuggestion = useCallback((originalText: string, replacementText: string, startOffset?: number, endOffset?: number) => {
        if (!editor) return;

        const { state } = editor;
        const { doc } = state;

        let startIndex: number;
        let endIndex: number;

        // Use provided offsets if available, otherwise fallback to indexOf
        if (typeof startOffset === 'number' && typeof endOffset === 'number') {
            startIndex = startOffset;
            endIndex = endOffset;

            // Verify the text at these offsets matches (document may have changed)
            const fullText = doc.textContent;
            const textAtOffset = fullText.substring(startIndex, endIndex);

            if (textAtOffset !== originalText) {
                // Document has changed, try to find the text
                const foundIndex = fullText.indexOf(originalText);
                if (foundIndex === -1) {
                    toast.error('Could not find the text to replace. The document may have changed.');
                    return;
                }
                startIndex = foundIndex;
                endIndex = foundIndex + originalText.length;
            }
        } else {
            // Fallback to searching for the original text
            const fullText = doc.textContent;
            startIndex = fullText.indexOf(originalText);

            if (startIndex === -1) {
                toast.error('Could not find the text to replace. The document may have changed.');
                return;
            }

            endIndex = startIndex + originalText.length;
        }

        // Apply the replacement
        editor.chain()
            .focus()
            .setTextSelection({ from: startIndex, to: endIndex })
            .insertContent(replacementText)
            .run();

        toast.success('AI suggestion applied successfully!');
    }, [editor]);

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Compact Mobile-Responsive Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm h-16">
                {/* Top menu bar */}
                <div className="h-full flex items-center justify-between px-3 sm:px-4 lg:px-6">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                            <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                                {uploadedDocument?.name || 'Untitled Essay'}
                            </h1>
                            <div className="hidden sm:flex items-center space-x-2 text-xs lg:text-sm text-gray-500">
                                <span className="truncate">{userRole === 'teacher' ? '👨‍🏫' : '👨‍🎓'} {username}</span>
                                <span className="hidden md:inline">•</span>
                                <span className="hidden md:inline">{others.length + 1} participants</span>
                                <span className="hidden lg:inline">•</span>
                                <span className="hidden lg:inline">{wordCount} words</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-1 sm:space-x-2">
                        {/* Upload Document Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('essay-upload-input')?.click()}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <Upload className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Upload</span>
                        </Button>
                        <input
                            id="essay-upload-input"
                            type="file"
                            accept=".doc,.docx,.pdf,.txt"
                            className="hidden"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                console.log('📤 Uploading file:', file.name, file.type);
                                toast.info('Uploading document...');

                                const formData = new FormData();
                                formData.append('document', file);
                                formData.append('sessionId', sessionId);

                                try {
                                    const response = await fetch('/api/sessions/upload-document', {
                                        method: 'POST',
                                        headers: {
                                            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                                        },
                                        body: formData
                                    });

                                    console.log('📥 Upload response status:', response.status);

                                    if (response.ok) {
                                        const data = await response.json();
                                        console.log('📄 Upload response data:', data);

                                        if (data.success && data.content) {
                                            console.log('✅ Setting editor content, length:', data.content.length);
                                            editor?.commands.setContent(data.content);
                                            toast.success(`Document "${data.fileName}" loaded successfully!`);
                                        } else if (data.success) {
                                            toast.warning('Document uploaded but no content extracted');
                                            console.warn('No content in response:', data);
                                        } else {
                                            toast.error('Upload failed: ' + (data.error || 'Unknown error'));
                                        }
                                    } else {
                                        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                                        console.error('❌ Upload failed:', errorData);
                                        toast.error('Upload failed: ' + (errorData.error || response.statusText));
                                    }
                                } catch (error) {
                                    console.error('❌ Upload error:', error);
                                    toast.error('Upload failed: ' + error.message);
                                }
                                e.target.value = ''; // Reset input
                            }}
                        />

                        {/* Inline Comments Button */}
                        <Button
                            variant={showAIPanel ? "default" : "outline"}
                            size="sm"
                            onClick={generateInlineComments}
                            disabled={aiAnalysisInProgress}
                            className={cn(
                                showAIPanel
                                    ? "bg-orange-600 hover:bg-orange-700 text-white"
                                    : "text-orange-600 border-orange-200 hover:bg-orange-50"
                            )}
                        >
                            {aiAnalysisInProgress ? (
                                <div className="animate-spin w-4 h-4 sm:mr-1 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                                <Sparkles className="w-4 h-4 sm:mr-1" />
                            )}
                            <span className="hidden sm:inline">
                                {aiAnalysisInProgress ? 'Analyzing...' : 'AI Comments'}
                            </span>
                        </Button>

                        {/* AI Tools Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                                    <Brain className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden lg:inline">AI Tools</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                    onClick={analyzeWithAI}
                                    disabled={aiAnalysisInProgress}
                                >
                                    <Brain className="w-4 h-4 mr-2" />
                                    Claude Review
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={startClaudeInteractiveReview}
                                    disabled={aiAnalysisInProgress}
                                >
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Interactive Review
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setShowComprehensiveAICoach(true)}
                                    disabled={aiAnalysisInProgress}
                                    className="bg-gradient-to-r from-indigo-50 to-purple-50 font-medium"
                                >
                                    <Sparkles className="w-4 h-4 mr-2 text-indigo-600" />
                                    <span className="text-indigo-900">✨ New AI Coach</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={startMozartStrokeReview}
                                    disabled={aiAnalysisInProgress}
                                >
                                    <Target className="w-4 h-4 mr-2" />
                                    MozartStroke AI Review
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={openSmartPrompts}
                                    disabled={aiAnalysisInProgress}
                                >
                                    <Lightbulb className="w-4 h-4 mr-2" />
                                    Smart Prompts
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setShowAIChatWindow(!showAIChatWindow)}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    MozartStroke Chat ({aiChatMessages.length})
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Comments & Collaboration Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                                    <MessageCircle className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden lg:inline">Comments</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => setShowCommentPanel(!showCommentPanel)}>
                                    <MessageCircle className="w-4 h-4 mr-2" />
                                    View Comments ({comments.length})
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        if (!editor) return;
                                        const { from, to } = editor.state.selection;
                                        const currentSelectedText = editor.state.doc.textBetween(from, to, '').trim();
                                        if (currentSelectedText && from !== to) {
                                            const truncatedText = currentSelectedText.substring(0, 50) + (currentSelectedText.length > 50 ? '...' : '');
                                            const comment = prompt(`Add comment for "${truncatedText}":`);
                                            if (comment && comment.trim()) {
                                                addComment('suggestion', comment.trim(), { from, to });
                                            }
                                        } else {
                                            alert('Please select some text first');
                                        }
                                    }}
                                >
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Add Comment
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => setShowSuggestionMode(!showSuggestionMode)}
                                >
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    {showSuggestionMode ? 'Exit' : 'Enter'} Suggestion Mode
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Video/Audio Controls Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                                    <Video className="w-4 h-4 sm:mr-1" />
                                    <span className="hidden lg:inline">Media</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem
                                    onClick={async () => {
                                        try {
                                            if (window.AudioContext || (window as any).webkitAudioContext) {
                                                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                                                const audioContext = new AudioContext();
                                                if (audioContext.state === 'suspended') {
                                                    await audioContext.resume();
                                                    toast.success('Audio enabled!');
                                                }
                                            }
                                            if (localTracks.current?.audioTrack) {
                                                localTracks.current.audioTrack.setVolume(100);
                                            }
                                        } catch (error) {
                                            console.error('Failed to enable audio:', error);
                                        }
                                    }}
                                >
                                    <Volume2 className="w-4 h-4 mr-2" />
                                    Enable Audio
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={toggleMute}>
                                    {isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                                    {isMuted ? 'Unmute' : 'Mute'} Microphone
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={toggleCamera}>
                                    {isCameraOff ? <VideoOff className="w-4 h-4 mr-2" /> : <Video className="w-4 h-4 mr-2" />}
                                    {isCameraOff ? 'Turn On' : 'Turn Off'} Camera
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setIsVideoCollapsed(!isVideoCollapsed)}>
                                    <Users className="w-4 h-4 mr-2" />
                                    {isVideoCollapsed ? 'Show' : 'Hide'} Participants
                                </DropdownMenuItem>
                                {userRole === 'teacher' && (
                                    <DropdownMenuItem onClick={toggleAIVoice}>
                                        <Volume2 className="w-4 h-4 mr-2" />
                                        {teacherVoicePermission ? 'Disable' : 'Enable'} AI Voice
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Save Button */}
                        <Button
                            size="sm"
                            onClick={() => onSave(editor?.getHTML() || '')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Save className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">Save</span>
                        </Button>

                        {/* End Session Button (only for teachers) */}
                        {userRole === 'teacher' && (
                            <Button
                                size="sm"
                                onClick={async () => {
                                    if (!confirm('Are you sure you want to end this session?')) return;

                                    try {
                                        console.log('🔴 Ending session:', sessionId);
                                        const response = await apiClient.post(`/api/sessions/${sessionId}/end`, {
                                            deleteSession: true
                                        });

                                        console.log('✅ End session response:', response.data);

                                        if (response.data.success) {
                                            toast.success('Session ended successfully');
                                            // Redirect to sessions page after a brief delay
                                            setTimeout(() => {
                                                window.location.href = '/sessions';
                                            }, 1500);
                                        } else {
                                            toast.error('Failed to end session: ' + (response.data.error || 'Unknown error'));
                                        }
                                    } catch (error) {
                                        console.error('❌ End session error:', error);
                                        console.error('❌ Error response:', error.response?.data);
                                        const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message;
                                        toast.error('Failed to end session: ' + errorMsg);
                                    }
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white"
                            >
                                <X className="w-4 h-4 sm:mr-1" />
                                <span className="hidden sm:inline">End Session</span>
                            </Button>
                        )}
                    </div>
                </div>

                {/* Toolbar */}
                {editor && (
                    <div className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center space-x-1">
                            {/* File menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        File
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => onSave(editor.getHTML())}>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Printer className="w-4 h-4 mr-2" />
                                        Print
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Edit menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        Edit
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => editor.commands.undo()}>
                                        <Undo className="w-4 h-4 mr-2" />
                                        Undo
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editor.commands.redo()}>
                                        <Redo className="w-4 h-4 mr-2" />
                                        Redo
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Scissors className="w-4 h-4 mr-2" />
                                        Cut
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                        <Clipboard className="w-4 h-4 mr-2" />
                                        Paste
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* View menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                        View
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => setShowRulers(!showRulers)}>
                                        <Rulers className="w-4 h-4 mr-2" />
                                        {showRulers ? 'Hide' : 'Show'} rulers
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setShowGrid(!showGrid)}>
                                        <Grid className="w-4 h-4 mr-2" />
                                        {showGrid ? 'Hide' : 'Show'} grid
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <Separator orientation="vertical" className="h-6" />

                            {/* Formatting toolbar */}
                            <div className="flex items-center space-x-1">
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

                                <Separator orientation="vertical" className="h-6" />

                                {/* Highlight dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                            <Highlighter className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {Object.entries(HIGHLIGHT_COLORS).map(([key, color]) => (
                                            <DropdownMenuItem
                                                key={key}
                                                onClick={() => editor.commands.toggleHighlight({ color: color.bg })}
                                            >
                                                <div
                                                    className="w-4 h-4 rounded mr-2"
                                                    style={{ backgroundColor: color.bg }}
                                                />
                                                {color.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <Separator orientation="vertical" className="h-6" />

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

                                <Separator orientation="vertical" className="h-6" />

                                {/* Page break button */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editor.commands.setPageBreak()}
                                    title="Insert page break (Ctrl+Enter)"
                                >
                                    <Minus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Zoom controls */}
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setZoom(Math.max(25, zoom - 25))}
                            >
                                <ZoomOut className="w-4 h-4" />
                            </Button>
                            <span className="text-sm text-gray-600 min-w-[50px] text-center">
                                {zoom}%
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setZoom(Math.min(200, zoom + 25))}
                            >
                                <ZoomIn className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Main content area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor area */}
                <div className="flex-1 overflow-auto bg-gray-100 p-8">
                    <div className="max-w-none mx-auto">
                        {showRulers && (
                            <div className="ruler-horizontal bg-white border-b border-gray-200 h-6 mb-4"></div>
                        )}
                        <div className="relative">
                            {showRulers && (
                                <div className="ruler-vertical bg-white border-r border-gray-200 w-6 absolute left-0 top-0 bottom-0"></div>
                            )}
                            <div className={cn("relative", showRulers && "ml-6")}>
                                {/* Show inline comment system when MozartStroke review is active */}
                                {showMozartInlineComments && isReviewMode ? (
                                    <div className="bg-white rounded-lg shadow-sm p-8">
                                        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Brain className="w-5 h-5 text-purple-600" />
                                                    <h3 className="font-semibold text-purple-900">MozartStroke AI Review Active</h3>
                                                </div>
                                                <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                                                    {mozartInlineComments.filter(c => c.isVisible !== false).length} comments
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-purple-700">
                                                Click on highlighted text to see detailed feedback and suggestions. Apply or dismiss each comment as you review.
                                            </p>
                                        </div>
                                        <InlineCommentSystem
                                            documentContent={editor?.getText() || ''}
                                            comments={mozartInlineComments.filter(c => c.isVisible !== false)}
                                            onCommentAction={handleMozartCommentAction}
                                            onCommentHover={handleMozartCommentHover}
                                            isActive={showMozartInlineComments}
                                        />
                                    </div>
                                ) : (
                                    <EditorContent editor={editor} />
                                )}


                                {/* Floating features - Wrapped in error boundary */}
                                {editor && (
                                    <div key={`floating-features-${sessionId}`}>
                                        <FloatingToolbar editor={editor} />
                                        <FloatingThreads
                                            editor={editor}
                                            className="z-50"
                                        />
                                        <AnchoredThreads
                                            editor={editor}
                                            className="z-40"
                                        />
                                    </div>
                                )}

                                {/* Bubble menu for text selection - Always render but conditionally show */}
                                {editor && (
                                    <BubbleMenu
                                        editor={editor}
                                        shouldShow={({ state }) => {
                                            const { from, to } = state.selection;
                                            const selectedText = state.doc.textBetween(from, to, '').trim();
                                            const hasSelection = from !== to && selectedText.length > 0;

                                            console.log('🔍 BubbleMenu shouldShow check:', {
                                                from,
                                                to,
                                                selectedText: selectedText.substring(0, 50),
                                                hasSelection,
                                                selectionEmpty: state.selection.empty
                                            });

                                            return hasSelection;
                                        }}
                                        tippyOptions={{
                                            duration: 100,
                                            placement: 'top',
                                            interactive: true,
                                            maxWidth: 400,
                                            zIndex: 9999,
                                            hideOnClick: false,
                                            onShow: (instance) => {
                                                console.log('✅ BubbleMenu showing');
                                            },
                                            onHide: (instance) => {
                                                console.log('❌ BubbleMenu hiding');
                                            }
                                        }}
                                    >
                                        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-2 flex items-center space-x-1 z-[9999]">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-50">
                                                        <MessageCircle className="w-4 h-4 mr-1" />
                                                        Add Comment
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent className="z-[10000]" side="bottom" align="start">
                                                    {Object.entries(COMMENT_TYPES).map(([key, type]) => (
                                                        <DropdownMenuItem
                                                            key={key}
                                                            onSelect={(e) => {
                                                                e.preventDefault();

                                                                // Immediately capture the current selection before any state changes
                                                                const selection = editor.state.selection;
                                                                const { from, to } = selection;
                                                                const currentSelectedText = editor.state.doc.textBetween(from, to, '').trim();

                                                                console.log('Comment button clicked:', {
                                                                    from,
                                                                    to,
                                                                    currentSelectedText,
                                                                    hasSelection: from !== to
                                                                });

                                                                if (currentSelectedText && from !== to) {
                                                                    const truncatedText = currentSelectedText.substring(0, 50) + (currentSelectedText.length > 50 ? '...' : '');

                                                                    // Use setTimeout to allow UI to settle
                                                                    setTimeout(() => {
                                                                        const comment = prompt(`Add ${type.name.toLowerCase()} for "${truncatedText}":`);
                                                                        if (comment && comment.trim()) {
                                                                            // Pass the saved selection to addComment
                                                                            addComment(key as keyof typeof COMMENT_TYPES, comment.trim(), { from, to });
                                                                        }
                                                                    }, 50);
                                                                } else {
                                                                    alert('Please select some text first to add a comment.');
                                                                }
                                                            }}
                                                            className="cursor-pointer"
                                                        >
                                                            <type.icon className="w-4 h-4 mr-2" style={{ color: type.color }} />
                                                            {type.name}
                                                        </DropdownMenuItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>

                                            {/* Quick comment button */}
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();

                                                    // Immediately capture the current selection
                                                    const selection = editor.state.selection;
                                                    const { from, to } = selection;
                                                    const currentSelectedText = editor.state.doc.textBetween(from, to, '').trim();

                                                    console.log('Quick comment clicked:', {
                                                        from,
                                                        to,
                                                        currentSelectedText,
                                                        hasSelection: from !== to
                                                    });

                                                    if (currentSelectedText && from !== to) {
                                                        const truncatedText = currentSelectedText.substring(0, 50) + (currentSelectedText.length > 50 ? '...' : '');

                                                        setTimeout(() => {
                                                            const comment = prompt(`Quick comment for "${truncatedText}":`);
                                                            if (comment && comment.trim()) {
                                                                // Pass the saved selection to addComment
                                                                addComment('suggestion', comment.trim(), { from, to });
                                                            }
                                                        }, 50);
                                                    } else {
                                                        alert('Please select some text first to add a comment.');
                                                    }
                                                }}
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </BubbleMenu>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right sidebar for comments and AI */}
                {(showCommentPanel || showAIPanel) && (
                    <div className="w-80 bg-white border-l border-gray-200 overflow-hidden">
                        <Tabs value={showAIPanel ? 'ai' : 'comments'} className="h-full flex flex-col">
                            <TabsList className="grid w-full grid-cols-2 p-1 m-1">
                                <TabsTrigger
                                    value="comments"
                                    onClick={() => { setShowCommentPanel(true); setShowAIPanel(false); }}
                                >
                                    Comments ({comments.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="ai"
                                    onClick={() => { setShowAIPanel(true); setShowCommentPanel(false); }}
                                >
                                    MozartStroke Review
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="comments" className="flex-1 overflow-hidden">
                                <ScrollArea className="h-full p-4">
                                    <div className="space-y-4">
                                        {/* Current Selection Info and Quick Comment */}
                                        {currentSelection ? (
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-blue-900 mb-1">
                                                            Selected Text:
                                                        </h4>
                                                        <p className="text-sm text-blue-700 bg-white p-2 rounded border italic">
                                                            "{currentSelection.text.length > 100
                                                                ? currentSelection.text.substring(0, 100) + '...'
                                                                : currentSelection.text}"
                                                        </p>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setCurrentSelection(null)}
                                                        className="text-blue-600 hover:text-blue-800"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(COMMENT_TYPES).map(([key, type]) => (
                                                        <Button
                                                            key={key}
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs"
                                                            style={{ borderColor: type.color, color: type.color }}
                                                            onClick={() => {
                                                                const comment = prompt(`Add ${type.name.toLowerCase()} for selected text:`);
                                                                if (comment && comment.trim()) {
                                                                    addComment(key as keyof typeof COMMENT_TYPES, comment.trim(), {
                                                                        from: currentSelection.from,
                                                                        to: currentSelection.to
                                                                    });
                                                                    setCurrentSelection(null);
                                                                }
                                                            }}
                                                        >
                                                            <type.icon className="w-3 h-3 mr-1" />
                                                            {type.name}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                                                <div className="text-center text-gray-600">
                                                    <MessageCircle className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                                    <p className="text-sm">Select text in the editor to add comments</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Existing Comments */}
                                        {comments.length === 0 ? (
                                            <div className="text-center text-gray-500 py-8">
                                                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                                <p>No comments yet</p>
                                                <p className="text-sm">Comments will appear here once added</p>
                                            </div>
                                        ) : (
                                            comments.map((comment) => (
                                                <Card key={comment.id} className="p-3">
                                                    <div className="flex items-start space-x-2">
                                                        <div
                                                            className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                                                            style={{ backgroundColor: COMMENT_TYPES[comment.type]?.color || '#6366f1' }}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center space-x-2 mb-1">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {comment.author}
                                                                </span>
                                                                <Badge variant="outline" className="text-xs">
                                                                    {COMMENT_TYPES[comment.type]?.name || 'AI Feedback'}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-gray-600 mb-2">
                                                                "{comment.text}"
                                                            </p>
                                                            <p className="text-sm text-gray-800">
                                                                {comment.comment}
                                                            </p>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-xs text-gray-400">
                                                                    {comment.timestamp.toLocaleTimeString()}
                                                                </span>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => {
                                                                        setComments(prev =>
                                                                            prev.map(c =>
                                                                                c.id === comment.id
                                                                                    ? { ...c, resolved: !c.resolved }
                                                                                    : c
                                                                            )
                                                                        );
                                                                    }}
                                                                    className="text-xs"
                                                                >
                                                                    {comment.resolved ? (
                                                                        <RotateCcw className="w-3 h-3 mr-1" />
                                                                    ) : (
                                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                                    )}
                                                                    {comment.resolved ? 'Reopen' : 'Resolve'}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </TabsContent>

                            <TabsContent value="ai" className="flex-1 overflow-hidden">
                                <div className="p-4 h-full flex flex-col">
                                    <div className="mb-4 space-y-2">
                                        <Button
                                            onClick={startClaudeInteractiveReview}
                                            disabled={aiAnalysisInProgress}
                                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                                        >
                                            {aiAnalysisInProgress ? (
                                                <Loader className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Brain className="w-4 h-4 mr-2" />
                                            )}
                                            Claude Interactive Review
                                        </Button>

                                        <Button
                                            onClick={analyzeWithAI}
                                            disabled={aiAnalysisInProgress}
                                            variant="outline"
                                            className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                                        >
                                            {aiAnalysisInProgress ? (
                                                <Loader className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Wand2 className="w-4 h-4 mr-2" />
                                            )}
                                            Basic Analysis
                                        </Button>
                                    </div>

                                    <ScrollArea className="flex-1">
                                        <div className="space-y-3">
                                            {aiFeedback.length === 0 ? (
                                                <div className="text-center text-gray-500 py-8">
                                                    <Brain className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                                                    <p>MozartStroke Ready</p>
                                                    <p className="text-sm">AI Writing Mentor with Socratic Guidance</p>
                                                </div>
                                            ) : (
                                                aiFeedback.map((feedback) => (
                                                    <Card key={feedback.id} className="p-3">
                                                        <div className="flex items-start space-x-2">
                                                            <div className={cn(
                                                                "w-2 h-2 rounded-full mt-2 flex-shrink-0",
                                                                feedback.severity === 'high' ? 'bg-red-500' :
                                                                feedback.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                                                            )} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center space-x-2 mb-1">
                                                                    <Badge variant="outline" className="text-xs capitalize">
                                                                        {feedback.type}
                                                                    </Badge>
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={cn(
                                                                            "text-xs",
                                                                            feedback.severity === 'high' ? 'text-red-600 border-red-200' :
                                                                            feedback.severity === 'medium' ? 'text-yellow-600 border-yellow-200' :
                                                                            'text-green-600 border-green-200'
                                                                        )}
                                                                    >
                                                                        {feedback.severity}
                                                                    </Badge>
                                                                </div>
                                                                <p className="text-sm text-gray-800 mb-2">
                                                                    {feedback.message}
                                                                </p>
                                                                <p className="text-sm text-blue-600 mb-2 whitespace-pre-wrap">
                                                                    {feedback.suggestion}
                                                                </p>
                                                                {feedback.highlightedText && (
                                                                    <div className="bg-gray-50 border border-gray-200 rounded p-2 mb-2">
                                                                        <p className="text-xs text-gray-500 mb-1">Original text:</p>
                                                                        <p className="text-sm italic">"{feedback.highlightedText}"</p>
                                                                    </div>
                                                                )}
                                                                <div className="flex space-x-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                        onClick={() => {
                                                                            if (editor && feedback.position && feedback.replacementText) {
                                                                                editor.commands.focus();
                                                                                editor.commands.setTextSelection({
                                                                                    from: feedback.position.from,
                                                                                    to: feedback.position.to
                                                                                });
                                                                                editor.commands.insertContent(feedback.replacementText);
                                                                                toast.success('Suggestion applied!');

                                                                                // Remove this feedback item
                                                                                setAiFeedback(prev => prev.filter(f => f.id !== feedback.id));
                                                                            } else {
                                                                                toast.info('Select the text manually to apply this suggestion');
                                                                            }
                                                                        }}
                                                                    >
                                                                        Apply
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        className="text-xs"
                                                                        onClick={() => {
                                                                            setAiFeedback(prev => prev.filter(f => f.id !== feedback.id));
                                                                            toast.info('Suggestion dismissed');
                                                                        }}
                                                                    >
                                                                        Dismiss
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Card>
                                                ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="bg-white border-t border-gray-200 px-4 py-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                        <span>Words: {wordCount}</span>
                        <span>Characters: {characterCount}</span>
                        {others.length > 0 && (
                            <span className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{others.length + 1} editing</span>
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={cn(
                            "w-2 h-2 rounded-full",
                            status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
                        )} />
                        <span className="capitalize">{status}</span>
                    </div>
                </div>
            </div>

            {/* Video Participants Panel - Draggable */}
            {!isVideoCollapsed && (
                <div
                    ref={videoPanelRef}
                    className={cn(
                        "fixed w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-30 transition-shadow",
                        isDragging ? "shadow-2xl" : "shadow-lg"
                    )}
                    style={{
                        left: `${videoPanelPosition.x}px`,
                        top: `${videoPanelPosition.y}px`,
                        cursor: isDragging ? 'grabbing' : 'default'
                    }}
                >
                    <div
                        className={cn(
                            "p-3 border-b border-gray-200 flex items-center justify-between",
                            "cursor-grab active:cursor-grabbing select-none"
                        )}
                        onMouseDown={handleMouseDown}
                    >
                        <div>
                            <div className="flex items-center space-x-2">
                                <div className="flex space-x-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                </div>
                                <h3 className="text-sm font-semibold text-gray-900">Participants</h3>
                            </div>
                            <p className="text-xs text-gray-500">{remoteUsers.length + 1} total</p>
                            <button
                                onClick={() => {
                                    console.log('🔍 Debug - Current remote users:', remoteUsers);
                                    console.log('🔍 Debug - Agora client remote users:', agoraClient.current?.remoteUsers);
                                    toast.info(`Remote users: ${remoteUsers.length}`);
                                }}
                                className="text-xs text-blue-600 underline"
                            >
                                Debug
                            </button>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVideoCollapsed(true);
                                }}
                                className="w-6 h-6 p-0"
                                title="Minimize video panel"
                            >
                                <Minimize className="w-3 h-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVideoCollapsed(true);
                                }}
                                className="w-6 h-6 p-0"
                                title="Close video panel"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
                        {/* Local video */}
                        <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                You ({userRole})
                            </div>
                        </div>

                        {/* Remote participants */}
                        {remoteUsers.map((user) => (
                            <RemoteUserVideo key={user.uid} user={user} />
                        ))}
                    </div>
                </div>
            )}

            {/* Minimized video panel button */}
            {isVideoCollapsed && (
                <div
                    className="fixed z-30"
                    style={{
                        left: `${videoPanelPosition.x}px`,
                        top: `${videoPanelPosition.y}px`
                    }}
                >
                    <Button
                        onClick={() => setIsVideoCollapsed(false)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                        size="sm"
                    >
                        <Video className="w-4 h-4 mr-1" />
                        Show Video ({remoteUsers.length + 1})
                    </Button>
                </div>
            )}

            {/* AI Chat Window */}
            {showAIChatWindow && (
                <div className="fixed bottom-4 right-4 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 flex flex-col h-96">
                    <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            <h3 className="text-sm font-semibold text-gray-900">MozartStroke Review</h3>
                            {teacherVoicePermission && (
                                <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                    🔊 Voice Enabled
                                </div>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAIChatWindow(false)}
                            className="w-6 h-6 p-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-3">
                        {aiChatMessages.length === 0 ? (
                            <div className="text-center text-purple-600 text-sm py-8">
                                <Brain className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                                <p>🧠 MozartStroke AI Writing Mentor</p>
                                <p>Ask about essay structure, clarity, or style!</p>
                            </div>
                        ) : (
                            aiChatMessages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn(
                                        "flex",
                                        message.type === 'user' ? 'justify-end' : 'justify-start'
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "max-w-xs px-3 py-2 rounded-lg text-sm",
                                            message.type === 'user'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                        )}
                                    >
                                        <p>{message.content}</p>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className={cn(
                                                "text-xs",
                                                message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                                            )}>
                                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {message.isVoice && (
                                                <span className="text-xs">🔊</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3 border-t border-gray-200">
                        <div className="flex space-x-2">
                            <Input
                                value={currentAIInput}
                                onChange={(e) => setCurrentAIInput(e.target.value)}
                                placeholder="Ask AI about your essay..."
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        sendAIMessage(currentAIInput);
                                    }
                                }}
                                className="flex-1"
                            />
                            <Button
                                onClick={() => sendAIMessage(currentAIInput)}
                                disabled={!currentAIInput.trim()}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* MozartStroke AI Review Panel */}
            {showMozartStrokePanel && (
                <div className="fixed top-20 right-4 z-50">
                    <MozartStrokePanel
                        isReviewMode={isReviewMode}
                        isAnalyzing={aiAnalysisInProgress}
                        reviewProgress={mozartReviewProgress}
                        reviewAnnotations={mozartAnnotations}
                        activeAnnotation={activeMozartAnnotation}
                        currentContent={editor?.getText() || ''}
                        inlineCommentsCount={mozartInlineComments.filter(c => c.isVisible !== false).length}
                        onStartReview={startMozartStrokeReview}
                        onExitReview={exitReviewMode}
                    />
                </div>
            )}

            {/* Enhanced AI Chat Panel (Original) */}
            <EnhancedAIChatPanel
                isVisible={showAIChatPanel}
                onToggle={() => setShowAIChatPanel(!showAIChatPanel)}
                sessionId={sessionId}
                userId={userId}
                username={username}
                userRole={userRole}
                documentContent={editor?.getHTML() || ''}
                students={students}
                onAnalysisComplete={(analysis) => {
                    console.log('AI Analysis completed:', analysis);
                    toast.success(`Document analyzed! Score: ${analysis.overallScore}/100`);
                }}
                onSuggestionApplied={(suggestion) => {
                    console.log('Suggestion applied:', suggestion);
                    // Here you could implement automatic text replacement based on the suggestion
                }}
            />

            {/* Enhanced AI Comment Panel - New System with Memory and Learning */}
            <EnhancedAICommentPanel
                documentContent={editor?.getText() || ''}
                documentType="essay"
                sessionId={parseInt(sessionId)}
                onApplySuggestion={handleApplyAISuggestion}
                isVisible={showEnhancedAIComments}
                onToggle={() => setShowEnhancedAIComments(!showEnhancedAIComments)}
                sendWsMessage={sendWsMessage}
            />

            {/* Comprehensive AI Writing Coach - Revolutionary New System */}
            <ComprehensiveAIWritingCoach
                documentContent={editor?.getText() || ''}
                onApplySuggestion={handleApplyAISuggestion}
                isVisible={showComprehensiveAICoach}
                onClose={() => setShowComprehensiveAICoach(false)}
                sessionId={parseInt(sessionId)}
            />

            {/* Gemini-Style Writing Assistant - Real-time Interactive AI */}
            <GeminiWritingAssistant
                editor={editor}
                selectedText={selectedText}
                cursorPosition={editor?.state?.selection?.$anchor?.pos || 0}
                onTextInsert={(text) => {
                    if (editor) {
                        editor.chain().focus().insertContent(text).run();
                    }
                }}
                onTextReplace={(oldText, newText) => {
                    if (editor && selectedText) {
                        const { from, to } = editor.state.selection;
                        editor.chain().focus().deleteRange({ from, to }).insertContent(newText).run();
                    }
                }}
            />
        </div>
    );
}

export default function ModernEssayEditor(props: ModernEssayEditorProps) {
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
        return '<h1>Welcome to the Collaborative Essay Editor</h1><p>Start writing your essay here...</p>';
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
                // Use the document field that the liveblocks extension expects
                document: getInitialContent(),
                version: 1,
                metadata: {
                    documentId: props.sessionId,
                    documentName: props.uploadedDocument?.name || 'Untitled Essay',
                    createdBy: user?.id,
                    createdAt: new Date().toISOString(),
                    lastModified: new Date().toISOString(),
                },
            }}
            shouldInitiallyConnect={true}
        >
            <ModernEssayEditorInner {...props} />
        </RoomProvider>
    );
}