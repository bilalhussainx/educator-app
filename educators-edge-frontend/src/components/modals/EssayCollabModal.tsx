/**
 * Essay Collaboration Modal
 *
 * Sidebar modal for teachers to create multi-agent essay sessions
 * and for students to join sessions by ID.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  PlusCircle,
  Loader,
  Target,
  Users,
  Copy,
  Check,
  Send,
  ArrowRight,
  FileText,
  Bell,
  ExternalLink,
  School
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';
import { createSession, listSessions, type EssaySession } from '@/services/essayCollabService';

interface Student {
  id: string;
  username: string;
  email: string;
}

interface EssayCollabModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

// Sample essay prompts for quick start
const SAMPLE_PROMPTS = [
  {
    title: 'Common App - Personal Growth',
    prompt: 'Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?',
    wordCount: 650,
    type: 'common_app'
  },
  {
    title: 'Common App - Background',
    prompt: 'Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.',
    wordCount: 650,
    type: 'common_app'
  },
  {
    title: 'Common App - Problem Solved',
    prompt: 'Describe a problem you\'ve solved or a problem you\'d like to solve. It can be an intellectual challenge, a research query, an ethical dilemma - anything that is of personal importance, no matter the scale.',
    wordCount: 650,
    type: 'common_app'
  },
  {
    title: 'Why This College',
    prompt: 'Why are you interested in [University Name]? What specific programs, opportunities, or aspects of campus life appeal to you?',
    wordCount: 400,
    type: 'why_us'
  },
  {
    title: 'Extracurricular Activity',
    prompt: 'Briefly describe your most meaningful extracurricular activity or work experience. What have you learned from this experience?',
    wordCount: 150,
    type: 'activity'
  },
  {
    title: 'Diversity & Inclusion',
    prompt: 'Describe how you would contribute to the diversity of our campus community and what perspectives you would bring.',
    wordCount: 500,
    type: 'diversity'
  }
];

export const EssayCollabModal: React.FC<EssayCollabModalProps> = ({ user, isOpen, onClose }) => {
  const navigate = useNavigate();
  const isTeacher = user?.role === 'teacher';

  // Teacher form state
  const [essayPrompt, setEssayPrompt] = useState('');
  const [targetWordCount, setTargetWordCount] = useState(650);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createdSession, setCreatedSession] = useState<EssaySession | null>(null);
  const [copied, setCopied] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [showSamples, setShowSamples] = useState(true);

  // Student join state
  const [joinSessionId, setJoinSessionId] = useState('');
  const [pendingInvites, setPendingInvites] = useState<EssaySession[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isTeacher) {
        loadStudents();
      } else {
        loadPendingInvites();
      }
    } else {
      // Reset form when closing
      setCreatedSession(null);
      setEssayPrompt('');
      setSelectedStudent('');
      setJoinSessionId('');
      setShowSamples(true);
    }
  }, [isOpen, isTeacher]);

  // Select a sample prompt
  const selectSamplePrompt = (sample: typeof SAMPLE_PROMPTS[0]) => {
    setEssayPrompt(sample.prompt);
    setTargetWordCount(sample.wordCount);
    setShowSamples(false);
  };

  const loadStudents = async () => {
    // Students join via session ID, so this is optional
    // The endpoint may not exist - that's fine
    try {
      setLoadingStudents(true);
      const response = await apiClient.get('/api/users/students');
      if (response.data?.students) {
        setStudents(response.data.students);
      }
    } catch (error) {
      // Silently fail - students can join via session ID anyway
      console.log('[EssayCollabModal] Students list not available - students will join via session ID');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadPendingInvites = async () => {
    try {
      setLoadingInvites(true);
      const response = await apiClient.get('/api/essay-collab/invitations');
      if (response.data?.sessions) {
        setPendingInvites(response.data.sessions);
      }
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleCreateSession = async () => {
    if (!essayPrompt.trim()) {
      toast.error('Please enter an essay prompt');
      return;
    }

    try {
      setCreating(true);

      const session = await createSession({
        essayPrompt: essayPrompt.trim(),
        targetWordCount,
        studentId: selectedStudent ? parseInt(selectedStudent) : undefined,
        studentProfile: {}
      });

      setCreatedSession(session);
      toast.success('Essay session created!');

      // If student was selected, send invitation notification
      if (selectedStudent) {
        await sendInvitation(session.id, parseInt(selectedStudent));
      }

    } catch (error: any) {
      console.error('Failed to create session:', error);
      toast.error(error.response?.data?.error || 'Failed to create session');
    } finally {
      setCreating(false);
    }
  };

  const sendInvitation = async (sessionId: string, studentId: number) => {
    try {
      setSendingInvite(true);
      await apiClient.post(`/api/essay-collab/sessions/${sessionId}/invite`, {
        studentId
      });
      toast.success('Invitation sent to student!');
    } catch (error) {
      console.error('Failed to send invitation:', error);
      // Don't show error - the session was still created
    } finally {
      setSendingInvite(false);
    }
  };

  const copySessionId = () => {
    if (createdSession) {
      navigator.clipboard.writeText(createdSession.id);
      setCopied(true);
      toast.success('Session ID copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSession = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sessionId = joinSessionId.trim();
    if (sessionId) {
      onClose();
      navigate(`/essay-collab/${sessionId}`);
    }
  };

  const handleJoinInvite = (sessionId: string) => {
    onClose();
    navigate(`/essay-collab/${sessionId}`);
  };

  const handleGoToSession = () => {
    if (createdSession) {
      onClose();
      navigate(`/essay-collab/${createdSession.id}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 text-white shadow-2xl w-full max-w-2xl mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-purple-300 text-2xl">
            <Sparkles className="w-6 h-6" /> AI Essay Collaboration
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isTeacher
              ? 'Create a multi-agent essay writing session with your student'
              : 'Join an essay collaboration session with your teacher'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="pt-4 space-y-6 pb-4">
          {isTeacher ? (
            // Teacher View
            <>
              {!createdSession ? (
                // Create Session Form
                <div className="space-y-5">
                  {/* Quick Start Samples */}
                  {showSamples && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-slate-300">
                          Quick Start - Choose a Prompt
                        </Label>
                        <button
                          onClick={() => setShowSamples(false)}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Write custom prompt
                        </button>
                      </div>
                      <div className="grid gap-2 max-h-[280px] overflow-y-auto pr-2">
                        {SAMPLE_PROMPTS.map((sample, idx) => (
                          <button
                            key={idx}
                            onClick={() => selectSamplePrompt(sample)}
                            className="text-left p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:border-purple-500 hover:bg-slate-800 transition-all group"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-purple-300 group-hover:text-purple-200">
                                {sample.title}
                              </span>
                              <span className="text-xs text-slate-500">
                                {sample.wordCount} words
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {sample.prompt}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Essay Prompt (shown when samples hidden or after selection) */}
                  {!showSamples && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Essay Prompt *
                        </Label>
                        <button
                          onClick={() => setShowSamples(true)}
                          className="text-xs text-purple-400 hover:text-purple-300"
                        >
                          Show samples
                        </button>
                      </div>
                      <Textarea
                        value={essayPrompt}
                        onChange={(e) => setEssayPrompt(e.target.value)}
                        placeholder="Enter the essay prompt or question..."
                        className="bg-slate-800 border-slate-600 focus:border-purple-400 min-h-[100px] resize-none"
                      />
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-400">Target:</span>
                          <Input
                            type="number"
                            value={targetWordCount}
                            onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 500)}
                            min={50}
                            max={2000}
                            className="w-20 h-7 text-xs bg-slate-800 border-slate-600 focus:border-purple-400"
                          />
                          <span className="text-xs text-slate-400">words</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Student Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Invite Student (Optional)
                    </Label>
                    {loadingStudents ? (
                      <div className="flex items-center gap-2 text-slate-400 py-2">
                        <Loader className="w-4 h-4 animate-spin" />
                        Loading students...
                      </div>
                    ) : students.length > 0 ? (
                      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 focus:border-purple-400">
                          <SelectValue placeholder="Select a student to invite..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-slate-200 max-h-[200px]">
                          <SelectItem value="" className="text-slate-400 focus:bg-slate-700">
                            No student (solo mode)
                          </SelectItem>
                          {students.map((student) => (
                            <SelectItem key={student.id} value={student.id} className="text-slate-200 focus:bg-slate-700">
                              {student.username} ({student.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-slate-500">No students found</p>
                    )}
                    {selectedStudent && (
                      <p className="text-xs text-purple-400 flex items-center gap-1">
                        <Bell className="w-3 h-3" />
                        Student will be notified when the session is created
                      </p>
                    )}
                  </div>

                  {/* Info Box */}
                  <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-700/50">
                    <h4 className="font-medium text-purple-300 mb-2">How it works</h4>
                    <p className="text-sm text-purple-200/80">
                      1. Start session with a prompt → 2. Configure details together → 3. AI pipeline begins
                    </p>
                    <p className="text-xs text-purple-200/60 mt-1">
                      University and essay type will be configured in the workspace with your student
                    </p>
                  </div>

                  {/* Create Button */}
                  <Button
                    onClick={handleCreateSession}
                    disabled={creating || !essayPrompt.trim()}
                    className="w-full py-6 bg-purple-600 hover:bg-purple-500 text-white font-bold disabled:opacity-50"
                  >
                    {creating ? (
                      <>
                        <Loader className="w-5 h-5 mr-2 animate-spin" />
                        Creating Session...
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-5 h-5 mr-2" />
                        Create Essay Session
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                // Session Created - Show ID
                <div className="space-y-6">
                  <div className="bg-green-900/30 rounded-lg p-4 border border-green-700/50 text-center">
                    <Check className="w-12 h-12 mx-auto text-green-400 mb-3" />
                    <h3 className="text-lg font-semibold text-green-300 mb-2">Session Created!</h3>
                    <p className="text-sm text-green-200/80 mb-4">
                      Share this Session ID with your student
                    </p>

                    {/* Session ID Display */}
                    <div className="bg-slate-800 rounded-lg p-4 mb-4">
                      <Label className="text-xs text-slate-400 mb-2 block">Session ID</Label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-lg font-mono text-purple-300 bg-slate-900 px-4 py-2 rounded break-all">
                          {createdSession.id}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copySessionId}
                          className="border-slate-600 hover:bg-slate-700"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Session Details */}
                    <div className="text-left text-sm text-slate-400 space-y-1 mb-4">
                      <p><strong>Prompt:</strong> {createdSession.essayPrompt.slice(0, 60)}...</p>
                      {createdSession.university && (
                        <p><strong>University:</strong> {createdSession.university}</p>
                      )}
                      <p><strong>Target:</strong> {createdSession.targetWordCount} words</p>
                    </div>
                  </div>

                  {/* Go to Session Button */}
                  <Button
                    onClick={handleGoToSession}
                    className="w-full py-6 bg-purple-600 hover:bg-purple-500 text-white font-bold"
                  >
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Go to Session
                  </Button>

                  {/* Create Another */}
                  <Button
                    variant="outline"
                    onClick={() => setCreatedSession(null)}
                    className="w-full border-slate-600 hover:bg-slate-800 text-slate-300"
                  >
                    Create Another Session
                  </Button>
                </div>
              )}
            </>
          ) : (
            // Student View
            <Tabs defaultValue="join" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="join" className="data-[state=active]:bg-purple-600">
                  Join by ID
                </TabsTrigger>
                <TabsTrigger value="invites" className="data-[state=active]:bg-purple-600 relative">
                  Invitations
                  {pendingInvites.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                      {pendingInvites.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="join" className="mt-4">
                <form onSubmit={handleJoinSession} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-300">
                      Enter Session ID from your teacher
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={joinSessionId}
                        onChange={(e) => setJoinSessionId(e.target.value)}
                        placeholder="Paste session ID here..."
                        className="flex-1 bg-slate-800 border-slate-600 focus:border-purple-400"
                        required
                      />
                      <Button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-500"
                        disabled={!joinSessionId.trim()}
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <h4 className="font-medium text-slate-300 mb-2">How it works</h4>
                    <ul className="text-sm text-slate-400 space-y-1">
                      <li>1. Get the Session ID from your teacher</li>
                      <li>2. Paste it above and click join</li>
                      <li>3. Collaborate on the essay together</li>
                    </ul>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="invites" className="mt-4">
                {loadingInvites ? (
                  <div className="flex items-center justify-center py-8 text-slate-400">
                    <Loader className="w-5 h-5 animate-spin mr-2" />
                    Loading invitations...
                  </div>
                ) : pendingInvites.length > 0 ? (
                  <div className="space-y-3">
                    {pendingInvites.map((session) => (
                      <div
                        key={session.id}
                        className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-purple-500 transition-colors"
                      >
                        <p className="font-medium text-slate-200 line-clamp-2 mb-2">
                          {session.essayPrompt}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
                          {session.university && (
                            <span className="flex items-center gap-1">
                              <School className="w-3 h-3" />
                              {session.university}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            {session.targetWordCount} words
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleJoinInvite(session.id)}
                          className="w-full bg-purple-600 hover:bg-purple-500"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Join Session
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No pending invitations</p>
                    <p className="text-sm text-slate-500 mt-1">
                      Your teacher will invite you to sessions
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EssayCollabModal;
