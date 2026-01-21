/**
 * Essay Collaboration Workspace
 *
 * Main workspace for the multi-agent essay collaboration system.
 * Handles data fetching, socket connections, and state management.
 * Delegates UI rendering to StageWizard component.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import StageWizard from './StageWizard';

import {
  getSession,
  startPipeline,
  approveStage,
  requestRevision,
  addStudentFeedback,
  exportEssay,
  sendMessage,
  updateSession,
  saveDraft,
  EssayCollabSocket,
  STAGES,
  STAGE_LABELS,
  type SessionState
} from '@/services/essayCollabService';

interface EssayCollabWorkspaceProps {
  sessionId?: string;
}

const EssayCollabWorkspace: React.FC<EssayCollabWorkspaceProps> = ({ sessionId: propSessionId }) => {
  const { sessionId: paramSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const sessionId = propSessionId || paramSessionId;

  // State
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<EssayCollabSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ userId: number; username: string }[]>([]);
  const [activeAgentStage, setActiveAgentStage] = useState<string | null>(null);
  const [selectedAngle, setSelectedAngle] = useState<number | undefined>(undefined);

  // Get current user info
  const token = localStorage.getItem('authToken');
  const currentUser = token ? JSON.parse(atob(token.split('.')[1])) : null;
  const currentUserId = currentUser?.user?.id || currentUser?.id;
  const isTeacher = String(sessionState?.session.teacherId) === String(currentUserId);

  // Track if a load is in progress
  const loadingRef = React.useRef(false);

  // Load session
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      const state = await getSession(sessionId);
      console.log('[EssayCollab] Loaded session - currentStage:', state.session.currentStage, 'status:', state.session.status);
      setSessionState(state);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load session:', err);
      setError(err.response?.data?.error || 'Failed to load session');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [sessionId]);

  // Initialize WebSocket
  useEffect(() => {
    if (!sessionId) return;

    const ws = new EssayCollabSocket(sessionId);

    // Set up event handlers
    ws.on('agent_started', (data) => {
      setActiveAgentStage(data.stage);
      toast.info(`Starting ${STAGE_LABELS[data.stage]}...`);
    });

    ws.on('agent_output', (data) => {
      setActiveAgentStage(null);
      setSessionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          agentOutputs: {
            ...prev.agentOutputs,
            [data.stage]: data.output
          }
        };
      });
    });

    ws.on('stage_changed', (data) => {
      setSessionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            currentStage: data.stage
          }
        };
      });
    });

    ws.on('approval_requested', (data) => {
      toast.info(`${STAGE_LABELS[data.stage]} needs review`);
    });

    ws.on('approval_response', (data) => {
      loadSession();
      if (data.status === 'approved') {
        toast.success('Stage approved!');
      } else if (data.status === 'revision_requested') {
        toast.info('Revision requested');
      }
    });

    ws.on('pipeline_complete', () => {
      toast.success('Essay complete!');
      loadSession();
    });

    ws.on('message', (data) => {
      setSessionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, data.message]
        };
      });
    });

    ws.on('typing', (data) => {
      if (data.userId !== currentUserId) {
        setTypingUsers(prev => {
          const exists = prev.some(u => u.userId === data.userId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, username: data.username }];
        });

        setTimeout(() => {
          setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
        }, 3000);
      }
    });

    ws.on('error', (data) => {
      console.error('[EssayCollab] Error received:', data);
      setActiveAgentStage(null);
      toast.error(data.error || 'An error occurred');
      loadSession();
    });

    ws.on('session_updated', (data) => {
      console.log('[EssayCollab] Session updated:', data);
      setSessionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            ...data.session
          }
        };
      });
      toast.info('Session settings updated');
    });

    ws.on('pipeline_started', (data) => {
      console.log('[EssayCollab] Pipeline started event received:', data);
      setActiveAgentStage(data.stage);
      setSessionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            currentStage: data.stage,
            status: 'active'
          }
        };
      });
      toast.info('Essay writing pipeline started!');
      loadSession();
    });

    ws.on('stage_complete', (data) => {
      console.log('[EssayCollab] Stage complete:', data);
      setActiveAgentStage(null);
      setSessionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            currentStage: data.currentStage
          },
          agentOutputs: data.agentOutput ? {
            ...prev.agentOutputs,
            [data.currentStage]: data.agentOutput
          } : prev.agentOutputs
        };
      });
      if (data.awaitingApproval) {
        toast.info(`${STAGE_LABELS[data.currentStage]} ready for review`);
      }
      loadSession();
    });

    ws.on('state_sync', (data) => {
      console.log('[EssayCollab] State sync received:', data);
      if (data.state) {
        setSessionState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            ...data.state,
            session: {
              ...prev.session,
              ...(data.state.session || {})
            }
          };
        });
      }
    });

    ws.connect();
    setSocket(ws);
    setIsConnected(true);

    return () => {
      ws.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [sessionId, currentUserId, loadSession]);

  // Initial load
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Polling fallback for students
  useEffect(() => {
    if (!sessionId || !sessionState) return;
    if (isTeacher) return;
    if (sessionState.session.currentStage !== STAGES.NOT_STARTED) return;

    const pollInterval = setInterval(async () => {
      await loadSession();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [sessionId, sessionState?.session.currentStage, isTeacher, loadSession]);

  // Handlers
  const handleStartPipeline = async () => {
    if (!sessionId) return;

    try {
      setActionLoading(true);
      await startPipeline(sessionId);
      toast.success('Pipeline started!');
      loadSession();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start pipeline');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (feedback?: string, editedOutput?: any) => {
    if (!sessionId) return;

    try {
      setActionLoading(true);

      // If no editedOutput passed but we're in topic analysis, include selected angle
      if (!editedOutput && sessionState?.session.currentStage === STAGES.TOPIC_ANALYSIS && selectedAngle !== undefined) {
        const topicOutput = sessionState.agentOutputs[STAGES.TOPIC_ANALYSIS];
        if (topicOutput?.angles) {
          editedOutput = {
            ...topicOutput,
            recommendedAngle: selectedAngle,
            selectedAngle: selectedAngle
          };
        }
      }

      await approveStage(sessionId, { feedback, editedOutput });
      toast.success('Stage approved!');
      setSelectedAngle(undefined);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve stage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevision = async (feedback: string) => {
    if (!sessionId) return;

    try {
      setActionLoading(true);
      await requestRevision(sessionId, feedback);
      toast.success('Revision requested - AI is regenerating content...');

      // Refresh session state after a delay to ensure we get the updated output
      // This is a fallback in case WebSocket events don't come through
      setTimeout(async () => {
        try {
          const response = await getSession(sessionId);
          if (response) {
            setSessionState(response);
          }
        } catch (e) {
          console.error('[EssayCollab] Failed to refresh session after revision:', e);
        }
      }, 5000); // Wait 5 seconds for the agent to complete
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to request revision');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStudentFeedback = async (feedback: string) => {
    if (!sessionId) return;

    try {
      await addStudentFeedback(sessionId, feedback);
      toast.success('Feedback added');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to add feedback');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!sessionId) return;

    try {
      await sendMessage(sessionId, content);
    } catch (err: any) {
      toast.error('Failed to send message');
    }
  };

  const handleExport = async (format: 'text' | 'pdf' = 'pdf') => {
    if (!sessionId) return;

    try {
      // Always use 'json' format to get structured data
      const essay = await exportEssay(sessionId, 'json');

      // Get content from export or fall back to session state
      const content = essay?.content ||
        sessionState?.agentOutputs?.polish?.content ||
        sessionState?.agentOutputs?.draft?.content ||
        sessionState?.currentContent ||
        '';

      const prompt = essay?.prompt || sessionState?.session.essayPrompt || '';
      const wordCount = essay?.wordCount || content.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
      const university = essay?.university || sessionState?.session.university || '';

      if (!content) {
        toast.error('No essay content available to export');
        return;
      }

      if (format === 'pdf') {
        // Dynamic import jspdf for PDF generation
        const { jsPDF } = await import('jspdf');

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // PDF styling
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 25;
        const contentWidth = pageWidth - (margin * 2);
        let yPosition = margin;

        // Title/Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        if (university) {
          doc.text(university, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 8;
        }

        // Essay Prompt (if available)
        if (prompt) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(100, 100, 100);
          const promptLines = doc.splitTextToSize(`Prompt: ${prompt}`, contentWidth);
          doc.text(promptLines, margin, yPosition);
          yPosition += (promptLines.length * 5) + 10;
        }

        // Divider line
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 10;

        // Essay content
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);

        // Split content into paragraphs and handle page breaks
        const paragraphs = content.split('\n\n').filter((p: string) => p.trim());

        for (const paragraph of paragraphs) {
          const lines = doc.splitTextToSize(paragraph.trim(), contentWidth);
          const blockHeight = lines.length * 6;

          // Check if we need a new page
          if (yPosition + blockHeight > pageHeight - margin) {
            doc.addPage();
            yPosition = margin;
          }

          doc.text(lines, margin, yPosition);
          yPosition += blockHeight + 6; // Add paragraph spacing
        }

        // Footer with word count
        doc.setFontSize(9);
        doc.setTextColor(128, 128, 128);
        doc.text(`Word Count: ${wordCount}`, margin, pageHeight - 10);
        doc.text('Generated with AI Essay Assistant', pageWidth - margin, pageHeight - 10, { align: 'right' });

        // Save the PDF
        const filename = university
          ? `${university.replace(/\s+/g, '_')}_Essay.pdf`
          : `Essay_${sessionId.slice(0, 8)}.pdf`;
        doc.save(filename);
        toast.success('Essay exported as PDF!');
      } else {
        // Text export
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `essay-${sessionId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Essay exported as text!');
      }
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error('Failed to export essay');
    }
  };

  const handleSaveDraft = async (content: string) => {
    if (!sessionId) return;

    try {
      await saveDraft(sessionId, content, sessionState?.session.currentStage);
      toast.success('Draft saved!');
    } catch (err: any) {
      toast.error('Failed to save draft');
    }
  };

  const handleUpdateProfile = async (profile: Record<string, any>) => {
    if (!sessionId) return;

    try {
      const updatedSession = await updateSession(sessionId, { studentProfile: profile });
      setSessionState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            studentProfile: updatedSession.studentProfile
          }
        };
      });
      toast.success('Profile updated!');
    } catch (err: any) {
      console.error('Profile update error:', err);
      toast.error('Failed to update profile');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-violet-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-violet-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <span className="text-gray-600 font-medium">Loading session...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !sessionState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-gray-50">
        <div className="p-4 bg-red-100 rounded-full">
          <AlertCircle className="w-12 h-12 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Session Not Found</h2>
          <p className="text-gray-500 max-w-md">{error || 'The requested session could not be loaded.'}</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-700 transition-colors shadow-md"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Render StageWizard
  return (
    <StageWizard
      sessionId={sessionId!}
      sessionState={sessionState}
      isTeacher={isTeacher}
      isConnected={isConnected}
      activeAgentStage={activeAgentStage}
      currentUserId={currentUserId}
      onApprove={handleApprove}
      onRequestRevision={handleRevision}
      onStudentFeedback={handleStudentFeedback}
      onSendMessage={handleSendMessage}
      onTyping={() => socket?.sendTyping()}
      onStartPipeline={handleStartPipeline}
      onSaveDraft={handleSaveDraft}
      onExport={handleExport}
      onUpdateProfile={handleUpdateProfile}
      typingUsers={typingUsers}
      actionLoading={actionLoading}
      selectedAngle={selectedAngle}
      onSelectAngle={setSelectedAngle}
    />
  );
};

export default EssayCollabWorkspace;
