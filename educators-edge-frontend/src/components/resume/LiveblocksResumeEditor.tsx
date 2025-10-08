/**
 * Liveblocks Resume Editor with AI Inline Comments
 * Collaborative resume editing with Claude AI providing inline feedback
 * Similar to the essay editor's inline comment system
 */

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Loader2, Upload, Download, Sparkles, CheckCircle, AlertCircle, MessageCircle, Lightbulb, Target, Brain, Wand2, Eye, X, Save, Grid3x3, Palette } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import axios from 'axios';
import TemplateManager from './TemplateManager';
import './resume-comments.css';

// Liveblocks integration
import {
  useLiveblocksExtension,
  FloatingThreads,
} from '@liveblocks/react-tiptap';
import { RoomProvider } from '@/lib/liveblocks';
import { useOthers, useMyPresence, useStatus } from '@liveblocks/react';

interface LiveblocksResumeEditorProps {
  userId: string;
  username: string;
  onAnalysisComplete?: (analysis: any) => void;
}

interface AnalysisData {
  analysisId: string;
  preservedHTML: string;
  editableContent: string;
  formattingContext: any;
  claudeAnalysis: any;
  sections: any[];
  metadata: any;
}

interface AIInlineComment {
  id: string;
  type: 'praise' | 'suggestion' | 'correction' | 'enhancement' | 'impact' | 'clarity';
  position: { from: number; to: number };
  text: string;
  message: string;
  suggestion?: string;
  explanation?: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  confidence: number;
}

