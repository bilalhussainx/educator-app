// src/pages/ScribeSessionPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useUser } from '@/hooks/useUser';
import apiClient from '@/services/apiClient';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ChevronLeft, User, Bot, MessageSquare, Sparkles, Send, FileEdit, Lightbulb, BookOpen, CheckCircle, File, Users, Eye, RadioTower, Target, Zap, MessageCircle, HelpCircle, Download, Save, Brain, Palette, Settings, Edit3, FileText, Wand2, X } from 'lucide-react';
import { toast } from 'sonner';

// Simple WebSocket-based collaboration
interface CollaborationUser {
    id: string;
    name: string;
    color: string;
    cursor?: number;
    isOnline: boolean;
}


interface AIMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'suggestion' | 'feedback' | 'question' | 'analysis' | 'proactive' | 'ideation' | 'counselor' | 'comprehensive-review';
    section?: 'intro' | 'body' | 'conclusion' | 'overall' | 'selection' | 'brainstorm' | 'full-document';
    selectedText?: string;
    isIdeationPhase?: boolean;
    requiresDocumentEdit?: boolean;
    suggestedEdit?: {
        action: 'insert' | 'replace' | 'delete';
        position?: number;
        content?: string;
        originalText?: string;
        reason?: string;
    };
}

const CollaborativeEditor = ({ 
    documentId, 
    username, 
    color, 
    aiSessionId,
    sessionId,
    initialContent,
    onContentChange,
    onCollaboratorsChange,
    onSelectionChange,
    onContentUpdate,
    onEditorReady
}: { 
    documentId: string; 
    username: string; 
    color: string;
    aiSessionId?: string;
    sessionId?: string;
    initialContent?: string;
    onContentChange?: (content: string) => void;
    onCollaboratorsChange?: (collaborators: CollaborationUser[]) => void;
    onSelectionChange?: (text: string, range: { from: number; to: number } | null) => void;
    onContentUpdate?: (content: string) => void;
    onEditorReady?: (editor: any) => void;
}) => {
    const [collaborators, setCollaborators] = useState<CollaborationUser[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const editorRef = useRef<any>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content: initialContent || '<p>Welcome to the AI-assisted essay editor! Start writing your essay here...</p><p>Your AI writing mentor will provide real-time suggestions and feedback to help improve your writing.</p>',
        editorProps: { 
            attributes: { 
                class: 'prose prose-invert max-w-4xl mx-auto p-6 focus:outline-none h-full min-h-[400px] text-slate-200' 
            } 
        },
        onUpdate: ({ editor }) => {
            const content = editor.getHTML();
            onContentChange?.(content);
            
            // Send content changes to other collaborators
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'content-change',
                    content,
                    userId: username,
                    timestamp: Date.now()
                }));
            }
        },
        onSelectionUpdate: ({ editor }) => {
            // Send cursor position to other collaborators
            const { from, to } = editor.state.selection;
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'cursor-change',
                    position: from,
                    userId: username,
                    timestamp: Date.now()
                }));
            }
            
            // Handle text selection for AI assistance
            if (from !== to) {
                const selectedText = editor.state.doc.textBetween(from, to);
                if (selectedText.trim().length > 0 && onSelectionChange) {
                    onSelectionChange(selectedText, { from, to });
                }
            } else if (onSelectionChange) {
                onSelectionChange('', null);
            }
        },
    });

    editorRef.current = editor;

    // WebSocket connection for real-time collaboration
    useEffect(() => {
        if (!sessionId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/collaboration/${sessionId}`;
        
        // For development, use a mock WebSocket implementation
        if (process.env.NODE_ENV === 'development') {
            // Mock WebSocket for development
            console.log('Using mock collaboration for development');
            setIsConnected(true);
            
            // Simulate some collaborators
            const mockCollaborators: CollaborationUser[] = [
                {
                    id: 'ai-mentor',
                    name: 'AI Writing Assistant',
                    color: '#00bcd4',
                    isOnline: true
                }
            ];
            setCollaborators(mockCollaborators);
            onCollaboratorsChange?.(mockCollaborators);
            return;
        }

        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Connected to collaboration session');
                setIsConnected(true);
                
                // Join collaboration session
                ws.send(JSON.stringify({
                    type: 'join',
                    userId: username,
                    color: color,
                    documentId: documentId
                }));
            };
    

            ws.onmessage = (event) => {
                const message = JSON.parse(event.data);
                
                switch (message.type) {
                    case 'collaborators-update':
                        setCollaborators(message.collaborators);
                        onCollaboratorsChange?.(message.collaborators);
                        break;
                        
                    case 'content-change':
                        if (message.userId !== username && editor) {
                            // Apply changes from other users
                            editor.commands.setContent(message.content, false);
                        }
                        break;
                        
                    case 'cursor-change':
                        // Show other users' cursors (simplified implementation)
                        console.log(`User ${message.userId} cursor at position ${message.position}`);
                        break;
                        
                    case 'user-joined':
                        toast.success(`${message.userName} joined the collaboration`);
                        break;
                        
                    case 'user-left':
                        toast.info(`${message.userName} left the collaboration`);
                        break;
                }
            };
    

            ws.onclose = () => {
                console.log('Disconnected from collaboration session');
                setIsConnected(false);
            };
    

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setIsConnected(false);
            };
    

        } catch (error) {
            console.error('Failed to connect to collaboration session:', error);
        }

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    
    }, [sessionId, username, documentId, color, editor]);

    // Update editor content when initialContent changes
    React.useEffect(() => {
        if (editor && initialContent) {
            editor.commands.setContent(initialContent);
        }
    }, [editor, initialContent]);

    // Monitor content changes for continuous analysis
    React.useEffect(() => {
        if (editor) {
            const handleUpdate = () => {
                const content = editor.getHTML();
                onContentUpdate?.(content);
            };

            editor.on('update', handleUpdate);
            
            // Notify parent that editor is ready
            onEditorReady?.(editor);
            
            return () => editor.off('update', handleUpdate);
        }
    }, [editor, onContentUpdate, onEditorReady]);

    return (
        <div className="flex-grow overflow-y-auto bg-slate-800/50 rounded-lg border border-slate-700">
            {/* Collaboration status */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800/30">
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        isConnected ? "bg-green-400" : "bg-red-400"
                    )} />
                    <span className="text-sm text-slate-300">
                        {isConnected ? 'Connected' : 'Offline'}
                    </span>
                </div>
                
                {collaborators.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-400">{collaborators.length + 1} collaborators</span>
                        <div className="flex -space-x-2">
                            {collaborators.slice(0, 3).map((collab) => (
                                <Avatar key={collab.id} className="h-6 w-6 border-2 border-slate-700">
                                    <AvatarFallback 
                                        className="text-xs text-white"
                                        style={{ backgroundColor: collab.color }}
                                    >
                                        {collab.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {collaborators.length > 3 && (
                                <Avatar className="h-6 w-6 border-2 border-slate-700">
                                    <AvatarFallback className="text-xs bg-slate-600 text-slate-300">
                                        +{collaborators.length - 3}
                                    </AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="relative">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
};

const ScribeSessionPage: React.FC = () => {
    const { documentId, sessionId: routeSessionId } = useParams<{ documentId?: string; sessionId?: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user, isLoading: isUserLoading } = useUser();
    const userColor = React.useMemo(() => `#${Math.floor(Math.random()*16777215).toString(16)}`, []);
    
    // AI assistance state - ALL hooks must be declared here unconditionally
    const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
    const [aiSessionId, setAiSessionId] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [editorInstance, setEditorInstance] = useState<any>(null);
    const [userInput, setUserInput] = useState('');
    const [currentContent, setCurrentContent] = useState('');
    const [aiMentor, setAiMentor] = useState<any>(null);
    const [uploadedDocument, setUploadedDocument] = useState<any>(null);
    const [, setIsLoadingDocument] = useState(false);
    const [collaborators, setCollaborators] = useState<CollaborationUser[]>([]);
    const [selectedText, setSelectedText] = useState('');
    const [selectionRange, setSelectionRange] = useState<{ from: number; to: number } | null>(null);
    const [showSelectionMenu, setShowSelectionMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
    const [analysisTimer, setAnalysisTimer] = useState<NodeJS.Timeout | null>(null);
    const [isIdeationMode, setIsIdeationMode] = useState(false);
    const [ideationStep, setIdeationStep] = useState(0);
    const [userResponses, setUserResponses] = useState<string[]>([]);
    const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
    const [textComments, setTextComments] = useState<{
        id: string;
        text: string;
        comment: string;
        position: { x: number; y: number };
        range: { from: number; to: number };
        timestamp: Date;
        type: 'suggestion' | 'feedback' | 'question';
    }[]>([]);
    const [showCommentBubble, setShowCommentBubble] = useState<string | null>(null);
    
    // Writing type categorization
    const [writingType, setWritingType] = useState<string>('auto-detect');
    const [customWritingGoals, setCustomWritingGoals] = useState<string>('');
    
    // Writing type definitions for AI contextual suggestions
    const writingTypes = {
        'auto-detect': {
            name: 'Auto-Detect',
            description: 'Let AI automatically determine your writing type',
            guidance: 'The AI will analyze your content and provide contextual suggestions.'
        },
        'academic-essay': {
            name: 'Academic Essay',
            description: 'Research papers, argumentative essays, analytical writing',
            guidance: 'Focus on thesis statements, evidence, citations, and logical structure.'
        },
        'narrative-essay': {
            name: 'Narrative Essay/Magazine Article',
            description: 'Personal stories, narrative journalism, feature articles',
            guidance: 'Emphasize storytelling, vivid descriptions, character development, and engaging narrative flow.'
        },
        'college-app-essay': {
            name: 'College Application Essay',
            description: 'Personal statements, supplemental essays',
            guidance: 'Show personality, experiences, growth, and fit with the institution.'
        },
        'why-college-essay': {
            name: 'Why College Essay',
            description: 'Why this school, why this major essays',
            guidance: 'Demonstrate specific knowledge about the institution and clear academic/career goals.'
        },
        'short-story': {
            name: 'Short Story (Under 5K words)',
            description: 'Fiction narratives, creative writing pieces',
            guidance: 'Focus on character development, plot structure, dialogue, and literary devices.'
        },
        'long-story': {
            name: 'Long Story/Novella (5K+ words)',
            description: 'Extended fiction, complex narratives',
            guidance: 'Manage pacing, multiple plot threads, character arcs, and sustained narrative tension.'
        },
        'memoir': {
            name: 'Memoir',
            description: 'Personal life experiences, reflective writing',
            guidance: 'Balance personal reflection with universal themes and engaging storytelling.'
        },
        'autobiography': {
            name: 'Autobiography',
            description: 'Comprehensive life story, biographical writing',
            guidance: 'Organize chronologically, highlight significant events, and maintain objective perspective.'
        },
        'creative-writing': {
            name: 'Creative Writing',
            description: 'Poetry, experimental forms, artistic expression',
            guidance: 'Explore literary techniques, voice, style, and innovative approaches.'
        }
    };
    const [isDraftSaved, setIsDraftSaved] = useState(false);
    const [showRequirements, setShowRequirements] = useState(false);
    const [showContextModal, setShowContextModal] = useState(false);
    const [showVersionHistory, setShowVersionHistory] = useState(false);
    const [requirements, setRequirements] = useState({
        writingCategory: '', // New field for detailed categorization
        subCategory: '', // Sub-category for more specific targeting
        wordCount: '',
        audience: '',
        purpose: '',
        tone: '',
        specificPrompt: ''
    });
    const [context, setContext] = useState({
        pastWritings: '',
        preferredStyle: '',
        writerReference: '',
        additionalContext: ''
    });
    const [pendingEdits, setPendingEdits] = useState<AIMessage[]>([]);
    const [showEditApproval, setShowEditApproval] = useState(false);

    // Educational Data Learning State - Patterns from Teacher-Student Interactions
    const [educationalKnowledge] = useState({
        commonIssues: {
            // Patterns learned from teacher feedback data
            weakOpenings: { pattern: /^(In this essay|This essay|There are|It is)/, severity: 0.8, suggestions: ['Start with a hook', 'Begin with a strong statement', 'Use an anecdote'] },
            passiveVoice: { pattern: /(was|were|been)\s+\w+ed/, severity: 0.6, suggestions: ['Use active voice', 'Make subject do the action'] },
            vagueWords: { words: ['very', 'really', 'quite', 'somewhat', 'things', 'stuff'], severity: 0.7, suggestions: ['Use specific descriptors', 'Replace with concrete terms'] },
            repetitiveStructure: { severity: 0.5, suggestions: ['Vary sentence length', 'Use different sentence starters'] },
            weakConclusions: { pattern: /^(In conclusion|To conclude|In summary)/, severity: 0.6, suggestions: ['End with impact', 'Call to action', 'Thought-provoking question'] }
        },
        gradePatterns: {
            // Common grade improvement patterns from educational data
            'A-level': { wordChoice: 0.9, structure: 0.85, voice: 0.8, evidence: 0.9 },
            'B-level': { wordChoice: 0.75, structure: 0.7, voice: 0.65, evidence: 0.7 },
            'C-level': { wordChoice: 0.6, structure: 0.55, voice: 0.5, evidence: 0.55 },
            improvement_paths: {
                'C_to_B': ['strengthen_thesis', 'add_evidence', 'improve_transitions'],
                'B_to_A': ['refine_word_choice', 'enhance_voice', 'deeper_analysis']
            }
        },
        contextualPatterns: {
            // Context-specific patterns (essay vs story vs research paper)
            essay: {
                critical_elements: ['thesis', 'evidence', 'analysis', 'conclusion'],
                common_weaknesses: ['weak_thesis', 'insufficient_evidence', 'poor_transitions'],
                improvement_priority: ['thesis_strength', 'evidence_quality', 'argument_flow']
            },
            story: {
                critical_elements: ['character', 'plot', 'setting', 'dialogue'],
                common_weaknesses: ['flat_characters', 'weak_dialogue', 'unclear_setting'],
                improvement_priority: ['character_development', 'show_dont_tell', 'pacing']
            },
            research: {
                critical_elements: ['sources', 'citations', 'methodology', 'analysis'],
                common_weaknesses: ['poor_sources', 'weak_analysis', 'citation_errors'],
                improvement_priority: ['source_quality', 'analytical_depth', 'proper_citations']
            },
            college_application: {
                critical_elements: ['authenticity', 'personal_growth', 'specific_examples', 'unique_voice'],
                common_weaknesses: ['generic_statements', 'lack_of_specificity', 'no_personal_growth', 'cliche_topics'],
                improvement_priority: ['authentic_voice', 'specific_examples', 'personal_reflection']
            }
        },
        admissionsCounselorAdvice: {
            // Patterns from real admissions counselor feedback
            essayTypes: {
                personal_statement: {
                    key_elements: ['unique_perspective', 'personal_growth', 'specific_anecdotes', 'future_goals'],
                    red_flags: ['generic_volunteer_story', 'sports_injury_comeback', 'mission_trip_revelation'],
                    winning_patterns: ['vulnerability', 'intellectual_curiosity', 'impact_on_others'],
                    word_limits: { common: 650, max: 1000 },
                    tone_requirements: 'authentic, reflective, forward-looking'
                },
                supplemental: {
                    key_elements: ['school_specific_research', 'concrete_plans', 'genuine_interest'],
                    red_flags: ['generic_praise', 'copy_paste_answers', 'surface_level_research'],
                    winning_patterns: ['specific_programs', 'professor_research', 'unique_opportunities'],
                    word_limits: { common: 250, max: 500 },
                    tone_requirements: 'enthusiastic, specific, informed'
                },
                why_major: {
                    key_elements: ['academic_passion', 'relevant_experience', 'career_vision'],
                    red_flags: ['generic_career_goals', 'no_personal_connection', 'unrealistic_expectations'],
                    winning_patterns: ['specific_coursework_interest', 'research_experience', 'industry_awareness'],
                    word_limits: { common: 300, max: 400 },
                    tone_requirements: 'passionate, informed, realistic'
                }
            },
            commonMistakes: {
                thesaurus_syndrome: { 
                    description: 'Overusing complex words unnecessarily',
                    detection: /\b(utilize|commence|endeavor|plethora|myriad)\b/gi,
                    advice: 'Use simple, clear language. Authenticity beats complexity.'
                },
                resume_regurgitation: {
                    description: 'Just listing achievements without reflection',
                    detection: /^(I have|I was|I did|My achievements)/gm,
                    advice: 'Focus on what you learned, not what you did.'
                },
                generic_statements: {
                    description: 'Could apply to any student',
                    detection: /\b(always been passionate|since I was young|make a difference|help people)\b/gi,
                    advice: 'Be specific. What exactly are you passionate about and why?'
                },
                cliche_endings: {
                    description: 'Overused conclusion phrases',
                    detection: /\b(in conclusion|this is why|I hope to|I look forward to)\b/gi,
                    advice: 'End with impact. Show your future contribution.'
                }
            },
            admissionsTips: {
                authenticity_markers: [
                    'Use your natural voice',
                    'Share specific moments, not general themes',
                    'Show vulnerability and growth',
                    'Avoid trying to impress with big words'
                ],
                storytelling_structure: [
                    'Start with a specific moment or scene',
                    'Provide context briefly',
                    'Focus on your internal experience',
                    'Connect to broader meaning',
                    'Show forward movement'
                ],
                differentiation_strategies: [
                    'Find unique angle on common experiences',
                    'Highlight unusual interests or perspectives',
                    'Show intellectual curiosity in unexpected areas',
                    'Demonstrate impact on your community'
                ]
            }
        }
    });

    // User Writing Style Profile
    const [userWritingProfile, setUserWritingProfile] = useState({
        styleMetrics: {
            avgSentenceLength: 15,
            vocabularyLevel: 'intermediate', // basic, intermediate, advanced
            preferredTone: 'neutral', // formal, neutral, casual
            complexityPreference: 'medium', // low, medium, high
            paragraphLength: 'medium',
            transitionStyle: 'simple' // simple, complex, varied
        },
        writingPatterns: {
            favoriteWords: new Map<string, number>(),
            avoidedWords: new Map<string, number>(),
            sentenceStarters: new Map<string, number>(),
            commonPhrases: new Map<string, number>(),
            errorPatterns: new Map<string, number>()
        },
        improvementAreas: {
            weaknesses: [] as string[],
            strengths: [] as string[],
            consistentMistakes: [] as string[],
            growthAreas: [] as string[]
        },
        behavioralData: {
            acceptanceRate: 0,
            preferredEditTypes: new Map<string, number>(),
            editingSpeed: 0, // words per minute
            revisionFrequency: 0,
            sessionDuration: 0
        }
    });

    // Draft History State
    const [draftHistory, setDraftHistory] = useState<DraftVersion[]>([]);
    const [, setCurrentVersionId] = useState<string | null>(null);

    // Comprehensive Writing Categories System
    const writingCategories = {
        'Academic Essays': {
            'Argumentative Essay': { wordRange: '1000-1500', audience: 'Academic readers', tone: 'analytical', structure: 'thesis-driven' },
            'Research Paper': { wordRange: '2000-5000', audience: 'Scholarly community', tone: 'formal', structure: 'research-based' },
            'Literary Analysis': { wordRange: '750-1250', audience: 'Literature scholars', tone: 'analytical', structure: 'close-reading' },
            'Compare & Contrast': { wordRange: '800-1200', audience: 'Academic readers', tone: 'analytical', structure: 'comparative' },
            'Persuasive Essay': { wordRange: '750-1000', audience: 'General academic', tone: 'persuasive', structure: 'argument-based' }
        },
        'College Application Essays': {
            'Personal Statement': { wordRange: '500-650', audience: 'Admissions officers', tone: 'authentic', structure: 'narrative-reflective' },
            'Why College Essay': { wordRange: '200-400', audience: 'Admissions committee', tone: 'enthusiastic', structure: 'research-based' },
            'Why Major Essay': { wordRange: '200-350', audience: 'Academic departments', tone: 'passionate', structure: 'goal-oriented' },
            'Supplemental Essays': { wordRange: '150-300', audience: 'Admissions staff', tone: 'specific', structure: 'targeted' },
            'Scholarship Essay': { wordRange: '300-500', audience: 'Scholarship committee', tone: 'merit-focused', structure: 'achievement-based' }
        },
        'Creative Writing': {
            'Short Story (Flash)': { wordRange: '100-1000', audience: 'General readers', tone: 'engaging', structure: 'narrative-arc' },
            'Short Story (Standard)': { wordRange: '1500-5000', audience: 'Literary readers', tone: 'literary', structure: 'character-driven' },
            'Narrative Essay': { wordRange: '750-1500', audience: 'General/literary', tone: 'narrative', structure: 'story-based' },
            'Creative Nonfiction': { wordRange: '1000-3000', audience: 'Literary readers', tone: 'literary', structure: 'scene-based' },
            'Magazine Story': { wordRange: '800-2500', audience: 'Magazine readers', tone: 'engaging', structure: 'hook-driven' }
        },
        'Memoir & Biography': {
            'Personal Memoir': { wordRange: '1500-5000', audience: 'General readers', tone: 'personal', structure: 'chronological' },
            'Autobiographical Essay': { wordRange: '1000-2500', audience: 'General readers', tone: 'reflective', structure: 'thematic' },
            'Family History': { wordRange: '2000-4000', audience: 'Family/community', tone: 'documentary', structure: 'generational' },
            'Life Reflection': { wordRange: '800-2000', audience: 'General readers', tone: 'contemplative', structure: 'reflective' }
        },
        'Professional Writing': {
            'Business Proposal': { wordRange: '1000-2500', audience: 'Business stakeholders', tone: 'professional', structure: 'proposal-format' },
            'Grant Application': { wordRange: '500-1500', audience: 'Funding organizations', tone: 'persuasive', structure: 'needs-based' },
            'Technical Report': { wordRange: '1500-3000', audience: 'Technical experts', tone: 'technical', structure: 'data-driven' },
            'White Paper': { wordRange: '2000-4000', audience: 'Industry professionals', tone: 'authoritative', structure: 'research-based' }
        },
        'Journalism & Media': {
            'News Article': { wordRange: '300-800', audience: 'General public', tone: 'objective', structure: 'inverted-pyramid' },
            'Feature Article': { wordRange: '1000-2500', audience: 'Target demographic', tone: 'engaging', structure: 'narrative-journalism' },
            'Op-Ed Piece': { wordRange: '600-900', audience: 'Newspaper readers', tone: 'persuasive', structure: 'opinion-based' },
            'Blog Post': { wordRange: '500-1500', audience: 'Online readers', tone: 'conversational', structure: 'web-optimized' }
        }
    };

    // Auto-Analysis Functions for Document Category Detection
    const analyzeDocumentCategory = (content: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (plainText.length < 100) return null; // Not enough content to analyze
        
        const wordCount = plainText.split(/\s+/).length;
        
        // Detection patterns for different categories
        const patterns = {
            'Personal Statement': {
                indicators: [/\b(I|my|me|myself)\b/gi, /\b(personal|experience|journey|growth|learned|discovered)\b/gi],
                minScore: 8,
                wordRange: [400, 800]
            },
            'Why College Essay': {
                indicators: [/\b(university|college|institution|program|major|study)\b/gi, /\b(because|why|choose|drawn to)\b/gi],
                minScore: 6,
                wordRange: [200, 500]
            },
            'Short Story': {
                indicators: [/\b(he|she|they|character)\b/gi, /^".*"$/gm, /\bsaid|asked|replied|whispered\b/gi],
                minScore: 10,
                wordRange: [500, 5000]
            },
            'Academic Essay': {
                indicators: [/\b(thesis|argument|evidence|research|analysis|scholar)\b/gi, /\b(furthermore|however|therefore|in conclusion)\b/gi],
                minScore: 7,
                wordRange: [800, 2500]
            },
            'Memoir': {
                indicators: [/\b(when I was|years ago|remember|childhood|family|growing up)\b/gi, /\b(my|our|life|lived)\b/gi],
                minScore: 8,
                wordRange: [1000, 4000]
            },
            'Magazine Story': {
                indicators: [/^.{1,100}$$/gm, /\b(readers|audience|engaging|hook)\b/gi],
                minScore: 5,
                wordRange: [800, 3000]
            }
        };
        
        let bestMatch = { category: null, confidence: 0, questions: [] };
        
        for (const [category, pattern] of Object.entries(patterns)) {
            let score = 0;
            
            // Check word count fit
            const [minWords, maxWords] = pattern.wordRange;
            if (wordCount >= minWords && wordCount <= maxWords) {
                score += 3;
            } else if (wordCount >= minWords * 0.7 && wordCount <= maxWords * 1.3) {
                score += 1;
            }
            
            // Check pattern indicators
            pattern.indicators.forEach(regex => {
                const matches = (plainText.match(regex) || []).length;
                score += Math.min(matches, 5); // Cap at 5 points per pattern
            });
            
            const confidence = Math.min(score / pattern.minScore, 1);
            
            if (confidence > bestMatch.confidence) {
                bestMatch = {
                    category: category,
                    confidence: confidence,
                    questions: generateClarifyingQuestions(category, plainText)
                };
            }
        }
        
        return bestMatch.confidence > 0.6 ? bestMatch : null;
    };
    
    const generateClarifyingQuestions = (category: string, content: string) => {
        const questions = {
            'Personal Statement': [
                "Is this for college admissions or graduate school applications?",
                "What specific aspects of your personal growth should we highlight?",
                "Are you applying to a particular field or program?"
            ],
            'Why College Essay': [
                "Which specific college or program is this for?",
                "What unique aspects of this institution should we emphasize?",
                "Are there specific professors or programs you're interested in?"
            ],
            'Short Story': [
                "Is this intended for a literary magazine, contest, or personal project?",
                "What genre or style are you aiming for?",
                "Who is your target audience?"
            ],
            'Academic Essay': [
                "What is the specific assignment or research question?",
                "What academic level is this for (high school, college, graduate)?",
                "Are there specific citation requirements or formatting guidelines?"
            ],
            'Memoir': [
                "Is this a standalone piece or part of a larger memoir?",
                "What time period or theme should we focus on?",
                "Who is your intended audience?"
            ],
            'Magazine Story': [
                "Which magazine or publication are you targeting?",
                "What's the main message or theme you want to convey?",
                "What style does your target publication prefer?"
            ]
        };
        
        return questions[category] || [
            "What is the main purpose of this piece?",
            "Who is your intended audience?",
            "Are there specific requirements or guidelines to follow?"
        ];
    };
    
    const getCategorySpecificAdvice = (category: string) => {
        const advice = {
            'Personal Statement': `
• Focus on a single, compelling narrative that reveals character growth
• Use specific anecdotes and concrete details, not general statements
• Show vulnerability and genuine reflection on experiences
• Connect experiences to future goals and values
• Avoid clichés like sports injuries, volunteer trips, or overcoming challenges`,

            'Why College Essay': `
• Research specific programs, professors, and opportunities at the school
• Connect your academic/career interests to unique offerings at this college
• Avoid generic praise that could apply to any school
• Mention specific courses, research opportunities, or campus culture aspects
• Show how you'll contribute to the community, not just what you'll gain`,

            'Short Story': `
• Start with compelling action or dialogue, not backstory
• Show character development through actions, not exposition
• Use dialogue to reveal character and advance plot
• Create vivid scenes with sensory details
• Every sentence should serve the story's purpose`,

            'Academic Essay': `
• Lead with a clear, debatable thesis statement
• Use topic sentences to guide each paragraph's focus
• Support arguments with credible evidence and analysis
• Address counterarguments to strengthen your position
• Use formal academic tone and proper citation format`,

            'Memoir': `
• Focus on specific moments and scenes, not broad life summaries
• Use present-tense storytelling for immediacy
• Include dialogue and sensory details to recreate experiences
• Reflect on meaning and growth without being preachy
• Show character development through specific incidents`,

            'Magazine Story': `
• Hook readers immediately with compelling opening
• Use subheadings and varied paragraph lengths for readability
• Include quotes, statistics, or anecdotes to support points
• Write for your target publication's specific audience
• End with a strong conclusion that reinforces main message`
        };
        
        return advice[category] || null;
    };

    // Local Analysis Fallback (when AI API is unavailable)
    const performLocalAnalysis = (content: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        if (!plainText || plainText.length < 50) {
            return null;
        }
        
        const wordCount = plainText.split(/\s+/).length;
        const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = plainText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        // Basic pattern detection
        const analysis = {
            strengths: [],
            improvements: [],
            category: requirements.writingCategory || 'General'
        };
        
        // Word count assessment
        if (wordCount > 100) {
            analysis.strengths.push(`Good length with ${wordCount} words - substantial content to work with`);
        }
        
        // Sentence structure
        const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
        if (avgSentenceLength > 25) {
            analysis.improvements.push('Consider breaking up some longer sentences for better readability');
        } else if (avgSentenceLength < 10) {
            analysis.improvements.push('Try combining some short sentences for better flow');
        }
        
        // Paragraph structure
        if (paragraphs.length === 1 && wordCount > 200) {
            analysis.improvements.push('Consider breaking content into multiple paragraphs for better organization');
        }
        
        // Category-specific analysis
        const categoryAdvice = getCategorySpecificAdvice(requirements.writingCategory);
        if (categoryAdvice) {
            analysis.improvements.push(`For ${requirements.writingCategory}: ${categoryAdvice.split('•')[1]?.trim() || 'Follow category-specific best practices'}`);
        }
        
        // Basic readability checks
        const complexWords = plainText.split(/\s+/).filter(word => word.length > 8).length;
        const complexityRatio = complexWords / wordCount;
        
        if (complexityRatio > 0.3) {
            analysis.improvements.push('Consider simplifying some complex words for better clarity');
        }
        
        return analysis;
    };

    // Enhanced error handling for AI responses
    const handleAIError = async (error: any, analysisType: string) => {
        console.error(`AI ${analysisType} error:`, error);
        
        // Check if it's a quota/rate limit error
        if (error?.response?.data?.error?.includes('quota') || error?.response?.data?.error?.includes('429')) {
            // Show detailed quota information
            toast.error('AI quota limit reached. Using local analysis instead.', { duration: 5000 });
            
            // Perform local analysis fallback
            const localAnalysis = performLocalAnalysis(currentContent);
            if (localAnalysis) {
                const fallbackMessage = `🔍 **Local Analysis Results** (AI currently unavailable)

**Detected Category**: ${localAnalysis.category}

**Strengths Found**:
${localAnalysis.strengths.map(s => `• ${s}`).join('\n')}

**Suggested Improvements**:
${localAnalysis.improvements.map(i => `• ${i}`).join('\n')}

**💡 Tip**: This is basic analysis. For detailed AI suggestions, try again later when quota resets.`;

                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: fallbackMessage,
                    timestamp: new Date(),
                    type: 'local-analysis',
                    section: 'fallback'
                };
                
                setAiMessages(prev => [...prev, aiMessage]);
                return true; // Indicate fallback was successful
            }
        }
        
        // Generic error handling
        toast.error(`${analysisType} temporarily unavailable. Please try again later.`);
        return false;
    };

    // Intelligent Editing Algorithm State
    const [editingStats, setEditingStats] = useState({
        commands: {
            toneCheck: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 },
            wordChoice: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 },
            weakPhrases: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 },
            intro: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 },
            structure: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 },
            conclusion: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 },
            ideation: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 },
            fullReview: { used: 0, successful: 0, effectiveness: 0.5, lastUsed: 0 }
        },
        essayAnalysis: {
            wordCount: 0,
            lastAnalyzed: 0,
            weaknessAreas: [] as string[],
            strengthAreas: [] as string[],
            priorityNeeds: [] as string[]
        },
        userBehavior: {
            preferredCommands: [] as string[],
            acceptanceRate: 0,
            editApplicationRate: 0,
            sessionDuration: 0
        }
    });
    
    // Get all URL parameters - declare once at the beginning
    const documentParam = searchParams.get('document');
    const sessionParam = searchParams.get('session');
    const mentorParam = searchParams.get('mentor');
    const typeParam = searchParams.get('type');
    const courseIdParam = searchParams.get('courseId');
    const docId = documentParam || documentId;

    // Determine if this is a teacher-led live session or urgent AI session
    const isLiveSession = typeParam === 'live' && mentorParam === 'teacher';
    const isUrgentSession = routeSessionId && mentorParam === 'ai'; // Urgent AI session

    // Function declarations - must be before useEffect hooks
    const loadDocumentContent = React.useCallback(async (documentId: string) => {
        setIsLoadingDocument(true);
        try {
            const response = await apiClient.get(`/api/documents/${documentId}`);
            if (response.data.success) {
                const document = response.data.document;
                setUploadedDocument(document);
                
                // Convert document content to HTML for the editor
                let htmlContent = `<h2>${document.name}</h2>`;
                if (document.content) {
                    // Split content into paragraphs and wrap in HTML
                    const paragraphs = document.content.split('\n').filter(p => p.trim());
                    htmlContent += paragraphs.map(p => `<p>${p.trim()}</p>`).join('');
                } else {
                    htmlContent += '<p>Document content could not be extracted. You can edit it here manually.</p>';
                }
                
                setCurrentContent(htmlContent);
                console.log(`Loaded document: ${document.name} (${document.contentLength} characters)`);
            }
        } catch (error) {
            console.error('Failed to load document:', error);
            toast.error('Failed to load uploaded document');
        } finally {
            setIsLoadingDocument(false);
        }
    }, []);

    const initializeAiSession = React.useCallback(async () => {
        try {
            // Find an AI essay editor bot
            const botsResponse = await apiClient.get('/api/ai-bots');
            const essayBots = botsResponse.data.bots?.filter((bot: any) => 
                bot.specialization_focus?.toLowerCase().includes('essay') || 
                bot.specialization_focus?.toLowerCase().includes('writing')
            );

            if (essayBots && essayBots.length > 0) {
                const bot = essayBots[0];
                setAiMentor(bot);

                // Start AI session
                const sessionResponse = await apiClient.post('/api/ai-bots/session/start', {
                    botId: bot.id,
                    sessionType: 'essay_editing',
                    problem: 'Essay writing assistance session'
                });

                if (sessionResponse.data.success) {
                    setAiSessionId(sessionResponse.data.session.id);
                    
                    // Send initial message with counselor persona
                    const welcomeResponse = await apiClient.post('/api/ai-bots/session/message', {
                        sessionId: sessionResponse.data.session.id,
                        message: `You are an elite English writing counselor with 20+ years of experience, currently in an URGENT ESSAY EDITING SESSION. You represent the top 0.1% of English writers and essay counselors with professor-level expertise.

CURRENT SESSION CONTEXT:
- You are actively helping edit an essay in real-time
- The student has access to a collaborative editor on the left
- You can see their essay content and provide specific suggestions
- This is NOT a general chat - focus on immediate essay improvement

YOUR CAPABILITIES AS ESSAY SUPERVISOR:
1. CONTENT ANALYSIS: Analyze structure, flow, argument strength, evidence quality
2. LANGUAGE ENHANCEMENT: Suggest better word choices, metaphors, descriptive phrases
3. TONE ADJUSTMENT: Help match the required tone (formal, persuasive, narrative, etc.)
4. REQUIREMENT ALIGNMENT: Ensure essay meets word count, audience, and purpose requirements
5. REAL-TIME EDITING: Highlight specific phrases to improve or remove
6. TEACHING MOMENTS: Explain WHY changes improve the writing

RESPONSE STYLE:
- Be direct and actionable
- Focus on immediate improvements to their current essay
- Ask about specific sections that need work
- Offer concrete examples and alternatives
- Act as a hands-on writing coach, not a general assistant

Please introduce yourself as their essay editing supervisor and ask to see their current draft to begin targeted improvements.`
                    });

                    if (welcomeResponse.data.success) {
                        setAiMessages([
                            {
                                id: '1',
                                role: 'assistant',
                                content: welcomeResponse.data.response,
                                timestamp: new Date(),
                                type: 'suggestion'
                            }
                        ]);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to initialize AI session:', error);
            toast.error('Failed to connect to AI writing assistant');
        }
    }, []);

    // ALL useEffect hooks must be declared here unconditionally
    useEffect(() => {
        // Hide selection menu when clicking elsewhere
        const handleClickOutside = () => {
            setShowSelectionMenu(false);
        };
    
        
        if (showSelectionMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showSelectionMenu]);

    useEffect(() => {
        // For urgent sessions, document ID comes from query param
        // For regular scribe sessions, document ID comes from route param
        if (docId) {
            loadDocumentContent(docId);
        }
        
        // Use session ID from route param (for urgent sessions) or query param
        const sessionIdToUse = routeSessionId || sessionParam;
        
        if (sessionIdToUse && mentorParam === 'ai') {
            initializeAiSession();
        }
        if (isLiveSession) {
            // For teacher-led sessions, we don't need to initialize AI
            console.log('Teacher-led live essay editing session initialized');
            setAiMessages([
                {
                    id: '1',
                    role: 'assistant',
                    content: 'Welcome to the live essay editing session! Your teacher will join shortly to help with collaborative writing.',
                    timestamp: new Date(),
                    type: 'suggestion'
                }
            ]);
        }
    }, [sessionParam, routeSessionId, mentorParam, documentParam, documentId, isLiveSession, docId, loadDocumentContent, initializeAiSession]);

    // Early return conditions - check after all hooks are declared
    if (isUserLoading) {
        return <div className="h-screen w-full flex items-center justify-center bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div></div>;
    }
    if (!docId) {
        return <div className="p-8 text-red-400">Error: Document ID is missing.</div>;
    }
    if (!user) {
        return <div className="p-8 text-red-400">Error: Could not authenticate user.</div>;
    }

    const sendMessageToAi = async (message: string) => {
        if (!message.trim()) return;

        setIsAiLoading(true);
        const userMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: message,
            timestamp: new Date()
        };
    

        setAiMessages(prev => [...prev, userMessage]);
        setUserInput('');

        try {
            // Extract plain text from HTML content for AI analysis
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentContent;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            // Create comprehensive context including essay content
            let contextualMessage = `STUDENT'S CURRENT ESSAY CONTENT:\n"""${plainText || '[No content yet - guide them to start writing]'}"""\n\nSTUDENT'S MESSAGE: ${message}\n\n`;
            
            // Add requirements and style context
            contextualMessage = createContextualPrompt(contextualMessage);
            
            // Add supervisor instructions
            contextualMessage += `\n\nAS ESSAY SUPERVISOR:
1. If they're asking for general help, analyze their current essay and provide 3-5 specific, actionable improvements
2. If their essay is empty, guide them to start with a strong opening based on their requirements
3. If they're asking about a specific part, reference the exact text and suggest improvements
4. Always explain WHY your suggestions make the writing stronger
5. Focus on immediate, practical changes they can make right now
6. Use professor-level expertise but communicate clearly

Respond as their hands-on essay editing supervisor.`;

            let response;
            
            // Try the specialized writing feedback agent first
            try {
                response = await apiClient.post('/api/ai/agent/writing-feedback', {
                    fullEssay: plainText || '[No content yet - guide them to start writing]',
                    message: message,
                    essayType: writingType
                });
                
                if (response.data.success) {
                    const aiMessage: AIMessage = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: response.data.response,
                        timestamp: new Date(),
                        type: 'feedback'
                    };
                    
                    setAiMessages(prev => [...prev, aiMessage]);
                    toast.success('✨ AI feedback generated');
                    return;
                }
            } catch (agentError) {
                console.log('[AI_FALLBACK] Specialized agent failed, trying legacy system...', agentError);
                
                // Fallback to old AI bot system if available
                if (aiSessionId) {
                    response = await apiClient.post('/api/ai-bots/session/message', {
                        sessionId: aiSessionId,
                        message: contextualMessage
                    });

                    if (response.data.success) {
                        // Parse for edit suggestions
                        parseEditSuggestions(response.data.response, (Date.now() + 1).toString());
                        
                        const aiMessage: AIMessage = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: response.data.response,
                            timestamp: new Date(),
                            type: 'feedback'
                        };
                        
                        setAiMessages(prev => [...prev, aiMessage]);
                        return;
                    }
                }
                
                // If both systems fail, throw error to trigger fallback message
                throw new Error('All AI systems unavailable');
            }
        } catch (error) {
            console.error('Error sending message to AI:', error);
            
            // Provide a helpful fallback response instead of just an error
            const fallbackMessage: AIMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `I'm having a small technical hiccup. Could you try:
                
• **Selecting specific text** and using the popup menu for targeted feedback
• **Refreshing the page** and trying again  
• **Rephrasing your question** - sometimes a different approach helps

Meanwhile, you can continue writing your essay, and I'll provide automatic suggestions as you write.`,
                timestamp: new Date(),
                type: 'feedback'
            };
            
            setAiMessages(prev => [...prev, fallbackMessage]);
            toast.info('AI temporarily unavailable - try selecting text for feedback');
        } finally {
            setIsAiLoading(false);
        }
    };

    // Enhanced ideation response handler
    const handleIdeationResponse = async (response: string) => {
        if (!aiSessionId || !response.trim()) return;
        
        const newResponses = [...userResponses, response];
        setUserResponses(newResponses);
        setIdeationStep(prev => prev + 1);
        
        const userMessage: AIMessage = {
            id: Date.now().toString(),
            role: 'user', 
            content: response,
            timestamp: new Date(),
            isIdeationPhase: true
        };
        setAiMessages(prev => [...prev, userMessage]);
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentContent;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        const hasExistingContent = plainText.trim().length > 100;
        
        let followUpPrompt = '';
        if (hasExistingContent) {
            if (ideationStep < 3) {
                followUpPrompt = `Based on "${response}" and their essay, ask another targeted question to help them add specific details, explore emotional impact, or develop weaker sections. Focus on ONE area for improvement.`;
            } else {
                followUpPrompt = `Based on responses: ${newResponses.join(' | ')} and their essay, provide specific improvement suggestions for particular paragraphs and ways to incorporate insights from our conversation.`;
            }
        } else {
            if (ideationStep < 5) {
                followUpPrompt = `Based on "${response}", ask ONE more question that builds on what they shared. Explore specific moments, lessons learned, or impact. Keep it conversational.`;
            } else {
                followUpPrompt = `Create essay ideation summary based on: ${newResponses.join(' | ')}. Provide 3-5 essay angles, opening hooks, key themes, personal details to include, and structure suggestions.`;
            }
        }
        
        try {
            setIsAiLoading(true);
            const aiResponse = await apiClient.post('/api/ai-bots/session/message', {
                sessionId: aiSessionId,
                message: followUpPrompt
            });
            
            if (aiResponse.data.success) {
                const aiMessage: AIMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: aiResponse.data.response, 
                    timestamp: new Date(),
                    type: (hasExistingContent && ideationStep >= 3) || (!hasExistingContent && ideationStep >= 5) ? 'counselor' : 'ideation',
                    section: 'brainstorm'
                };
                setAiMessages(prev => [...prev, aiMessage]);
                
                if ((hasExistingContent && ideationStep >= 3) || (!hasExistingContent && ideationStep >= 5)) {
                    setIsIdeationMode(false);
                    toast.success('Ideation session complete!');
                }
            }
        } catch (error) {
            toast.error('Failed to process response');
        } finally {
            setIsAiLoading(false);
        }
    };

    const requestAiFeedback = async () => {
        if (!currentContent.trim()) {
            toast.error('Please write some content first');
            return;
        }

        if (!aiSessionId) {
            toast.error('AI session not initialized. Please wait or refresh.');
            return;
        }

        setIsAiLoading(true);
        
        try {
            // Extract plain text for analysis
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentContent;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            const wordCount = plainText.split(/\s+/).length;
            
            // Create comprehensive review prompt using our enhanced context system
            const fullReviewPrompt = createContextualPrompt(`🎯 **COMPREHENSIVE FULL REVIEW REQUEST**

As an elite writing supervisor, provide a complete analysis of this ${wordCount}-word document:

**DOCUMENT TO REVIEW:**
${plainText}

**PROVIDE COMPREHENSIVE FEEDBACK IN THESE AREAS:**

**📊 OVERALL ASSESSMENT:**
- Current writing quality and effectiveness
- Estimated grade level and target achievement 
- Primary strengths (quote specific examples)

**🎭 CONTENT & STRUCTURE:**
- Main argument/narrative clarity
- Organization and flow between sections
- Introduction and conclusion effectiveness

**✍️ WRITING CRAFT:**
- Sentence variety and sophistication
- Word choice and vocabulary appropriateness
- Voice consistency and engagement

**🎯 CATEGORY-SPECIFIC ANALYSIS:**
- Alignment with document type requirements
- Audience appropriateness
- Genre/format conventions followed

**🚀 PRIORITY IMPROVEMENTS:**
1. Most critical issue to address first
2. Second most important enhancement
3. Third improvement for maximum impact

**💡 SPECIFIC ACTIONABLE SUGGESTIONS:**
- Provide 3-5 concrete edits using either format:
  • PREFERRED: [EDIT_SUGGESTION] Original: "exact text from the essay" Suggested: "improved replacement text" Reason: "why this improves the writing" [/EDIT_SUGGESTION]
  • OR SIMPLE: Instead of "current text", try "improved text" because it's more engaging.
- Always quote the exact original text from their essay
- Explain WHY each change improves the writing
- Make suggestions clear and actionable

**📈 NEXT STEPS:**
- Immediate actions the writer should take
- Areas to focus on in next revision
- Long-term development suggestions

Be thorough but encouraging. This is their main request for comprehensive assistance.`);

            console.log('Sending full review request to AI...');
            
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId: aiSessionId,
                message: fullReviewPrompt
            });

            if (response.data.success) {
                // Parse for edit suggestions
                parseEditSuggestions(response.data.response, Date.now().toString());
                
                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: 'comprehensive-review',
                    section: 'full-document'
                };
                
                setAiMessages(prev => [...prev, aiMessage]);
                toast.success('Comprehensive review complete!');
            } else {
                console.error('AI review failed:', response.data);
                toast.error('Review failed. Please try again.');
            }
        } catch (error) {
            console.error('Full review error:', error);
            const fallbackHandled = await handleAIError(error, 'Full Review');
            if (!fallbackHandled) {
                toast.error('Review temporarily unavailable. Please try again.');
            }
        } finally {
            setIsAiLoading(false);
        }
    };
    

    const handleContentChange = (content: string) => {
        const previousContent = currentContent;
        setCurrentContent(content);
        
        // Save draft version if significant change occurred
        if (content !== previousContent && content.trim().length > 0) {
            // Debounce draft saving to avoid too many versions
            if (analysisTimer) {
                clearTimeout(analysisTimer);
            }
            
            const saveTimer = setTimeout(() => {
                saveDraftVersion(content, 'user', [], []);
            }, 2000); // Save after 2 seconds of no typing
            
            setAnalysisTimer(saveTimer);
        }
        
        // Trigger proactive AI analysis after content changes
        if (aiSessionId && content.trim().length > 100) {
            // Clear existing timer
            if (analysisTimer) {
                clearTimeout(analysisTimer);
            }
            
            // Set new timer to analyze after 3 seconds of inactivity
            const newTimer = setTimeout(() => {
                performProactiveAnalysis(content);
            }, 3000);
            
            setAnalysisTimer(newTimer);
        }
    };
    
    
    // Proactive AI analysis function
    const performProactiveAnalysis = async (content: string) => {
        if (!aiSessionId || isAnalyzing) return;
        
        const now = Date.now();
        // Don't analyze more than once every 30 seconds
        if (now - lastAnalysisTime < 30000) return;
        
        setIsAnalyzing(true);
        setLastAnalysisTime(now);
        
        try {
            // Extract plain text from HTML content
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            // Only analyze substantial content
            const wordCount = plainText.split(/\s+/).length;
            if (wordCount < 30) {
                setIsAnalyzing(false);
                return;
            }
            
            // Auto-detect category if not set and provide category-specific analysis
            let categoryAnalysis = '';
            if (!requirements.writingCategory) {
                const detectedCategory = analyzeDocumentCategory(content);
                if (detectedCategory) {
                    categoryAnalysis = `\n\n🔍 AUTO-DETECTED CATEGORY: ${detectedCategory.category} (${Math.round(detectedCategory.confidence * 100)}% confidence)
You may want to confirm this in your requirements settings for more targeted suggestions.`;
                }
            }
            
            // Create enhanced supervisor-level analysis prompt with multiple suggestions
            const analysisMessage = createContextualPrompt(`As their AI Essay Supervisor, I notice they've paused writing. Provide comprehensive, category-specific feedback:

CURRENT ESSAY DRAFT (${wordCount} words):
${plainText}${categoryAnalysis}

🎯 COMPREHENSIVE SUPERVISOR FEEDBACK:

**IMMEDIATE PRIORITIES** (address these first):
1. [STRENGTH] - One specific strength in their current writing (quote exact text)
2. [CRITICAL FIX] - Most urgent improvement needed (be specific about what to change)
3. [STRUCTURE] - One structural or organizational suggestion

**CATEGORY-SPECIFIC IMPROVEMENTS** (based on document type):
4. [CONTENT] - One content-specific suggestion for their writing category
5. [STYLE] - One style/tone improvement for their target audience

**DEVELOPMENT QUESTIONS** (to deepen their thinking):
- One targeted question to help them develop weaker sections
- One question about their intended audience/purpose

**NEXT STEPS** (concrete actions):
- Specific 2-3 word section they should work on next
- One technique they should try in their next writing session

Be encouraging but professionally direct. Reference their exact text when suggesting changes. This is continuous analysis to keep them improving progressively.`);
            
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId: aiSessionId,
                message: analysisMessage
            });
            
            if (response.data.success) {
                // Parse for edit suggestions
                parseEditSuggestions(response.data.response, Date.now().toString());
                
                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: 'proactive',
                    section: 'overall'
                };
                
                setAiMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            console.error('Failed to perform proactive analysis:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    
    // AI assistance for selected text using specialized agents
    const analyzeSelectedText = async (text: string, analysisType: 'improve' | 'grammar' | 'clarity' | 'style') => {
        if (!text.trim()) return;
        
        setIsAiLoading(true);
        
        const prompts = {
            improve: `Suggest specific improvements to make this text more compelling and well-structured.`,
            grammar: `Check grammar and syntax and provide corrections.`,
            clarity: `Help improve clarity and understandability of this text.`,
            style: `Suggest stylistic improvements to make this text more engaging.`
        };
    
        try {
            // Use the specialized edit suggestion agent for selected text analysis
            const response = await apiClient.post('/api/ai/agent/edit-suggestions', {
                selectedText: text,
                fullEssay: currentContent,
                message: prompts[analysisType],
                essayType: writingType
            });
            
            if (response.data.success) {
                // Parse the response for structured suggestions
                parseEditSuggestions(response.data.response, Date.now().toString());
                
                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: 'analysis',
                    section: 'selection',
                    selectedText: text
                };
    
                setAiMessages(prev => [...prev, aiMessage]);
                setShowSelectionMenu(false);
                setSelectedText('');
                
                toast.success(`✨ ${analysisType.charAt(0).toUpperCase() + analysisType.slice(1)} suggestions generated`);
            }
        } catch (error) {
            console.error('Failed to analyze selected text:', error);
            toast.error('Failed to get AI analysis for selected text');
        } finally {
            setIsAiLoading(false);
        }
    };
    
    // Add comment to specific text selection
    const addCommentToText = async (text: string, commentType: 'suggestion' | 'feedback' | 'question', customMessage?: string) => {
        if (!text.trim() || !selectionRange) return;
        
        setIsAiLoading(true);
        
        try {
            // Get contextual comment from specialized agent
            const response = await apiClient.post('/api/ai/agent/contextual-comments', {
                selectedText: text,
                fullEssay: currentContent,
                message: customMessage || `Provide specific feedback and suggestions for this text passage.`,
                essayType: writingType
            });
            
            if (response.data.success) {
                // Calculate position for comment bubble
                const editorRect = editorInstance?.view?.dom?.getBoundingClientRect();
                const position = {
                    x: (editorRect?.right || 0) + 20,
                    y: menuPosition.y
                };
                
                const newComment = {
                    id: `comment_${Date.now()}_${Math.random()}`,
                    text: text,
                    comment: response.data.response,
                    position: position,
                    range: selectionRange,
                    timestamp: new Date(),
                    type: commentType
                };
                
                setTextComments(prev => [...prev, newComment]);
                
                // Add visual highlight with unique ID
                if (editorInstance) {
                    const commentId = newComment.id;
                    editorInstance.commands.setTextSelection(selectionRange);
                    editorInstance.commands.setHighlight({ 
                        color: commentType === 'suggestion' ? '#3b82f6' : 
                               commentType === 'feedback' ? '#10b981' : '#f59e0b',
                        class: `comment-highlight-${commentId}`
                    });
                }
                
                setShowSelectionMenu(false);
                setSelectedText('');
                setSelectionRange(null);
                
                toast.success(`✨ ${commentType.charAt(0).toUpperCase() + commentType.slice(1)} comment added`);
            }
        } catch (error) {
            console.error('Failed to create comment:', error);
            toast.error('Failed to create comment');
        } finally {
            setIsAiLoading(false);
        }
    };
    
    // Remove comment and its highlight
    const removeComment = (commentId: string) => {
        const comment = textComments.find(c => c.id === commentId);
        if (comment && editorInstance) {
            // Remove the highlight
            const highlightClass = `comment-highlight-${commentId}`;
            const highlightElements = document.querySelectorAll(`.${highlightClass}`);
            highlightElements.forEach(el => {
                el.classList.remove(highlightClass);
                if (el.classList.length === 0) {
                    el.outerHTML = el.innerHTML;
                }
            });
        }
        
        setTextComments(prev => prev.filter(c => c.id !== commentId));
        setShowCommentBubble(null);
    };
    
    
    // Analyze specific essay sections
    const analyzeEssaySection = async (sectionType: 'intro' | 'conclusion' | 'structure') => {
        if (!aiSessionId || !currentContent.trim()) {
            toast.error('Please write some content first');
            return;
        }
        
        setIsAiLoading(true);
        
        const prompts = {
            intro: `Please analyze the introduction of my essay and provide specific suggestions for improvement. Focus on hook effectiveness, thesis clarity, and preview of main points. Here's my essay: ${currentContent}`,
            conclusion: `Please analyze the conclusion of my essay and suggest improvements. Focus on restating the thesis, summarizing key points, and providing a strong closing thought. Here's my essay: ${currentContent}`,
            structure: `Please analyze the overall structure and organization of my essay. Suggest improvements for logical flow, paragraph transitions, and argument development. Here's my essay: ${currentContent}`
        };
    
        
        try {
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId: aiSessionId,
                message: prompts[sectionType]
            });
            
            if (response.data.success) {
                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: 'analysis',
                    section: sectionType === 'structure' ? 'overall' : sectionType
                };
    
                
                setAiMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            console.error('Failed to analyze essay section:', error);
            toast.error('Failed to get AI analysis');
        } finally {
            setIsAiLoading(false);
        }
    };
    

    // Handle text selection
    const handleSelectionChange = (text: string, range: { from: number; to: number } | null) => {
        setSelectedText(text);
        setSelectionRange(range);
        
        if (text.trim().length > 0 && range) {
            // Show selection menu after a short delay
            setTimeout(() => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const rect = selection.getRangeAt(0).getBoundingClientRect();
                    setMenuPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.top - 60
                    });
                    setShowSelectionMenu(true);
                }
            }, 100);
        } else {
            setShowSelectionMenu(false);
        }
    };
    
    
    // Enhanced ideation functionality
    const startIdeationSession = async () => {
        if (!aiSessionId) {
            toast.error('Please wait for AI assistant to connect first');
            return;
        }
        
        setIsIdeationMode(true);
        setIdeationStep(0);
        setUserResponses([]);
        
        // Extract plain text from HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = currentContent;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        const hasExistingContent = plainText.trim().length > 100; // More than just placeholder text
        
        let ideationPrompt = '';
        
        if (hasExistingContent) {
            // For existing essays - analyze and ask targeted questions
            ideationPrompt = `As an elite essay counselor with 20+ years of experience, I want to help this student enhance their existing essay. Please analyze their current draft and identify areas for deeper exploration.

CURRENT ESSAY DRAFT:
${plainText}

Based on this draft, please:
1. Identify the main themes and ideas the student is exploring
2. Find specific paragraphs or ideas that could be developed further
3. Ask ONE targeted question about a particular section or idea that needs more personal depth, specific examples, or emotional connection
4. Focus on helping them uncover unique details, personal insights, or experiences that would make their essay more compelling

Start with your analysis and then ask your first targeted question.`;
        } else {
            // For empty drafts - use guided survey approach
            ideationPrompt = `As an elite essay counselor with 20+ years of experience, I want to help this student discover compelling essay ideas through a friendly, conversational survey. This student is starting with a blank page.

Please start a guided discovery session by asking ONE simple, engaging question to understand their background. Make it feel like a natural conversation, not an intimidating survey. 

Choose from these areas for your first question:
- Recent meaningful experiences or challenges
- Activities they're passionate about
- Moments of personal growth or change
- Something they're proud of or values they hold dear

Ask just ONE question at a time, keep it conversational and encouraging. Make them feel excited to share their story.`;
        }
        
        try {
            setIsAiLoading(true);
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId: aiSessionId,
                message: ideationPrompt
            });
            
            if (response.data.success) {
                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: hasExistingContent ? 'analysis' : 'ideation',
                    section: 'brainstorm',
                    isIdeationPhase: true
                };
    
                setAiMessages(prev => [...prev, aiMessage]);
            }
        } catch (error) {
            console.error('Failed to start ideation session:', error);
            toast.error('Failed to start ideation session');
            setIsIdeationMode(false);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    
    // Download document
    const downloadDocument = async (format: 'docx' | 'pdf') => {
        if (!currentContent.trim()) {
            toast.error('No content to download');
            return;
        }
        
        try {
            if (format === 'docx') {
                const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Essay Draft</title></head><body>${currentContent}</body></html>`;
                const blob = new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `essay-draft-${new Date().toISOString().split('T')[0]}.doc`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`<!DOCTYPE html><html><head><title>Essay Draft</title><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6;margin:1in;}</style></head><body>${currentContent}</body></html>`);
                    printWindow.document.close();
                    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
                }
            }
            toast.success(`Document prepared for ${format.toUpperCase()} download`);
        } catch (error) {
            toast.error('Failed to download document');
        }
    };
    
    
    // Apply AI suggested edits
    const applyAIEdit = async (message: AIMessage) => {
        if (!message.suggestedEdit || !editorInstance) return;
        
        const edit = message.suggestedEdit;
        
        try {
            // Apply the edit based on type
            if (edit.action === 'replace' && edit.originalText && edit.content) {
                // Find the exact text position in the editor
                const textPosition = findAndSelectText(edit.originalText);
                
                if (textPosition) {
                    // Select the text to be replaced
                    editorInstance.commands.setTextSelection(textPosition);
                    
                    // Replace with the suggested content
                    editorInstance.commands.insertContent(edit.content);
                    
                    // Flash highlight the new content to show what changed
                    setTimeout(() => {
                        const newPosition = findAndSelectText(edit.content || '');
                        if (newPosition) {
                            editorInstance.commands.setTextSelection(newPosition);
                            editorInstance.commands.setHighlight({ color: '#22c55e' }); // Green highlight for applied edits
                            
                            // Remove highlight after 2 seconds
                            setTimeout(() => {
                                editorInstance.commands.unsetHighlight();
                            }, 2000);
                        }
                    }, 100);
                    
                    toast.success(`✨ Applied: ${edit.reason || 'Text improved'}`);
                } else if (edit.originalText.length === 0) {
                    // This is a general suggestion without specific text to replace
                    // Just show the suggestion content as guidance
                    toast.info(`💡 AI Suggestion: ${edit.content.substring(0, 100)}${edit.content.length > 100 ? '...' : ''}`);
                    console.log('Applied general suggestion:', edit.content);
                } else {
                    // Fallback: append the content if exact text not found
                    console.warn('Could not find exact text, using fallback method');
                    const currentText = editorInstance.getText();
                    const newContent = currentText + '\n\n' + edit.content;
                    editorInstance.commands.setContent(`<p>${newContent.replace(/\n/g, '</p><p>')}</p>`);
                    toast.success('✨ Edit applied (fallback method)');
                }
            } else if (edit.action === 'insert' && edit.content) {
                // Insert at current cursor position
                editorInstance.commands.insertContent(edit.content);
                toast.success('✨ Content inserted successfully');
            }
            
            // Remove highlighting from original text
            removeHighlightFromEditor();
            
            // Remove from pending edits
            setPendingEdits(prev => prev.filter(msg => msg.id !== message.id));
            
        } catch (error) {
            console.error('Error applying edit:', error);
            toast.error('Failed to apply edit. Please try manually.');
        }
    };
    
    // Reject AI suggested edit
    const rejectAIEdit = (messageId: string) => {
        setPendingEdits(prev => prev.filter(msg => msg.id !== messageId));
        toast.info('Edit suggestion dismissed');
    };
    
    // Create requirement-aware prompt
    const createContextualPrompt = (basePrompt: string) => {
        let contextualPrompt = basePrompt;
        
        // Add writing type context with specific guidance
        if (writingType !== 'auto-detect') {
            const category = writingTypes[writingType as keyof typeof writingTypes];
            if (category) {
                contextualPrompt += `\n\n🎯 WRITING TYPE CONTEXT:\n`;
                contextualPrompt += `- Document Type: ${category.name}\n`;
                contextualPrompt += `- Description: ${category.description}\n`;
                contextualPrompt += `- Key Focus: ${category.guidance}\n`;
                
                // Add specific AI instructions based on writing type
                switch (writingType) {
                    case 'academic-essay':
                        contextualPrompt += `\n📚 ACADEMIC ESSAY FOCUS:
- Prioritize clear thesis statements and logical argument structure
- Emphasize evidence, citations, and scholarly analysis
- Ensure formal academic tone and precise terminology
- Focus on coherent paragraph development with topic sentences`;
                        break;
                        
                    case 'narrative-essay':
                        contextualPrompt += `\n📖 NARRATIVE FOCUS:
- Emphasize storytelling elements: setting, character, plot, conflict
- Use vivid imagery and sensory details
- Maintain engaging narrative voice and pacing  
- Balance showing vs. telling techniques`;
                        break;
                        
                    case 'college-app-essay':
                        contextualPrompt += `\n🎓 COLLEGE APPLICATION FOCUS:
- Showcase unique personal experiences and growth
- Demonstrate fit with specific institution/program
- Use authentic, engaging personal voice
- Stay within word limits while maximizing impact`;
                        break;
                        
                    case 'why-college-essay':
                        contextualPrompt += `\n🏫 WHY COLLEGE FOCUS:
- Reference specific programs, professors, opportunities
- Connect personal goals to institutional offerings
- Demonstrate genuine research about the school
- Avoid generic statements - be highly specific`;
                        break;
                        
                    case 'short-story':
                    case 'long-story':
                        contextualPrompt += `\n📚 FICTION FOCUS:
- Develop compelling characters with clear motivations
- Create engaging dialogue that advances plot
- Build narrative tension and compelling conflict
- Use literary devices effectively (metaphor, symbolism, etc.)`;
                        break;
                        
                    case 'memoir':
                    case 'autobiography':
                        contextualPrompt += `\n📝 MEMOIR/AUTOBIOGRAPHY FOCUS:
- Balance personal reflection with universal themes
- Use reflective language showing temporal distance
- Organize chronologically with meaningful connections
- Include specific, vivid details from memory`;
                        break;
                }
            }
        }
        
        // Add custom writing goals if specified
        if (customWritingGoals.trim()) {
            contextualPrompt += `\n\n🎯 CUSTOM WRITING GOALS:\n${customWritingGoals}\n`;
            contextualPrompt += `Please incorporate these specific goals into your analysis and suggestions.\n`;
        }
        
        // Add requirements context
        if (requirements.wordCount || requirements.audience || requirements.purpose) {
            contextualPrompt += `\n\n📋 ESSAY REQUIREMENTS TO CONSIDER:\n`;
            if (requirements.wordCount) contextualPrompt += `- Target word count: ${requirements.wordCount}\n`;
            if (requirements.audience) contextualPrompt += `- Target audience: ${requirements.audience}\n`;
            if (requirements.purpose) contextualPrompt += `- Essay purpose: ${requirements.purpose}\n`;
            if (requirements.tone) contextualPrompt += `- Desired tone: ${requirements.tone}\n`;
            if (requirements.specificPrompt) contextualPrompt += `- Specific prompt: ${requirements.specificPrompt}\n`;
        }
        
        // Add style context
        if (context.preferredStyle || context.writerReference || context.pastWritings) {
            contextualPrompt += `\n\n✍️ WRITING STYLE CONTEXT:\n`;
            if (context.preferredStyle) contextualPrompt += `- Preferred style: ${context.preferredStyle}\n`;
            if (context.writerReference) contextualPrompt += `- Writer to emulate: ${context.writerReference}\n`;
            if (context.pastWritings) contextualPrompt += `- Past writing sample: ${context.pastWritings}\n`;
            if (context.additionalContext) contextualPrompt += `- Additional context: ${context.additionalContext}\n`;
        }
        
        // Add instruction for multiple suggestions and direct editing
        contextualPrompt += `\n\n🚀 RESPONSE GUIDELINES:
1. Always provide 3-5 SPECIFIC suggestions, not just one
2. Prioritize the most impactful improvements first
3. Reference exact text from their essay when suggesting changes
4. For each suggestion, explain WHY it improves the writing
5. Format specific edits flexibly: either [EDIT_SUGGESTION] tags OR natural language like 'Instead of "text", try "better text"'
6. Consider the document category requirements in ALL suggestions
7. Be encouraging but professionally direct - this is urgent session assistance`;
        
        return contextualPrompt;
    };
    
    // Parse AI response for edit suggestions
    const parseEditSuggestions = (content: string, messageId: string) => {
        console.log('[SUGGESTION_PARSER] Full AI response:', content);
        console.log('[SUGGESTION_PARSER] Content length:', content.length);
        let foundSuggestions = false;
        
        // Method 1: Try the new structured format first
        if (content.includes('[EDIT_SUGGESTION]')) {
            const editRegex = /\[EDIT_SUGGESTION\]\s*Original:\s*"([^"]*?)"\s*Suggested:\s*"([^"]*?)"\s*(?:Reason:\s*"([^"]*?)")?\s*(?:\[\/EDIT_SUGGESTION\]|(?=\[EDIT_SUGGESTION\]|$))/gs;
            let match;
            
            while ((match = editRegex.exec(content)) !== null) {
                const [, originalText, suggestedText, reason] = match;
                
                if (originalText && suggestedText) {
                    createSuggestion(messageId, originalText, suggestedText, reason);
                    foundSuggestions = true;
                }
            }
        }
        
        // Method 2: Fallback - Look for the old format
        if (!foundSuggestions && content.includes('[EDIT_SUGGESTION]')) {
            const oldFormatRegex = /\[EDIT_SUGGESTION\]([\s\S]*?)(?=\[EDIT_SUGGESTION\]|$)/g;
            let match;
            
            while ((match = oldFormatRegex.exec(content)) !== null) {
                const editContent = match[1].trim();
                if (editContent) {
                    // Try to extract original and suggested from freeform text
                    const smartParsed = parseSmartSuggestion(editContent);
                    if (smartParsed) {
                        createSuggestion(messageId, smartParsed.original, smartParsed.suggested, smartParsed.reason);
                        foundSuggestions = true;
                    } else {
                        // Fallback to simple suggestion
                        createSuggestion(messageId, '', editContent, 'AI suggested improvement');
                        foundSuggestions = true;
                    }
                }
            }
        }
        
        // Method 3: Look for common suggestion patterns even without [EDIT_SUGGESTION] tags
        if (!foundSuggestions) {
            const suggestionPatterns = [
                /(?:Instead of|Rather than|Change)\s*"([^"]+)"\s*(?:to|use|try)\s*"([^"]+)"/gi,
                /Replace\s*"([^"]+)"\s*with\s*"([^"]+)"/gi,
                /"([^"]+)"\s*(?:should be|could be)\s*"([^"]+)"/gi,
                /Consider changing\s*"([^"]+)"\s*to\s*"([^"]+)"/gi,
                /Try\s*"([^"]+)"\s*instead of\s*"([^"]+)"/gi,
                /Rewrite\s*"([^"]+)"\s*as\s*"([^"]+)"/gi
            ];
            
            for (const pattern of suggestionPatterns) {
                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const [, originalText, suggestedText] = match;
                    if (originalText && suggestedText && originalText !== suggestedText) {
                        createSuggestion(messageId, originalText, suggestedText, 'AI suggested improvement');
                        foundSuggestions = true;
                    }
                }
            }
        }
        
        // Method 4: Context-aware quoted suggestion detection
        if (!foundSuggestions) {
            // Look for quoted text that appears in suggestion context
            const quotedSuggestions = content.match(/"([^"]{5,})"/g);
            if (quotedSuggestions && quotedSuggestions.length >= 2) {
                // Find quoted pairs that appear close together with suggestion keywords between them
                for (let i = 0; i < quotedSuggestions.length - 1; i++) {
                    const text1 = quotedSuggestions[i].replace(/"/g, '');
                    const text2 = quotedSuggestions[i + 1].replace(/"/g, '');
                    
                    // Find the text between these two quotes
                    const quote1Index = content.indexOf(quotedSuggestions[i]);
                    const quote2Index = content.indexOf(quotedSuggestions[i + 1], quote1Index + quotedSuggestions[i].length);
                    
                    if (quote2Index > quote1Index) {
                        const betweenText = content.substring(quote1Index + quotedSuggestions[i].length, quote2Index).toLowerCase();
                        
                        // Check if the text between quotes contains suggestion keywords
                        const suggestionKeywords = ['instead', 'rather', 'replace', 'change to', 'should be', 'could be', 'try', 'better as'];
                        const hasKeywords = suggestionKeywords.some(keyword => betweenText.includes(keyword));
                        
                        // Also check that the quotes are reasonably close (within 100 characters)
                        const distance = quote2Index - quote1Index;
                        
                        if (hasKeywords && distance < 150 && text1.length > 3 && text2.length > 3 && text1 !== text2) {
                            console.log('[SUGGESTION_PARSER] Found contextually related quotes:', {text1, text2, betweenText});
                            createSuggestion(messageId, text1, text2, 'AI suggested improvement');
                            foundSuggestions = true;
                            break; // Only take the first valid pair to avoid nonsensical suggestions
                        }
                    }
                }
            }
        }
        
        // Method 5: Last resort - look for any actionable advice
        if (!foundSuggestions) {
            const actionableKeywords = ['should', 'could', 'might', 'consider', 'try', 'improve', 'enhance', 'strengthen', 'revise', 'edit', 'change', 'replace', 'add', 'remove'];
            const contentLower = content.toLowerCase();
            
            if (actionableKeywords.some(keyword => contentLower.includes(keyword))) {
                console.log('[SUGGESTION_PARSER] Found actionable language, creating general suggestion');
                // Extract the first sentence with actionable advice
                const sentences = content.split(/[.!?]+/);
                for (const sentence of sentences) {
                    if (actionableKeywords.some(keyword => sentence.toLowerCase().includes(keyword)) && sentence.length > 20) {
                        createSuggestion(messageId, '', sentence.trim(), 'AI suggested improvement');
                        foundSuggestions = true;
                        break;
                    }
                }
            }
        }
        
        // Method 6: Emergency fallback - if this appears to be feedback, create a suggestion
        if (!foundSuggestions && content.length > 50) {
            const feedbackIndicators = ['feedback', 'suggestion', 'recommendation', 'advice', 'improvement', 'better', 'enhance'];
            if (feedbackIndicators.some(indicator => content.toLowerCase().includes(indicator))) {
                console.log('[SUGGESTION_PARSER] Detected feedback content, creating general suggestion');
                createSuggestion(messageId, '', content.length > 200 ? content.substring(0, 200) + '...' : content, 'AI feedback and suggestions');
                foundSuggestions = true;
            }
        }

        if (foundSuggestions) {
            console.log('[SUGGESTION_PARSER] Found suggestions, showing edit approval panel');
            setShowEditApproval(true);
        } else {
            console.log('[SUGGESTION_PARSER] No suggestions found in this AI response');
            // Let's see what we're missing
            console.log('[SUGGESTION_PARSER] Debug - Content contains keywords:', {
                hasQuotes: content.includes('"'),
                hasSuggest: content.toLowerCase().includes('suggest'),
                hasImprove: content.toLowerCase().includes('improve'),
                hasChange: content.toLowerCase().includes('change'),
                hasBetter: content.toLowerCase().includes('better'),
                hasShould: content.toLowerCase().includes('should'),
                hasConsider: content.toLowerCase().includes('consider')
            });
        }
    };

    // Helper function to create suggestions
    const createSuggestion = (messageId: string, originalText: string, suggestedText: string, reason?: string) => {
        // Validate that this is a sensible suggestion
        if (originalText && suggestedText) {
            // Skip if texts are too similar or identical
            if (originalText === suggestedText) {
                console.log('[SUGGESTION_PARSER] Skipping identical texts:', originalText);
                return;
            }
            
            // Skip if one text is much longer than the other (likely unrelated)
            const lengthRatio = Math.max(originalText.length, suggestedText.length) / Math.min(originalText.length, suggestedText.length);
            if (lengthRatio > 3) {
                console.log('[SUGGESTION_PARSER] Skipping due to length mismatch:', {
                    originalLength: originalText.length, 
                    suggestedLength: suggestedText.length, 
                    ratio: lengthRatio
                });
                return;
            }
            
            // Skip if texts appear to be from completely different contexts (no common words)
            const originalWords = originalText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const suggestedWords = suggestedText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const commonWords = originalWords.filter(w => suggestedWords.includes(w));
            
            if (originalWords.length > 3 && suggestedWords.length > 3 && commonWords.length === 0) {
                console.log('[SUGGESTION_PARSER] Skipping due to no common context:', {originalText: originalText.substring(0, 30), suggestedText: suggestedText.substring(0, 30)});
                return;
            }
        }
        
        console.log('[SUGGESTION_PARSER] Creating suggestion:', { originalText: originalText.substring(0, 50), suggestedText: suggestedText.substring(0, 50), reason });
        const message: AIMessage = {
            id: messageId + '_edit_' + Date.now() + '_' + Math.random(),
            role: 'assistant',
            content: reason || `I suggest improving this text.`,
            timestamp: new Date(),
            type: 'counselor',
            requiresDocumentEdit: true,
            suggestedEdit: {
                action: 'replace',
                content: suggestedText,
                originalText: originalText,
                reason: reason
            }
        };
        setPendingEdits(prev => [...prev, message]);
        
        // Highlight the original text in the editor if we have it
        if (originalText && originalText.length > 0) {
            setTimeout(() => highlightTextInEditor(originalText), 100);
        }
    };

    // Smart parsing for freeform suggestions
    const parseSmartSuggestion = (text: string): { original: string; suggested: string; reason?: string } | null => {
        // Look for quoted text patterns with suggestion context
        const contextualQuotedPatterns = [
            /"([^"]+)"\s*(?:should be|could be|might be better as|instead try)\s*"([^"]+)"/i,
            /"([^"]+)"\s*(?:can be improved to|becomes)\s*"([^"]+)"/i,
            /(?:change|replace)\s*"([^"]+)"\s*(?:with|to)\s*"([^"]+)"/i,
            /(?:instead of|rather than)\s*"([^"]+)"\s*(?:use|try|write)\s*"([^"]+)"/i,
            /"([^"]+)"\s*→\s*"([^"]+)"/i  // arrow notation
        ];
        
        for (const pattern of contextualQuotedPatterns) {
            const match = text.match(pattern);
            if (match && match[1] && match[2] && match[1] !== match[2]) {
                return {
                    original: match[1],
                    suggested: match[2],
                    reason: 'AI suggested improvement'
                };
            }
        }
        
        // Look for "instead of X, use Y" patterns
        const insteadPattern = /instead of\s+(.+?),?\s+(?:use|try|write)\s+(.+)/i;
        const insteadMatch = text.match(insteadPattern);
        
        if (insteadMatch && insteadMatch[1] && insteadMatch[2]) {
            return {
                original: insteadMatch[1].trim(),
                suggested: insteadMatch[2].trim(),
                reason: 'AI suggested improvement'
            };
        }
        
        return null;
    };

    // Highlight specific text in the editor for suggestions
    const highlightTextInEditor = (textToHighlight: string) => {
        if (!editorInstance || !textToHighlight) return;
        
        try {
            const docContent = editorInstance.getText();
            const startIndex = docContent.indexOf(textToHighlight);
            
            if (startIndex !== -1) {
                const endIndex = startIndex + textToHighlight.length;
                
                // Create a temporary highlight mark
                editorInstance.commands.setTextSelection({ from: startIndex + 1, to: endIndex + 1 });
                
                // Add visual highlighting using the Highlight extension
                setTimeout(() => {
                    try {
                        const selection = editorInstance.state.selection;
                        if (selection && !selection.empty) {
                            editorInstance.commands.setHighlight({ color: '#3b82f6' }); // Blue highlight for suggestions
                        }
                    } catch (error) {
                        console.warn('Could not apply highlight:', error);
                    }
                }, 100);
            }
        } catch (error) {
            console.warn('Could not highlight text:', error);
        }
    };

    // Remove highlighting from editor
    const removeHighlightFromEditor = () => {
        if (!editorInstance) return;
        
        try {
            editorInstance.commands.unsetHighlight();
        } catch (error) {
            console.warn('Could not remove highlight:', error);
        }
    };

    // Find and select text in editor for precise editing
    const findAndSelectText = (textToFind: string): { from: number; to: number } | null => {
        if (!editorInstance || !textToFind) return null;
        
        const docContent = editorInstance.getText();
        const startIndex = docContent.indexOf(textToFind);
        
        if (startIndex !== -1) {
            const from = startIndex + 1; // TipTap uses 1-based positions
            const to = from + textToFind.length;
            return { from, to };
        }
        
        return null;
    };
    
    // AI Tone and Voice Analysis - Enhanced with Learning Algorithm
    const analyzeToneAndVoice = async () => {
        if (!aiSessionId || !currentContent.trim()) return;
        
        await executeCommandWithLearning('toneCheck', async () => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentContent;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            const tonePrompt = createAdaptivePrompt(`🎭 COMPREHENSIVE TONE & VOICE ANALYSIS

Analyze the tone and voice of this essay with multiple specific suggestions:

ESSAY TEXT (${plainText.split(/\s+/).length} words): 
${plainText}

**PROVIDE 4-5 SPECIFIC TONE IMPROVEMENTS:**

**1. OVERALL TONE ASSESSMENT:**
- Current tone description and effectiveness for the document category
- One specific sentence that best represents their current tone (quote exactly)

**2. AUDIENCE ALIGNMENT:**
- How well does the tone match the target audience?
- One sentence that should be adjusted for better audience fit (quote and suggest replacement)

**3. CONSISTENCY CHECK:**
- Identify any tone shifts or inconsistencies
- Quote 1-2 sentences where tone feels inconsistent and suggest fixes

**4. CATEGORY-SPECIFIC TONE SUGGESTIONS:**
- Based on the document type, what tone improvements are most critical?
- Provide 2-3 specific word/phrase replacements that would better achieve the desired tone

**5. VOICE STRENGTHENING:**
- What would make their voice more distinctive and appropriate?
- Suggest one technique they can apply throughout their writing

Reference exact text from their essay and provide replacement suggestions. Use either [EDIT_SUGGESTION] tags or natural language like 'Instead of "current text", try "improved text" for better clarity.'`, 'toneCheck');

            setIsAiLoading(true);
            try {
                const response = await apiClient.post('/api/ai-bots/session/message', {
                    sessionId: aiSessionId,
                    message: tonePrompt
                });

                if (response.data.success) {
                    parseEditSuggestions(response.data.response, Date.now().toString());
                    
                    const aiMessage: AIMessage = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: response.data.response,
                        timestamp: new Date(),
                        type: 'analysis',
                        section: 'overall'
                    };
                    setAiMessages(prev => [...prev, aiMessage]);
                    toast.success('Tone analysis complete!');
                }
            } catch (error) {
                const fallbackHandled = await handleAIError(error, 'Tone Analysis');
                if (fallbackHandled) {
                    toast.success('Local tone analysis provided');
                }
            } finally {
                setIsAiLoading(false);
            }
        });
    };

    // AI Word Choice Suggestions - Enhanced with Learning Algorithm
    const suggestWordChoices = async () => {
        if (!aiSessionId || !currentContent.trim()) return;
        
        await executeCommandWithLearning('wordChoice', async () => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentContent;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            const wordChoicePrompt = createAdaptivePrompt(`As a professor-level English expert, analyze this essay for word choice improvements:

1. Identify overused or weak words (very, really, good, bad, thing, etc.)
2. Find opportunities for more descriptive, specific vocabulary
3. Suggest stronger verbs to replace weak verb + adverb combinations
4. Recommend metaphors or figurative language where appropriate
5. Point out any vocabulary that doesn't match the academic level required

For each suggestion, explain WHY the new word/phrase is stronger and provide 2-3 alternatives.

ESSAY TEXT: ${plainText}`, 'wordChoice');

            setIsAiLoading(true);
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId: aiSessionId,
                message: wordChoicePrompt
            });

            if (response.data.success) {
                parseEditSuggestions(response.data.response, Date.now().toString());
                
                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: 'analysis',
                    section: 'overall'
                };
                setAiMessages(prev => [...prev, aiMessage]);
                toast.success('Word choice analysis complete!');
            }
            setIsAiLoading(false);
        });
    };

    // AI Weak Phrase Detection - Enhanced with Learning Algorithm
    const findWeakPhrasesAI = async () => {
        if (!aiSessionId || !currentContent.trim()) return;
        
        await executeCommandWithLearning('weakPhrases', async () => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentContent;
            const plainText = tempDiv.textContent || tempDiv.innerText || '';
            
            const weakPhrasePrompt = createAdaptivePrompt(`As an elite writing coach, identify weak phrases and sentences that should be removed or strengthened:

1. WEAK OPENINGS: Sentences that start with "There are/is", "It is", vague phrases
2. REDUNDANT PHRASES: Repetitive ideas, unnecessary words
3. PASSIVE VOICE: Where active voice would be stronger
4. VAGUE LANGUAGE: Non-specific terms that could be more precise
5. FILLER WORDS: Unnecessary qualifiers and hedge words
6. WEAK TRANSITIONS: Overused connecting words

For each weak phrase, explain:
- WHY it weakens the writing
- HOW to fix it (specific replacement or deletion)
- The IMPACT of the change on the overall essay

Be specific with quotes from their text.

ESSAY TEXT: ${plainText}`, 'weakPhrases');

            setIsAiLoading(true);
            const response = await apiClient.post('/api/ai-bots/session/message', {
                sessionId: aiSessionId,
                message: weakPhrasePrompt
            });

            if (response.data.success) {
                parseEditSuggestions(response.data.response, Date.now().toString());
                
                const aiMessage: AIMessage = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: response.data.response,
                    timestamp: new Date(),
                    type: 'analysis',
                    section: 'overall'
                };
                setAiMessages(prev => [...prev, aiMessage]);
                toast.success('Weak phrase analysis complete!');
            }
            setIsAiLoading(false);
        });
    };

    // ====== INTELLIGENT DRAFT VERSIONING & USER STYLE LEARNING SYSTEM ======
    
    // Draft Version Interface
    interface DraftVersion {
        id: string;
        content: string;
        timestamp: Date;
        wordCount: number;
        changes: {
            type: 'addition' | 'deletion' | 'modification';
            position: number;
            oldText?: string;
            newText?: string;
            reason?: string; // user edit, AI suggestion applied, etc.
        }[];
        aiSuggestionsApplied: string[];
        userRejections: string[];
        editSource: 'user' | 'ai_applied' | 'ai_rejected';
    }

    // ====== INTELLIGENT EDITING ALGORITHM WITH EDUCATIONAL DATA ======

    // Advanced Essay Analysis Using Educational Data Patterns
    const analyzeEssayNeedsAlgorithmic = (content: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        const wordCount = plainText.split(/\s+/).length;
        const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
        const paragraphs = plainText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        // Educational Data-Based Analysis
        const issues = educationalKnowledge.commonIssues;
        const detectedIssues: { type: string, severity: number, count: number, suggestions: string[] }[] = [];
        
        // Detect weak openings (learned from teacher feedback)
        const firstSentences = sentences.slice(0, 3).join(' ');
        if (issues.weakOpenings.pattern.test(firstSentences)) {
            detectedIssues.push({
                type: 'weak_opening',
                severity: issues.weakOpenings.severity,
                count: 1,
                suggestions: issues.weakOpenings.suggestions
            });
        }
        
        // Detect passive voice patterns
        const passiveMatches = plainText.match(issues.passiveVoice.pattern) || [];
        if (passiveMatches.length > sentences.length * 0.25) {
            detectedIssues.push({
                type: 'passive_voice',
                severity: issues.passiveVoice.severity,
                count: passiveMatches.length,
                suggestions: issues.passiveVoice.suggestions
            });
        }
        
        // Detect vague words (from teacher marking patterns)
        let vagueWordCount = 0;
        issues.vagueWords.words.forEach(word => {
            const matches = plainText.toLowerCase().match(new RegExp(`\\b${word}\\b`, 'g')) || [];
            vagueWordCount += matches.length;
        });
        
        if (vagueWordCount > wordCount * 0.015) { // More than 1.5% vague words
            detectedIssues.push({
                type: 'vague_language',
                severity: issues.vagueWords.severity,
                count: vagueWordCount,
                suggestions: issues.vagueWords.suggestions
            });
        }
        
        // Detect weak conclusions
        const lastParagraph = paragraphs[paragraphs.length - 1] || '';
        if (issues.weakConclusions.pattern.test(lastParagraph)) {
            detectedIssues.push({
                type: 'weak_conclusion',
                severity: issues.weakConclusions.severity,
                count: 1,
                suggestions: issues.weakConclusions.suggestions
            });
        }
        
        // Determine writing context (essay, story, research, college application)
        const contextClues = {
            essay: /\b(thesis|argument|evidence|conclude|analyze)\b/gi,
            story: /\b(character|plot|dialogue|scene|narrative)\b/gi,
            research: /\b(study|data|methodology|findings|citation)\b/gi,
            college_application: /\b(university|college|admission|personal|growth|passion|future|goals|experience|impact)\b/gi
        };
        
        // Check if it's specifically a college application context
        const isCollegeApp = requirements.purpose?.toLowerCase().includes('admission') || 
                           requirements.purpose?.toLowerCase().includes('college') ||
                           requirements.purpose?.toLowerCase().includes('application') ||
                           requirements.audience?.toLowerCase().includes('admission') ||
                           requirements.audience?.toLowerCase().includes('college');
        
        let detectedContext = 'essay'; // default
        let maxMatches = 0;
        Object.entries(contextClues).forEach(([context, pattern]) => {
            const matches = (plainText.match(pattern) || []).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                detectedContext = context;
            }
        });
        
        // Override with college application if detected through requirements
        if (isCollegeApp) {
            detectedContext = 'college_application';
        }
        
        // Detect specific college essay types and common admissions mistakes
        let collegeEssayType = 'personal_statement'; // default
        let admissionsMistakes: { type: string, advice: string, count: number }[] = [];
        
        if (detectedContext === 'college_application') {
            // Detect essay type
            if (plainText.toLowerCase().includes('why') && plainText.toLowerCase().includes('major')) {
                collegeEssayType = 'why_major';
            } else if (wordCount < 300) {
                collegeEssayType = 'supplemental';
            }
            
            // Detect common admissions mistakes
            Object.entries(educationalKnowledge.admissionsCounselorAdvice.commonMistakes).forEach(([mistake, data]) => {
                const matches = plainText.match(data.detection) || [];
                if (matches.length > 0) {
                    admissionsMistakes.push({
                        type: mistake,
                        advice: data.advice,
                        count: matches.length
                    });
                }
            });
        }
        
        // Estimate current grade level based on patterns
        const gradeEstimate = estimateGradeLevel(detectedIssues, avgSentenceLength);
        const targetGrade = determineTargetGrade(requirements.audience);
        
        const analysis = {
            wordCount,
            sentences: sentences.length,
            paragraphs: paragraphs.length,
            avgSentenceLength,
            complexity: avgSentenceLength > 20 ? 'high' : avgSentenceLength > 15 ? 'medium' : 'low',
            detectedContext,
            currentGrade: gradeEstimate,
            targetGrade,
            detectedIssues,
            collegeEssayType: detectedContext === 'college_application' ? collegeEssayType : null,
            admissionsMistakes,
            needsStructure: wordCount > 100 && sentences.length < 3,
            needsToneWork: detectedIssues.some(i => i.type === 'weak_opening' || i.type === 'weak_conclusion'),
            needsWordChoice: detectedIssues.some(i => i.type === 'vague_language'),
            needsWeakPhraseRemoval: detectedIssues.some(i => i.type === 'passive_voice'),
            priority: [] as string[],
            improvementPath: [] as string[]
        };
        
        // Generate improvement path based on educational data
        if (gradeEstimate === 'C-level' && targetGrade !== 'C-level') {
            analysis.improvementPath = educationalKnowledge.gradePatterns.improvement_paths.C_to_B;
        } else if (gradeEstimate === 'B-level' && targetGrade === 'A-level') {
            analysis.improvementPath = educationalKnowledge.gradePatterns.improvement_paths.B_to_A;
        }
        
        // Priority based on detected issues severity and context
        const contextPriorities = (educationalKnowledge.contextualPatterns as any)[detectedContext]?.improvement_priority || [];
        const issuePriorities = detectedIssues
            .sort((a, b) => b.severity - a.severity)
            .map(issue => {
                switch(issue.type) {
                    case 'weak_opening': return 'intro';
                    case 'weak_conclusion': return 'conclusion';
                    case 'passive_voice': return 'weakPhrases';
                    case 'vague_language': return 'wordChoice';
                    default: return 'toneCheck';
                }
            });
        
        // Combine context priorities with detected issues
        analysis.priority = [...new Set([...issuePriorities, ...contextPriorities, 'fullReview'])].slice(0, 4);
        
        return analysis;
    };
    
    // Estimate grade level based on educational patterns
    const estimateGradeLevel = (issues: any[], avgSentenceLength: number): 'A-level' | 'B-level' | 'C-level' => {
        let score = 0.7; // Start at B-level
        
        // Deduct for issues
        issues.forEach(issue => {
            score -= issue.severity * 0.1;
        });
        
        // Adjust for complexity
        if (avgSentenceLength > 18) score += 0.1;
        if (avgSentenceLength < 12) score -= 0.1;
        
        // Determine grade
        if (score >= 0.8) return 'A-level';
        if (score >= 0.65) return 'B-level';
        return 'C-level';
    };
    
    // Determine target grade from requirements
    const determineTargetGrade = (audience?: string): 'A-level' | 'B-level' | 'C-level' => {
        if (!audience) return 'B-level';
        if (audience.toLowerCase().includes('college') || audience.toLowerCase().includes('university')) return 'A-level';
        if (audience.toLowerCase().includes('scholarship')) return 'A-level';
        return 'B-level';
    };

    // Calculate dynamic effectiveness percentages for each command
    const calculateCommandPriorities = (essayNeeds: ReturnType<typeof analyzeEssayNeedsAlgorithmic>) => {
        const commands = editingStats.commands;
        const priorities: { [key: string]: number } = {};
        
        // Base priority scores (0-1)
        const baseScores = {
            ideation: essayNeeds.wordCount < 100 ? 0.9 : 0.1,
            structure: essayNeeds.needsStructure ? 0.8 : 0.3,
            intro: essayNeeds.wordCount > 50 ? 0.7 : 0.2,
            conclusion: essayNeeds.wordCount > 100 ? 0.7 : 0.2,
            weakPhrases: essayNeeds.needsWeakPhraseRemoval ? 0.8 : 0.4,
            wordChoice: essayNeeds.needsWordChoice ? 0.8 : 0.5,
            toneCheck: essayNeeds.needsToneWork ? 0.8 : 0.6,
            fullReview: essayNeeds.wordCount > 150 ? 0.7 : 0.3
        };
        
        // Adjust based on historical effectiveness and recent usage
        Object.keys(commands).forEach(cmd => {
            const stats = (commands as any)[cmd];
            const recencyFactor = Date.now() - stats.lastUsed > 300000 ? 1.1 : 0.8; // 5 mins
            const effectivenessFactor = stats.effectiveness;
            const usageBalance = stats.used > 5 ? 0.9 : 1.0; // Slight reduction if overused
            
            priorities[cmd] = ((baseScores as any)[cmd] || 0.5) * effectivenessFactor * recencyFactor * usageBalance;
        });
        
        // Normalize to percentages
        const total = Object.values(priorities).reduce((sum, val) => sum + val, 0);
        Object.keys(priorities).forEach(cmd => {
            priorities[cmd] = Math.round((priorities[cmd] / total) * 100);
        });
        
        return priorities;
    };

    // Track command usage and success
    const trackCommandUsage = (commandName: string, wasSuccessful?: boolean) => {
        setEditingStats(prev => {
            const newStats = { ...prev };
            const cmd = (newStats.commands as any)[commandName];
            
            if (cmd) {
                cmd.used += 1;
                cmd.lastUsed = Date.now();
                
                if (wasSuccessful !== undefined) {
                    if (wasSuccessful) cmd.successful += 1;
                    // Recalculate effectiveness with exponential smoothing
                    const successRate = cmd.successful / cmd.used;
                    cmd.effectiveness = 0.7 * cmd.effectiveness + 0.3 * successRate;
                }
                
                // Update user behavior patterns
                const preferences = newStats.userBehavior.preferredCommands;
                const cmdIndex = preferences.indexOf(commandName);
                if (cmdIndex > -1) preferences.splice(cmdIndex, 1);
                preferences.unshift(commandName);
                if (preferences.length > 3) preferences.pop(); // Keep top 3
            }
            
            return newStats;
        });
    };

    // Generate adaptive AI prompt based on algorithmic analysis and educational data
    const createAdaptivePrompt = (basePrompt: string, commandName?: string) => {
        const essayNeeds = analyzeEssayNeedsAlgorithmic(currentContent);
        const priorities = calculateCommandPriorities(essayNeeds);
        
        let adaptivePrompt = createContextualPrompt(basePrompt);
        
        // Add algorithmic guidance
        adaptivePrompt += `\n\nALGORITHMIC ESSAY ANALYSIS:
- Word Count: ${essayNeeds.wordCount} words (${essayNeeds.sentences} sentences, ${essayNeeds.paragraphs} paragraphs)
- Complexity Level: ${essayNeeds.complexity}
- Detected Context: ${essayNeeds.detectedContext}
- Current Grade Estimate: ${essayNeeds.currentGrade}
- Target Grade: ${essayNeeds.targetGrade}
- Priority Needs: ${essayNeeds.priority.join(', ')}
- Command Effectiveness Ranking: ${Object.entries(priorities)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([cmd, pct]) => `${cmd}(${pct}%)`)
    .join(', ')}`;

        // Add college application specific guidance
        if (essayNeeds.detectedContext === 'college_application') {
            const essayTypeData = (educationalKnowledge.admissionsCounselorAdvice.essayTypes as any)[essayNeeds.collegeEssayType || 'personal_statement'];
            
            adaptivePrompt += `\n\nADMISSIONS COUNSELOR EXPERTISE:
- Essay Type: ${essayNeeds.collegeEssayType} (${essayTypeData?.word_limits.common || 650} word target)
- Required Tone: ${essayTypeData?.tone_requirements}
- Key Elements Needed: ${essayTypeData?.key_elements.join(', ')}
- Red Flags to Avoid: ${essayTypeData?.red_flags.join(', ')}
- Winning Patterns: ${essayTypeData?.winning_patterns.join(', ')}`;

            if (essayNeeds.admissionsMistakes.length > 0) {
                adaptivePrompt += `\n- DETECTED ADMISSIONS MISTAKES: ${essayNeeds.admissionsMistakes.map(m => `${m.type} (${m.count}x) - ${m.advice}`).join('; ')}`;
            }

            adaptivePrompt += `\n\nADMISSIONS COUNSELOR ADVICE:
${educationalKnowledge.admissionsCounselorAdvice.admissionsTips.authenticity_markers.map(tip => `- ${tip}`).join('\n')}`;
        }

        // Add detected issues with educational context
        if (essayNeeds.detectedIssues.length > 0) {
            adaptivePrompt += `\n\nDETECTED ISSUES (from teacher feedback patterns):`;
            essayNeeds.detectedIssues.forEach(issue => {
                adaptivePrompt += `\n- ${issue.type.toUpperCase()} (severity: ${Math.round(issue.severity * 100)}%): ${issue.suggestions.join(', ')}`;
            });
        }

        // Add personalized suggestions based on user's writing history
        const personalizedSuggestions = generatePersonalizedSuggestions(currentContent);
        if (personalizedSuggestions.length > 0) {
            adaptivePrompt += `\n\nPERSONALIZED INSIGHTS (based on user's writing history):
${personalizedSuggestions.map(s => `- ${s}`).join('\n')}`;
        }

        // Add user style profile insights
        const profile = userWritingProfile;
        adaptivePrompt += `\n\nUSER WRITING STYLE PROFILE:
- Typical Sentence Length: ${Math.round(profile.styleMetrics.avgSentenceLength)} words
- Vocabulary Level: ${profile.styleMetrics.vocabularyLevel}
- Complexity Preference: ${profile.styleMetrics.complexityPreference}
- AI Suggestion Acceptance Rate: ${Math.round(profile.behavioralData.acceptanceRate * 100)}%`;

        // Add preferred edit types
        const preferredEdits = Array.from(profile.behavioralData.preferredEditTypes.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([type, score]) => `${type}(${Math.round(score * 10)}/10)`)
            .join(', ');
        
        if (preferredEdits) {
            adaptivePrompt += `\n- Preferred Edit Types: ${preferredEdits}`;
        }

        // Add words the user typically uses/avoids
        const favoriteWords = Array.from(profile.writingPatterns.favoriteWords.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word)
            .join(', ');
            
        const avoidedWords = Array.from(profile.writingPatterns.avoidedWords.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([word]) => word)
            .join(', ');

        if (favoriteWords) {
            adaptivePrompt += `\n- Frequently Used Words: ${favoriteWords}`;
        }
        if (avoidedWords) {
            adaptivePrompt += `\n- Words User Typically Avoids: ${avoidedWords}`;
        }

        adaptivePrompt += `\n\nADAPTIVE FOCUS: ${commandName ? `Since "${commandName}" was requested, focus ${priorities[commandName] || 50}% of your response on this area.` : 'Prioritize suggestions in the order listed above.'}

As an AI with access to patterns from thousands of teacher feedback sessions, admissions counselor reviews, AND this user's specific writing history and preferences, adjust your response to match their personal style while guiding improvement. Be as specific and actionable as a real counselor who has worked with this student multiple times.`;
        
        return adaptivePrompt;
    };

    // Enhanced command execution with learning
    const executeCommandWithLearning = async (commandName: string, commandFunction: () => Promise<void>) => {
        trackCommandUsage(commandName);
        
        try {
            await commandFunction();
            // Track success after a delay to see if user accepts suggestions
            setTimeout(() => {
                const hadPendingEdits = pendingEdits.length > 0;
                trackCommandUsage(commandName, hadPendingEdits);
            }, 2000);
        } catch (error) {
            trackCommandUsage(commandName, false);
            throw error;
        }
    };

    // ====== USER WRITING STYLE ANALYSIS & LEARNING FUNCTIONS ======

    // Analyze user's writing style from content
    const analyzeUserWritingStyle = (content: string, previousContent?: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = content;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = plainText.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        const paragraphs = plainText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
        
        // Calculate style metrics
        const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
        
        // Analyze vocabulary level
        const complexWords = words.filter(word => word.length > 6).length;
        const vocabularyLevel = complexWords / words.length > 0.3 ? 'advanced' : 
                              complexWords / words.length > 0.15 ? 'intermediate' : 'basic';
        
        // Analyze sentence starters
        const sentenceStarters = new Map<string, number>();
        sentences.forEach(sentence => {
            const starter = sentence.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase();
            sentenceStarters.set(starter, (sentenceStarters.get(starter) || 0) + 1);
        });
        
        // Track word frequency
        const wordFreq = new Map<string, number>();
        words.forEach(word => {
            if (word.length > 3) { // Focus on meaningful words
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        });
        
        // Detect changes if previous content exists
        const changes: DraftVersion['changes'] = [];
        if (previousContent) {
            changes.push(...detectContentChanges(previousContent, content));
        }
        
        return {
            metrics: {
                avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
                vocabularyLevel,
                complexityPreference: avgSentenceLength > 18 ? 'high' : avgSentenceLength > 12 ? 'medium' : 'low',
                paragraphLength: paragraphs.length > 0 ? (words.length / paragraphs.length > 100 ? 'long' : 'medium') : 'short'
            },
            patterns: {
                sentenceStarters,
                wordFreq,
                totalWords: words.length,
                totalSentences: sentences.length,
                totalParagraphs: paragraphs.length
            },
            changes
        };
    };

    // Detect specific changes between two versions of content
    const detectContentChanges = (oldContent: string, newContent: string): DraftVersion['changes'] => {
        const changes: DraftVersion['changes'] = [];
        
        // Simple diff algorithm - can be enhanced with more sophisticated diff libraries
        const oldWords = oldContent.split(/\s+/);
        const newWords = newContent.split(/\s+/);
        
        // Basic change detection (this can be enhanced with proper diff algorithms)
        if (newWords.length > oldWords.length) {
            changes.push({
                type: 'addition',
                position: oldWords.length,
                newText: newWords.slice(oldWords.length).join(' '),
                reason: 'user_edit'
            });
        } else if (newWords.length < oldWords.length) {
            changes.push({
                type: 'deletion',
                position: newWords.length,
                oldText: oldWords.slice(newWords.length).join(' '),
                reason: 'user_edit'
            });
        } else {
            // Check for modifications
            for (let i = 0; i < oldWords.length; i++) {
                if (oldWords[i] !== newWords[i]) {
                    changes.push({
                        type: 'modification',
                        position: i,
                        oldText: oldWords[i],
                        newText: newWords[i],
                        reason: 'user_edit'
                    });
                }
            }
        }
        
        return changes;
    };

    // Save draft version with style analysis
    const saveDraftVersion = (content: string, editSource: DraftVersion['editSource'], appliedSuggestions: string[] = [], rejectedSuggestions: string[] = []) => {
        const previousContent = draftHistory.length > 0 ? draftHistory[draftHistory.length - 1].content : '';
        const analysis = analyzeUserWritingStyle(content, previousContent);
        
        const newVersion: DraftVersion = {
            id: `draft_${Date.now()}`,
            content,
            timestamp: new Date(),
            wordCount: analysis.patterns.totalWords,
            changes: analysis.changes,
            aiSuggestionsApplied: appliedSuggestions,
            userRejections: rejectedSuggestions,
            editSource
        };
        
        setDraftHistory(prev => [...prev, newVersion]);
        setCurrentVersionId(newVersion.id);
        
        // Update user writing profile with new analysis
        updateUserWritingProfile(analysis);
        
        return newVersion;
    };

    // Update user writing profile based on analysis
    const updateUserWritingProfile = (analysis: ReturnType<typeof analyzeUserWritingStyle>) => {
        setUserWritingProfile(prev => {
            const updated = { ...prev };
            
            // Update style metrics with exponential moving average
            const alpha = 0.3; // Learning rate
            updated.styleMetrics.avgSentenceLength = 
                alpha * analysis.metrics.avgSentenceLength + (1 - alpha) * prev.styleMetrics.avgSentenceLength;
            updated.styleMetrics.vocabularyLevel = analysis.metrics.vocabularyLevel;
            updated.styleMetrics.complexityPreference = analysis.metrics.complexityPreference;
            updated.styleMetrics.paragraphLength = analysis.metrics.paragraphLength;
            
            // Update writing patterns
            analysis.patterns.sentenceStarters.forEach((count, starter) => {
                const current = prev.writingPatterns.sentenceStarters.get(starter) || 0;
                updated.writingPatterns.sentenceStarters.set(starter, current + count);
            });
            
            analysis.patterns.wordFreq.forEach((count, word) => {
                const current = prev.writingPatterns.favoriteWords.get(word) || 0;
                updated.writingPatterns.favoriteWords.set(word, current + count);
            });
            
            return updated;
        });
    };

    // Generate personalized suggestions based on user's writing history
    const generatePersonalizedSuggestions = (currentContent: string): string[] => {
        const analysis = analyzeUserWritingStyle(currentContent);
        const suggestions: string[] = [];
        const profile = userWritingProfile;
        
        // Get current writing type context
        const currentCategory = writingTypes[writingType as keyof typeof writingTypes];
        const wordCount = currentContent.split(/\s+/).length;
        
        // Writing type specific suggestions
        if (writingType !== 'auto-detect' && currentCategory) {
            switch (writingType) {
                case 'academic-essay':
                    if (!currentContent.toLowerCase().includes('thesis') && wordCount > 100) {
                        suggestions.push('Academic essays need a clear thesis statement. Consider adding one.');
                    }
                    if (currentContent.split('.').length < wordCount / 20) {
                        suggestions.push('Academic writing benefits from evidence and citations. Add supporting details.');
                    }
                    break;
                    
                case 'narrative-essay':
                case 'short-story':
                case 'long-story':
                    const dialogueCount = (currentContent.match(/"/g) || []).length;
                    if (dialogueCount === 0 && wordCount > 200) {
                        suggestions.push('Narratives come alive with dialogue. Consider adding character conversations.');
                    }
                    if (!currentContent.match(/\b(felt|saw|heard|smelled|tasted)\b/i) && wordCount > 100) {
                        suggestions.push('Use sensory details to create vivid imagery and engage readers.');
                    }
                    break;
                    
                case 'college-app-essay':
                    if (!currentContent.toLowerCase().match(/\b(i|my|me)\b/) && wordCount > 50) {
                        suggestions.push('College essays should showcase your personal voice and experiences.');
                    }
                    if (wordCount > 650) {
                        suggestions.push('College essays have strict word limits. Consider condensing your ideas.');
                    }
                    break;
                    
                case 'why-college-essay':
                    if (!currentContent.toLowerCase().includes('because') && wordCount > 100) {
                        suggestions.push('Why college essays need specific reasons. Use "because" to strengthen your arguments.');
                    }
                    if (!currentContent.match(/\b(program|major|school|university|college)\b/i)) {
                        suggestions.push('Reference specific programs, professors, or opportunities at the institution.');
                    }
                    break;
                    
                case 'memoir':
                case 'autobiography':
                    if (!currentContent.match(/\b(remember|recall|looking back|years ago)\b/i) && wordCount > 100) {
                        suggestions.push('Memoirs benefit from reflective language that shows temporal distance.');
                    }
                    break;
            }
        }
        
        // Enhanced general suggestions based on user patterns
        if (analysis.metrics.avgSentenceLength < profile.styleMetrics.avgSentenceLength - 3) {
            const context = writingType === 'academic-essay' ? 'Academic writing' : 
                           writingType.includes('story') ? 'Narratives' : 'Your writing';
            suggestions.push(`${context} can benefit from varied sentence length. You typically write longer, more complex sentences.`);
        } else if (analysis.metrics.avgSentenceLength > profile.styleMetrics.avgSentenceLength + 3) {
            suggestions.push("Your sentences are longer than usual. Consider breaking some into shorter, clearer statements.");
        }
        
        // Vocabulary suggestions with context
        if (analysis.metrics.vocabularyLevel !== profile.styleMetrics.vocabularyLevel) {
            if (profile.styleMetrics.vocabularyLevel === 'advanced' && analysis.metrics.vocabularyLevel === 'intermediate') {
                const vocab = writingType === 'academic-essay' ? 'scholarly terminology' :
                             writingType.includes('creative') ? 'literary devices' : 'sophisticated terms';
                suggestions.push(`Consider using more ${vocab} where appropriate.`);
            }
        }
        
        // Custom goals integration
        if (customWritingGoals && wordCount > 50) {
            if (customWritingGoals.toLowerCase().includes('persuasive') && !currentContent.match(/\b(should|must|need to|important)\b/i)) {
                suggestions.push('For persuasive writing, use strong action words and imperatives.');
            }
            if (customWritingGoals.toLowerCase().includes('descriptive') && !currentContent.match(/\b(vivid|bright|soft|rough|smooth)\b/i)) {
                suggestions.push('Descriptive writing needs sensory adjectives and specific details.');
            }
        }
        
        // Check for overused words with writing type context
        const favoriteWords = Array.from(profile.writingPatterns.favoriteWords.entries())
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        analysis.patterns.wordFreq.forEach((count, word) => {
            if (count > 3 && favoriteWords.find(([w]) => w === word)) {
                suggestions.push(`You frequently use "${word}". Consider synonyms to add variety.`);
            }
        });
        
        // Sentence starter variety with genre awareness
        const starterCounts = Array.from(analysis.patterns.sentenceStarters.entries());
        const repetitiveStarters = starterCounts.filter(([,count]) => count > 2);
        if (repetitiveStarters.length > 0) {
            const starter = repetitiveStarters[0][0];
            const improvement = writingType.includes('story') ? 
                'Try varying your sentence beginnings with action, dialogue, or description' :
                writingType === 'academic-essay' ? 
                'Use transition words and varied sentence beginnings for better flow' :
                'Try varying your sentence beginnings';
            suggestions.push(`You're starting multiple sentences with "${starter}". ${improvement}.`);
        }
        
        return suggestions.slice(0, 5); // Limit to 5 most relevant suggestions
    };

    // Continuous intelligent document analysis
    const performContinuousAnalysis = (content: string) => {
        const now = Date.now();
        const plainText = content.replace(/<[^>]*>/g, ''); // Strip HTML
        const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
        
        // Only analyze if there's sufficient content and enough time has passed
        if (wordCount < 10 || now - lastAnalysisTime < 5000) return; // 5 second throttle
        
        // Clear existing timer
        if (analysisTimer) {
            clearTimeout(analysisTimer);
        }
        
        // Set new analysis timer (debounced)
        const newTimer = setTimeout(async () => {
            try {
                setIsAnalyzing(true);
                setLastAnalysisTime(now);
                
                // Auto-detect writing type if set to auto-detect
                if (writingType === 'auto-detect' && wordCount > 50) {
                    const detectedCategory = analyzeDocumentCategory(plainText);
                    if (detectedCategory && detectedCategory.confidence > 0.7 && detectedCategory.category) {
                        setWritingType(String(detectedCategory.category).toLowerCase().replace(/\s+/g, '-'));
                        
                        // Send notification to AI about detected category
                        if (aiSessionId) {
                            setTimeout(() => {
                                sendMessageToAi(`I've detected your writing type as "${detectedCategory.category}" with ${Math.round(detectedCategory.confidence * 100)}% confidence. I'm now providing suggestions specific to this writing type. Let me know if this seems correct or if you'd like to adjust it.`);
                            }, 1000);
                        }
                    }
                }
                
                // Generate contextual suggestions based on writing progress
                const suggestions = generatePersonalizedSuggestions(plainText);
                
                // Milestone-based AI insights
                const milestones = [
                    { words: 50, message: "Great start! Your opening is taking shape." },
                    { words: 150, message: "You're building momentum. Consider if your main argument/theme is clear." },
                    { words: 300, message: "Strong progress! This is a good point to review structure and flow." },
                    { words: 500, message: "Excellent depth! Make sure your conclusion will tie everything together." },
                    { words: 750, message: "Substantial content! Consider refining your strongest points." },
                    { words: 1000, message: "Impressive length! Time to polish and ensure every paragraph serves your main purpose." }
                ];
                
                const currentMilestone = milestones.reverse().find(m => wordCount >= m.words);
                
                // Send milestone-based AI suggestion  
                if (currentMilestone && aiSessionId && wordCount >= currentMilestone.words) {
                    // Check if we haven't sent this milestone message before
                    const milestoneKey = `milestone_${currentMilestone.words}`;
                    const lastMilestone = localStorage.getItem(milestoneKey);
                    
                    if (!lastMilestone || Date.now() - parseInt(lastMilestone) > 300000) { // 5 minutes
                        localStorage.setItem(milestoneKey, now.toString());
                        
                        setTimeout(async () => {
                            const analysisPrompt = `**PROGRESS MILESTONE: ${wordCount} words**
                            
${currentMilestone.message}

Based on my analysis of your current content, here are specific suggestions to strengthen your ${writingTypes[writingType as keyof typeof writingTypes]?.name || 'writing'}:

${suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}

What would you like me to focus on next?`;
                            
                            await sendMessageToAi(analysisPrompt);
                        }, 2000);
                    }
                }
                
            } catch (error) {
                console.error('Continuous analysis error:', error);
            } finally {
                setIsAnalyzing(false);
            }
        }, 2000); // 2 second debounce
        
        setAnalysisTimer(newTimer);
    };

    // Learn from user's acceptance/rejection of AI suggestions
    const learnFromUserFeedback = (suggestion: string, wasAccepted: boolean, suggestionType: string) => {
        setUserWritingProfile(prev => {
            const updated = { ...prev };
            
            // Update acceptance rate
            const totalFeedback = updated.behavioralData.acceptanceRate * 10; // Rough estimate
            updated.behavioralData.acceptanceRate = 
                (totalFeedback + (wasAccepted ? 1 : 0)) / (Math.floor(totalFeedback) + 1);
            
            // Track preferred edit types
            const current = updated.behavioralData.preferredEditTypes.get(suggestionType) || 0;
            updated.behavioralData.preferredEditTypes.set(
                suggestionType, 
                current + (wasAccepted ? 1 : -0.5)
            );
            
            // Learn about avoided suggestions
            if (!wasAccepted) {
                const words = suggestion.toLowerCase().split(/\s+/);
                words.forEach(word => {
                    if (word.length > 3) {
                        const current = updated.writingPatterns.avoidedWords.get(word) || 0;
                        updated.writingPatterns.avoidedWords.set(word, current + 1);
                    }
                });
            }
            
            return updated;
        });
    };

    // Enhanced applyAIEdit with learning
    const applyAIEditWithLearning = async (message: AIMessage) => {
        if (!message.suggestedEdit) return;
        
        const previousContent = currentContent;
        
        // Apply the edit
        await applyAIEdit(message);
        
        // Learn from the acceptance
        learnFromUserFeedback(message.content, true, message.type || 'general');
        
        // Save new draft version
        saveDraftVersion(currentContent, 'ai_applied', [message.id], []);
        
        // Update user profile based on what they accepted
        setTimeout(() => {
            analyzeAcceptedEdit(previousContent, currentContent);
        }, 100);
    };

    // Analyze what the user accepted to learn their preferences
    const analyzeAcceptedEdit = (beforeContent: string, afterContent: string) => {
        const changes = detectContentChanges(beforeContent, afterContent);
        
        setUserWritingProfile(prev => {
            const updated = { ...prev };
            
            // Learn about successful edit types
            changes.forEach(change => {
                if (change.newText) {
                    // Track improvements user accepts
                    const words = change.newText.toLowerCase().split(/\s+/);
                    words.forEach(word => {
                        if (word.length > 3) {
                            const current = updated.writingPatterns.favoriteWords.get(word) || 0;
                            updated.writingPatterns.favoriteWords.set(word, current + 0.5);
                        }
                    });
                }
            });
            
            return updated;
        });
    };

    // Save draft
    const saveDraft = async () => {
        if (!currentContent.trim()) return;
        try {
            const response = await apiClient.post('/api/documents/save-draft', {
                content: currentContent,
                aiInteractions: aiMessages.length,
                sessionType: isUrgentSession ? 'urgent' : 'regular',
                title: uploadedDocument?.name || `Essay Draft ${new Date().toLocaleDateString()}`
            });
            if (response.data.success) {
                setIsDraftSaved(true);
                toast.success('Draft saved successfully!');
            }
        } catch (error) {
            toast.error('Failed to save draft');
        }
    };
    

    // End urgent session and return to trust graph
    const endUrgentSession = async () => {
        if (!routeSessionId) return;
        
        try {
            await apiClient.post(`/api/ai-bots/urgent-sessions/${routeSessionId}/end`);
            toast.success('Session ended successfully');
            navigate('/trust-graph');
        } catch (error) {
            console.error('Error ending session:', error);
            toast.error('Failed to end session');
        }
    };
    

    return (
        <AppLayout user={user} setUser={() => {}}>
            <div className="w-full h-full flex flex-col bg-slate-950 text-white font-sans overflow-hidden">
                {/* CSS Styles for AI Suggestion Highlighting */}
                <style>{`
                    .ai-suggestion-highlight {
                        background-color: rgba(59, 130, 246, 0.3) !important;
                        border: 2px solid #3b82f6 !important;
                        border-radius: 4px;
                        padding: 2px;
                        animation: pulse 2s infinite;
                    }
                    
                    .ai-edit-applied {
                        background-color: rgba(16, 185, 129, 0.4) !important;
                        border: 2px solid #10b981 !important;
                        border-radius: 4px;
                        padding: 2px;
                        animation: fadeInOut 2s ease-in-out;
                    }
                    
                    @keyframes pulse {
                        0%, 100% { opacity: 0.7; }
                        50% { opacity: 1; }
                    }
                    
                    @keyframes fadeInOut {
                        0% { opacity: 0.8; background-color: rgba(16, 185, 129, 0.6); }
                        50% { opacity: 1; background-color: rgba(16, 185, 129, 0.4); }
                        100% { opacity: 0.6; background-color: rgba(16, 185, 129, 0.2); }
                    }
                    
                    .suggestion-panel-enhanced {
                        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(99, 102, 241, 0.1));
                        border: 1px solid rgba(59, 130, 246, 0.3);
                    }
                `}</style>
                {/* Session Header with Controls */}
                <div className="flex-shrink-0 flex justify-between items-center px-4 sm:px-6 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <FileEdit className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <h1 className="text-sm font-medium text-white">
                                {isUrgentSession 
                                    ? 'Urgent AI Essay Session'
                                    : isLiveSession 
                                        ? 'Live Essay Editing Session'
                                        : collaborators.length > 0 
                                            ? 'Collaborative Essay Editor' 
                                            : 'AI Essay Editor'
                                }
                            </h1>
                            <p className="text-xs text-slate-400">
                                {isLiveSession
                                    ? `Live session with teacher • ${user.username}`
                                    : collaborators.length > 0 
                                        ? `${user.username} + ${collaborators.length} collaborators`
                                        : user.username
                                }
                            </p>
                        </div>
                        {uploadedDocument && (
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                <File className="h-3 w-3 mr-1" />
                                {uploadedDocument.title || uploadedDocument.name}
                            </Badge>
                        )}
                        {isLiveSession && (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                                <RadioTower className="h-3 w-3 mr-1" />
                                Live Session
                            </Badge>
                        )}
                        {aiMentor && !isLiveSession && (
                            <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                                <Bot className="h-3 w-3 mr-1" />
                                {aiMentor.bot_name}
                            </Badge>
                        )}
                    </div>
                    
                    {/* Session Controls */}
                    <div className="flex items-center gap-2">
                        {isUrgentSession && (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                onClick={endUrgentSession}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                End Session
                            </Button>
                        )}
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(isUrgentSession ? '/trust-graph' : '/dashboard')} 
                            className="text-slate-300 hover:bg-slate-800"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> 
                            {isUrgentSession ? 'Back to Trust Graph' : 'Back to Dashboard'}
                        </Button>
                    </div>
                </div>
            <main className="flex-grow flex overflow-hidden gap-4 p-4">
                {/* Editor Section */}
                <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-blue-400" />
                            Your Essay
                            {isAnalyzing && (
                                <div className="flex items-center gap-1 text-xs text-cyan-400">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    AI Analyzing...
                                </div>
                            )}
                        </h2>
                        <div className="flex gap-2 flex-wrap">
                            <Button
                                size="sm"
                                onClick={startIdeationSession}
                                disabled={!aiSessionId || isAiLoading || isIdeationMode}
                                className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-xs"
                            >
                                <Brain className="h-3 w-3 mr-1" />
                                Ideation
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => analyzeEssaySection('intro')}
                                disabled={!aiSessionId || isAiLoading}
                                className="bg-green-600 hover:bg-green-700 text-xs"
                            >
                                <Target className="h-3 w-3 mr-1" />
                                Intro
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => analyzeEssaySection('structure')}
                                disabled={!aiSessionId || isAiLoading}
                                className="bg-yellow-600 hover:bg-yellow-700 text-xs"
                            >
                                <Zap className="h-3 w-3 mr-1" />
                                Structure
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => analyzeEssaySection('conclusion')}
                                disabled={!aiSessionId || isAiLoading}
                                className="bg-orange-600 hover:bg-orange-700 text-xs"
                            >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Conclusion
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => downloadDocument('docx')}
                                className="bg-blue-600 hover:bg-blue-700 text-xs"
                            >
                                <Download className="h-3 w-3 mr-1" />
                                Word
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => downloadDocument('pdf')}
                                className="bg-red-600 hover:bg-red-700 text-xs"
                            >
                                <Download className="h-3 w-3 mr-1" />
                                PDF
                            </Button>
                            <Button
                                size="sm"
                                onClick={saveDraft}
                                disabled={isDraftSaved}
                                className={`text-xs ${isDraftSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                            >
                                <Save className="h-3 w-3 mr-1" />
                                {isDraftSaved ? 'Saved' : 'Save Draft'}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setShowRequirements(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-xs"
                            >
                                <Settings className="h-3 w-3 mr-1" />
                                Requirements
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setShowContextModal(true)}
                                className="bg-teal-600 hover:bg-teal-700 text-xs"
                            >
                                <Palette className="h-3 w-3 mr-1" />
                                Context
                            </Button>
                            <Button
                                size="sm"
                                onClick={analyzeToneAndVoice}
                                disabled={!aiSessionId || isAiLoading || !currentContent.trim()}
                                className="bg-amber-600 hover:bg-amber-700 text-xs"
                            >
                                <Wand2 className="h-3 w-3 mr-1" />
                                Tone Check
                            </Button>
                            <Button
                                size="sm"
                                onClick={suggestWordChoices}
                                disabled={!aiSessionId || isAiLoading || !currentContent.trim()}
                                className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                            >
                                <FileText className="h-3 w-3 mr-1" />
                                Word Choice
                            </Button>
                            <Button
                                size="sm"
                                onClick={findWeakPhrasesAI}
                                disabled={!aiSessionId || isAiLoading || !currentContent.trim()}
                                className="bg-red-600 hover:bg-red-700 text-xs"
                            >
                                <Target className="h-3 w-3 mr-1" />
                                Weak Phrases
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setShowVersionHistory(true)}
                                className="bg-slate-600 hover:bg-slate-700 text-xs"
                            >
                                <FileText className="h-3 w-3 mr-1" />
                                History ({draftHistory.length})
                            </Button>
                            <Button
                                onClick={requestAiFeedback}
                                disabled={!aiSessionId || isAiLoading}
                                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                Full Review
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <CollaborativeEditor 
                            documentId={docId} 
                            username={user.username} 
                            color={userColor}
                            aiSessionId={aiSessionId || undefined}
                            sessionId={routeSessionId || sessionParam || docId}
                            initialContent={currentContent}
                            onContentChange={handleContentChange}
                            onCollaboratorsChange={setCollaborators}
                            onSelectionChange={handleSelectionChange}
                            onContentUpdate={(content) => {
                                setCurrentContent(content);
                                performContinuousAnalysis(content);
                            }}
                            onEditorReady={(editor) => {
                                console.log('[EDITOR] Editor instance received:', editor);
                                setEditorInstance(editor);
                            }}
                        />
                        
                        {/* Floating Selection Menu */}
                        {showSelectionMenu && selectedText && (
                            <div 
                                className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-lg p-2"
                                style={{
                                    left: `${menuPosition.x - 120}px`,
                                    top: `${menuPosition.y}px`,
                                    transform: 'translateX(-50%)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Quick Analysis Buttons */}
                                <div className="flex gap-2 mb-2 pb-2 border-b border-slate-600">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-blue-300 hover:bg-blue-500/20"
                                        onClick={() => analyzeSelectedText(selectedText, 'improve')}
                                        disabled={isAiLoading}
                                    >
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Improve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-green-300 hover:bg-green-500/20"
                                        onClick={() => analyzeSelectedText(selectedText, 'grammar')}
                                        disabled={isAiLoading}
                                    >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Grammar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-yellow-300 hover:bg-yellow-500/20"
                                        onClick={() => analyzeSelectedText(selectedText, 'clarity')}
                                        disabled={isAiLoading}
                                    >
                                        <Eye className="h-3 w-3 mr-1" />
                                        Clarity
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-purple-300 hover:bg-purple-500/20"
                                        onClick={() => analyzeSelectedText(selectedText, 'style')}
                                        disabled={isAiLoading}
                                    >
                                        <Target className="h-3 w-3 mr-1" />
                                        Style
                                    </Button>
                                </div>
                                
                                {/* Comment Options */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-orange-300 hover:bg-orange-500/20"
                                        onClick={() => addCommentToText(selectedText, 'suggestion')}
                                        disabled={isAiLoading}
                                    >
                                        <MessageCircle className="h-3 w-3 mr-1" />
                                        Comment
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-xs text-cyan-300 hover:bg-cyan-500/20"
                                        onClick={() => addCommentToText(selectedText, 'feedback')}
                                        disabled={isAiLoading}
                                    >
                                        <Brain className="h-3 w-3 mr-1" />
                                        Feedback
                                    </Button>
                                </div>
                            </div>
                        )}
                        
                        {/* Microsoft Office-like Comment Bubbles */}
                        {textComments.map(comment => (
                            <div
                                key={comment.id}
                                className="fixed z-40 bg-white dark:bg-slate-900 border-2 border-orange-400 rounded-lg shadow-lg p-3 max-w-xs"
                                style={{
                                    left: `${comment.position.x}px`,
                                    top: `${comment.position.y}px`,
                                    transform: 'translateY(-50%)'
                                }}
                            >
                                {/* Arrow pointing to text */}
                                <div 
                                    className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1"
                                    style={{
                                        width: 0,
                                        height: 0,
                                        borderTop: '8px solid transparent',
                                        borderBottom: '8px solid transparent',
                                        borderRight: '8px solid #fb923c'
                                    }}
                                />
                                
                                {/* Comment Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                            comment.type === 'suggestion' ? 'bg-blue-400' :
                                            comment.type === 'feedback' ? 'bg-green-400' : 'bg-orange-400'
                                        }`} />
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            {comment.type.charAt(0).toUpperCase() + comment.type.slice(1)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeComment(comment.id)}
                                        className="text-slate-400 hover:text-red-500 text-xs"
                                        title="Remove comment"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                                
                                {/* Selected Text */}
                                <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 mb-2">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Selected:</div>
                                    <div className="text-xs italic text-slate-700 dark:text-slate-300">
                                        "{comment.text.length > 50 ? comment.text.substring(0, 50) + '...' : comment.text}"
                                    </div>
                                </div>
                                
                                {/* AI Comment */}
                                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {comment.comment}
                                </div>
                                
                                {/* Comment Footer */}
                                <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                                    <span>{comment.timestamp.toLocaleTimeString()}</span>
                                    <button
                                        onClick={() => setShowCommentBubble(showCommentBubble === comment.id ? null : comment.id)}
                                        className="text-blue-500 hover:text-blue-700"
                                    >
                                        {showCommentBubble === comment.id ? 'Collapse' : 'Expand'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Assistant / Live Session Panel */}
                <div className="w-96 flex flex-col bg-slate-900/50 rounded-lg border border-slate-700">
                    <div className="p-4 border-b border-slate-700">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            {isLiveSession ? (
                                <>
                                    <Users className="h-5 w-5 text-green-400" />
                                    Live Session Chat
                                </>
                            ) : (
                                <>
                                    <Bot className="h-5 w-5 text-cyan-400" />
                                    {isUrgentSession ? 'AI Essay Supervisor' : 'AI Writing Assistant'}
                                </>
                            )}
                        </h3>
                        {isLiveSession ? (
                            <p className="text-sm text-slate-400 mt-1">
                                Communicate with your teacher and classmates
                            </p>
                        ) : aiMentor ? (
                            <p className="text-sm text-slate-400 mt-1">
                                {aiMentor.specialization_focus}
                            </p>
                        ) : null}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-96">
                        {aiMessages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {message.role === 'assistant' && (
                                    <Avatar className="h-8 w-8 flex-shrink-0">
                                        <AvatarFallback className={cn(
                                            "text-white",
                                            message.type === 'proactive' ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                                            message.type === 'analysis' ? "bg-gradient-to-r from-purple-500 to-violet-500" :
                                            message.type === 'question' ? "bg-gradient-to-r from-orange-500 to-red-500" :
                                            "bg-gradient-to-r from-cyan-500 to-blue-500"
                                        )}>
                                            {message.type === 'proactive' ? <Zap className="h-4 w-4" /> :
                                             message.type === 'analysis' ? <Target className="h-4 w-4" /> :
                                             message.type === 'question' ? <HelpCircle className="h-4 w-4" /> :
                                             <Bot className="h-4 w-4" />}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                                <div className="max-w-xs flex-1">
                                    {/* Message type indicator */}
                                    {message.role === 'assistant' && message.type && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge className={cn(
                                                "text-xs px-2 py-0.5",
                                                message.type === 'proactive' ? "bg-green-500/20 text-green-300 border-green-500/30" :
                                                message.type === 'analysis' ? "bg-purple-500/20 text-purple-300 border-purple-500/30" :
                                                message.type === 'question' ? "bg-orange-500/20 text-orange-300 border-orange-500/30" :
                                                "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                                            )}>
                                                {message.type === 'proactive' ? 'AI Suggestion' :
                                                 message.type === 'analysis' ? `${message.section?.charAt(0).toUpperCase()}${message.section?.slice(1)} Analysis` :
                                                 message.type === 'question' ? 'Question' :
                                                 'Feedback'}
                                            </Badge>
                                            {message.selectedText && (
                                                <Badge className="bg-slate-600/50 text-slate-300 text-xs px-1 py-0.5">
                                                    Selected Text
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Show selected text if available */}
                                    {message.selectedText && (
                                        <div className="bg-slate-700/50 border border-slate-600 rounded p-2 mb-2">
                                            <div className="text-xs text-slate-400 mb-1">Selected text:</div>
                                            <div className="text-xs italic text-slate-300">"{message.selectedText}"</div>
                                        </div>
                                    )}
                                    
                                    <div className={`p-3 rounded-lg ${
                                        message.role === 'user' 
                                            ? 'bg-blue-600 text-white' 
                                            : 'bg-slate-800 text-slate-200'
                                    }`}>
                                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                        <div className="text-xs mt-2 opacity-70">
                                            {message.timestamp.toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isAiLoading && (
                            <div className="flex gap-3 justify-start">
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                                        <Bot className="h-4 w-4" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="bg-slate-800 text-slate-200 p-3 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">AI is thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-700">
                        <div className="flex gap-2">
                            <Textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={isLiveSession 
                                    ? "Send a message to the class..." 
                                    : isIdeationMode 
                                        ? "Share your thoughts and experiences..." 
                                        : "Ask for writing help, feedback, or suggestions..."
                                }
                                className="flex-1 bg-slate-800 border-slate-600 text-white resize-none"
                                rows={2}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (isLiveSession) {
                                            // For live sessions, we would send to all participants
                                            // This would require WebSocket implementation
                                            console.log('Live session message:', userInput);
                                            toast.info('Live session messaging will be available when WebSocket server is running');
                                            setUserInput('');
                                        } else if (isIdeationMode) {
                                            handleIdeationResponse(userInput);
                                            setUserInput('');
                                        } else {
                                            sendMessageToAi(userInput);
                                        }
                                    }
                                }}
                            />
                            <Button
                                onClick={() => {
                                    if (isLiveSession) {
                                        console.log('Live session message:', userInput);
                                        toast.info('Live session messaging will be available when WebSocket server is running');
                                        setUserInput('');
                                    } else if (isIdeationMode) {
                                        handleIdeationResponse(userInput);
                                        setUserInput('');
                                    } else {
                                        sendMessageToAi(userInput);
                                    }
                                }}
                                disabled={!userInput.trim() || (isAiLoading && !isLiveSession)}
                                size="sm"
                                className="self-end bg-cyan-500 hover:bg-cyan-600"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Requirements Modal */}
            {showRequirements && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Settings className="h-5 w-5 text-indigo-400" />
                                Essay Requirements
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowRequirements(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ×
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Auto-Analyze Button */}
                            <div className="mb-4">
                                <Button
                                    onClick={async () => {
                                        if (!currentContent) {
                                            toast.error('No content to analyze');
                                            return;
                                        }
                                        
                                        const analysis = analyzeDocumentCategory(currentContent);
                                        if (analysis) {
                                            setRequirements(prev => ({
                                                ...prev,
                                                writingCategory: analysis.category
                                            }));
                                            
                                            // Ask AI to confirm and get more details
                                            if (aiSessionId) {
                                                const questions = analysis.questions.slice(0, 2).join(' ');
                                                await sendMessageToAi(`I've analyzed your document and detected it might be a "${analysis.category}" (${Math.round(analysis.confidence * 100)}% confidence). ${questions} Please confirm or correct this categorization so I can provide the most relevant assistance.`);
                                            }
                                            
                                            toast.success(`Detected: ${analysis.category} (${Math.round(analysis.confidence * 100)}% confidence)`);
                                        } else {
                                            toast.info('Could not auto-detect category. Please select manually.');
                                        }
                                    }}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    Auto-Analyze Document Category
                                </Button>
                            </div>

                            {/* Writing Type Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Writing Type
                                </label>
                                <select
                                    value={writingType}
                                    onChange={(e) => {
                                        const newType = e.target.value;
                                        setWritingType(newType);
                                        
                                        // Update requirements based on selected type
                                        if (newType !== 'auto-detect') {
                                            const category = writingTypes[newType as keyof typeof writingTypes];
                                            if (category) {
                                                // Send AI a message about the new category
                                                if (aiSessionId && currentContent) {
                                                    sendMessageToAi(`I've selected "${category.name}" as my writing type. ${category.guidance} Please analyze my current content and provide specific suggestions based on this writing type.`);
                                                }
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    {Object.entries(writingTypes).map(([key, category]) => (
                                        <option key={key} value={key}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                                
                                {/* Show description for selected writing type */}
                                {writingType !== 'auto-detect' && writingTypes[writingType as keyof typeof writingTypes] && (
                                    <div className="mt-2 p-3 bg-slate-700 rounded border-l-4 border-indigo-400">
                                        <p className="text-xs text-slate-300 mb-1">
                                            {writingTypes[writingType as keyof typeof writingTypes].description}
                                        </p>
                                        <p className="text-xs text-indigo-300 italic">
                                            {writingTypes[writingType as keyof typeof writingTypes].guidance}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Custom Writing Goals */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Additional Writing Goals (Optional)
                                </label>
                                <Textarea
                                    value={customWritingGoals}
                                    onChange={(e) => setCustomWritingGoals(e.target.value)}
                                    placeholder="Describe any specific goals, requirements, or constraints for your writing..."
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                />
                                {requirements.writingCategory && (
                                    <p className="text-xs text-slate-400 mt-1">
                                        Category detected - fields below have been auto-populated with recommended values
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Word Count Target
                                </label>
                                <input
                                    type="text"
                                    value={requirements.wordCount}
                                    onChange={(e) => setRequirements(prev => ({ ...prev, wordCount: e.target.value }))}
                                    placeholder="e.g., 500-750 words"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Target Audience
                                </label>
                                <input
                                    type="text"
                                    value={requirements.audience}
                                    onChange={(e) => setRequirements(prev => ({ ...prev, audience: e.target.value }))}
                                    placeholder="e.g., College admissions committee"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Essay Purpose
                                </label>
                                <input
                                    type="text"
                                    value={requirements.purpose}
                                    onChange={(e) => setRequirements(prev => ({ ...prev, purpose: e.target.value }))}
                                    placeholder="e.g., Personal statement, scholarship application"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Desired Tone
                                </label>
                                <select
                                    value={requirements.tone}
                                    onChange={(e) => setRequirements(prev => ({ ...prev, tone: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select tone...</option>
                                    <option value="formal">Formal</option>
                                    <option value="conversational">Conversational</option>
                                    <option value="persuasive">Persuasive</option>
                                    <option value="reflective">Reflective</option>
                                    <option value="narrative">Narrative</option>
                                    <option value="analytical">Analytical</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Specific Prompt/Question
                                </label>
                                <textarea
                                    value={requirements.specificPrompt}
                                    onChange={(e) => setRequirements(prev => ({ ...prev, specificPrompt: e.target.value }))}
                                    placeholder="Paste the exact essay prompt or question here..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={() => setShowRequirements(false)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Save Requirements
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setRequirements({ writingCategory: '', subCategory: '', wordCount: '', audience: '', purpose: '', tone: '', specificPrompt: '' });
                                        setShowRequirements(false);
                                    }}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Context Modal */}
            {showContextModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Palette className="h-5 w-5 text-teal-400" />
                                Writing Context & Style
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowContextModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ×
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Preferred Writing Style
                                </label>
                                <input
                                    type="text"
                                    value={context.preferredStyle}
                                    onChange={(e) => setContext(prev => ({ ...prev, preferredStyle: e.target.value }))}
                                    placeholder="e.g., Academic, creative, journalistic"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Writer to Emulate
                                </label>
                                <input
                                    type="text"
                                    value={context.writerReference}
                                    onChange={(e) => setContext(prev => ({ ...prev, writerReference: e.target.value }))}
                                    placeholder="e.g., Maya Angelou, Malcolm Gladwell"
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Sample of Your Past Writing
                                </label>
                                <textarea
                                    value={context.pastWritings}
                                    onChange={(e) => setContext(prev => ({ ...prev, pastWritings: e.target.value }))}
                                    placeholder="Paste a paragraph from your previous work to help AI understand your voice..."
                                    rows={4}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">
                                    Additional Context
                                </label>
                                <textarea
                                    value={context.additionalContext}
                                    onChange={(e) => setContext(prev => ({ ...prev, additionalContext: e.target.value }))}
                                    placeholder="Any other style preferences, background info, or special instructions..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                                <Button
                                    onClick={() => setShowContextModal(false)}
                                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                                >
                                    Save Context
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setContext({ pastWritings: '', preferredStyle: '', writerReference: '', additionalContext: '' });
                                        setShowContextModal(false);
                                    }}
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Edit Approval Panel */}
            {showEditApproval && pendingEdits.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 max-w-md">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                            <Edit3 className="h-4 w-4 text-yellow-400" />
                            AI Edit Suggestions ({pendingEdits.length})
                        </h3>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowEditApproval(false)}
                            className="text-slate-400 hover:text-white h-6 w-6 p-0"
                        >
                            ×
                        </Button>
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {pendingEdits.map((edit, index) => (
                            <div key={edit.id} className="suggestion-panel-enhanced border border-slate-500 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                    <div className="text-xs text-blue-300 font-medium">Edit Suggestion {index + 1}</div>
                                    {edit.suggestedEdit?.reason && (
                                        <div className="text-xs text-slate-400">• {edit.suggestedEdit.reason}</div>
                                    )}
                                </div>
                                
                                {edit.suggestedEdit && (
                                    <div className="space-y-3 mb-4">
                                        {/* Original Text - only show if we have it */}
                                        {edit.suggestedEdit.originalText && edit.suggestedEdit.originalText.length > 0 && (
                                            <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Target className="h-3 w-3 text-red-400" />
                                                    <div className="text-xs text-red-300 font-medium">Current Text:</div>
                                                </div>
                                                <div className="text-sm text-red-100 italic">
                                                    "{edit.suggestedEdit.originalText}"
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Suggested Text */}
                                        <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle className="h-3 w-3 text-green-400" />
                                                <div className="text-xs text-green-300 font-medium">
                                                    {edit.suggestedEdit.originalText && edit.suggestedEdit.originalText.length > 0 
                                                        ? 'Suggested Improvement:' 
                                                        : 'AI Feedback & Suggestions:'}
                                                </div>
                                            </div>
                                            <div className="text-sm text-green-100">
                                                {edit.suggestedEdit.originalText && edit.suggestedEdit.originalText.length > 0
                                                    ? `"${edit.suggestedEdit.content}"`
                                                    : edit.suggestedEdit.content}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Expanded view for general suggestions */}
                                {expandedSuggestion === edit.id && (!edit.suggestedEdit?.originalText || edit.suggestedEdit.originalText.length === 0) && (
                                    <div className="mt-3 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Lightbulb className="h-4 w-4 text-blue-400" />
                                            <div className="text-sm font-medium text-blue-300">AI Writing Suggestion</div>
                                        </div>
                                        <div className="text-sm text-slate-200 leading-relaxed mb-3">
                                            {edit.suggestedEdit?.content}
                                        </div>
                                        {edit.suggestedEdit?.reason && (
                                            <div className="text-xs text-slate-400 italic border-t border-slate-600 pt-2 mt-3">
                                                <strong>Why this helps:</strong> {edit.suggestedEdit.reason}
                                            </div>
                                        )}
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    // Copy suggestion to clipboard for manual use
                                                    navigator.clipboard.writeText(edit.suggestedEdit?.content || '');
                                                    toast.success('Suggestion copied to clipboard');
                                                }}
                                                className="text-xs border-blue-500 text-blue-300 hover:bg-blue-600/20"
                                            >
                                                <FileText className="h-3 w-3 mr-1" />
                                                Copy Text
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setExpandedSuggestion(null)}
                                                className="text-xs border-slate-500 text-slate-300 hover:bg-slate-600/20"
                                            >
                                                Close
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            if (edit.suggestedEdit?.originalText && edit.suggestedEdit.originalText.length > 0) {
                                                applyAIEditWithLearning(edit);
                                            } else {
                                                // For general suggestions without specific text, show in expanded view
                                                setExpandedSuggestion(expandedSuggestion === edit.id ? null : edit.id);
                                            }
                                        }}
                                        onMouseEnter={() => edit.suggestedEdit?.originalText && edit.suggestedEdit.originalText.length > 0 && highlightTextInEditor(edit.suggestedEdit.originalText)}
                                        onMouseLeave={() => removeHighlightFromEditor()}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-xs transition-all duration-200"
                                    >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        {edit.suggestedEdit?.originalText && edit.suggestedEdit.originalText.length > 0 
                                            ? 'Apply Edit' 
                                            : 'View Suggestion'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => rejectAIEdit(edit.id)}
                                        className="flex-1 border-slate-500 text-slate-300 hover:bg-slate-600 text-xs"
                                    >
                                        <X className="h-3 w-3 mr-1" />
                                        Reject
                                    </Button>
                                    {edit.suggestedEdit?.originalText && edit.suggestedEdit.originalText.length > 0 && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                highlightTextInEditor(edit.suggestedEdit?.originalText || '');
                                                toast.info('Text highlighted in editor');
                                            }}
                                            className="border-blue-500 text-blue-300 hover:bg-blue-600/20 text-xs"
                                            title="Highlight this text in the editor"
                                        >
                                            <Eye className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        
                        <div className="flex gap-2 pt-2 border-t border-slate-600">
                            <Button
                                size="sm"
                                onClick={() => {
                                    pendingEdits.forEach(edit => applyAIEdit(edit));
                                }}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                            >
                                Apply All
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setPendingEdits([]);
                                    setShowEditApproval(false);
                                }}
                                className="flex-1 border-slate-500 text-slate-300 hover:bg-slate-600 text-xs"
                            >
                                Reject All
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Version History Modal */}
            {showVersionHistory && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <FileText className="h-5 w-5 text-slate-400" />
                                Version History & Writing Analysis
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowVersionHistory(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ×
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                            {/* Version History */}
                            <div>
                                <h3 className="text-md font-semibold text-white mb-3">Draft Versions</h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {draftHistory.slice().reverse().map((version, index) => (
                                        <div key={version.id} className="bg-slate-700/50 border border-slate-600 rounded p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-sm text-slate-300">
                                                    Version #{draftHistory.length - index}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {version.timestamp.toLocaleTimeString()}
                                                </div>
                                            </div>
                                            
                                            <div className="text-xs text-slate-400 mb-2">
                                                {version.wordCount} words • {version.editSource === 'user' ? 'User Edit' : 
                                                 version.editSource === 'ai_applied' ? 'AI Applied' : 'AI Rejected'}
                                            </div>
                                            
                                            {version.changes.length > 0 && (
                                                <div className="text-xs text-cyan-400 mb-2">
                                                    Changes: {version.changes.map(c => c.type).join(', ')}
                                                </div>
                                            )}
                                            
                                            <div className="text-xs text-slate-300 line-clamp-3">
                                                {version.content.replace(/<[^>]*>/g, '').substring(0, 150)}...
                                            </div>
                                            
                                            <div className="flex gap-2 mt-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setCurrentContent(version.content)}
                                                    className="text-xs border-slate-500 text-slate-300 hover:bg-slate-600"
                                                >
                                                    Restore
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    {draftHistory.length === 0 && (
                                        <div className="text-slate-500 text-center py-8">
                                            No versions saved yet. Start writing to track your progress!
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Writing Style Analysis */}
                            <div>
                                <h3 className="text-md font-semibold text-white mb-3">Your Writing Style Profile</h3>
                                <div className="space-y-4">
                                    <div className="bg-slate-700/30 border border-slate-600 rounded p-3">
                                        <h4 className="text-sm font-medium text-green-400 mb-2">Style Metrics</h4>
                                        <div className="text-xs text-slate-300 space-y-1">
                                            <div>Avg Sentence Length: {Math.round(userWritingProfile.styleMetrics.avgSentenceLength)} words</div>
                                            <div>Vocabulary Level: {userWritingProfile.styleMetrics.vocabularyLevel}</div>
                                            <div>Complexity: {userWritingProfile.styleMetrics.complexityPreference}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-700/30 border border-slate-600 rounded p-3">
                                        <h4 className="text-sm font-medium text-blue-400 mb-2">Behavioral Insights</h4>
                                        <div className="text-xs text-slate-300 space-y-1">
                                            <div>AI Suggestion Acceptance: {Math.round(userWritingProfile.behavioralData.acceptanceRate * 100)}%</div>
                                            <div>Total Drafts: {draftHistory.length}</div>
                                            <div>User Edits: {draftHistory.filter(d => d.editSource === 'user').length}</div>
                                            <div>AI Applied: {draftHistory.filter(d => d.editSource === 'ai_applied').length}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-700/30 border border-slate-600 rounded p-3">
                                        <h4 className="text-sm font-medium text-purple-400 mb-2">Writing Patterns</h4>
                                        <div className="text-xs text-slate-300">
                                            <div className="mb-2">
                                                <span className="text-slate-400">Favorite Words:</span>
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {Array.from(userWritingProfile.writingPatterns.favoriteWords.entries())
                                                        .sort(([,a], [,b]) => b - a)
                                                        .slice(0, 8)
                                                        .map(([word, count]) => (
                                                            <span key={word} className="bg-slate-600 px-2 py-1 rounded text-xs">
                                                                {word} ({count})
                                                            </span>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-700/30 border border-slate-600 rounded p-3">
                                        <h4 className="text-sm font-medium text-amber-400 mb-2">Personalized Suggestions</h4>
                                        <div className="text-xs text-slate-300 space-y-1">
                                            {generatePersonalizedSuggestions(currentContent).slice(0, 3).map((suggestion, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <span className="text-amber-400 mt-1">•</span>
                                                    <span>{suggestion}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </AppLayout>
    );
};

export default ScribeSessionPage;