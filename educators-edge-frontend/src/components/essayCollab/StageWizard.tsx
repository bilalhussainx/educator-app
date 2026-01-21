/**
 * Stage Wizard - Slide-Based Multi-Agent Essay Collaboration
 *
 * A modern, wizard-style interface for the multi-agent essay writing process.
 * Each stage is presented as a full-viewport slide with smooth transitions.
 *
 * Features:
 * - Slide-based navigation between stages
 * - Stage output persistence
 * - Back/forward navigation with restrictions
 * - Progress indicator with stage status
 * - Split-view for editing stage (suggestions + editor)
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  Brain,
  Search,
  FileText,
  PenTool,
  Edit3,
  Sparkles,
  Play,
  Send,
  AlertCircle,
  RefreshCw,
  Download,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  Circle,
  Pause,
  Plus,
  User,
  MessageSquare,
  Target,
  Star,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import EditingSuggestionsPanel from './EditingSuggestionsPanel';
import EssayCollabEditor, { EditorMethods } from './EssayCollabEditor';
import ApprovalControls from './ApprovalControls';
import CollabChat from './CollabChat';
import StudentProfileSetup, { SAMPLE_PROFILES } from './StudentProfileSetup';

import {
  STAGES,
  STAGE_ORDER,
  STAGE_LABELS,
  type SessionState,
  type ChatMessage
} from '@/services/essayCollabService';

// Stage configuration
const stageConfig: Record<string, {
  icon: React.FC<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
}> = {
  [STAGES.TOPIC_ANALYSIS]: {
    icon: Brain,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
    description: 'Analyzing your topic and suggesting compelling angles'
  },
  [STAGES.RESEARCH]: {
    icon: Search,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Gathering insights and supporting material'
  },
  [STAGES.OUTLINE]: {
    icon: FileText,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    description: 'Creating a detailed paragraph-by-paragraph outline'
  },
  [STAGES.DRAFT]: {
    icon: PenTool,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    description: 'Writing your complete first draft'
  },
  [STAGES.EDITING]: {
    icon: Edit3,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
    description: 'Analyzing and suggesting improvements'
  },
  [STAGES.POLISH]: {
    icon: Sparkles,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Final polish for a publication-ready essay'
  }
};

interface StageWizardProps {
  sessionId: string;
  sessionState: SessionState;
  isTeacher: boolean;
  isConnected: boolean;
  activeAgentStage: string | null;
  currentUserId?: number;
  onApprove: (feedback?: string, editedOutput?: any) => Promise<void>;
  onRequestRevision: (feedback: string) => Promise<void>;
  onStudentFeedback: (feedback: string) => Promise<void>;
  onSendMessage: (content: string) => Promise<void>;
  onTyping: () => void;
  onStartPipeline: () => Promise<void>;
  onSaveDraft: (content: string) => Promise<void>;
  onExport: (format?: 'text' | 'pdf') => Promise<void>;
  onUpdateProfile: (profile: Record<string, any>) => Promise<void>;
  typingUsers: { userId: number; username: string }[];
  actionLoading: boolean;
  selectedAngle?: number;
  onSelectAngle?: (index: number) => void;
}

const StageWizard: React.FC<StageWizardProps> = ({
  sessionId,
  sessionState,
  isTeacher,
  isConnected,
  activeAgentStage,
  currentUserId = 0,
  onApprove,
  onRequestRevision,
  onStudentFeedback,
  onSendMessage,
  onTyping,
  onStartPipeline,
  onSaveDraft,
  onExport,
  onUpdateProfile,
  typingUsers,
  actionLoading,
  selectedAngle,
  onSelectAngle
}) => {
  // Viewing stage (can be different from current processing stage)
  const [viewingStage, setViewingStage] = useState<string>(STAGES.TOPIC_ANALYSIS);
  const [showChat, setShowChat] = useState(false);
  const [isViewingStages, setIsViewingStages] = useState(false); // Track if user is browsing stages when complete
  const [showProfileSetup, setShowProfileSetup] = useState(false); // Show full profile setup screen
  const [profileLoading, setProfileLoading] = useState(false); // Loading state for profile updates
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); // Track selected profile template
  const [profileMode, setProfileMode] = useState<'samples' | 'custom'>('samples'); // Toggle between sample and custom profile
  const [customProfile, setCustomProfile] = useState({
    background: '',
    strengths: '',
    experiences: '',
    goals: ''
  }); // Custom profile text inputs
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [editorContent, setEditorContent] = useState<string>('');
  const [editingView, setEditingView] = useState<'editor' | 'preview'>('editor');
  const editorMethodsRef = useRef<EditorMethods | null>(null);
  const editorInitializedRef = useRef<boolean>(false);
  const editorContentRef = useRef<string>(''); // Ref to always get latest content

  // Keep ref in sync with state
  useEffect(() => {
    editorContentRef.current = editorContent;
  }, [editorContent]);

  // Current pipeline stage
  const currentStage = sessionState.session.currentStage;
  const isNotStarted = currentStage === STAGES.NOT_STARTED;
  const isComplete = currentStage === STAGES.COMPLETE;

  // Stage statuses
  const stageStatuses = useMemo(() => {
    const statuses: Record<string, 'completed' | 'active' | 'pending' | 'locked'> = {};
    const currentIndex = STAGE_ORDER.indexOf(currentStage as any);

    STAGE_ORDER.forEach((stage, index) => {
      const stageData = sessionState.stages.find(s => s.stage === stage);

      if (stageData?.approval_status === 'approved') {
        statuses[stage] = 'completed';
      } else if (stage === currentStage) {
        statuses[stage] = 'active';
      } else if (stage === activeAgentStage) {
        statuses[stage] = 'active';
      } else if (index < currentIndex || (stageData && stageData.approval_status)) {
        statuses[stage] = 'pending';
      } else {
        statuses[stage] = 'locked';
      }
    });

    return statuses;
  }, [sessionState, currentStage, activeAgentStage]);

  // Check if viewing stage is awaiting approval
  const isAwaitingApproval = useMemo(() => {
    const stageData = sessionState.stages.find(s => s.stage === viewingStage);
    return stageData?.approval_status === 'pending' && viewingStage === currentStage;
  }, [sessionState, viewingStage, currentStage]);

  // Auto-navigate to current stage when it changes
  useEffect(() => {
    if (currentStage && currentStage !== STAGES.NOT_STARTED && currentStage !== STAGES.COMPLETE) {
      setViewingStage(currentStage);
    }
  }, [currentStage]);

  // Initialize editorContent when entering editing stage
  useEffect(() => {
    if (viewingStage === STAGES.EDITING && !editorContent) {
      const draftContent = sessionState.agentOutputs?.draft?.content || sessionState.currentContent;
      if (draftContent) {
        console.log('[StageWizard] Initializing editorContent from draft, length:', draftContent.length);
        setEditorContent(draftContent);
      }
    }
  }, [viewingStage, editorContent, sessionState.agentOutputs?.draft?.content, sessionState.currentContent]);

  // Get agent output for a stage
  const getStageOutput = (stage: string) => {
    return sessionState.agentOutputs[stage] ||
      sessionState.stages.find(s => s.stage === stage)?.agent_output;
  };

  // Navigation handlers
  const canGoBack = useMemo(() => {
    const index = STAGE_ORDER.indexOf(viewingStage as any);
    return index > 0 && stageStatuses[STAGE_ORDER[index - 1]] !== 'locked';
  }, [viewingStage, stageStatuses]);

  const canGoForward = useMemo(() => {
    const index = STAGE_ORDER.indexOf(viewingStage as any);
    if (index >= STAGE_ORDER.length - 1) return false;
    const nextStage = STAGE_ORDER[index + 1];
    return stageStatuses[nextStage] !== 'locked';
  }, [viewingStage, stageStatuses]);

  const goBack = () => {
    const index = STAGE_ORDER.indexOf(viewingStage as any);
    if (index > 0) {
      setViewingStage(STAGE_ORDER[index - 1]);
    }
  };

  const goForward = () => {
    const index = STAGE_ORDER.indexOf(viewingStage as any);
    if (index < STAGE_ORDER.length - 1) {
      setViewingStage(STAGE_ORDER[index + 1]);
    }
  };

  // Handle applying suggestions to editor
  const handleApplySuggestion = (index: number, original: string, suggested: string): boolean => {
    console.log('[StageWizard] handleApplySuggestion called, index:', index);
    console.log('[StageWizard] editorMethodsRef.current:', !!editorMethodsRef.current);

    if (!editorMethodsRef.current) {
      console.error('[StageWizard] Editor methods not available');
      return false;
    }

    // Also update the editorContent state directly if the editor method fails
    const success = editorMethodsRef.current.findAndReplace(original, suggested);
    console.log('[StageWizard] findAndReplace result:', success);

    if (success) {
      setAppliedSuggestions(prev => new Set([...prev, index]));
      // Force update editorContent from editor
      const newContent = editorMethodsRef.current.getPlainText();
      if (newContent) {
        setEditorContent(newContent);
        editorContentRef.current = newContent; // Update ref immediately
        console.log('[StageWizard] Updated editorContent after apply, length:', newContent.length);
      }
    } else {
      // Fallback: Update editorContent directly
      console.log('[StageWizard] Trying fallback: direct editorContent update');
      const content = editorContentRef.current || sessionState.agentOutputs?.draft?.content || '';
      if (content.includes(original)) {
        const newContent = content.replace(original, suggested);
        setEditorContent(newContent);
        editorContentRef.current = newContent; // Update ref immediately
        setAppliedSuggestions(prevSet => new Set([...prevSet, index]));
        // Also update the editor if possible
        if (editorMethodsRef.current) {
          editorMethodsRef.current.setContent(newContent);
        }
        console.log('[StageWizard] Fallback applied, new content length:', newContent.length);
      }
    }
    return success;
  };

  const handleUndoSuggestion = (index: number, original: string, suggested: string): boolean => {
    console.log('[StageWizard] handleUndoSuggestion called, index:', index);

    if (!editorMethodsRef.current) {
      console.error('[StageWizard] Editor methods not available');
      return false;
    }

    // Undo means replacing suggested back to original
    const success = editorMethodsRef.current.findAndReplace(suggested, original);

    if (success) {
      setAppliedSuggestions(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      // Force update editorContent from editor
      const newContent = editorMethodsRef.current.getPlainText();
      if (newContent) {
        setEditorContent(newContent);
        editorContentRef.current = newContent; // Update ref immediately
      }
    } else {
      // Fallback: Update editorContent directly
      const content = editorContentRef.current;
      if (content && content.includes(suggested)) {
        const newContent = content.replace(suggested, original);
        setEditorContent(newContent);
        editorContentRef.current = newContent; // Update ref immediately
        setAppliedSuggestions(prevSet => {
          const next = new Set(prevSet);
          next.delete(index);
          return next;
        });
        if (editorMethodsRef.current) {
          editorMethodsRef.current.setContent(newContent);
        }
      }
    }
    return success;
  };

  // Handle editor ready - initialize with content
  const handleEditorReady = (methods: EditorMethods) => {
    const currentContent = editorContentRef.current; // Use ref to get latest value
    console.log('[StageWizard] handleEditorReady called, already initialized:', editorInitializedRef.current);
    console.log('[StageWizard] Current editorContentRef length:', currentContent?.length);
    editorMethodsRef.current = methods;

    // If we have editorContent (user has made edits), use that
    // Otherwise use the original draft content
    if (currentContent) {
      console.log('[StageWizard] Restoring editor with current editorContent (from ref)');
      methods.setContent(currentContent);
      editorInitializedRef.current = true;
      return;
    }

    // First time initialization - use draft content
    const draftContent = sessionState.agentOutputs?.draft?.content ||
      sessionState.currentContent;
    console.log('[StageWizard] Draft content available:', !!draftContent, 'length:', draftContent?.length);

    if (draftContent) {
      methods.setContent(draftContent);
      setEditorContent(draftContent);
      editorContentRef.current = draftContent; // Also update ref
      editorInitializedRef.current = true;
      console.log('[StageWizard] Editor initialized with draft content');
    }
  };

  // Handle approve with editor content
  const handleApproveWithEdits = async (feedback?: string) => {
    let editedOutput = undefined;

    // If we're in editing stage and have editor content, include it
    const currentEditorContent = editorContentRef.current;
    if (viewingStage === STAGES.EDITING && currentEditorContent) {
      editedOutput = {
        content: currentEditorContent,
        wordCount: currentEditorContent.trim().split(/\s+/).filter((w: string) => w.length > 0).length,
        edits: getStageOutput(STAGES.EDITING)
      };
    }

    // For topic analysis, include selected angle
    if (viewingStage === STAGES.TOPIC_ANALYSIS && selectedAngle !== undefined) {
      const topicOutput = getStageOutput(STAGES.TOPIC_ANALYSIS);
      if (topicOutput?.angles) {
        editedOutput = {
          ...topicOutput,
          recommendedAngle: selectedAngle,
          selectedAngle: selectedAngle
        };
      }
    }

    await onApprove(feedback, editedOutput);
  };

  // Render stage content
  const renderStageContent = () => {
    const stageOutput = getStageOutput(viewingStage);
    const config = stageConfig[viewingStage];
    const StageIcon = config?.icon || Brain;
    const isActiveAgent = activeAgentStage === viewingStage;

    // Loading state
    if (isActiveAgent) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${config?.bgColor} mb-6`}>
              <Loader2 className={`w-10 h-10 ${config?.color} animate-spin`} />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{STAGE_LABELS[viewingStage]}</h2>
            <p className="text-gray-500">{config?.description}</p>
            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      );
    }

    // No output yet
    if (!stageOutput) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-6`}>
              <StageIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">{STAGE_LABELS[viewingStage]}</h2>
            <p className="text-gray-400">Waiting for previous stages to complete</p>
          </div>
        </div>
      );
    }

    // Render based on stage type
    switch (viewingStage) {
      case STAGES.TOPIC_ANALYSIS:
        return renderTopicAnalysis(stageOutput);
      case STAGES.RESEARCH:
        return renderResearch(stageOutput);
      case STAGES.OUTLINE:
        return renderOutline(stageOutput);
      case STAGES.DRAFT:
        return renderDraft(stageOutput);
      case STAGES.EDITING:
        return renderEditing(stageOutput);
      case STAGES.POLISH:
        return renderPolish(stageOutput);
      default:
        return <div className="p-6">{JSON.stringify(stageOutput, null, 2)}</div>;
    }
  };

  // Render Topic Analysis Stage
  const renderTopicAnalysis = (output: any) => {
    const angles = output.angles || [];
    const recommendedIdx = output.recommendedAngle ?? 0;
    const currentSelection = selectedAngle ?? recommendedIdx;

    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 mb-4">
              <Brain className="w-8 h-8 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Essay Angle</h2>
            <p className="text-gray-500 max-w-lg mx-auto">
              Select the approach that best represents your story. The AI recommends option {recommendedIdx + 1}.
            </p>
          </div>

          {/* Angle Cards */}
          <div className="space-y-4">
            {angles.map((angle: any, idx: number) => {
              const isSelected = currentSelection === idx;
              const isRecommended = idx === recommendedIdx;

              return (
                <div
                  key={idx}
                  onClick={() => onSelectAngle?.(idx)}
                  className={`
                    relative p-6 rounded-2xl border-2 cursor-pointer transition-all duration-300
                    ${isSelected
                      ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-100'
                      : 'border-gray-200 bg-white hover:border-violet-300 hover:shadow-md'
                    }
                  `}
                >
                  {/* Recommended Badge */}
                  {isRecommended && (
                    <div className="absolute -top-3 left-6">
                      <span className="px-3 py-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-semibold rounded-full shadow-md">
                        Recommended
                      </span>
                    </div>
                  )}

                  {/* Selection Radio */}
                  <div className="flex items-start gap-4">
                    <div className={`
                      w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1
                      ${isSelected ? 'border-violet-500 bg-violet-500' : 'border-gray-300'}
                    `}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{angle.title}</h3>
                        {angle.fitScore && (
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium text-amber-600">{angle.fitScore}/10</span>
                          </div>
                        )}
                      </div>

                      <p className="text-gray-600 mb-4">{angle.description}</p>

                      {/* Opening Hook */}
                      {angle.openingHook && (
                        <div className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                          <p className="text-xs font-semibold text-amber-600 mb-1">Opening Hook</p>
                          <p className="text-gray-700 italic">"{angle.openingHook}"</p>
                        </div>
                      )}

                      {/* Strengths & Risks */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4" />
                            Strengths
                          </h4>
                          <ul className="space-y-1">
                            {angle.strengths?.map((s: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">+</span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-rose-600 mb-2 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Risks
                          </h4>
                          <ul className="space-y-1">
                            {angle.risks?.map((r: string, i: number) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-rose-500 mt-1">-</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render Research Stage
  const renderResearch = (output: any) => {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Research & Insights</h2>
            <p className="text-gray-500">Supporting material and key moments for your essay</p>
          </div>

          {/* Central Theme */}
          {output.centralTheme && (
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
              <h3 className="font-semibold text-blue-900 mb-2">Central Theme</h3>
              <p className="text-gray-700">{output.centralTheme}</p>
            </div>
          )}

          {/* Insights */}
          {output.insights && (
            <div className="space-y-4 mb-6">
              <h3 className="font-semibold text-gray-900">Key Insights</h3>
              {output.insights.map((insight: any, idx: number) => (
                <div key={idx} className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <h4 className="font-medium text-blue-700 mb-2">{insight.category}</h4>
                  <ul className="space-y-1">
                    {insight.points?.map((point: string, i: number) => (
                      <li key={i} className="text-gray-600 flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Key Moments */}
          {output.keyMoments && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Key Moments to Include</h3>
              {output.keyMoments.map((moment: any, idx: number) => (
                <div key={idx} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <h4 className="font-medium text-amber-800 mb-2">{moment.moment}</h4>
                  {moment.details && <p className="text-gray-600 text-sm mb-1">Details: {moment.details}</p>}
                  {moment.significance && <p className="text-gray-500 text-sm italic">Significance: {moment.significance}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Outline Stage
  const renderOutline = (output: any) => {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Essay Outline</h2>
            <p className="text-gray-500">{output.narrativeStructure || 'Structured narrative approach'}</p>
          </div>

          {/* Thesis */}
          {output.thesis && (
            <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100">
              <h3 className="font-semibold text-emerald-900 mb-2">Thesis</h3>
              <p className="text-gray-700 text-lg">{output.thesis}</p>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-4">
            {output.sections?.map((section: any, idx: number) => (
              <div key={idx} className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold text-sm">
                      {section.sectionNumber || idx + 1}
                    </div>
                    <h4 className="font-semibold text-gray-900">{section.title}</h4>
                  </div>
                  <span className="text-sm text-gray-500">~{section.estimatedWords} words</span>
                </div>

                <p className="text-gray-600 mb-3">{section.purpose}</p>

                {section.content?.openingLine && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 mb-3">
                    <p className="text-xs text-amber-600 font-medium mb-1">Opening Line</p>
                    <p className="text-gray-700 italic">"{section.content.openingLine}"</p>
                  </div>
                )}

                {section.content?.keyMoment && (
                  <p className="text-sm text-gray-500 mb-2">
                    <span className="font-medium">Key moment:</span> {section.content.keyMoment}
                  </p>
                )}

                {section.transitionTo && (
                  <p className="text-sm text-blue-600 mt-3">
                    <ArrowRight className="w-4 h-4 inline mr-1" />
                    {section.transitionTo}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Word Count Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Estimated Words</span>
              <span className="font-semibold text-gray-900">{output.totalEstimatedWords || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Draft Stage
  const renderDraft = (output: any) => {
    const wordCount = output.wordCount || 0;
    const targetWordCount = sessionState.session.targetWordCount || 650;

    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <PenTool className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">First Draft</h2>
                <p className="text-gray-500 text-sm">Your essay is ready for review</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{wordCount}</div>
                <div className="text-xs text-gray-500">of {targetWordCount} words</div>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={wordCount > targetWordCount ? '#ef4444' : '#8b5cf6'}
                    strokeWidth="3"
                    strokeDasharray={`${Math.min((wordCount / targetWordCount) * 100, 100)}, 100`}
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Essay Content */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="prose prose-lg max-w-none">
                {output.content?.split('\n\n').map((paragraph: string, idx: number) => (
                  <p key={idx} className="text-gray-800 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Voice & Techniques */}
          {(output.voiceNotes || output.techniquesUsed) && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {output.voiceNotes && (
                <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <h4 className="font-medium text-purple-800 mb-2">Voice Notes</h4>
                  <p className="text-sm text-gray-600">{output.voiceNotes}</p>
                </div>
              )}
              {output.techniquesUsed && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-medium text-blue-800 mb-2">Techniques Used</h4>
                  <ul className="text-sm text-gray-600">
                    {output.techniquesUsed.map((t: string, i: number) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Editing Stage (Split View with Tabs)
  const renderEditing = (output: any) => {
    const suggestions = output.suggestions || [];
    const draftContent = sessionState.agentOutputs?.draft?.content || '';

    // Create preview content with applied suggestions highlighted
    const getPreviewContent = () => {
      let content = editorContent || draftContent;
      return content;
    };

    return (
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Suggestions Panel */}
        <div className="w-[380px] border-r bg-white flex-shrink-0 flex flex-col overflow-hidden">
          <EditingSuggestionsPanel
            suggestions={suggestions}
            overallFeedback={output.overallFeedback}
            currentScore={output.currentScore}
            targetScore={output.targetScore}
            onApplySuggestion={handleApplySuggestion}
            onUndoSuggestion={handleUndoSuggestion}
            appliedSuggestions={appliedSuggestions}
          />
        </div>

        {/* Right: Editor/Preview with Tabs */}
        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {/* Header with Tabs */}
          <div className="bg-white border-b">
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setEditingView('editor')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    editingView === 'editor'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Editor
                </button>
                <button
                  onClick={() => setEditingView('preview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    editingView === 'preview'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Preview
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {appliedSuggestions.size} / {suggestions.length} applied
                </span>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-hidden">
            {editingView === 'editor' ? (
              /* Collaborative Editor */
              <div className="h-full p-4 overflow-auto">
                <div className="h-full min-h-[500px] bg-white rounded-xl border shadow-sm overflow-hidden">
                  <EssayCollabEditor
                    sessionId={sessionId}
                    initialContent={draftContent}
                    targetWordCount={sessionState.session.targetWordCount}
                    isTeacher={isTeacher}
                    onContentChange={(content) => {
                      // Only update ref, not state - prevents scroll jump on every keystroke
                      editorContentRef.current = content;
                    }}
                    onSave={onSaveDraft}
                    onEditorReady={handleEditorReady}
                  />
                </div>
              </div>
            ) : (
              /* Preview Mode - Scrollable Essay */
              <div className="h-full overflow-auto p-4">
                <div className="max-w-3xl mx-auto">
                  {/* Preview Header */}
                  <div className="mb-4 p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-rose-500" />
                      <span className="font-medium text-rose-900">Essay Preview</span>
                    </div>
                    <p className="text-sm text-rose-700">
                      This shows your essay with all edits. Applied suggestions are reflected here.
                    </p>
                  </div>

                  {/* Essay Content */}
                  <div className="bg-white rounded-2xl border shadow-sm p-8">
                    <div className="prose prose-lg max-w-none">
                      {(() => {
                        // Get content from ref (updated on each keystroke) or fall back to draft
                        const content = editorContentRef.current || draftContent;
                        return content
                          .split('\n\n')
                          .filter((p: string) => p.trim())
                          .map((paragraph: string, idx: number) => {
                            // Check if this paragraph contains any applied suggestion text
                            const hasAppliedChange = Array.from(appliedSuggestions).some(
                              (suggIdx) => {
                                const sugg = suggestions[suggIdx];
                                return sugg && paragraph.includes(sugg.suggested);
                              }
                            );

                            return (
                              <p
                                key={idx}
                                className={`
                                  text-gray-800 leading-relaxed mb-4 transition-all
                                  ${hasAppliedChange ? 'bg-green-50 -mx-2 px-2 py-1 rounded border-l-4 border-green-400' : ''}
                                `}
                              >
                                {paragraph}
                              </p>
                            );
                          });
                      })()}
                    </div>
                  </div>

                  {/* Word Count Footer */}
                  <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <span>
                      Word count: {(editorContentRef.current || draftContent).trim().split(/\s+/).filter((w: string) => w.length > 0).length}
                    </span>
                    <span>
                      Target: {sessionState.session.targetWordCount || 650} words
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Polish Stage
  const renderPolish = (output: any) => {
    const wordCount = output.wordCount || 0;
    const score = output.finalScore || output.score || 0;

    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header with Score */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 mb-4 shadow-lg shadow-purple-200">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Polished Essay</h2>

            {/* Score Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full shadow-md">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-bold text-lg">{score}/10</span>
              <span className="text-emerald-100">Quality Score</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-white rounded-xl border text-center">
              <div className="text-2xl font-bold text-gray-900">{wordCount}</div>
              <div className="text-sm text-gray-500">Words</div>
            </div>
            <div className="p-4 bg-white rounded-xl border text-center">
              <div className="text-2xl font-bold text-purple-600">{output.improvements?.length || 0}</div>
              <div className="text-sm text-gray-500">Improvements Made</div>
            </div>
            <div className="p-4 bg-white rounded-xl border text-center">
              <div className="text-2xl font-bold text-emerald-600">{score >= 9 ? 'Excellent' : score >= 8 ? 'Great' : 'Good'}</div>
              <div className="text-sm text-gray-500">Rating</div>
            </div>
          </div>

          {/* Essay Content */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden mb-6">
            <div className="p-8">
              <div className="prose prose-lg max-w-none">
                {output.content?.split('\n\n').map((paragraph: string, idx: number) => (
                  <p key={idx} className="text-gray-800 leading-relaxed mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Summary & Strengths */}
          {output.summary && (
            <div className="p-6 bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl border border-purple-100 mb-4">
              <h3 className="font-semibold text-purple-900 mb-2">Summary</h3>
              <p className="text-gray-700">{output.summary}</p>
            </div>
          )}

          {output.keyStrengths && (
            <div className="p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-100">
              <h3 className="font-semibold text-emerald-900 mb-3">Key Strengths</h3>
              <div className="flex flex-wrap gap-2">
                {output.keyStrengths.map((strength: string, idx: number) => (
                  <span key={idx} className="px-3 py-1 bg-white rounded-full text-sm text-emerald-700 border border-emerald-200">
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-gray-900 truncate max-w-md">
            {sessionState.session.essayPrompt?.slice(0, 50) || 'Essay Session'}...
          </h1>
          {sessionState.session.university && (
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {sessionState.session.university}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
            isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>

          {/* Chat Toggle */}
          <button
            onClick={() => setShowChat(!showChat)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              showChat ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Chat
          </button>

          {/* Export Dropdown */}
          {isComplete && (
            <div className="relative group">
              <button
                className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 shadow-md"
              >
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => onExport('pdf')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                >
                  <FileText className="w-4 h-4 text-red-500" />
                  Export as PDF
                </button>
                <button
                  onClick={() => onExport('text')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  Export as Text
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          {STAGE_ORDER.map((stage, index) => {
            const config = stageConfig[stage];
            const StageIcon = config?.icon || Brain;
            const status = stageStatuses[stage];
            const isViewing = viewingStage === stage;
            const isClickable = status !== 'locked';

            return (
              <React.Fragment key={stage}>
                {/* Stage Node */}
                <button
                  onClick={() => isClickable && setViewingStage(stage)}
                  disabled={!isClickable}
                  className={`
                    relative flex flex-col items-center gap-2 transition-all
                    ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                  `}
                >
                  {/* Icon Circle */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all
                    ${status === 'completed' ? 'bg-emerald-500 text-white' :
                      status === 'active' ? `${config?.bgColor} ${config?.color} ring-4 ring-offset-2 ${config?.color.replace('text', 'ring')}/30` :
                      isViewing ? `${config?.bgColor} ${config?.color} ring-2 ring-offset-2 ring-gray-300` :
                      'bg-gray-100 text-gray-400'
                    }
                  `}>
                    {status === 'completed' ? (
                      <Check className="w-6 h-6" />
                    ) : status === 'active' && activeAgentStage === stage ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <StageIcon className="w-6 h-6" />
                    )}
                  </div>

                  {/* Label */}
                  <span className={`
                    text-xs font-medium whitespace-nowrap
                    ${isViewing ? 'text-gray-900' : 'text-gray-500'}
                  `}>
                    {STAGE_LABELS[stage]}
                  </span>

                  {/* Active Indicator */}
                  {isViewing && (
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-2 h-2 bg-violet-500 rounded-full" />
                  )}
                </button>

                {/* Connector Line */}
                {index < STAGE_ORDER.length - 1 && (
                  <div className={`
                    flex-1 h-0.5 mx-2
                    ${stageStatuses[STAGE_ORDER[index + 1]] !== 'locked' ? 'bg-emerald-300' : 'bg-gray-200'}
                  `} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stage Content */}
        <div className="flex-1 flex flex-col">
          {/* Not Started State */}
          {isNotStarted ? (
            showProfileSetup ? (
              /* Full Profile Setup Screen */
              <div className="flex-1 overflow-auto">
                <StudentProfileSetup
                  onComplete={async (profile) => {
                    await onUpdateProfile(profile);
                    setShowProfileSetup(false);
                  }}
                  onSkip={() => setShowProfileSetup(false)}
                  initialProfile={sessionState.session.studentProfile as any}
                />
              </div>
            ) : (
              /* Pre-Start Screen - Compact Single Viewport Design */
              <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
                <div className="w-full max-w-2xl flex flex-col items-center">
                  {/* Compact Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 text-white ml-0.5" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-gray-900">Ready to Write Your Essay?</h2>
                      <p className="text-sm text-gray-500">AI-guided writing in 6 stages</p>
                    </div>
                  </div>

                  {/* Profile Section - Compact */}
                  {sessionState.session.studentProfile &&
                   Object.keys(sessionState.session.studentProfile).length > 0 &&
                   (sessionState.session.studentProfile.name ||
                    sessionState.session.studentProfile.activities?.length > 0 ||
                    sessionState.session.studentProfile.strengths?.length > 0 ||
                    sessionState.session.studentProfile.background?.firstGeneration ||
                    sessionState.session.studentProfile.customDescription) ? (
                    <div className="w-full mb-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Profile saved - personalized suggestions enabled</span>
                      </div>
                      <button
                        onClick={() => setShowProfileSetup(true)}
                        className="text-xs text-emerald-700 hover:text-emerald-800 underline"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <div className="w-full mb-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      {/* Inline Tab Header */}
                      <div className="flex items-center justify-between bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <span className="text-sm font-medium text-gray-700">Add your profile</span>
                        <div className="flex bg-gray-200 rounded-lg p-0.5">
                          <button
                            onClick={() => setProfileMode('samples')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                              profileMode === 'samples'
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Quick Select
                          </button>
                          <button
                            onClick={() => setProfileMode('custom')}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                              profileMode === 'custom'
                                ? 'bg-white text-violet-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Custom
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        {profileLoading && (
                          <div className="flex items-center justify-center gap-2 py-2 text-violet-600 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                          </div>
                        )}

                        {profileMode === 'samples' ? (
                          /* Quick Select - Horizontal Scroll */
                          <div>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                              {SAMPLE_PROFILES.map((template) => {
                                const Icon = template.icon;
                                const isSelected = selectedProfileId === template.id;
                                const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
                                  violet: { bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-500' },
                                  amber: { bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-500' },
                                  emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-500' },
                                  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-500' },
                                  rose: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-500' },
                                  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-500' },
                                  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-500' },
                                  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-500' },
                                };
                                const colors = colorClasses[template.color] || colorClasses.violet;

                                return (
                                  <button
                                    key={template.id}
                                    disabled={profileLoading}
                                    onClick={async () => {
                                      if (isSelected) {
                                        // Confirm selection
                                        setProfileLoading(true);
                                        try {
                                          await onUpdateProfile(template.profile);
                                          setSelectedProfileId(null);
                                        } finally {
                                          setProfileLoading(false);
                                        }
                                      } else {
                                        setSelectedProfileId(template.id);
                                      }
                                    }}
                                    className={`
                                      flex-shrink-0 w-28 p-2.5 rounded-lg border-2 transition-all text-left
                                      ${isSelected
                                        ? `${colors.border} bg-white shadow-md`
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                      }
                                      ${profileLoading ? 'opacity-50' : 'cursor-pointer'}
                                    `}
                                  >
                                    <div className={`w-7 h-7 rounded-md ${colors.bg} flex items-center justify-center mb-1.5`}>
                                      <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                                    </div>
                                    <p className="text-xs font-medium text-gray-900 leading-tight truncate">{template.name}</p>
                                    {isSelected && (
                                      <p className="text-[10px] text-violet-600 mt-1 font-medium">Click to confirm</p>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => setShowProfileSetup(true)}
                              className="mt-2 text-xs text-gray-500 hover:text-violet-600"
                            >
                              + More detailed profile builder
                            </button>
                          </div>
                        ) : (
                          /* Custom Profile - Compact */
                          <div className="space-y-2">
                            <textarea
                              value={customProfile.background}
                              onChange={(e) => setCustomProfile(prev => ({ ...prev, background: e.target.value }))}
                              placeholder="Describe yourself: background, strengths, experiences, goals..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                disabled={profileLoading || !customProfile.background.trim()}
                                onClick={async () => {
                                  setProfileLoading(true);
                                  try {
                                    await onUpdateProfile({
                                      customDescription: {
                                        background: customProfile.background,
                                        strengths: customProfile.strengths,
                                        experiences: customProfile.experiences,
                                        goals: customProfile.goals
                                      },
                                      background: { uniqueCircumstances: customProfile.background }
                                    });
                                    setCustomProfile({ background: '', strengths: '', experiences: '', goals: '' });
                                  } finally {
                                    setProfileLoading(false);
                                  }
                                }}
                                className="flex-1 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Save Profile
                              </button>
                              <button
                                onClick={() => setShowProfileSetup(true)}
                                className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                Detailed
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Start Button - Always Visible */}
                  <button
                    onClick={onStartPipeline}
                    disabled={actionLoading}
                    className="w-full max-w-sm py-3.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-base font-semibold rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-purple-200/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        Start Writing
                      </>
                    )}
                  </button>

                  <p className="mt-2 text-xs text-gray-400">
                    Profile is optional - you can start writing immediately
                  </p>
                </div>
              </div>
            )
          ) : isComplete && !isViewingStages ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 mb-6 shadow-xl shadow-green-200">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-3">Essay Complete!</h2>
                <p className="text-gray-500 mb-8">
                  Congratulations! Your essay has been polished and is ready for submission.
                </p>
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        setViewingStage(STAGES.POLISH);
                        setIsViewingStages(true);
                      }}
                      className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      View Final Essay
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onExport('pdf')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium rounded-xl hover:from-violet-600 hover:to-purple-700 shadow-md transition-all"
                    >
                      <Download className="w-5 h-5" />
                      Export as PDF
                    </button>
                    <button
                      onClick={() => onExport('text')}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      Export as Text
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Stage Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewingStage}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {renderStageContent()}
                </motion.div>
              </AnimatePresence>

              {/* Bottom Navigation & Approval */}
              <div className="border-t bg-white px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                  {/* Navigation */}
                  <div className="flex items-center gap-3">
                    {isComplete && isViewingStages ? (
                      <button
                        onClick={() => setIsViewingStages(false)}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                        Back to Summary
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={goBack}
                          disabled={!canGoBack}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                          Previous
                        </button>
                        <button
                          onClick={goForward}
                          disabled={!canGoForward}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Next
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Export buttons when viewing completed essay */}
                  {isComplete && isViewingStages && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onExport('pdf')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 shadow-md transition-all"
                      >
                        <Download className="w-4 h-4" />
                        Export PDF
                      </button>
                      <button
                        onClick={() => onExport('text')}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                        Export Text
                      </button>
                    </div>
                  )}

                  {/* Approval Controls */}
                  {isAwaitingApproval && viewingStage === currentStage && !isComplete && (
                    <ApprovalControls
                      stage={viewingStage}
                      isTeacher={isTeacher}
                      onApprove={handleApproveWithEdits}
                      onRequestRevision={onRequestRevision}
                      onAddFeedback={!isTeacher ? onStudentFeedback : undefined}
                      isLoading={actionLoading}
                      compact
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Chat Panel */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 350, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l bg-white overflow-hidden flex-shrink-0"
            >
              <CollabChat
                messages={sessionState.messages}
                currentUserId={currentUserId}
                onSendMessage={onSendMessage}
                onTyping={onTyping}
                typingUsers={typingUsers}
                isConnected={isConnected}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StageWizard;