function LiveblocksResumeEditorInner({ userId, username, onAnalysisComplete }: LiveblocksResumeEditorProps) {
  // Liveblocks presence
  const others = useOthers();
  const [myPresence, updateMyPresence] = useMyPresence();
  const status = useStatus();

  // State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // AI Feedback
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [aiInlineComments, setAiInlineComments] = useState<AIInlineComment[]>([]);
  const [showInlineComments, setShowInlineComments] = useState(true);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(true);
  const [isGeneratingComments, setIsGeneratingComments] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Template management
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [templateRecommendation, setTemplateRecommendation] = useState<any>(null);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');

  // Liveblocks extension for collaborative editing
  const liveblocks = useLiveblocksExtension({
    field: 'resumeDocument',
    onLoadDocument: (doc) => {
      console.log('Resume document loaded:', doc?.length || 0);
    },
    onSaveDocument: (doc) => {
      console.log('Resume document saved:', doc?.length || 0);
    },
  });

  // TipTap editor with Liveblocks
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false, // Liveblocks provides history
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Typography,
      TextStyle,
      Color,
      Underline,
      liveblocks,
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none max-w-none p-8',
      },
    },
  });

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  /**
   * Upload and analyze resume
   */
  const handleUploadAndAnalyze = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

      // Upload and analyze with Azure Vision
      const response = await axios.post(
        `${API_URL}/api/resume-coach/analyze`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = response.data;

      setAnalysisData({
        analysisId: data.analysisId,
        preservedHTML: data.preservedHTML,
        editableContent: data.editableContent,
        formattingContext: data.formattingContext,
        claudeAnalysis: data.claudeAnalysis,
        sections: data.sections,
        metadata: data.metadata
      });

      // Set the HTML content in the editor
      if (editor && data.preservedHTML) {
        editor.commands.setContent(data.preservedHTML);
      }

      setAiFeedback(data.claudeAnalysis?.analysis);

      // Generate inline comments
      await generateInlineComments(data.editableContent, data.claudeAnalysis);

      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.error || 'Failed to upload and analyze resume');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  /**
   * Generate AI inline comments from Claude analysis
   */
  const generateInlineComments = async (content: string, claudeAnalysis: any) => {
    setIsGeneratingComments(true);

    try {
      const analysis = claudeAnalysis?.analysis;
      if (!analysis || !analysis.priorityImprovements) {
        return;
      }

      const comments: AIInlineComment[] = [];

      // Convert priority improvements to inline comments
      analysis.priorityImprovements.forEach((improvement: any, index: number) => {
        // Try to find the text in the content
        const contextualHint = improvement.contextual_hint || '';
        const issue = improvement.issue || '';

        // Simple search - in production, you'd want more sophisticated matching
        const searchText = contextualHint.substring(0, 50);
        const position = content.indexOf(searchText);

        if (position !== -1) {
          comments.push({
            id: `comment-${index}`,
            type: getCommentType(improvement.category),
            position: {
              from: position,
              to: position + searchText.length
            },
            text: searchText,
            message: improvement.issue,
            suggestion: improvement.how_to_fix,
            explanation: improvement.why_it_matters,
            priority: improvement.priority,
            category: improvement.category,
            confidence: 0.85
          });
        }
      });

      // Add strengths as praise comments
      if (analysis.strengths) {
        analysis.strengths.forEach((strength: string, index: number) => {
          const position = content.indexOf(strength.substring(0, 30));
          if (position !== -1) {
            comments.push({
              id: `praise-${index}`,
              type: 'praise',
              position: {
                from: position,
                to: position + 30
              },
              text: strength.substring(0, 30),
              message: strength,
              priority: 'low',
              category: 'Strength',
              confidence: 0.9
            });
          }
        });
      }

      setAiInlineComments(comments);

      // Apply highlights to the editor
      if (editor) {
        comments.forEach(comment => {
          const color = getCommentColor(comment.type);
          editor.chain()
            .focus()
            .setTextSelection({ from: comment.position.from, to: comment.position.to })
            .setHighlight({ color })
            .run();
        });
      }

    } catch (error) {
      console.error('Failed to generate inline comments:', error);
    } finally {
      setIsGeneratingComments(false);
    }
  };

  /**
   * Map category to comment type
   */
  const getCommentType = (category: string): AIInlineComment['type'] => {
    const lower = category.toLowerCase();
    if (lower.includes('content')) return 'suggestion';
    if (lower.includes('formatting')) return 'correction';
    if (lower.includes('impact')) return 'impact';
    if (lower.includes('clarity')) return 'clarity';
    return 'enhancement';
  };

  /**
   * Get color for comment type
   */
  const getCommentColor = (type: AIInlineComment['type']): string => {
    switch (type) {
      case 'praise': return '#D1FAE5';
      case 'suggestion': return '#DBEAFE';
      case 'correction': return '#FEE2E2';
      case 'enhancement': return '#E9D5FF';
      case 'impact': return '#FED7AA';
      case 'clarity': return '#FEF3C7';
      default: return '#F3F4F6';
    }
  };

  /**
   * Handle template application
   */
  const handleApplyTemplate = (transformedHTML: string, template: any) => {
    if (editor) {
      editor.commands.setContent(transformedHTML);
      console.log('Template applied:', template.name);
    }
  };

  /**
   * Export improved resume
   */
  const handleExport = async () => {
    if (!analysisData || !editor) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';
      const content = editor.getHTML();

      const response = await axios.post(
        `${API_URL}/api/resume-coach/export`,
        {
          analysisId: analysisData.analysisId,
          content,
          format: 'docx'
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          responseType: 'blob'
        }
      );

      // Download file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `improved-resume-${Date.now()}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (err: any) {
      console.error('Export failed:', err);
      setError('Failed to export resume');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Resume Coach</h1>
            <p className="text-sm text-gray-600 mt-1">
              Collaborative resume editing with AI inline feedback
            </p>

            {/* Liveblocks status */}
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">
                {status === 'connected' ? 'Connected' : 'Connecting...'}
              </span>
              {others.count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {others.count} other{others.count !== 1 ? 's' : ''} editing
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {analysisData && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateDialog(true)}
                >
                  <Grid3x3 className="w-4 h-4 mr-2" />
                  Templates
                </Button>
                <Button
                  variant={showInlineComments ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowInlineComments(!showInlineComments)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  AI Comments
                </Button>
                <Button onClick={handleExport} className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Section */}
      {!analysisData && (
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-lg p-8">
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Upload Your Resume</h2>
              <p className="text-gray-600 mb-6">
                Supported formats: PDF, DOCX
              </p>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {file ? (
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-medium">Click to browse</p>
                        <p className="text-sm text-gray-500">or drag and drop</p>
                      </div>
                    )}
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleUploadAndAnalyze}
                  disabled={!file || isUploading}
                  className="w-full flex items-center justify-center gap-2"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Upload & Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Editor Section */}
      {analysisData && editor && (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Editor Area */}
          <div className="flex-1 bg-white overflow-auto relative">
            <EditorContent editor={editor} className="h-full" />

            {/* Liveblocks Floating Threads */}
            <FloatingThreads editor={editor} className="floating-threads" />

            {/* Inline Comment Indicators */}
            {showInlineComments && aiInlineComments.map(comment => (
              <CommentIndicator
                key={comment.id}
                comment={comment}
                isActive={activeCommentId === comment.id}
                onClick={() => setActiveCommentId(comment.id === activeCommentId ? null : comment.id)}
              />
            ))}
          </div>

          {/* AI Feedback Sidebar */}
          {showFeedbackPanel && (
            <div className="w-96 border-l bg-gray-50 flex flex-col">
              <div className="p-4 border-b bg-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">AI Coach</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedbackPanel(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Overall Scores */}
                {aiFeedback?.overallScore && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <ScoreCard label="Content" score={aiFeedback.overallScore.content} />
                    <ScoreCard label="Format" score={aiFeedback.overallScore.formatting} />
                    <ScoreCard label="ATS" score={aiFeedback.overallScore.ats} />
                    <ScoreCard label="Overall" score={aiFeedback.overallScore.overall} />
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1 p-4">
                {/* Inline Comments List */}
                {showInlineComments && aiInlineComments.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      AI Suggestions ({aiInlineComments.length})
                    </h4>
                    {aiInlineComments.map(comment => (
                      <CommentCard
                        key={comment.id}
                        comment={comment}
                        isActive={activeCommentId === comment.id}
                        onSelect={() => setActiveCommentId(comment.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Quick Wins */}
                {aiFeedback?.quickWins && aiFeedback.quickWins.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Quick Wins
                    </h4>
                    <div className="space-y-2">
                      {aiFeedback.quickWins.map((win: string, index: number) => (
                        <div key={index} className="text-xs bg-white p-3 rounded-lg border">
                          <div className="flex items-start gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                            <span className="text-gray-700">{win}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </div>
      )}

      {/* Template Manager Modal */}
      {analysisData && editor && (
        <TemplateManager
          open={showTemplateDialog}
          onClose={() => setShowTemplateDialog(false)}
          userId={userId}
          currentContent={editor.getHTML()}
          onApplyTemplate={handleApplyTemplate}
        />
      )}
    </div>
  );
}

/**
 * Comment Indicator Component
 */
const CommentIndicator: React.FC<{
  comment: AIInlineComment;
  isActive: boolean;
  onClick: () => void;
}> = ({ comment, isActive, onClick }) => {
  const getIcon = () => {
    switch (comment.type) {
      case 'praise': return CheckCircle;
      case 'suggestion': return Lightbulb;
      case 'correction': return AlertCircle;
      case 'enhancement': return Wand2;
      case 'impact': return Target;
      case 'clarity': return Brain;
      default: return MessageCircle;
    }
  };

  const getColor = () => {
    switch (comment.type) {
      case 'praise': return 'text-green-600 bg-green-100';
      case 'suggestion': return 'text-blue-600 bg-blue-100';
      case 'correction': return 'text-red-600 bg-red-100';
      case 'enhancement': return 'text-purple-600 bg-purple-100';
      case 'impact': return 'text-orange-600 bg-orange-100';
      case 'clarity': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const Icon = getIcon();

  return (
    <div
      className={`absolute cursor-pointer transition-all ${isActive ? 'scale-110' : ''}`}
      onClick={onClick}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getColor()}`}>
        <Icon className="w-3 h-3" />
      </div>
    </div>
  );
};

/**
 * Comment Card Component
 */
const CommentCard: React.FC<{
  comment: AIInlineComment;
  isActive: boolean;
  onSelect: () => void;
}> = ({ comment, isActive, onSelect }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg p-3 border cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant="secondary" className="text-xs">
          {comment.type}
        </Badge>
        <Badge className={`text-xs ${getPriorityColor(comment.priority)}`}>
          {comment.priority}
        </Badge>
      </div>

      <p className="text-sm font-medium text-gray-900 mb-1">{comment.message}</p>

      {comment.suggestion && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <p className="font-medium text-blue-900 mb-1">Suggestion:</p>
          <p className="text-blue-800">{comment.suggestion}</p>
        </div>
      )}

      {comment.explanation && (
        <p className="text-xs text-gray-600 mt-2">💡 {comment.explanation}</p>
      )}
    </div>
  );
};

/**
 * Score Card Component
 */
const ScoreCard: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`rounded-lg p-2 text-center ${getColor(score)}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-lg font-bold">{score}</div>
    </div>
  );
};

/**
 * Wrapped component with RoomProvider
 */
export const LiveblocksResumeEditor: React.FC<LiveblocksResumeEditorProps> = (props) => {
  const roomId = `resume-${props.userId}-${Date.now()}`;

  return (
    <RoomProvider
      id={roomId}
      initialPresence={{
        cursor: undefined,
        selection: undefined,
        user: {
          id: props.userId,
          name: props.username,
          color: '#3B82F6'
        }
      }}
    >
      <LiveblocksResumeEditorInner {...props} />
    </RoomProvider>
  );
};

export default LiveblocksResumeEditor;
