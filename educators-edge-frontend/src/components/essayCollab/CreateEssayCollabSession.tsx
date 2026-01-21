/**
 * Create Essay Collaboration Session
 *
 * Component for teachers to create new multi-agent essay collaboration sessions.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  FileText,
  School,
  Users,
  Target,
  Sparkles,
  ArrowRight,
  Loader2,
  Info,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { createSession, listSessions, type EssaySession } from '@/services/essayCollabService';
import apiClient from '@/services/apiClient';

interface Student {
  id: string;
  username: string;
  email: string;
}

const UNIVERSITIES = [
  'Harvard University',
  'Stanford University',
  'MIT',
  'Yale University',
  'Princeton University',
  'Columbia University',
  'University of Pennsylvania',
  'Duke University',
  'Northwestern University',
  'Brown University',
  'Cornell University',
  'Johns Hopkins University',
  'UC Berkeley',
  'UCLA',
  'University of Chicago',
  'Carnegie Mellon University',
  'NYU',
  'University of Michigan',
  'Georgetown University',
  'Other'
];

const ESSAY_TYPES = [
  { value: 'common_app', label: 'Common App Essay', wordCount: 650 },
  { value: 'supplemental', label: 'Supplemental Essay', wordCount: 250 },
  { value: 'why_us', label: '"Why Us" Essay', wordCount: 400 },
  { value: 'diversity', label: 'Diversity Essay', wordCount: 500 },
  { value: 'activity', label: 'Activity Essay', wordCount: 150 },
  { value: 'custom', label: 'Custom', wordCount: 500 }
];

interface CreateEssayCollabSessionProps {
  onSessionCreated?: (session: EssaySession) => void;
  showExistingSessions?: boolean;
}

const CreateEssayCollabSession: React.FC<CreateEssayCollabSessionProps> = ({
  onSessionCreated,
  showExistingSessions = true
}) => {
  const navigate = useNavigate();

  // Form state
  const [essayPrompt, setEssayPrompt] = useState('');
  const [university, setUniversity] = useState('');
  const [customUniversity, setCustomUniversity] = useState('');
  const [essayType, setEssayType] = useState('common_app');
  const [targetWordCount, setTargetWordCount] = useState(650);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [soloMode, setSoloMode] = useState(true);

  // Loading/data states
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [existingSessions, setExistingSessions] = useState<EssaySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load students and existing sessions
  useEffect(() => {
    loadStudents();
    if (showExistingSessions) {
      loadExistingSessions();
    }
  }, [showExistingSessions]);

  // Update word count when essay type changes
  useEffect(() => {
    const type = ESSAY_TYPES.find(t => t.value === essayType);
    if (type && essayType !== 'custom') {
      setTargetWordCount(type.wordCount);
    }
  }, [essayType]);

  const loadStudents = async () => {
    try {
      const response = await apiClient.get('/api/students');
      if (response.data) {
        setStudents(response.data);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  };

  const loadExistingSessions = async () => {
    try {
      setLoadingSessions(true);
      const sessions = await listSessions({ limit: 10 });
      setExistingSessions(sessions);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!essayPrompt.trim()) {
      toast.error('Please enter an essay prompt');
      return;
    }

    try {
      setLoading(true);

      const finalUniversity = university === 'Other' ? customUniversity : university;

      const session = await createSession({
        essayPrompt: essayPrompt.trim(),
        university: finalUniversity || undefined,
        targetWordCount,
        studentId: soloMode ? undefined : (selectedStudent ? parseInt(selectedStudent) : undefined),
        studentProfile: {}
      });

      toast.success('Essay session created!');

      if (onSessionCreated) {
        onSessionCreated(session);
      }

      // Navigate to the collaboration workspace
      navigate(`/essay-collab/${session.id}`);

    } catch (error: any) {
      console.error('Failed to create session:', error);
      toast.error(error.response?.data?.error || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'paused': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Sparkles className="w-7 h-7 text-purple-600" />
          AI Essay Collaboration
        </h1>
        <p className="text-gray-600 mt-2">
          Create a collaborative essay writing session powered by our 6-agent AI pipeline.
          Each stage has human-in-the-loop approval for quality control.
        </p>
      </div>

      {/* Existing Sessions */}
      {showExistingSessions && existingSessions.length > 0 && !showCreateForm && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Your Essay Sessions</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
          </div>

          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="grid gap-4">
              {existingSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/essay-collab/${session.id}`)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {session.essayPrompt.slice(0, 80)}...
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        {session.university && (
                          <span className="flex items-center gap-1">
                            <School className="w-4 h-4" />
                            {session.university}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          {session.targetWordCount} words
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    Stage: {session.currentStage.replace('_', ' ')} | Created: {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Form */}
      {(showCreateForm || existingSessions.length === 0) && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          {existingSessions.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Create New Session</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Essay Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1.5" />
                Essay Prompt *
              </label>
              <textarea
                value={essayPrompt}
                onChange={(e) => setEssayPrompt(e.target.value)}
                placeholder="Enter the essay prompt or question..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                rows={4}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Paste the complete essay prompt including any specific requirements
              </p>
            </div>

            {/* University */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <School className="w-4 h-4 inline mr-1.5" />
                Target University (Optional)
              </label>
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select a university...</option>
                {UNIVERSITIES.map((uni) => (
                  <option key={uni} value={uni}>{uni}</option>
                ))}
              </select>
              {university === 'Other' && (
                <input
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder="Enter university name"
                  className="mt-2 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              )}
            </div>

            {/* Essay Type & Word Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Essay Type
                </label>
                <select
                  value={essayType}
                  onChange={(e) => setEssayType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  {ESSAY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.wordCount} words)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Target className="w-4 h-4 inline mr-1.5" />
                  Target Word Count
                </label>
                <input
                  type="number"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 500)}
                  min={50}
                  max={2000}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Collaboration Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Users className="w-4 h-4 inline mr-1.5" />
                Collaboration Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSoloMode(true)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    soloMode
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">Solo Mode</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Work alone with AI agents
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSoloMode(false)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    !soloMode
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">With Student</div>
                  <div className="text-sm text-gray-500 mt-1">
                    Collaborate with a student
                  </div>
                </button>
              </div>

              {!soloMode && students.length > 0 && (
                <div className="mt-4">
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Select a student (optional)...</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.username} ({student.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* AI Pipeline Info */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-purple-900">6-Stage AI Pipeline</h4>
                  <p className="text-sm text-purple-700 mt-1">
                    Your essay will go through: Topic Analysis → Research → Outline → Draft → Editing → Polish.
                    You can review and approve each stage before proceeding.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !essayPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Start Essay Collaboration
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CreateEssayCollabSession;
