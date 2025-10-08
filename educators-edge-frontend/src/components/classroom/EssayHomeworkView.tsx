import React, { useState, useEffect, useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Download,
  Save,
  Eye,
  MessageCircle,
  Hand,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface EssayHomeworkAssignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  dueDate?: string;
  referenceDocument?: {
    name: string;
    url: string;
    instructions?: string;
  };
  maxWords?: number;
  submissionStatus: 'not_started' | 'in_progress' | 'submitted' | 'graded';
  grade?: number;
  teacherFeedback?: string;
}

interface EssayHomeworkViewProps {
  assignment: EssayHomeworkAssignment;
  sessionId: string;
  studentId: string;
  studentName: string;
  teacherName?: string;
  onLeave: () => void;
  sendWsMessage?: (type: string, payload: any) => void;
  isTeacherMonitoring?: boolean;
  initialContent?: string;
}

export const EssayHomeworkView: React.FC<EssayHomeworkViewProps> = ({
  assignment,
  sessionId,
  studentId,
  studentName,
  teacherName,
  onLeave,
  sendWsMessage,
  isTeacherMonitoring = false,
  initialContent
}) => {
  const [currentContent, setCurrentContent] = useState(initialContent || '');
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(assignment.submissionStatus === 'submitted');
  const [documentViewerOpen, setDocumentViewerOpen] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: currentContent || `<p>Start working on: <strong>${assignment.title}</strong></p><p></p>`,
    editable: !isSubmitted,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none mx-auto p-6 focus:outline-none h-full min-h-[400px] text-slate-200'
      }
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      const text = editor.getText();
      const words = text.trim().split(/\s+/).filter(word => word.length > 0).length;

      setCurrentContent(content);
      setWordCount(words);

      // Auto-save every 3 seconds
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        handleAutoSave(content);
      }, 3000);

      // Send real-time updates to teacher if monitoring
      if (isTeacherMonitoring) {
        sendWsMessage?.('ESSAY_HOMEWORK_UPDATE', {
          assignmentId: assignment.id,
          studentId,
          content,
          wordCount: words,
          timestamp: Date.now()
        });
      }
    },
  });

  const handleAutoSave = (content: string) => {
    // Send save request through WebSocket
    sendWsMessage?.('ESSAY_HOMEWORK_SAVE', {
      assignmentId: assignment.id,
      studentId,
      content,
      wordCount,
      timestamp: Date.now()
    });

    setLastSaved(new Date());
  };

  const handleSubmit = () => {
    if (editor && currentContent.trim()) {
      const content = editor.getHTML();

      sendWsMessage?.('ESSAY_HOMEWORK_SUBMIT', {
        assignmentId: assignment.id,
        studentId,
        content,
        wordCount,
        timestamp: Date.now()
      });

      setIsSubmitted(true);
      toast.success('Assignment submitted successfully!');
    }
  };

  const handleRaiseHand = () => {
    setHasRaisedHand(!hasRaisedHand);

    sendWsMessage?.('STUDENT_HAND_RAISE', {
      studentId,
      studentName,
      isRaised: !hasRaisedHand,
      context: 'essay_homework',
      assignmentId: assignment.id
    });

    toast.success(hasRaisedHand ? 'Hand lowered' : 'Hand raised - teacher will be notified');
  };

  const handleExportEssay = () => {
    if (editor) {
      const content = editor.getHTML();
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${assignment.title.replace(/\s+/g, '_')}_${studentName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Essay exported');
    }
  };

  // Calculate time remaining if due date exists
  const timeRemaining = assignment.dueDate ?
    Math.max(0, new Date(assignment.dueDate).getTime() - Date.now()) : null;

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onLeave}
            className="bg-slate-700 border-slate-600 hover:bg-slate-600"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Session
          </Button>

          <div>
            <h1 className="text-lg font-semibold text-slate-100">
              {assignment.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>Essay Homework</span>
              {teacherName && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Teacher: {teacherName}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status badges */}
          <div className="flex items-center gap-2">
            {isSubmitted ? (
              <Badge className="bg-green-600/20 text-green-300 border-green-600/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Submitted
              </Badge>
            ) : (
              <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-600/30">
                <AlertCircle className="h-3 w-3 mr-1" />
                In Progress
              </Badge>
            )}

            {timeRemaining && timeRemaining > 0 && (
              <Badge className="bg-blue-600/20 text-blue-300 border-blue-600/30">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeRemaining(timeRemaining)} left
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {assignment.referenceDocument && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDocumentViewerOpen(!documentViewerOpen)}
                className="bg-slate-700 border-slate-600 hover:bg-slate-600"
              >
                <FileText className="h-4 w-4 mr-1" />
                Reference
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRaiseHand}
              className={cn(
                "border-slate-600",
                hasRaisedHand
                  ? "bg-yellow-600/20 border-yellow-600/30 text-yellow-300"
                  : "bg-slate-700 hover:bg-slate-600"
              )}
            >
              <Hand className="h-4 w-4 mr-1" />
              {hasRaisedHand ? 'Lower Hand' : 'Raise Hand'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportEssay}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>

            {!isSubmitted && (
              <Button
                onClick={handleSubmit}
                disabled={wordCount === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Submit Assignment
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Assignment Details Sidebar */}
        <div className="w-80 border-r border-slate-700 bg-slate-800/30 p-4 overflow-y-auto">
          <Card className="bg-slate-700/50 border-slate-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-slate-200">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-1">Description</h4>
                <p className="text-xs text-slate-400">{assignment.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-300 mb-1">Instructions</h4>
                <p className="text-xs text-slate-400">{assignment.instructions}</p>
              </div>

              {assignment.maxWords && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-1">Word Limit</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {wordCount} / {assignment.maxWords} words
                    </span>
                    <div className={cn(
                      "text-xs",
                      wordCount > assignment.maxWords ? "text-red-400" : "text-green-400"
                    )}>
                      {wordCount > assignment.maxWords ? "Over limit!" : "Within limit"}
                    </div>
                  </div>
                </div>
              )}

              {assignment.dueDate && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-1">Due Date</h4>
                  <p className="text-xs text-slate-400">
                    {new Date(assignment.dueDate).toLocaleString()}
                  </p>
                </div>
              )}

              {lastSaved && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-1">Last Saved</h4>
                  <p className="text-xs text-slate-400">
                    {lastSaved.toLocaleTimeString()}
                  </p>
                </div>
              )}

              {assignment.grade !== undefined && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-1">Grade</h4>
                  <p className="text-sm font-semibold text-green-400">
                    {assignment.grade}/100
                  </p>
                </div>
              )}

              {assignment.teacherFeedback && (
                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-1">Teacher Feedback</h4>
                  <p className="text-xs text-slate-400">{assignment.teacherFeedback}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main essay editor */}
        <div className="flex-1 overflow-y-auto">
          <div className="relative h-full">
            <EditorContent
              editor={editor}
              className="h-full bg-slate-800/20 rounded-lg border border-slate-700/50"
            />

            {isSubmitted && (
              <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
                <Card className="bg-slate-800 border-slate-600 p-6">
                  <div className="text-center space-y-3">
                    <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
                    <h3 className="text-lg font-semibold text-slate-100">
                      Assignment Submitted
                    </h3>
                    <p className="text-sm text-slate-400">
                      Your essay has been submitted successfully. You can still view it but no longer edit.
                    </p>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* Reference document panel */}
        {assignment.referenceDocument && documentViewerOpen && (
          <div className="w-80 border-l border-slate-700 bg-slate-800/30 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Reference Document</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDocumentViewerOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-200">
                    {assignment.referenceDocument.name}
                  </span>
                </div>
                {assignment.referenceDocument.instructions && (
                  <p className="text-xs text-slate-400 mb-2">
                    {assignment.referenceDocument.instructions}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(assignment.referenceDocument!.url, '_blank')}
                  className="w-full bg-slate-600 border-slate-500 hover:bg-slate-500"
                >
                  Open Document
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};