import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Eye,
  MessageCircle,
  Hand,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Activity,
  BarChart3,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentWorkspace {
  studentId: string;
  studentName: string;
  content: string;
  wordCount: number;
  lastActive: Date;
  isActive: boolean;
  handRaised: boolean;
  assignment?: {
    id: string;
    title: string;
    maxWords?: number;
    dueDate?: string;
  };
  progress: {
    percentage: number;
    status: 'not_started' | 'in_progress' | 'submitted' | 'graded';
  };
  timeSpent: number; // in minutes
  keystrokeCount: number;
  averageWPM: number;
}

interface EssayMonitoringPanelProps {
  sessionId: string;
  students: Array<{ id: string; username: string; }>;
  sendWsMessage?: (type: string, payload: any) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const EssayMonitoringPanel: React.FC<EssayMonitoringPanelProps> = ({
  sessionId,
  students,
  sendWsMessage,
  isVisible,
  onToggleVisibility
}) => {
  const [studentWorkspaces, setStudentWorkspaces] = useState<StudentWorkspace[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentWorkspace | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Initialize student workspaces
  useEffect(() => {
    const initWorkspaces = students.map(student => ({
      studentId: student.id,
      studentName: student.username,
      content: '',
      wordCount: 0,
      lastActive: new Date(),
      isActive: false,
      handRaised: false,
      progress: {
        percentage: 0,
        status: 'not_started' as const
      },
      timeSpent: 0,
      keystrokeCount: 0,
      averageWPM: 0
    }));

    setStudentWorkspaces(initWorkspaces);
  }, [students]);

  // Handle real-time updates from WebSocket
  useEffect(() => {
    const handleWorkspaceUpdate = (data: any) => {
      if (data.type === 'ESSAY_HOMEWORK_UPDATE') {
        setStudentWorkspaces(prev => prev.map(workspace =>
          workspace.studentId === data.studentId
            ? {
                ...workspace,
                content: data.content,
                wordCount: data.wordCount,
                lastActive: new Date(data.timestamp),
                isActive: true,
                keystrokeCount: workspace.keystrokeCount + 1,
                progress: {
                  ...workspace.progress,
                  percentage: Math.min(100, (data.wordCount / (workspace.assignment?.maxWords || 500)) * 100),
                  status: data.wordCount > 0 ? 'in_progress' : 'not_started'
                }
              }
            : workspace
        ));
      }

      if (data.type === 'STUDENT_HAND_RAISE') {
        setStudentWorkspaces(prev => prev.map(workspace =>
          workspace.studentId === data.studentId
            ? { ...workspace, handRaised: data.isRaised }
            : workspace
        ));
      }

      if (data.type === 'ESSAY_HOMEWORK_SUBMIT') {
        setStudentWorkspaces(prev => prev.map(workspace =>
          workspace.studentId === data.studentId
            ? {
                ...workspace,
                progress: { ...workspace.progress, status: 'submitted' },
                isActive: false
              }
            : workspace
        ));
      }
    };

    // This would be connected to the main WebSocket message handler
    // For now, simulate some activity
    const interval = setInterval(() => {
      setStudentWorkspaces(prev => prev.map(workspace => ({
        ...workspace,
        isActive: Math.random() > 0.7,
        timeSpent: workspace.timeSpent + (workspace.isActive ? 1/60 : 0), // Add 1 second
        averageWPM: workspace.keystrokeCount > 0 ? Math.round((workspace.wordCount / (workspace.timeSpent || 1)) * 60) : 0
      })));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'not_started':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      case 'in_progress':
        return <Activity className="h-4 w-4 text-yellow-400" />;
      case 'submitted':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'graded':
        return <Target className="h-4 w-4 text-blue-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started':
        return 'bg-gray-600/20 text-gray-300 border-gray-600/30';
      case 'in_progress':
        return 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30';
      case 'submitted':
        return 'bg-green-600/20 text-green-300 border-green-600/30';
      case 'graded':
        return 'bg-blue-600/20 text-blue-300 border-blue-600/30';
      default:
        return 'bg-gray-600/20 text-gray-300 border-gray-600/30';
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const totalActive = studentWorkspaces.filter(w => w.isActive).length;
  const totalSubmitted = studentWorkspaces.filter(w => w.progress.status === 'submitted').length;
  const handsRaised = studentWorkspaces.filter(w => w.handRaised).length;

  if (!isVisible) {
    return (
      <Button
        onClick={onToggleVisibility}
        className="fixed bottom-4 right-4 bg-purple-600 hover:bg-purple-700 text-white z-50"
        size="lg"
      >
        <Users className="h-5 w-5 mr-2" />
        Monitor Students ({totalActive} active)
      </Button>
    );
  }

  return (
    <>
      {/* Floating monitoring panel */}
      <div className="fixed bottom-4 right-4 w-96 max-h-[600px] bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl z-40">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            <span className="font-semibold text-slate-100">Student Monitor</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisibility}
            className="text-slate-400 hover:text-slate-200"
          >
            ×
          </Button>
        </div>

        {/* Quick stats */}
        <div className="p-3 border-b border-slate-700">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-green-400 font-semibold">{totalActive}</div>
              <div className="text-slate-400">Active</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-semibold">{totalSubmitted}</div>
              <div className="text-slate-400">Submitted</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 font-semibold">{handsRaised}</div>
              <div className="text-slate-400">Need Help</div>
            </div>
          </div>
        </div>

        {/* Student list */}
        <div className="max-h-96 overflow-y-auto">
          <div className="p-2 space-y-2">
            {studentWorkspaces.map((workspace) => (
              <Card
                key={workspace.studentId}
                className={cn(
                  "cursor-pointer transition-all duration-200 bg-slate-800/50 border-slate-600 hover:bg-slate-700/50",
                  workspace.handRaised && "border-yellow-600/50 bg-yellow-600/10"
                )}
                onClick={() => setSelectedStudent(workspace)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-slate-600">
                          {workspace.studentName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-slate-200">
                          {workspace.studentName}
                        </div>
                        <div className="text-xs text-slate-400">
                          {workspace.wordCount} words • {formatTime(workspace.timeSpent)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {workspace.handRaised && (
                        <Hand className="h-4 w-4 text-yellow-400" />
                      )}
                      {workspace.isActive && (
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      )}
                      <Badge className={getStatusColor(workspace.progress.status)}>
                        {getStatusIcon(workspace.progress.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <div className="w-full bg-slate-700 rounded-full h-1">
                      <div
                        className={cn(
                          "h-1 rounded-full transition-all duration-300",
                          workspace.progress.status === 'submitted' ? "bg-green-400" : "bg-blue-400"
                        )}
                        style={{ width: `${workspace.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed student view dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100">
              {selectedStudent?.studentName} - Essay Workspace
            </DialogTitle>
          </DialogHeader>

          {selectedStudent && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800">
                <TabsTrigger value="content" className="text-slate-300">Content</TabsTrigger>
                <TabsTrigger value="analytics" className="text-slate-300">Analytics</TabsTrigger>
                <TabsTrigger value="feedback" className="text-slate-300">Feedback</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(selectedStudent.progress.status)}>
                        {getStatusIcon(selectedStudent.progress.status)}
                        <span className="ml-1 capitalize">{selectedStudent.progress.status.replace('_', ' ')}</span>
                      </Badge>
                      {selectedStudent.handRaised && (
                        <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-600/30">
                          <Hand className="h-3 w-3 mr-1" />
                          Needs Help
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-400">
                      Last active: {selectedStudent.lastActive.toLocaleTimeString()}
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                    <div
                      className="prose prose-invert prose-sm max-w-none text-slate-200"
                      dangerouslySetInnerHTML={{ __html: selectedStudent.content || '<p class="text-slate-400 italic">No content yet...</p>' }}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardContent className="p-4 text-center">
                      <FileText className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-100">{selectedStudent.wordCount}</div>
                      <div className="text-sm text-slate-400">Words</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardContent className="p-4 text-center">
                      <Clock className="h-8 w-8 text-green-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-100">{formatTime(selectedStudent.timeSpent)}</div>
                      <div className="text-sm text-slate-400">Time Spent</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-100">{selectedStudent.averageWPM}</div>
                      <div className="text-sm text-slate-400">Avg WPM</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-slate-800/50 border-slate-600">
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                      <div className="text-2xl font-bold text-slate-100">{Math.round(selectedStudent.progress.percentage)}%</div>
                      <div className="text-sm text-slate-400">Progress</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="feedback" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-200">Send Feedback</h3>
                    <Button
                      onClick={() => {
                        sendWsMessage?.('TEACHER_MESSAGE', {
                          studentId: selectedStudent.studentId,
                          message: 'Great progress! Keep up the good work.',
                          type: 'encouragement'
                        });
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Send Encouragement
                    </Button>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4">
                    <p className="text-sm text-slate-400 mb-2">Quick feedback options:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          sendWsMessage?.('TEACHER_FEEDBACK', {
                            studentId: selectedStudent.studentId,
                            feedback: 'Consider adding more supporting details to strengthen your argument.',
                            type: 'suggestion'
                          });
                        }}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200"
                      >
                        Suggest More Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          sendWsMessage?.('TEACHER_FEEDBACK', {
                            studentId: selectedStudent.studentId,
                            feedback: 'Great introduction! Your thesis statement is clear and engaging.',
                            type: 'praise'
                          });
                        }}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200"
                      >
                        Praise Introduction
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          sendWsMessage?.('TEACHER_FEEDBACK', {
                            studentId: selectedStudent.studentId,
                            feedback: 'Check your paragraph transitions - they need to flow better.',
                            type: 'improvement'
                          });
                        }}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200"
                      >
                        Improve Transitions
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          sendWsMessage?.('TEACHER_FEEDBACK', {
                            studentId: selectedStudent.studentId,
                            feedback: 'Remember to cite your sources properly in MLA format.',
                            type: 'reminder'
                          });
                        }}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-slate-200"
                      >
                        Citation Reminder
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};