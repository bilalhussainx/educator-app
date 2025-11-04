import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { RoomProvider } from '@/lib/liveblocks';
import sessionWebSocketService from '../services/sessionWebSocketService';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSessionEndHandler } from '../hooks/useSessionEndHandler';

// Enhanced UI Components
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons
import {
    Bot, Sparkles, Send, Brain, Wand2, Zap, MessageCircle, Target,
    Star, Lightbulb, FileEdit, CheckCircle, Eye, Palette, Settings,
    ChevronDown, ChevronUp, Loader2, X, Video, Mic, Hand, PhoneOff,
    Edit3, Save, Download, Upload, Lock, Crown, Gem, ArrowRight,
    Layers, Microscope, Telescope, Beaker, Compass, Clock, Award,
    FileText, GraduationCap, RotateCcw, Users, Monitor, Pen,
    UserCheck, UserPlus, Globe, Shield, Menu, MoreVertical
} from 'lucide-react';

// Import our enhanced essay editor
import ModernEssayEditor from '../components/classroom/ModernEssayEditor';

// Import enhanced essay editing components
import EnhancedAnnotationPanel from '../components/scribe/EnhancedAnnotationPanel';
import EnhancedEssayEditingPanel from '../components/scribe/EnhancedEssayEditingPanel';
import EnhancedAnalysisConfigPanel from '../components/analysis/EnhancedAnalysisConfigPanel';
import InteractiveAnalysisFlow from '../components/analysis/InteractiveAnalysisFlow';
import InlineCommentSystem, { InlineComment } from '../components/analysis/InlineCommentSystem';
import inlineCommentGenerator from '../services/inlineCommentGenerator';
import claudeInlineCommentService from '../services/claudeInlineCommentService';

// Import collaborative features
import CollaborativeWhiteboard, { DrawingAction } from '../components/classroom/CollaborativeWhiteboard';
import WorkspaceManager, { Workspace, Participant } from '../components/classroom/WorkspaceManager';
import liveSessionService, { LiveSession } from '../services/liveSessionService';

// AI Interface Types
interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'suggestion' | 'feedback' | 'analysis' | 'proactive' | 'ideation' | 'enhancement' | 'review';
    section?: 'intro' | 'body' | 'conclusion' | 'overall' | 'selection';
    selectedText?: string;
    confidence?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    suggestedEdit?: {
        action: 'insert' | 'replace' | 'delete';
        position?: number;
        content?: string;
        originalText?: string;
        reason?: string;
    };
}

interface AIFeedbackCard {
    id: string;
    type: 'grammar' | 'style' | 'structure' | 'clarity' | 'engagement' | 'research';
    title: string;
    description: string;
    selectedText?: string;
    suggestion: string;
    confidence: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    position?: { from: number; to: number };
}

const simpleJwtDecode = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
};

const UrgentEssaySessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Handle session end events - auto-redirect when teacher ends session
    useSessionEndHandler({
        sessionId: sessionId || '',
        redirectPath: '/sessions',
        onSessionEnd: (data) => {
            console.log('[UrgentEssaySessionPage] Session ended:', data);
            toast.error('Session has been ended by the teacher', {
                description: 'Redirecting to sessions page...',
                duration: 3000
            });
        }
    });

    // Core state
    const [students] = useState<any[]>([]);
    const [handsRaised] = useState<Set<string>>(new Set());
    const [uploadedDocument, setUploadedDocument] = useState<{
        name: string;
        url: string;
        content?: string;
        instructions?: string;
    } | null>(null);
    const [isLoadingDocument, setIsLoadingDocument] = useState(false);

    // Premium AI state
    const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
    const [aiAnalyzing, setAiAnalyzing] = useState(false);
    const [feedbackCards, setFeedbackCards] = useState<AIFeedbackCard[]>([]);
    const [activePanel, setActivePanel] = useState<'advanced' | 'chat' | 'feedback' | 'analysis' | 'insights' | 'highlights'>('advanced');
    const [aiInput, setAiInput] = useState('');
    const [documentAnalysis, setDocumentAnalysis] = useState<any>(null);
    const [realTimeFeedback, setRealTimeFeedback] = useState<AIFeedbackCard[]>([]);
    const [selectedText, setSelectedText] = useState<string>('');
    const [currentContent, setCurrentContent] = useState<string>('');

    // Mozart stroke review state
    const [reviewAnnotations, setReviewAnnotations] = useState<any[]>([]);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
    const [reviewProgress, setReviewProgress] = useState({ current: 0, total: 0 });

    // Enhanced analysis state
    const [enhancedAnalysisConfig, setEnhancedAnalysisConfig] = useState<any>({
        documentType: 'college_essay',
        customRequirements: [],
        focusAreas: [],
        analysisDepth: 'comprehensive'
    });
    const [showEnhancedAnalysis, setShowEnhancedAnalysis] = useState(false);
    const [enhancedAnalysisResults, setEnhancedAnalysisResults] = useState<any>(null);

    // Interactive analysis state
    const [showInteractiveFlow, setShowInteractiveFlow] = useState(false);
    const [interactiveResults, setInteractiveResults] = useState<any[]>([]);

    // Inline comment system state
    const [inlineComments, setInlineComments] = useState<InlineComment[]>([]);
    const [showInlineComments, setShowInlineComments] = useState(false);
    const [inlineCommentMode, setInlineCommentMode] = useState<'basic' | 'dense' | 'very_dense'>('very_dense');
    const [claudeApiStatus, setClaudeApiStatus] = useState<{ ready: boolean; message: string }>({ ready: false, message: 'Checking...' });
    const [usingClaudeApi, setUsingClaudeApi] = useState(false);

    // UI state
    const [showAIPanel, setShowAIPanel] = useState(true);
    const [sessionStartTime] = useState(new Date().toISOString());

    // DEBUG: Force panel open when in review mode with annotations
    useEffect(() => {
        if (isReviewMode && reviewAnnotations.length > 0) {
            console.log('🎨 REVIEW MODE ACTIVE - Forcing AI Panel Open', {
                isReviewMode,
                annotationsCount: reviewAnnotations.length,
                currentlyVisible: showAIPanel,
                progress: reviewProgress
            });
            setShowAIPanel(true);
            setShowEnhancedAnalysis(false); // Make sure we're not in other mode
        }
    }, [isReviewMode, reviewAnnotations.length]);

    // Live session and collaboration state
    const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
    const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('main');
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [sessionParticipants, setSessionParticipants] = useState<Participant[]>([]);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
    const [whiteboardActions, setWhiteboardActions] = useState<DrawingAction[]>([]);
    const [isTeacher, setIsTeacher] = useState(false);
    const [liveUserName, setLiveUserName] = useState('');
    const [liveUserId, setLiveUserId] = useState('');

    // Auth
    const token = localStorage.getItem('authToken');
    const decodedToken = token ? simpleJwtDecode(token) : null;

    // Load uploaded document
    useEffect(() => {
        const loadDocument = async () => {
            const documentParam = searchParams.get('document');
            console.log('📄 Document param from URL:', documentParam);

            // Check if we have a document parameter (could be documentId or 'true')
            if (documentParam && documentParam !== 'false' && documentParam !== 'null') {
                setIsLoadingDocument(true);
                try {
                    // Method 1: Try to get document using the session document endpoint
                    console.log('🔍 Trying to load document for session:', sessionId);
                    const sessionDocResponse = await apiClient.get(`/api/sessions/${sessionId}/document`);

                    if (sessionDocResponse.data.success && sessionDocResponse.data.document) {
                        const doc = sessionDocResponse.data.document;
                        const documentData = {
                            name: doc.original_name || doc.filename || doc.name || 'Uploaded Document',
                            url: doc.url || '',
                            content: doc.content || '',
                            instructions: doc.instructions || ''
                        };

                        setUploadedDocument(documentData);
                        setCurrentContent(documentData.content); // Initialize current content
                        console.log('✅ Document loaded from session endpoint:', doc.original_name);
                        toast.success(`Document "${doc.original_name || 'Document'}" loaded successfully`);

                        // Auto-analyze the document
                        if (doc.content) {
                            analyzeDocument(doc.content);
                        }
                        return; // Success, exit early
                    }

                    // Method 2: If documentParam looks like a UUID, try the documents endpoint
                    if (documentParam.length > 10 && documentParam.includes('-')) {
                        console.log('🔍 Trying to load document by ID:', documentParam);
                        const docResponse = await apiClient.get(`/api/documents/${documentParam}`);

                        if (docResponse.data.success && docResponse.data.document) {
                            const doc = docResponse.data.document;
                            const documentData = {
                                name: doc.original_name || doc.filename || doc.name || 'Uploaded Document',
                                url: doc.url || '',
                                content: doc.content || '',
                                instructions: doc.instructions || ''
                            };

                            setUploadedDocument(documentData);
                            setCurrentContent(documentData.content); // Initialize current content
                            console.log('✅ Document loaded from documents endpoint:', doc.original_name);
                            toast.success(`Document "${doc.original_name || 'Document'}" loaded successfully`);

                            // Auto-analyze the document
                            if (doc.content) {
                                analyzeDocument(doc.content);
                            }
                            return; // Success, exit early
                        }
                    }

                    // If we get here, no document was found
                    console.warn('⚠️ No document found for session or document ID');

                } catch (error) {
                    console.error('❌ Error loading document:', error);
                    if (error.response?.status !== 404) {
                        toast.error('Failed to load uploaded document');
                    }
                } finally {
                    setIsLoadingDocument(false);
                }
            }
        };

        if (sessionId) {
            const timeoutId = setTimeout(loadDocument, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [sessionId, searchParams]);

    // Initialize WebSocket
    useEffect(() => {
        if (decodedToken && sessionId && token) {
            const userId = decodedToken.user?.id || decodedToken.userId || '';
            if (!sessionWebSocketService.connectionStatus) {
                sessionWebSocketService.connect(userId, token, sessionId);
            }
        }
    }, [decodedToken, sessionId, token]);

    // Auto-set session mode to 'essay' when teacher accesses this page
    useEffect(() => {
        const autoSetEssayMode = async () => {
            if (!sessionId || !decodedToken) return;

            const userRole = decodedToken.user?.role || decodedToken.role;
            const roleParam = searchParams.get('role');

            console.log('[UrgentEssaySession] Auto mode detection:', {
                sessionId,
                userRole,
                roleParam,
                isTeacher: userRole === 'teacher' || roleParam === 'teacher'
            });

            // Only auto-set for teachers
            if (userRole !== 'teacher' && roleParam !== 'teacher') {
                console.log('[UrgentEssaySession] Not a teacher, skipping auto mode set');
                return;
            }

            try {
                console.log('[UrgentEssaySession] Checking if session mode needs to be set...');

                // Check current session state
                const sessionRes = await apiClient.get(`/api/sessions?status=all`);
                const sessions = sessionRes.data.sessions || [];
                const currentSession = sessions.find((s: any) => s.id.toString() === sessionId?.toString());

                console.log('[UrgentEssaySession] Current session:', currentSession);

                if (currentSession && !currentSession.session_mode) {
                    console.log('[UrgentEssaySession] ⚠️  Session mode not set! Auto-setting to essay...');

                    const response = await apiClient.post(`/api/sessions/${sessionId}/start`, {
                        mode: 'essay'
                    });

                    if (response.data.success) {
                        console.log('[UrgentEssaySession] ✅ Session mode set to essay automatically');
                        toast.success('Essay session mode activated!');
                    } else {
                        console.error('[UrgentEssaySession] ❌ Failed to set session mode:', response.data);
                    }
                } else if (currentSession?.session_mode) {
                    console.log('[UrgentEssaySession] ✅ Session mode already set:', currentSession.session_mode);
                } else {
                    console.log('[UrgentEssaySession] Session not found, may not be created yet');
                }
            } catch (error: any) {
                console.error('[UrgentEssaySession] Error auto-setting essay mode:', error);
                // Don't show error toast - this is a background operation
            }
        };

        // Run after a short delay to ensure session is created
        const timeoutId = setTimeout(autoSetEssayMode, 1000);
        return () => clearTimeout(timeoutId);
    }, [sessionId, decodedToken, searchParams]);

    // Set isTeacher state based on token and URL parameter
    useEffect(() => {
        if (!decodedToken) return;

        const userRole = decodedToken.user?.role || decodedToken.role;
        const roleParam = searchParams.get('role');

        const teacherDetected = userRole === 'teacher' || roleParam === 'teacher';

        console.log('[UrgentEssaySession] Setting isTeacher:', {
            userRole,
            roleParam,
            teacherDetected
        });

        setIsTeacher(teacherDetected);
    }, [decodedToken, searchParams]);

    // AI Functions
    const analyzeDocument = async (content: string) => {
        if (!content || content.trim().length < 50) {
            toast.error('Please write at least 50 characters to analyze');
            return;
        }

        setAiAnalyzing(true);
        try {
            // Try real API first
            const response = await apiClient.post('/api/ai/analyze-essay', {
                content,
                sessionId,
                analysisType: 'comprehensive'
            });

            if (response.data.success) {
                setDocumentAnalysis(response.data.analysis);
                setFeedbackCards(response.data.feedbackCards || []);

                // Add analysis message to chat
                const analysisMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `I've analyzed your essay and found ${response.data.feedbackCards?.length || 0} areas for improvement. Check the feedback panel for detailed suggestions!`,
                    timestamp: new Date(),
                    type: 'analysis',
                    confidence: 0.9
                };
                setAiMessages(prev => [...prev, analysisMessage]);
            }
        } catch (error) {
            console.error('API analysis failed, using demo analysis:', error);

            // Fallback to demo analysis
            setTimeout(() => {
                const demoAnalysis = {
                    overallScore: 78,
                    readabilityGrade: 'College Level',
                    wordCount: content.split(' ').length,
                    sentiment: 'Professional',
                    mainTopics: ['Introduction', 'Body Arguments', 'Conclusion']
                };

                const demoFeedbackCards = [
                    {
                        id: '1',
                        type: 'clarity' as const,
                        title: 'Improve sentence clarity',
                        description: 'Some sentences could be more concise and clear',
                        suggestion: 'Consider breaking long sentences into shorter, more focused ones',
                        confidence: 0.85,
                        priority: 'medium' as const,
                        category: 'technical' as const,
                        difficulty: 'intermediate' as const
                    },
                    {
                        id: '2',
                        type: 'structure' as const,
                        title: 'Strengthen transitions',
                        description: 'Improve flow between paragraphs',
                        suggestion: 'Add transitional phrases to connect ideas more smoothly',
                        confidence: 0.80,
                        priority: 'high' as const,
                        category: 'academic' as const,
                        difficulty: 'beginner' as const
                    },
                    {
                        id: '3',
                        type: 'engagement' as const,
                        title: 'Enhance reader engagement',
                        description: 'Make the content more engaging for readers',
                        suggestion: 'Add specific examples or anecdotes to illustrate your points',
                        confidence: 0.90,
                        priority: 'medium' as const,
                        category: 'creative' as const,
                        difficulty: 'intermediate' as const
                    }
                ];

                setDocumentAnalysis(demoAnalysis);
                setFeedbackCards(demoFeedbackCards);

                // Add analysis message to chat
                const analysisMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `I've analyzed your essay and found ${demoFeedbackCards.length} areas for improvement. Check the feedback panel for detailed suggestions! (Demo analysis)`,
                    timestamp: new Date(),
                    type: 'analysis',
                    confidence: 0.9
                };
                setAiMessages(prev => [...prev, analysisMessage]);

                toast.success('Document analyzed successfully!');
            }, 2000); // Simulate API delay
        } finally {
            setTimeout(() => {
                setAiAnalyzing(false);
            }, 2000);
        }
    };

    const sendAIMessage = async () => {
        if (!aiInput.trim()) return;

        const userMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: aiInput,
            timestamp: new Date()
        };

        setAiMessages(prev => [...prev, userMessage]);
        setAiInput('');

        try {
            const response = await apiClient.post('/api/ai/chat-essay', {
                message: aiInput,
                sessionId,
                documentContent: uploadedDocument?.content,
                context: 'urgent_session'
            });

            if (response.data.success) {
                const aiResponse: AIMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: response.data.type || 'feedback',
                    confidence: response.data.confidence || 0.8
                };
                setAiMessages(prev => [...prev, aiResponse]);
            }
        } catch (error) {
            console.error('Error sending AI message:', error);
            toast.error('Failed to get AI response');
        }
    };

    // Event handlers
    const sendWsMessage = useCallback((type: string, payload: any) => {
        if (sessionWebSocketService.connectionStatus) {
            sessionWebSocketService.send(type, payload);
        }
    }, []);

    const handleRaiseHand = useCallback(() => {
        console.log('Hand raised');
    }, []);

    const handleSave = useCallback((content: string) => {
        console.log('Saving content:', content);
    }, []);

    const handleContentChange = useCallback((content: string) => {
        // Update current content for AI analysis
        setCurrentContent(content);

        // Auto-trigger inline comments for substantial content (but only once)
        if (!showInlineComments && !isReviewMode && content.length > 300 && content.split(' ').length > 50) {
            // Debounced auto-trigger after user stops typing
            setTimeout(() => {
                if (currentContent.length > 300 && !showInlineComments) {
                    toast.info('💡 Your essay is getting substantial! Click "Inline Comments" to see MozartStroke feedback throughout your document.');
                }
            }, 3000);
        }

        // Update document content state for AI analysis
        if (uploadedDocument) {
            setUploadedDocument(prev => prev ? { ...prev, content } : null);
        }
    }, [uploadedDocument, showInlineComments, isReviewMode, currentContent]);

    const handleTextSelection = useCallback((text: string) => {
        setSelectedText(text);
    }, []);

    // TrustGraph token generation
    const generateTrustGraphTokens = async (analysisResults: any, userInteractions: any[]) => {
        try {
            console.log('Generating TrustGraph tokens for MozartStroke session...');

            const response = await apiClient.post('/api/ai/scribe/generate-trustgraph-tokens', {
                sessionId,
                analysisResults,
                userInteractions,
                documentMetrics: {
                    length: currentContent.length,
                    wordCount: currentContent.split(' ').length,
                    analysisTime: Date.now()
                }
            });

            if (response.data.success) {
                console.log('TrustGraph tokens generated:', response.data);

                // Add success message to AI chat
                const tokenMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `🌟 TrustGraph Integration: Generated ${response.data.tokens.length} trust tokens based on your session. Your engagement quality score: ${response.data.session_summary.average_value.toFixed(2)}/1.0`,
                    timestamp: new Date(),
                    type: 'analysis',
                    confidence: 0.95
                };
                setAiMessages(prev => [...prev, tokenMessage]);

                return response.data;
            }
        } catch (error) {
            console.error('Failed to generate TrustGraph tokens:', error);
            // Don't throw error - this shouldn't break the main analysis flow
        }
        return null;
    };

    // Document saving functionality
    const saveSessionDocument = async (documentType: 'draft' | 'final' | 'revision' | 'backup' = 'draft') => {
        try {
            if (!currentContent || currentContent.trim().length === 0) {
                toast.error('No content to save');
                return;
            }

            console.log('Saving session document...');

            const response = await apiClient.post('/api/session-documents', {
                sessionId,
                sessionName: `Urgent Essay Session - ${new Date().toLocaleDateString()}`,
                sessionType: 'urgent_essay',
                documentName: uploadedDocument?.name || `Essay Document - ${documentType}`,
                documentType,
                content: currentContent,
                sessionMetadata: {
                    hasAiAnalysis: reviewAnnotations.length > 0,
                    wordCount: currentContent.split(' ').length,
                    characterCount: currentContent.length,
                    sessionDuration: Date.now() - Date.parse(sessionStartTime || new Date().toISOString())
                },
                aiAnalysisData: reviewAnnotations.length > 0 ? {
                    totalAnnotations: reviewAnnotations.length,
                    annotationTypes: reviewAnnotations.map(a => a.category),
                    analysisTimestamp: new Date().toISOString()
                } : {},
                tags: ['urgent-essay', documentType, 'essay-writing']
            });

            if (response.data.success) {
                toast.success(`Document saved as ${documentType} (Version ${response.data.document.version_number})`);

                // Add success message to AI chat
                const saveMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `📄 Document saved successfully! Your ${documentType} version is now stored in Session Documents. You can access it anytime from the sidebar.`,
                    timestamp: new Date(),
                    type: 'system',
                    confidence: 1.0
                };
                setAiMessages(prev => [...prev, saveMessage]);

                return response.data.document;
            }
        } catch (error) {
            console.error('Failed to save session document:', error);
            toast.error('Failed to save document');
        }
        return null;
    };

    // Enhanced Mozart stroke analysis handlers
    const startEnhancedAnalysis = async () => {
        const content = currentContent || uploadedDocument?.content || '';

        if (!content || content.trim().length < 100) {
            toast.error('Please write at least 100 characters before starting enhanced analysis');
            return;
        }

        setAiAnalyzing(true);
        setIsReviewMode(true);
        setShowAIPanel(true); // Open AI Panel to show annotations

        try {
            console.log('Starting Enhanced MozartStroke analysis...', enhancedAnalysisConfig);

            const response = await apiClient.post('/api/ai/scribe/enhanced-analyze', {
                documentContent: content,
                sessionId,
                analysisConfig: enhancedAnalysisConfig
            });

            if (response.data.success && response.data.results) {
                setEnhancedAnalysisResults(response.data.results);

                // Convert enhanced results to annotations for display
                const paragraphAnnotations = [];
                if (response.data.results.paragraphAnalysis) {
                    response.data.results.paragraphAnalysis.forEach((para, index) => {
                        if (para.specificIssues) {
                            para.specificIssues.forEach((issue, issueIndex) => {
                                paragraphAnnotations.push({
                                    id: `para-${index}-issue-${issueIndex}`,
                                    start: issue.startIndex || 0,
                                    end: issue.endIndex || 50,
                                    text: issue.highlightedText || '',
                                    highlightedText: issue.highlightedText || '',
                                    type: issue.issueType || 'improvement',
                                    category: issue.severity === 'high' ? 'Critical Issue' :
                                             issue.severity === 'medium' ? 'Important Improvement' : 'Minor Enhancement',
                                    severity: issue.severity,
                                    message: issue.counselorNote,
                                    suggestion: issue.suggestedRevision,
                                    confidence: 0.9,
                                    context: issue.requirementAlignment,
                                    replacement: issue.suggestedRevision,
                                    paragraphNumber: para.paragraphNumber,
                                    counselorComment: para.counselorComment
                                });
                            });
                        }
                    });
                }

                setReviewAnnotations(paragraphAnnotations);
                setReviewProgress({ current: 0, total: paragraphAnnotations.length });
                toast.success(`Enhanced analysis complete! Found ${paragraphAnnotations.length} counselor-level suggestions.`);

                // Generate TrustGraph tokens after successful analysis
                setTimeout(async () => {
                    try {
                        await generateTrustGraphTokens(
                            {
                                analysisType: 'enhanced_mozart_stroke',
                                documentType: response.data.metadata.documentType,
                                paragraphCount: response.data.metadata.paragraphCount,
                                analysisDepth: response.data.metadata.analysisDepth,
                                results: response.data.results
                            },
                            []  // Will be populated with actual user interactions later
                        );
                    } catch (error) {
                        console.warn('TrustGraph token generation failed but continuing session:', error);
                    }
                }, 1000);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Error in Enhanced MozartStroke analysis:', error);
            toast.error('Enhanced analysis failed. Please try again.');
        } finally {
            setAiAnalyzing(false);
        }
    };

    // Legacy Mozart stroke review (keep as fallback) - DISABLED DUE TO RATE LIMITING
    const activateMozartStrokeReview = async () => {
        let content = currentContent || uploadedDocument?.content || '';

        // Strip HTML tags to get clean text for analysis
        const stripHtml = (html: string) => {
            const tmp = document.createElement('DIV');
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || '';
        };

        content = stripHtml(content);

        if (!content || content.trim().length < 50) {
            toast.error('Please write at least 50 characters before activating Mozart stroke Review');
            return;
        }

        setAiAnalyzing(true);
        setIsReviewMode(true);
        setShowAIPanel(true); // Open AI Panel to show annotations

        try {
            console.log('Starting MozartStroke analysis with Claude AI...');

            // Use Claude API for intelligent analysis
            let generatedComments: InlineComment[] = [];

            try {
                toast.info('🧠 Connecting to Claude AI for MozartStroke analysis...');

                const response = await apiClient.post('/api/ai/scribe/claude-inline-analysis', {
                    documentContent: content,
                    config: {
                        documentType: 'college_essay',
                        analysisDepth: 'dense',
                        focusAreas: ['structure', 'clarity', 'style', 'engagement'],
                        userLevel: 'intermediate'
                    },
                    analysisType: 'inline_comments'
                });

                if (response.data.success) {
                    const claudeComments = response.data.comments || [];

                    // Convert Claude comments to InlineComment format
                    generatedComments = claudeComments.map((comment: any, index: number) => ({
                        id: comment.id || `claude_mozart_${index}`,
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

                    toast.success(`✨ Generated ${generatedComments.length} Claude-powered comprehensive comments! (Target: ${targetComments})`);
                    console.log('Claude API comprehensive analysis successful');
                } else {
                    throw new Error(response.data.error || 'Claude analysis failed');
                }

            } catch (claudeError) {
                console.warn('Claude API failed for MozartStroke, falling back to local generation:', claudeError);

                toast.error('⚠️ Claude AI unavailable. Using basic pattern-matching analysis with limited accuracy.', { duration: 5000 });
                toast.info('💡 Tip: For intelligent, context-aware feedback, configure Claude API in your backend.', { duration: 7000 });

                // Fallback to local generation if Claude fails - minimal density
                const wordCount = content.trim().split(/\s+/).length;
                const targetComments = Math.min(Math.floor(wordCount / 150), 10); // Very conservative: 1 per 150 words, max 10

                generatedComments = inlineCommentGenerator.generateInlineComments(content, {
                    density: 'light', // Minimal density to avoid bad suggestions
                    focusAreas: ['structure', 'clarity'], // Focus on basic issues only
                    documentType: 'college_essay',
                    userLevel: 'intermediate',
                    targetCommentCount: targetComments,
                    analyzeEntireDocument: true,
                    distributionMode: 'proportional'
                });

                console.log('Local fallback analysis complete - limited to basic patterns only');
            }

            // Convert inline comments to annotation format - use ALL comments, not just 10
            console.log('🔍 DEBUG: Converting comments to annotations. Sample of first 3 comments:',
                generatedComments.slice(0, 3).map(c => ({
                    id: c.id,
                    highlightedText: c.highlightedText,
                    text: c.text,
                    startOffset: c.startOffset,
                    endOffset: c.endOffset
                }))
            );

            const annotations = generatedComments.map((comment, index) => {
                const annotation = {
                    id: comment.id,
                    start: comment.startOffset,
                    end: comment.endOffset,
                    startIndex: comment.startOffset,
                    endIndex: comment.endOffset,
                    text: comment.highlightedText || comment.text || '',
                    highlightedText: comment.highlightedText || comment.text || '',
                    type: comment.type === 'praise' ? 'positive' : 'improvement',
                    category: comment.category,
                    severity: comment.severity === 'positive' ? 'positive' : comment.severity === 'minor' ? 'low' : comment.severity === 'moderate' ? 'medium' : 'high',
                    message: comment.message,
                    suggestion: comment.suggestion || '',
                    explanation: comment.explanation || '',
                    rationale: comment.explanation || 'Generated from inline analysis',
                    confidence: comment.confidence,
                    replacement: comment.suggestion || comment.highlightedText || comment.text || ''
                };

                // Debug log first 3 annotations
                if (index < 3) {
                    console.log(`🔍 Annotation ${index}:`, {
                        id: annotation.id,
                        highlightedText: annotation.highlightedText,
                        text: annotation.text,
                        originalHighlightedText: comment.highlightedText,
                        originalText: comment.text
                    });
                }

                return annotation;
            });

            setReviewAnnotations(annotations);
            setReviewProgress({ current: 1, total: annotations.length });

            // Set first annotation as active
            if (annotations.length > 0) {
                setActiveAnnotation(annotations[0].id);
            }

            toast.success(`MozartStroke analysis complete! Found ${annotations.length} suggestions. View them in the AI Panel!`);

            // Automatically switch to inline comments for better experience
            setTimeout(() => {
                setInlineComments(generatedComments);
                setShowInlineComments(true);
                toast.info('💡 Tip: Use "Inline Comments" for the best experience with lots of comments throughout your document!');
            }, 2000);

        } catch (error) {
            console.error('Error in Mozart stroke Review:', error);

            // Simple fallback without API calls
            const demoAnnotations = [
                {
                    id: '1',
                    start: 0,
                    end: 50,
                    text: content.substring(0, 50),
                    highlightedText: content.substring(0, 50),
                    type: 'improvement',
                    category: 'Structure Enhancement',
                    severity: 'medium',
                    message: 'Consider strengthening your opening with more specific details.',
                    suggestion: 'Add concrete examples to support your point.',
                    confidence: 0.88,
                    context: 'Strong openings engage readers immediately.',
                    replacement: content.substring(0, 50) + ' [Enhanced example]'
                },
                {
                    id: '2',
                    start: Math.floor(content.length / 2),
                    end: Math.floor(content.length / 2) + 50,
                    text: content.substring(Math.floor(content.length / 2), Math.floor(content.length / 2) + 50),
                    highlightedText: content.substring(Math.floor(content.length / 2), Math.floor(content.length / 2) + 50),
                    type: 'suggestion',
                    category: 'Clarity Improvement',
                    severity: 'low',
                    message: 'This section could be clearer.',
                    suggestion: 'Try using more specific language.',
                    confidence: 0.75,
                    context: 'Clear writing helps readers follow your ideas.',
                    replacement: content.substring(Math.floor(content.length / 2), Math.floor(content.length / 2) + 50)
                }
            ];

            setReviewAnnotations(demoAnnotations);
            setReviewProgress({ current: 0, total: demoAnnotations.length });
            toast.success(`MozartStroke analysis complete! Found ${demoAnnotations.length} suggestions.`);
        } finally {
            setAiAnalyzing(false);
        }
    };

    const exitReviewMode = useCallback(() => {
        setIsReviewMode(false);
        setReviewAnnotations([]);
        setActiveAnnotation(null);
        setReviewProgress({ current: 0, total: 0 });
        toast.info('Review mode deactivated');
    }, []);

    const handleAnnotationClick = useCallback((annotationId: string) => {
        setActiveAnnotation(annotationId);
        const currentIndex = reviewAnnotations.findIndex(a => a.id === annotationId);
        if (currentIndex !== -1) {
            setReviewProgress(prev => ({ ...prev, current: currentIndex + 1 }));
        }
    }, [reviewAnnotations]);

    const handleAnnotationAction = useCallback(async (annotationId: string, action: 'apply' | 'dismiss' | 'modify') => {
        try {
            const annotation = reviewAnnotations.find(a => a.id === annotationId);
            if (!annotation) return;

            if (action === 'apply') {
                // Apply the suggested edit
                const beforeText = currentContent.substring(0, annotation.start);
                const afterText = currentContent.substring(annotation.end);
                const newContent = beforeText + (annotation.replacement || annotation.suggestion) + afterText;

                setCurrentContent(newContent);
                handleContentChange(newContent);
                toast.success('Suggestion applied successfully!');
            }

            // Remove the annotation after processing
            setReviewAnnotations(prev => prev.filter(a => a.id !== annotationId));
            setActiveAnnotation(null);

            // Update progress
            const remainingAnnotations = reviewAnnotations.filter(a => a.id !== annotationId);
            setReviewProgress(prev => ({
                current: Math.min(prev.current, remainingAnnotations.length),
                total: remainingAnnotations.length
            }));

        } catch (error) {
            console.error('Error handling annotation action:', error);
            toast.error('Failed to process suggestion');
        }
    }, [currentContent, reviewAnnotations, handleContentChange]);

    // Interactive analysis handlers
    const handleInteractiveAnalysisComplete = (results: any[]) => {
        setInteractiveResults(results);
        setShowInteractiveFlow(false);

        // Convert interactive results to annotations for display
        const annotations: any[] = [];

        results.forEach((stepResult, stepIndex) => {
            if (stepResult.analysis && stepResult.suggestions) {
                stepResult.suggestions.forEach((suggestion: string, suggestionIndex: number) => {
                    // Create annotations based on the step results
                    const paragraphs = currentContent.split('\n\n').filter(p => p.trim().length > 0);
                    const targetParagraph = paragraphs[stepIndex % paragraphs.length] || '';
                    const startIndex = currentContent.indexOf(targetParagraph);
                    const endIndex = startIndex + Math.min(targetParagraph.length, 100);

                    annotations.push({
                        id: `interactive-${stepIndex}-${suggestionIndex}`,
                        start: Math.max(0, startIndex),
                        end: Math.min(currentContent.length, endIndex),
                        text: targetParagraph.substring(0, 100),
                        highlightedText: targetParagraph.substring(0, 100),
                        type: 'interactive_suggestion',
                        category: `Interactive: ${stepResult.stepId.replace('_', ' ')}`,
                        severity: 'medium',
                        message: suggestion,
                        suggestion: suggestion,
                        confidence: 0.95,
                        context: `Based on your preferences in ${stepResult.stepId} analysis`,
                        replacement: suggestion,
                        interactiveStep: stepResult.stepId,
                        userResponses: stepResult.responses
                    });
                });
            }
        });

        setReviewAnnotations(annotations);
        setReviewProgress({ current: 0, total: annotations.length });
        setIsReviewMode(true);
        setShowAIPanel(true); // Open AI Panel to show annotations

        toast.success(`🎉 Interactive analysis complete! Found ${annotations.length} personalized suggestions based on your preferences.`);

        // Generate TrustGraph tokens for interactive analysis
        setTimeout(async () => {
            try {
                await generateTrustGraphTokens(
                    {
                        analysisType: 'interactive_mozart_stroke',
                        stepResults: results,
                        totalSteps: results.length,
                        userEngagement: 'high',
                        personalization: 'high'
                    },
                    results.flatMap(r => r.responses) // Include user interactions
                );
            } catch (error) {
                console.warn('TrustGraph token generation failed but continuing session:', error);
            }
        }, 1000);
    };

    const handleInteractiveAnalysisCancel = () => {
        setShowInteractiveFlow(false);
        toast.info('Interactive analysis cancelled');
    };

    // Inline comment system handlers using Claude API
    const generateInlineComments = async (content: string, mode: 'basic' | 'dense' | 'very_dense' = 'dense') => {
        if (!content || content.trim().length < 50) {
            toast.error('Please write at least 50 characters to generate inline comments');
            return;
        }

        setAiAnalyzing(true);
        toast.info(`Generating ${mode} Claude-powered inline comments...`);

        try {
            // Try Claude API first for high-quality analysis
            let generatedComments: InlineComment[] = [];
            setUsingClaudeApi(false);

            try {
                console.log('Attempting Claude API for inline comments...');
                toast.info('🧠 Connecting to Claude AI for advanced analysis...');

                // Use the same API endpoint as ModernEssayEditor
                // Calculate proportional comments based on document length
                const wordCount = content.trim().split(/\s+/).length;
                const targetComments = Math.max(Math.floor(wordCount / 50), 20); // 1 comment per 50 words, minimum 20
                const commentsPerParagraph = Math.max(Math.floor(targetComments / 10), 3); // Distribute across paragraphs

                const response = await apiClient.post('/api/ai/scribe/claude-inline-analysis', {
                    documentContent: content,
                    config: {
                        documentType: 'college_essay',
                        analysisDepth: 'comprehensive',
                        focusAreas: ['structure', 'clarity', 'style', 'engagement', 'grammar', 'vocabulary', 'transitions', 'evidence', 'flow', 'persuasion', 'examples', 'voice'],
                        userLevel: 'intermediate',
                        requestComprehensive: true,
                        targetCommentCount: targetComments,
                        minCommentsPerParagraph: commentsPerParagraph,
                        maxCommentsPerParagraph: commentsPerParagraph + 2,
                        includePositiveFeedback: true,
                        includeDetailedExplanations: true,
                        analyzeEntireDocument: true,
                        commentDistribution: 'proportional',
                        sentenceLevelAnalysis: true,
                        paragraphLevelAnalysis: true,
                        documentLevelAnalysis: true
                    },
                    analysisType: 'comprehensive_proportional_inline_comments'
                });

                if (response.data.success) {
                    const claudeComments = response.data.comments || [];

                    // Convert Claude comments to the format expected by UrgentEssaySessionPage
                    generatedComments = claudeComments.map((comment: any, index: number) => {
                        // Create enhanced suggestion with concrete replacements
                        let enhancedSuggestion = comment.suggestion || comment.explanation || 'Consider the suggested improvement';

                        // Add concrete replacement text if available
                        if (comment.originalText && comment.replacementText && comment.originalText !== comment.replacementText) {
                            enhancedSuggestion += `\n\n🔄 Replace:\n"${comment.originalText}"\n\nWith:\n"${comment.replacementText}"`;
                        }

                        // Add alternatives if available
                        if (comment.alternatives && comment.alternatives.length > 0) {
                            enhancedSuggestion += `\n\n💡 Other options:\n${comment.alternatives.map((alt: string) => `• ${alt}`).join('\n')}`;
                        }

                        return {
                            id: comment.id || `claude_${index}`,
                            startOffset: comment.startOffset || 0,
                            endOffset: comment.endOffset || 50,
                            text: comment.originalText || content.substring(comment.startOffset || 0, comment.endOffset || 50),
                            highlightedText: comment.highlightedText || content.substring(comment.startOffset || 0, comment.endOffset || 50),
                            type: comment.commentType || 'suggestion',
                            severity: comment.severity || 'moderate',
                            message: comment.message || 'Claude suggests reviewing this section',
                            suggestion: enhancedSuggestion,
                            explanation: comment.explanation || 'This will enhance your writing',
                            alternatives: comment.alternatives || [],
                            confidence: comment.confidence || 0.8,
                            category: comment.category || 'General Improvement',
                            timestamp: new Date(),
                            isVisible: true
                        };
                    });

                    setUsingClaudeApi(true);
                    toast.success(`✨ Generated ${generatedComments.length} Claude-powered inline comments! Intelligent AI feedback with specific text replacements.`);
                    console.log('Claude API analysis successful');
                } else {
                    throw new Error(response.data.error || 'Claude analysis failed');
                }

            } catch (claudeError) {
                console.warn('Claude API failed, falling back to local generation:', claudeError);
                setUsingClaudeApi(false);

                // Fallback to local generation if Claude fails - enhanced for comprehensive analysis
                const wordCount = content.trim().split(/\s+/).length;
                const targetComments = Math.max(Math.floor(wordCount / 50), 20); // 1 comment per 50 words, minimum 20

                generatedComments = inlineCommentGenerator.generateInlineComments(content, {
                    density: 'very_dense',
                    focusAreas: ['structure', 'clarity', 'style', 'engagement', 'grammar', 'vocabulary', 'transitions', 'evidence', 'flow', 'examples', 'voice', 'persuasion'],
                    documentType: 'college_essay',
                    userLevel: 'intermediate',
                    targetCommentCount: targetComments,
                    analyzeEntireDocument: true,
                    distributionMode: 'proportional'
                });

                toast.success(`Generated ${generatedComments.length} inline comments! (Local analysis - Claude API unavailable)`);
                console.log('Local fallback analysis successful');
            }

            setInlineComments(generatedComments);
            setShowInlineComments(true);
            setInlineCommentMode(mode);

        } catch (error) {
            console.error('Error generating inline comments:', error);
            toast.error('Failed to generate inline comments. Please try again.');
        } finally {
            setAiAnalyzing(false);
        }
    };

    const handleInlineCommentAction = async (commentId: string, action: 'apply' | 'dismiss' | 'like' | 'dislike') => {
        const comment = inlineComments.find(c => c.id === commentId);
        if (!comment) return;

        try {
            switch (action) {
                case 'apply':
                    // Use replacementText if available (Claude's specific replacement), otherwise use suggestion
                    const textToApply = comment.replacementText || comment.suggestion;

                    if (textToApply) {
                        // Apply the suggested text to the document
                        const beforeText = currentContent.substring(0, comment.startOffset);
                        const afterText = currentContent.substring(comment.endOffset);
                        const originalText = currentContent.substring(comment.startOffset, comment.endOffset);


                        const newContent = beforeText + textToApply + afterText;

                        setCurrentContent(newContent);
                        handleContentChange(newContent);

                        // Update comment positions after text change
                        const lengthDiff = textToApply.length - (comment.endOffset - comment.startOffset);
                        setInlineComments(prev => prev.map(c => {
                            if (c.id === commentId) {
                                return { ...c, isVisible: false }; // Hide applied comment
                            }
                            if (c.startOffset > comment.endOffset) {
                                return {
                                    ...c,
                                    startOffset: c.startOffset + lengthDiff,
                                    endOffset: c.endOffset + lengthDiff
                                };
                            }
                            return c;
                        }));

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
                    toast.info('Thanks for the feedback. We\'ll improve our suggestions. 👎');
                    break;
            }

            // Log user interaction for TrustGraph
            console.log('User interaction with inline comment:', { commentId, action, commentType: comment.type });

        } catch (error) {
            console.error('Error handling inline comment action:', error);
            toast.error('Failed to process comment action');
        }
    };

    const handleInlineCommentHover = (commentId: string | null) => {
        // Optional: Could add hover effects or preview functionality
        console.log('Hovering over comment:', commentId);
    };

    const toggleInlineComments = () => {
        if (showInlineComments) {
            setShowInlineComments(false);
            setInlineComments([]);
            toast.info('Inline comments hidden');
        } else {
            // Ensure we analyze the complete document content
            const fullContent = currentContent || uploadedDocument?.content || '';
            if (fullContent.trim().length < 50) {
                toast.error('Please write at least 50 characters to generate inline comments');
                return;
            }

            // Show loading state and analyze full document comprehensively
            const wordCount = fullContent.trim().split(/\s+/).length;
            const expectedComments = Math.max(Math.floor(wordCount / 50), 20);
            toast.info(`🧠 Performing comprehensive analysis of complete document (${wordCount} words, targeting ${expectedComments} comments)...`);
            generateInlineComments(fullContent, 'very_dense');
        }
    };

    // Live session management functions
    const initializeLiveSession = useCallback(() => {
        if (!decodedToken) return;

        const userInfo = {
            id: decodedToken.userId || decodedToken.id || 'unknown',
            name: decodedToken.username || decodedToken.name || 'User',
            role: decodedToken.role === 'teacher' ? 'teacher' : 'student'
        };

        setLiveUserId(userInfo.id);
        setLiveUserName(userInfo.name);
        setIsTeacher(userInfo.role === 'teacher');

        // Set up live session event listeners
        liveSessionService.on('session:joined', (participant: Participant) => {
            setSessionParticipants(prev => [...prev.filter(p => p.id !== participant.id), participant]);
            toast.info(`${participant.name} joined the session`);
        });

        liveSessionService.on('session:left', (participantId: string) => {
            setSessionParticipants(prev => prev.filter(p => p.id !== participantId));
        });

        liveSessionService.on('workspace:created', (workspace: Workspace) => {
            setWorkspaces(prev => [...prev, workspace]);
            toast.success(`Breakout room "${workspace.name}" created`);
        });

        liveSessionService.on('workspace:updated', (workspace: Workspace) => {
            setWorkspaces(prev => prev.map(w => w.id === workspace.id ? workspace : w));
        });

        liveSessionService.on('whiteboard:action', (action: DrawingAction) => {
            setWhiteboardActions(prev => [...prev, action]);
        });

        liveSessionService.on('error', (error) => {
            console.error('Live session error:', error);
            toast.error(error.message);
        });

    }, [decodedToken]);

    const createLiveSession = useCallback(async () => {
        if (!decodedToken || !isTeacher) {
            toast.error('Only teachers can create live sessions');
            return;
        }

        try {
            const sessionData = {
                title: `Essay Session - ${new Date().toLocaleDateString()}`,
                description: 'Collaborative essay writing session',
                maxParticipants: 30,
                settings: {
                    allowBreakoutRooms: true,
                    allowWhiteboard: true,
                    allowPrivateWorkspaces: true,
                    requireApproval: false
                }
            };

            const session = await liveSessionService.createSession(sessionData);
            setLiveSession(session);
            setIsLiveSessionActive(true);
            setWorkspaces(session.workspaces);
            toast.success('Live session created successfully!');
        } catch (error) {
            console.error('Failed to create live session:', error);
            toast.error('Failed to create live session');
        }
    }, [decodedToken, isTeacher]);

    const joinLiveSession = useCallback(async (sessionId: string) => {
        if (!decodedToken) return;

        try {
            const userInfo = {
                id: decodedToken.userId || decodedToken.id || 'unknown',
                name: decodedToken.username || decodedToken.name || 'User',
                role: (decodedToken.role === 'teacher' ? 'teacher' : 'student') as 'teacher' | 'student'
            };

            const session = await liveSessionService.joinSession(sessionId, userInfo);
            setLiveSession(session);
            setIsLiveSessionActive(true);
            setWorkspaces(session.workspaces);
            setSessionParticipants(session.participants);
            toast.success('Joined live session successfully!');
        } catch (error) {
            console.error('Failed to join live session:', error);
            toast.error('Failed to join live session');
        }
    }, [decodedToken]);

    const endLiveSession = useCallback(async () => {
        try {
            console.log('[UrgentEssaySession] Ending session:', sessionId);

            // End the database session first
            if (sessionId) {
                const response = await apiClient.post(`/api/sessions/${sessionId}/end`, {
                    deleteSession: true  // Delete the session completely
                });

                if (response.data.success) {
                    console.log('[UrgentEssaySession] ✅ Session ended and deleted:', response.data);
                    toast.success('Session ended and removed successfully');
                } else {
                    throw new Error(response.data.error || 'Failed to end session');
                }
            }

            // End the live collaboration session if it exists
            if (liveSession) {
                await liveSessionService.endSession(liveSession.id);
                setLiveSession(null);
                setIsLiveSessionActive(false);
                setWorkspaces([]);
                setSessionParticipants([]);
            }

            // Navigate back to sessions page
            setTimeout(() => {
                navigate('/sessions');
            }, 1000);

        } catch (error: any) {
            console.error('[UrgentEssaySession] ❌ Failed to end session:', error);
            toast.error(error.response?.data?.error || error.message || 'Failed to end session');
        }
    }, [liveSession, sessionId, navigate]);

    const createBreakoutRoom = useCallback(async () => {
        if (!liveSession) {
            toast.error('Please start a live session first to create breakout rooms');
            return;
        }

        try {
            const roomName = `Breakout Room ${workspaces.filter(w => w.type === 'breakout').length + 1}`;
            const workspace = await liveSessionService.createBreakoutRoom(roomName, {
                isPrivate: false,
                maxParticipants: 10
            });

            setWorkspaces(prev => [...prev, workspace]);
            toast.success(`Created ${roomName}`);
        } catch (error: any) {
            console.error('Failed to create breakout room:', error);
            toast.error(error?.message || 'Failed to create breakout room');
        }
    }, [liveSession, workspaces]);

    const switchWorkspace = useCallback(async (workspaceId: string) => {
        if (!liveSession) return;

        try {
            await liveSessionService.joinWorkspace(workspaceId);
            setCurrentWorkspaceId(workspaceId);

            const workspace = workspaces.find(w => w.id === workspaceId);
            toast.success(`Switched to ${workspace?.name || 'workspace'}`);
        } catch (error) {
            console.error('Failed to switch workspace:', error);
            toast.error('Failed to switch workspace');
        }
    }, [liveSession, workspaces]);

    const toggleMonitorWorkspace = useCallback(async (workspaceId: string, monitor: boolean) => {
        if (!isTeacher) return;

        try {
            if (monitor) {
                await liveSessionService.startMonitoring(workspaceId);
            } else {
                await liveSessionService.stopMonitoring(workspaceId);
            }
        } catch (error) {
            console.error('Failed to toggle monitoring:', error);
            toast.error('Failed to toggle monitoring');
        }
    }, [isTeacher]);

    const handleWhiteboardAction = useCallback((action: DrawingAction) => {
        if (!liveSession) return;
        liveSessionService.sendWhiteboardAction(currentWorkspaceId, action);
    }, [liveSession, currentWorkspaceId]);

    // Initialize live session on component mount
    useEffect(() => {
        initializeLiveSession();

        return () => {
            liveSessionService.disconnect();
        };
    }, [initializeLiveSession]);

    // Claude Interactive Review function - same as ModernEssayEditor
    const startClaudeInteractiveReview = async () => {
        const content = currentContent || uploadedDocument?.content || '';

        if (!content || content.trim().length < 50) {
            toast.error('Please write at least 50 characters to start interactive review');
            return;
        }

        setAiAnalyzing(true);

        try {
            console.log('🚀 Starting Claude Interactive Review...');
            toast.info('🧠 Connecting to Claude AI for interactive review...');

            // Call Claude with higher density for interactive review
            const response = await apiClient.post('/api/ai/scribe/claude-inline-analysis', {
                documentContent: content,
                config: {
                    documentType: 'college_essay',
                    analysisDepth: 'very_dense',
                    focusAreas: ['structure', 'clarity', 'style', 'engagement'],
                    userLevel: 'intermediate'
                },
                analysisType: 'inline_comments'
            });

            if (response.data.success) {
                const claudeComments = response.data.comments || [];

                // Clear existing comments first
                setInlineComments([]);

                // Convert Claude comments to inline comments with enhanced interactivity
                const interactiveComments = claudeComments.map((comment: any, index: number) => {
                    // Create enhanced interactive comment with concrete replacements
                    let enhancedSuggestion = comment.suggestion || comment.explanation || 'Consider the suggested improvement';

                    // Add concrete replacement text if available
                    if (comment.originalText && comment.replacementText && comment.originalText !== comment.replacementText) {
                        enhancedSuggestion += `\n\n🔄 Replace:\n"${comment.originalText}"\n\nWith:\n"${comment.replacementText}"`;
                    }

                    // Add alternatives if available
                    if (comment.alternatives && comment.alternatives.length > 0) {
                        enhancedSuggestion += `\n\n💡 Other options:\n${comment.alternatives.map((alt: string) => `• ${alt}`).join('\n')}`;
                    }

                    return {
                        id: comment.id || `claude_interactive_${index}`,
                        startIndex: comment.startOffset || 0,
                        endIndex: comment.endOffset || 50,
                        highlightedText: comment.highlightedText || content.substring(comment.startOffset || 0, comment.endOffset || 50),
                        type: comment.commentType || 'suggestion',
                        severity: comment.severity || 'moderate',
                        message: comment.message || 'Claude suggests reviewing this section',
                        suggestion: enhancedSuggestion,
                        explanation: comment.explanation || 'This will enhance your writing',
                        originalText: comment.originalText || '',
                        replacementText: comment.replacementText || '',
                        editType: comment.editType || 'enhance',
                        alternatives: comment.alternatives || [],
                        confidence: comment.confidence || 0.8,
                        category: comment.category || 'General Improvement',
                        requirementAlignment: comment.requirementAlignment || 'Supports overall writing quality'
                    };
                });

                // Add comments to the interface
                setInlineComments(interactiveComments);
                setShowInlineComments(true);

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
                await generateInlineComments(content, 'dense');
            } else {
                toast.error(`Interactive Review failed: ${errorMessage}`);
            }
        } finally {
            setAiAnalyzing(false);
        }
    };

    // Loading states
    if (!decodedToken || !sessionId) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-indigo-700">Loading session...</p>
                </div>
            </div>
        );
    }

    if (isLoadingDocument) {
        return (
            <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-50 to-emerald-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-emerald-700">Loading your document...</p>
                    <p className="text-sm text-emerald-600 mt-2">Session: {sessionId}</p>
                </div>
            </div>
        );
    }

    const userId = decodedToken.user?.id || decodedToken.userId || '';
    const username = decodedToken.user?.username || decodedToken.username || 'User';
    const userRole = decodedToken.user?.role || decodedToken.role || 'student';
    const roomId = `essay-${sessionId}`;

    return (
        <div className="w-full h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
            <RoomProvider
                id={roomId}
                initialPresence={{
                    userId,
                    username,
                    role: userRole,
                    cursor: null,
                }}
            >
                <PanelGroup direction="horizontal" className="relative">
                    {/* Main Editor Panel - Full width on mobile */}
                    <Panel defaultSize={showAIPanel ? 70 : 100} minSize={50} className="min-w-0">
                        <div className="h-full flex flex-col">
                            {/* Compact Header - 64px height, mobile responsive */}
                            <div className="bg-white border-b border-slate-200 shadow-sm h-16">
                                <div className="h-full flex items-center justify-between px-4 lg:px-6">
                                    {/* Left: Logo + Title */}
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Crown className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="hidden sm:block">
                                            <h1 className="text-base font-semibold text-slate-900">AI Essay Coach</h1>
                                        </div>
                                    </div>

                                    {/* Center: Live Session Badge */}
                                    {isLiveSessionActive && (
                                        <Badge className="hidden md:flex bg-gradient-to-r from-emerald-500 to-green-600 text-white animate-pulse">
                                            <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                                            Live
                                        </Badge>
                                    )}

                                    {/* Right: Actions */}
                                    <div className="flex items-center space-x-2">
                                        {/* Desktop: Inline Comments + Tools Dropdown */}
                                        <div className="hidden md:flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={toggleInlineComments}
                                                disabled={aiAnalyzing || (!currentContent || currentContent.trim().length < 50)}
                                                className={`${
                                                    showInlineComments
                                                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                                                        : 'border-slate-200 text-slate-700'
                                                } ${aiAnalyzing ? 'animate-pulse' : ''}`}
                                            >
                                                {aiAnalyzing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                        <span className="hidden lg:inline">Generating...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageCircle className="w-4 h-4 lg:mr-1" />
                                                        <span className="hidden lg:inline">
                                                            {showInlineComments ? `Comments (${inlineComments.filter(c => c.isVisible !== false).length})` : 'Comments'}
                                                        </span>
                                                    </>
                                                )}
                                            </Button>

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="outline" size="sm" className="border-slate-200">
                                                        <Zap className="w-4 h-4 lg:mr-1" />
                                                        <span className="hidden lg:inline">Tools</span>
                                                        <ChevronDown className="w-3 h-3 ml-1" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-56">
                                                    <DropdownMenuLabel>AI Tools</DropdownMenuLabel>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            if (isReviewMode) {
                                                                exitReviewMode();
                                                            } else {
                                                                setShowInteractiveFlow(true);
                                                            }
                                                        }}
                                                        disabled={aiAnalyzing || (!currentContent || currentContent.trim().length < 100)}
                                                    >
                                                        <Target className="w-4 h-4 mr-2" />
                                                        {isReviewMode ? 'Exit Review' : 'Interactive Review'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setShowEnhancedAnalysis(true)}
                                                        disabled={aiAnalyzing || (!currentContent || currentContent.trim().length < 100)}
                                                    >
                                                        <Settings className="w-4 h-4 mr-2" />
                                                        Analysis Config
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuLabel>Collaboration</DropdownMenuLabel>

                                                    {isTeacher && !isLiveSessionActive && (
                                                        <DropdownMenuItem onClick={createLiveSession}>
                                                            <Globe className="w-4 h-4 mr-2" />
                                                            Start Live Session
                                                        </DropdownMenuItem>
                                                    )}
                                                    {!isLiveSessionActive && !isTeacher && (
                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                const sessionId = prompt('Enter session ID to join:');
                                                                if (sessionId) joinLiveSession(sessionId);
                                                            }}
                                                        >
                                                            <UserPlus className="w-4 h-4 mr-2" />
                                                            Join Session
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuItem onClick={() => setShowWhiteboard(true)}>
                                                        <Pen className="w-4 h-4 mr-2" />
                                                        Whiteboard
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setShowWorkspaceManager(true)}>
                                                        <Users className="w-4 h-4 mr-2" />
                                                        Workspaces
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* AI Panel Toggle */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowAIPanel(!showAIPanel)}
                                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                        >
                                            <Sparkles className="w-4 h-4 md:mr-1" />
                                            <span className="hidden md:inline">AI</span>
                                        </Button>

                                        {/* Teacher: End Session */}
                                        {isTeacher && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={endLiveSession}
                                                className="hidden sm:flex border-red-500 text-red-600 hover:bg-red-50"
                                            >
                                                <PhoneOff className="w-4 h-4 md:mr-1" />
                                                <span className="hidden lg:inline">End</span>
                                            </Button>
                                        )}

                                        {/* Mobile: Hamburger Menu */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="outline" size="sm" className="md:hidden">
                                                    <Menu className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={toggleInlineComments}
                                                    disabled={aiAnalyzing || (!currentContent || currentContent.trim().length < 50)}
                                                >
                                                    <MessageCircle className="w-4 h-4 mr-2" />
                                                    {showInlineComments ? 'Hide Comments' : 'Inline Comments'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        if (isReviewMode) {
                                                            exitReviewMode();
                                                        } else {
                                                            setShowInteractiveFlow(true);
                                                        }
                                                    }}
                                                    disabled={aiAnalyzing || (!currentContent || currentContent.trim().length < 100)}
                                                >
                                                    <Target className="w-4 h-4 mr-2" />
                                                    {isReviewMode ? 'Exit Review' : 'Interactive Review'}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setShowEnhancedAnalysis(true)}
                                                    disabled={aiAnalyzing || (!currentContent || currentContent.trim().length < 100)}
                                                >
                                                    <Settings className="w-4 h-4 mr-2" />
                                                    Analysis Config
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuItem onClick={() => setShowWhiteboard(true)}>
                                                    <Pen className="w-4 h-4 mr-2" />
                                                    Whiteboard
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setShowWorkspaceManager(true)}>
                                                    <Users className="w-4 h-4 mr-2" />
                                                    Workspaces
                                                </DropdownMenuItem>

                                                {isTeacher && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={endLiveSession} className="text-red-600">
                                                            <PhoneOff className="w-4 h-4 mr-2" />
                                                            End Session
                                                        </DropdownMenuItem>
                                                    </>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </div>

                            {/* Essay Editor with Inline Comments - Mobile Responsive */}
                            <div className="flex-1 overflow-hidden relative">
                                {showInlineComments ? (
                                    /* Inline Comment Editor */
                                    <div className="h-full bg-white">
                                        <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
                                            <div className="max-w-4xl mx-auto">
                                                {/* Comment density controls - Mobile Responsive */}
                                                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 sm:mb-3">
                                                        <h3 className="font-semibold text-sm sm:text-base text-purple-900 flex items-center">
                                                            <Brain className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                                                            MozartStroke Inline Analysis
                                                        </h3>
                                                        <div className="flex space-x-2 flex-wrap">
                                                            {(['basic', 'dense', 'very_dense'] as const).map((mode) => (
                                                                <Button
                                                                    key={mode}
                                                                    size="sm"
                                                                    variant={inlineCommentMode === mode ? 'default' : 'outline'}
                                                                    onClick={() => {
                                                                        setInlineCommentMode(mode);
                                                                        generateInlineComments(currentContent, mode);
                                                                    }}
                                                                    disabled={aiAnalyzing}
                                                                    className="text-xs"
                                                                >
                                                                    {mode === 'basic' ? '15-25' : mode === 'dense' ? '40-60' : '80-120'} comments
                                                                </Button>
                                                            ))}

                                                            {/* Claude Interactive Review Button */}
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={startClaudeInteractiveReview}
                                                                disabled={aiAnalyzing}
                                                                className="text-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
                                                            >
                                                                {aiAnalyzing ? (
                                                                    <>
                                                                        <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full mr-1"></div>
                                                                        Analyzing...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Brain className="w-3 h-3 mr-1" />
                                                                        Interactive Review
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    <p className="text-purple-700 text-sm">
                                                        Click on highlighted text to see detailed feedback and suggestions.
                                                        <Badge variant="outline" className="ml-2">
                                                            {inlineComments.filter(c => c.isVisible !== false).length} active comments
                                                        </Badge>
                                                        {inlineComments.length > 0 && (
                                                            <Badge
                                                                variant={usingClaudeApi ? "default" : "secondary"}
                                                                className={`ml-2 ${usingClaudeApi ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}
                                                            >
                                                                {usingClaudeApi ? '🧠 Claude AI' : '⚡ Local Analysis'}
                                                            </Badge>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Document with inline comments */}
                                                <InlineCommentSystem
                                                    documentContent={currentContent}
                                                    comments={inlineComments.filter(c => c.isVisible !== false)}
                                                    onCommentAction={handleInlineCommentAction}
                                                    onCommentHover={handleInlineCommentHover}
                                                    isActive={showInlineComments}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* Regular Essay Editor */
                                    <>
                                        <ModernEssayEditor
                                            sessionId={sessionId}
                                            userId={userId}
                                            username={username}
                                            userRole={userRole as 'teacher' | 'student'}
                                            uploadedDocument={uploadedDocument}
                                            initialContent={uploadedDocument?.content || ''}
                                            sendWsMessage={sendWsMessage}
                                            students={students}
                                            handsRaised={handsRaised}
                                            onRaiseHand={handleRaiseHand}
                                            onSave={handleSave}
                                            onContentChange={handleContentChange}
                                            reviewAnnotations={isReviewMode ? reviewAnnotations : []}
                                            activeAnnotationId={activeAnnotation}
                                            onAnnotationClick={handleAnnotationClick}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    </Panel>

                    {/* AI Assistant Panel - Mobile: Overlay, Desktop: Side Panel */}
                    {showAIPanel && (
                        <>
                            {console.log('🎨 Rendering AI Panel', {
                                showAIPanel,
                                isReviewMode,
                                annotationsCount: reviewAnnotations.length,
                                progress: reviewProgress
                            })}
                            <PanelResizeHandle className="hidden md:block w-2 bg-slate-200 hover:bg-slate-300 transition-colors" />
                            <Panel defaultSize={30} minSize={25} maxSize={50} className="md:relative absolute inset-0 md:inset-auto z-50 md:z-auto">
                                <div className="h-full bg-white md:border-l border-slate-200 flex flex-col shadow-2xl md:shadow-none">
                                    {/* Mozart stroke Panel Header - Mobile Responsive */}
                                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-3 sm:p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                                    <Brain className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">MozartStroke AI Review</h3>
                                                    <p className="text-purple-100 text-sm">
                                                        {isReviewMode ? `Active Review (${reviewAnnotations.length} comments)` : 'AI Writing Mentor'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowAIPanel(false)}
                                                className="text-white hover:bg-white/20"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        {isReviewMode && reviewProgress.total > 0 && (
                                            <div className="flex items-center gap-2 mt-3">
                                                <div className="flex-1 bg-purple-800/30 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${(reviewProgress.current / Math.max(reviewProgress.total, 1)) * 100}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-purple-200">
                                                    {reviewProgress.current}/{reviewProgress.total}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Enhanced Analysis Panel Content */}
                                    <div className="flex-1 overflow-hidden">
                                        {isReviewMode && reviewAnnotations.length > 0 ? (
                                            /* Show annotation panel when in review mode with comments */
                                            <>
                                            {console.log('📋 Rendering EnhancedAnnotationPanel with', reviewAnnotations.length, 'comments')}
                                            <EnhancedAnnotationPanel
                                                annotations={reviewAnnotations}
                                                activeAnnotationId={activeAnnotation}
                                                onAnnotationClick={handleAnnotationClick}
                                                onAcceptSuggestion={(id) => handleAnnotationAction(id, 'apply')}
                                                onRejectSuggestion={(id) => handleAnnotationAction(id, 'dismiss')}
                                                onNextAnnotation={() => {
                                                    const currentIndex = reviewAnnotations.findIndex(a => a.id === activeAnnotation);
                                                    if (currentIndex < reviewAnnotations.length - 1) {
                                                        const nextAnnotation = reviewAnnotations[currentIndex + 1];
                                                        setActiveAnnotation(nextAnnotation.id);
                                                        setReviewProgress(prev => ({ ...prev, current: currentIndex + 2 }));
                                                    }
                                                }}
                                                onPrevAnnotation={() => {
                                                    const currentIndex = reviewAnnotations.findIndex(a => a.id === activeAnnotation);
                                                    if (currentIndex > 0) {
                                                        const prevAnnotation = reviewAnnotations[currentIndex - 1];
                                                        setActiveAnnotation(prevAnnotation.id);
                                                        setReviewProgress(prev => ({ ...prev, current: currentIndex }));
                                                    }
                                                }}
                                                reviewProgress={reviewProgress}
                                            />
                                            </>
                                        ) : showEnhancedAnalysis && !isReviewMode ? (
                                            <div className="h-full p-4">
                                                <EnhancedAnalysisConfigPanel
                                                    onConfigChange={setEnhancedAnalysisConfig}
                                                    onStartAnalysis={startEnhancedAnalysis}
                                                    isAnalyzing={aiAnalyzing}
                                                    documentLength={currentContent?.length || 0}
                                                />
                                            </div>
                                        ) : (
                                            <EnhancedEssayEditingPanel
                                                isReviewMode={isReviewMode}
                                                isAnalyzing={aiAnalyzing}
                                                reviewProgress={reviewProgress}
                                                reviewAnnotations={reviewAnnotations}
                                                activeAnnotation={activeAnnotation}
                                                currentContent={currentContent || uploadedDocument?.content || ''}
                                                onStartReview={activateMozartStrokeReview}
                                                onExitReview={exitReviewMode}
                                                onContentChange={(newContent) => {
                                                    setCurrentContent(newContent);
                                                    if (uploadedDocument) {
                                                        setUploadedDocument({
                                                            ...uploadedDocument,
                                                            content: newContent
                                                        });
                                                    }
                                                }}
                                                onSendPrompt={async (prompt, context) => {
                                                    console.log('📤 Sending prompt to AI:', { prompt, context });
                                                }}
                                                onAICommentsReceived={(comments, promptContext) => {
                                                    console.log(`📋 Received ${comments.length} AI comments for prompt: ${promptContext}`);
                                                    // Add these comments to the review annotations
                                                    const newAnnotations = comments.map((comment: any) => ({
                                                        id: comment.id || `ai-${Date.now()}-${Math.random()}`,
                                                        type: 'ai_suggestion',
                                                        text: comment.highlightedText,
                                                        comment: comment.message,
                                                        suggestion: comment.suggestion,
                                                        explanation: comment.explanation,
                                                        replacementText: comment.replacementText,
                                                        position: {
                                                            from: comment.startOffset,
                                                            to: comment.endOffset
                                                        },
                                                        category: comment.category,
                                                        severity: comment.severity,
                                                        promptContext: promptContext
                                                    }));
                                                    setReviewAnnotations((prev: any[]) => [...newAnnotations, ...prev]);
                                                    toast.success(`Added ${comments.length} inline comments based on: "${promptContext.substring(0, 50)}..."`);
                                                }}
                                            />
                                        )}
                                    </div>

                                    {/* Legacy Analysis Panel (keeping for document analysis) */}
                                    {false && (
                                        <ScrollArea className="h-full p-4">
                                                <div className="space-y-4">
                                                    {documentAnalysis ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-semibold text-slate-900">Document Analysis</h4>
                                                                <Badge className="bg-green-100 text-green-800">
                                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                                    Complete
                                                                </Badge>
                                                            </div>

                                                            {/* Overall Score */}
                                                            <Card>
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-sm font-medium text-slate-700">Overall Score</span>
                                                                        <span className="text-2xl font-bold text-indigo-600">{documentAnalysis.overallScore}%</span>
                                                                    </div>
                                                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                                                        <div
                                                                            className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                                                            style={{ width: `${documentAnalysis.overallScore}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* Key Metrics */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <Card>
                                                                    <CardContent className="p-3">
                                                                        <div className="text-center">
                                                                            <FileText className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                                                                            <p className="text-lg font-semibold text-slate-900">{documentAnalysis.wordCount}</p>
                                                                            <p className="text-xs text-slate-500">Words</p>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                                <Card>
                                                                    <CardContent className="p-3">
                                                                        <div className="text-center">
                                                                            <GraduationCap className="w-6 h-6 text-green-500 mx-auto mb-1" />
                                                                            <p className="text-sm font-semibold text-slate-900">{documentAnalysis.readabilityGrade}</p>
                                                                            <p className="text-xs text-slate-500">Reading Level</p>
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            </div>

                                                            {/* Sentiment & Topics */}
                                                            <Card>
                                                                <CardContent className="p-4">
                                                                    <h5 className="font-medium text-slate-900 mb-3">Content Analysis</h5>
                                                                    <div className="space-y-3">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-slate-600">Tone</span>
                                                                            <Badge variant="outline">{documentAnalysis.sentiment}</Badge>
                                                                        </div>
                                                                        <div>
                                                                            <span className="text-sm text-slate-600 block mb-2">Main Topics</span>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {documentAnalysis.mainTopics.map((topic: string, index: number) => (
                                                                                    <Badge key={index} variant="secondary" className="text-xs">
                                                                                        {topic}
                                                                                    </Badge>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* Feedback Summary */}
                                                            {feedbackCards.length > 0 && (
                                                                <Card>
                                                                    <CardContent className="p-4">
                                                                        <h5 className="font-medium text-slate-900 mb-3">Improvement Areas</h5>
                                                                        <div className="space-y-2">
                                                                            {feedbackCards.slice(0, 3).map((feedback) => (
                                                                                <div key={feedback.id} className="flex items-center justify-between">
                                                                                    <span className="text-sm text-slate-600">{feedback.title}</span>
                                                                                    <Badge
                                                                                        variant={feedback.priority === 'high' ? 'destructive' : 'secondary'}
                                                                                        className="text-xs"
                                                                                    >
                                                                                        {feedback.priority}
                                                                                    </Badge>
                                                                                </div>
                                                                            ))}
                                                                            {feedbackCards.length > 3 && (
                                                                                <p className="text-xs text-slate-500 text-center pt-2">
                                                                                    +{feedbackCards.length - 3} more suggestions in Feedback panel
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </CardContent>
                                                                </Card>
                                                            )}

                                                            {/* Re-analyze Button */}
                                                            <div className="text-center">
                                                                <Button
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        const content = currentContent || uploadedDocument?.content || '';
                                                                        if (content.trim().length > 0) {
                                                                            analyzeDocument(content);
                                                                        } else {
                                                                            toast.error('No content to analyze.');
                                                                        }
                                                                    }}
                                                                    disabled={aiAnalyzing}
                                                                    className="text-xs"
                                                                >
                                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                                    Re-analyze
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8">
                                                            <Beaker className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                            <p className="text-slate-500">No analysis available</p>
                                                            <Button
                                                                onClick={() => {
                                                                    const content = currentContent || uploadedDocument?.content || '';
                                                                    if (content.trim().length > 0) {
                                                                        analyzeDocument(content);
                                                                    } else {
                                                                        toast.error('No content to analyze. Please upload a document or start writing.');
                                                                    }
                                                                }}
                                                                disabled={aiAnalyzing}
                                                                className="mt-3"
                                                            >
                                                                {aiAnalyzing ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                        Analyzing...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Microscope className="w-4 h-4 mr-2" />
                                                                        Analyze Document
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        )}

                                        {/* Legacy Insights Panel (keeping for insights) */}
                                        {false && (
                                            <ScrollArea className="h-full p-4">
                                                <div className="space-y-4">
                                                    {(documentAnalysis || currentContent.length > 100) ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-semibold text-slate-900">Writing Insights</h4>
                                                                <Badge className="bg-purple-100 text-purple-800">
                                                                    <Brain className="w-3 h-3 mr-1" />
                                                                    AI Powered
                                                                </Badge>
                                                            </div>

                                                            {/* Writing Style Analysis */}
                                                            <Card>
                                                                <CardHeader className="pb-3">
                                                                    <CardTitle className="text-sm flex items-center">
                                                                        <Edit3 className="w-4 h-4 mr-2 text-blue-500" />
                                                                        Writing Style
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-slate-600">Sentence Length</span>
                                                                        <div className="flex items-center space-x-1">
                                                                            <div className="w-16 bg-slate-200 rounded-full h-2">
                                                                                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                                                                            </div>
                                                                            <span className="text-xs text-slate-500">Moderate</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-slate-600">Vocabulary Complexity</span>
                                                                        <div className="flex items-center space-x-1">
                                                                            <div className="w-16 bg-slate-200 rounded-full h-2">
                                                                                <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }}></div>
                                                                            </div>
                                                                            <span className="text-xs text-slate-500">Advanced</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-slate-600">Readability</span>
                                                                        <div className="flex items-center space-x-1">
                                                                            <div className="w-16 bg-slate-200 rounded-full h-2">
                                                                                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                                                                            </div>
                                                                            <span className="text-xs text-slate-500">Good</span>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* Content Structure */}
                                                            <Card>
                                                                <CardHeader className="pb-3">
                                                                    <CardTitle className="text-sm flex items-center">
                                                                        <Layers className="w-4 h-4 mr-2 text-green-500" />
                                                                        Content Structure
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent className="space-y-3">
                                                                    <div className="grid grid-cols-3 gap-2 text-center">
                                                                        <div className="bg-slate-50 p-2 rounded">
                                                                            <p className="text-lg font-semibold text-slate-900">{Math.ceil((currentContent.split(' ').length) / 100)}</p>
                                                                            <p className="text-xs text-slate-500">Paragraphs</p>
                                                                        </div>
                                                                        <div className="bg-slate-50 p-2 rounded">
                                                                            <p className="text-lg font-semibold text-slate-900">{currentContent.split('.').length - 1}</p>
                                                                            <p className="text-xs text-slate-500">Sentences</p>
                                                                        </div>
                                                                        <div className="bg-slate-50 p-2 rounded">
                                                                            <p className="text-lg font-semibold text-slate-900">{Math.ceil(currentContent.split(' ').length / 200)}</p>
                                                                            <p className="text-xs text-slate-500">Min Read</p>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* Writing Strengths */}
                                                            <Card>
                                                                <CardHeader className="pb-3">
                                                                    <CardTitle className="text-sm flex items-center">
                                                                        <Award className="w-4 h-4 mr-2 text-amber-500" />
                                                                        Strengths Identified
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center space-x-2">
                                                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                                                            <span className="text-sm text-slate-700">Clear thesis statement</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                                                            <span className="text-sm text-slate-700">Good use of transitions</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                                                            <span className="text-sm text-slate-700">Appropriate academic tone</span>
                                                                        </div>
                                                                        {currentContent.length > 500 && (
                                                                            <div className="flex items-center space-x-2">
                                                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                                                <span className="text-sm text-slate-700">Substantial content development</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* Improvement Suggestions */}
                                                            <Card>
                                                                <CardHeader className="pb-3">
                                                                    <CardTitle className="text-sm flex items-center">
                                                                        <Target className="w-4 h-4 mr-2 text-purple-500" />
                                                                        Growth Areas
                                                                    </CardTitle>
                                                                </CardHeader>
                                                                <CardContent>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center space-x-2">
                                                                            <Clock className="w-3 h-3 text-orange-500" />
                                                                            <span className="text-sm text-slate-700">Consider varying sentence length</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Clock className="w-3 h-3 text-orange-500" />
                                                                            <span className="text-sm text-slate-700">Add more specific examples</span>
                                                                        </div>
                                                                        <div className="flex items-center space-x-2">
                                                                            <Clock className="w-3 h-3 text-orange-500" />
                                                                            <span className="text-sm text-slate-700">Strengthen conclusion impact</span>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            {/* AI Writing Coach Tips */}
                                                            <Card className="border-indigo-200 bg-indigo-50">
                                                                <CardContent className="p-4">
                                                                    <div className="flex items-start space-x-2">
                                                                        <Crown className="w-4 h-4 text-indigo-600 mt-0.5" />
                                                                        <div>
                                                                            <h6 className="text-sm font-medium text-indigo-900">AI Coach Tip</h6>
                                                                            <p className="text-xs text-indigo-700 mt-1">
                                                                                Your writing shows strong analytical thinking. Try incorporating more transitional phrases to create even smoother flow between your ideas.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8">
                                                            <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                            <p className="text-slate-500">Start writing to see insights</p>
                                                            <p className="text-sm text-slate-400">AI will analyze your writing patterns and provide personalized feedback</p>
                                                        </div>
                                                    )}
                                                </div>
                                        </ScrollArea>
                                    )}
                                </div>
                            </Panel>
                        </>
                    )}
                </PanelGroup>

                {/* Quick Mozart stroke Review Button (if panel is hidden) */}
                {!showAIPanel && reviewAnnotations.length > 0 && (
                    <Button
                        onClick={() => setShowAIPanel(true)}
                        className="fixed bottom-4 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white shadow-2xl animate-pulse"
                        size="lg"
                    >
                        <Brain className="w-5 h-5 mr-2" />
                        View {reviewAnnotations.length} AI Comments
                    </Button>
                )}
                {!showAIPanel && reviewAnnotations.length === 0 && (
                    <div className="fixed bottom-4 right-4 z-40">
                        <Button
                            onClick={() => {
                                if (isReviewMode) {
                                    exitReviewMode();
                                } else {
                                    setShowInteractiveFlow(true);
                                }
                            }}
                            disabled={aiAnalyzing || (!currentContent || currentContent.trim().length < 100)}
                            className={`${
                                isReviewMode
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                            } ${aiAnalyzing ? 'animate-pulse' : ''} shadow-lg`}
                            size="lg"
                        >
                            {aiAnalyzing ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : isReviewMode ? (
                                <>
                                    <X className="h-5 w-5 mr-2" />
                                    Exit Review ({reviewProgress.current}/{reviewProgress.total})
                                </>
                            ) : (
                                <>
                                    <MessageCircle className="h-5 w-5 mr-2" />
                                    Interactive Analysis
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* Enhanced Analysis Configuration Dialog */}
                <Dialog open={showEnhancedAnalysis && !isReviewMode} onOpenChange={(open) => setShowEnhancedAnalysis(open)}>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-purple-800">
                                <Brain className="w-5 h-5" />
                                Enhanced MozartStroke Analysis Configuration
                            </DialogTitle>
                        </DialogHeader>
                        <div className="mt-4">
                            <EnhancedAnalysisConfigPanel
                                onConfigChange={setEnhancedAnalysisConfig}
                                onStartAnalysis={() => {
                                    setShowEnhancedAnalysis(false);
                                    startEnhancedAnalysis();
                                }}
                                isAnalyzing={aiAnalyzing}
                                documentLength={currentContent?.length || 0}
                            />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Session Document Save Buttons */}
                <div className="fixed bottom-4 left-4 z-40 space-y-2">
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={() => saveSessionDocument('draft')}
                            disabled={!currentContent || currentContent.trim().length === 0}
                            className="bg-yellow-600 hover:bg-yellow-700 shadow-lg"
                            size="sm"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Save Draft
                        </Button>
                        <Button
                            onClick={() => saveSessionDocument('final')}
                            disabled={!currentContent || currentContent.trim().length === 0}
                            className="bg-green-600 hover:bg-green-700 shadow-lg"
                            size="sm"
                        >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Save Final
                        </Button>
                        <Button
                            onClick={() => {
                                const blob = new Blob([currentContent], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${uploadedDocument?.name || 'essay'}.txt`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }}
                            disabled={!currentContent || currentContent.trim().length === 0}
                            variant="outline"
                            className="shadow-lg bg-white/90 backdrop-blur-sm"
                            size="sm"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </div>

                {/* Interactive Analysis Flow */}
                <InteractiveAnalysisFlow
                    documentContent={currentContent || ''}
                    sessionId={sessionId || ''}
                    onComplete={handleInteractiveAnalysisComplete}
                    onCancel={handleInteractiveAnalysisCancel}
                    isVisible={showInteractiveFlow}
                />

                {/* Live Session Status Indicator */}
                {isLiveSessionActive && (
                    <div className="fixed top-4 right-4 z-50">
                        <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    <div>
                                        <p className="text-sm font-medium text-green-800">Live Session Active</p>
                                        <p className="text-xs text-green-600">
                                            {sessionParticipants.length} participant{sessionParticipants.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                    {isTeacher && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setShowWorkspaceManager(true)}
                                            className="text-green-700 hover:bg-green-100"
                                        >
                                            <Monitor className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Collaborative Whiteboard */}
                <CollaborativeWhiteboard
                    sessionId={liveSession?.id || sessionId || 'demo'}
                    userId={userId}
                    userName={username}
                    userRole={isTeacher ? 'teacher' : 'student'}
                    isVisible={showWhiteboard}
                    onClose={() => setShowWhiteboard(false)}
                    onToggleBreakout={() => {
                        // Switch between main and breakout workspace
                        const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
                        if (currentWorkspace?.type === 'main') {
                            const breakoutRoom = workspaces.find(w => w.type === 'breakout');
                            if (breakoutRoom) {
                                switchWorkspace(breakoutRoom.id);
                            } else {
                                createBreakoutRoom();
                            }
                        } else {
                            const mainWorkspace = workspaces.find(w => w.type === 'main');
                            if (mainWorkspace) {
                                switchWorkspace(mainWorkspace.id);
                            }
                        }
                    }}
                    isInBreakout={workspaces.find(w => w.id === currentWorkspaceId)?.type === 'breakout'}
                    workspaceId={currentWorkspaceId}
                    onWorkspaceSwitch={switchWorkspace}
                    availableWorkspaces={workspaces.map(w => ({
                        id: w.id,
                        name: w.name,
                        userId: w.ownerId,
                        active: w.id === currentWorkspaceId
                    }))}
                    onSendAction={handleWhiteboardAction}
                />

                {/* Workspace Manager */}
                <WorkspaceManager
                    sessionId={liveSession?.id || sessionId || 'demo'}
                    currentUserId={userId}
                    currentUserName={username}
                    currentUserRole={isTeacher ? 'teacher' : 'student'}
                    currentWorkspaceId={currentWorkspaceId}
                    workspaces={workspaces}
                    isVisible={showWorkspaceManager}
                    onClose={() => setShowWorkspaceManager(false)}
                    onWorkspaceSwitch={switchWorkspace}
                    onCreateBreakoutRoom={createBreakoutRoom}
                    onJoinWorkspace={switchWorkspace}
                    onLeaveWorkspace={(workspaceId) => {
                        if (workspaces.find(w => w.type === 'main')) {
                            const mainWorkspace = workspaces.find(w => w.type === 'main');
                            if (mainWorkspace) {
                                switchWorkspace(mainWorkspace.id);
                            }
                        }
                    }}
                    onMonitorWorkspace={toggleMonitorWorkspace}
                    onInviteToWorkspace={(workspaceId, userId) => {
                        // Implementation for inviting users
                        toast.info('Invite functionality not yet implemented');
                    }}
                    onUpdatePermissions={(workspaceId, userId, permissions) => {
                        // Implementation for updating permissions
                        console.log('Update permissions:', { workspaceId, userId, permissions });
                    }}
                    onSendMessage={(workspaceId, message) => {
                        liveSessionService.sendMessage(workspaceId, message);
                    }}
                    onToggleWhiteboard={(workspaceId) => {
                        setShowWhiteboard(true);
                        if (workspaceId !== currentWorkspaceId) {
                            switchWorkspace(workspaceId);
                        }
                    }}
                    onToggleVideo={(workspaceId) => {
                        toast.info('Video functionality not yet implemented');
                    }}
                    onToggleAudio={(workspaceId) => {
                        toast.info('Audio functionality not yet implemented');
                    }}
                />
            </RoomProvider>
        </div>
    );
};

export default UrgentEssaySessionPage;