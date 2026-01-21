/**
 * Session Setup Panel
 *
 * Collaborative setup panel for teacher and student to configure
 * essay session details together before starting the AI pipeline.
 */

import React, { useState, useEffect } from 'react';
import {
  School,
  Target,
  FileText,
  Play,
  Loader,
  Users,
  CheckCircle,
  Edit3
} from 'lucide-react';
import { toast } from 'sonner';

interface SessionSetupPanelProps {
  sessionId: string;
  essayPrompt: string;
  currentUniversity: string | null;
  currentWordCount: number;
  isTeacher: boolean;
  hasStudent: boolean;
  studentName?: string;
  onUpdate: (data: { university?: string; targetWordCount?: number }) => Promise<void>;
  onStart: () => Promise<void>;
  isStarting: boolean;
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
  { value: 'activity', label: 'Activity Essay', wordCount: 150 }
];

const SessionSetupPanel: React.FC<SessionSetupPanelProps> = ({
  sessionId,
  essayPrompt,
  currentUniversity,
  currentWordCount,
  isTeacher,
  hasStudent,
  studentName,
  onUpdate,
  onStart,
  isStarting
}) => {
  const [university, setUniversity] = useState(currentUniversity || '');
  const [customUniversity, setCustomUniversity] = useState('');
  const [wordCount, setWordCount] = useState(currentWordCount);
  const [selectedType, setSelectedType] = useState('');
  const [saving, setSaving] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  // Sync with props when they change (for real-time updates)
  useEffect(() => {
    if (currentUniversity !== null && currentUniversity !== university) {
      setUniversity(currentUniversity || '');
    }
  }, [currentUniversity]);

  useEffect(() => {
    if (currentWordCount !== wordCount) {
      setWordCount(currentWordCount);
    }
  }, [currentWordCount]);

  // Check if setup is complete
  useEffect(() => {
    const hasUniversity = university && university !== 'Other' ? true : customUniversity.length > 0;
    setSetupComplete(hasUniversity && wordCount > 0);
  }, [university, customUniversity, wordCount]);

  const handleTypeSelect = (type: typeof ESSAY_TYPES[0]) => {
    setSelectedType(type.value);
    setWordCount(type.wordCount);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const finalUniversity = university === 'Other' ? customUniversity : university;
      await onUpdate({
        university: finalUniversity || undefined,
        targetWordCount: wordCount
      });
      toast.success('Settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleStartPipeline = async () => {
    if (!setupComplete) {
      toast.error('Please complete the setup first');
      return;
    }

    // Save before starting
    const finalUniversity = university === 'Other' ? customUniversity : university;
    await onUpdate({
      university: finalUniversity || undefined,
      targetWordCount: wordCount
    });

    await onStart();
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Edit3 className="w-5 h-5" />
          Session Setup
        </h2>
        <p className="text-purple-100 text-sm mt-1">
          {hasStudent
            ? `Configure this session together with ${studentName || 'your student'}`
            : 'Configure your essay session before starting'
          }
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Essay Prompt (Read-only) */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4" />
            Essay Prompt
          </label>
          <div className="bg-gray-50 rounded-lg p-4 border">
            <p className="text-gray-700 whitespace-pre-wrap">{essayPrompt}</p>
          </div>
        </div>

        {/* Participants */}
        {hasStudent && (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <Users className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">Collaborative Session</p>
              <p className="text-xs text-green-600">Working with {studentName}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
          </div>
        )}

        {/* University Selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <School className="w-4 h-4" />
            Target University
            {!isTeacher && <span className="text-xs text-gray-400 ml-2">(Set by teacher)</span>}
          </label>
          {isTeacher ? (
            <>
              <select
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
              >
                <option value="" className="text-gray-500">Select a university...</option>
                {UNIVERSITIES.map((uni) => (
                  <option key={uni} value={uni} className="text-gray-900">{uni}</option>
                ))}
              </select>
              {university === 'Other' && (
                <input
                  type="text"
                  value={customUniversity}
                  onChange={(e) => setCustomUniversity(e.target.value)}
                  placeholder="Enter university name"
                  className="mt-2 w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 placeholder-gray-400"
                />
              )}
            </>
          ) : (
            <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {university || <span className="text-gray-400 italic">Waiting for teacher to select...</span>}
            </div>
          )}
        </div>

        {/* Essay Type Quick Select - Teacher only */}
        {isTeacher && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Essay Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ESSAY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTypeSelect(type)}
                  className={`p-3 text-left rounded-lg border transition-all ${
                    selectedType === type.value
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <span className={`text-sm font-medium block ${
                    selectedType === type.value ? 'text-purple-700' : 'text-gray-800'
                  }`}>{type.label}</span>
                  <span className={`text-xs ${
                    selectedType === type.value ? 'text-purple-600' : 'text-gray-600'
                  }`}>{type.wordCount} words</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Word Count */}
        <div>
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <Target className="w-4 h-4" />
            Target Word Count
            {!isTeacher && <span className="text-xs text-gray-400 ml-2">(Set by teacher)</span>}
          </label>
          <div className="flex items-center gap-3">
            {isTeacher ? (
              <>
                <input
                  type="number"
                  value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value) || 500)}
                  min={50}
                  max={2000}
                  className="w-32 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900"
                />
                <span className="text-gray-700 font-medium">words</span>
                <div className="flex-1" />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  {saving ? <Loader className="w-4 h-4 animate-spin" /> : 'Save'}
                </button>
              </>
            ) : (
              <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
                {wordCount} words
              </div>
            )}
          </div>
        </div>

        {/* AI Pipeline Info */}
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
          <h4 className="font-medium text-purple-900 mb-2">6-Stage AI Pipeline</h4>
          <div className="flex flex-wrap gap-2 text-sm">
            {['Topic Analysis', 'Research', 'Outline', 'Draft', 'Editing', 'Polish'].map((stage, i) => (
              <span key={stage} className="flex items-center gap-1 text-purple-700">
                {i > 0 && <span className="text-purple-300">→</span>}
                {stage}
              </span>
            ))}
          </div>
          <p className="text-xs text-purple-600 mt-2">
            Both teacher and student can review and approve each stage
          </p>
        </div>

        {/* Start Button - Teacher only */}
        {isTeacher ? (
          <>
            <button
              onClick={handleStartPipeline}
              disabled={!setupComplete || isStarting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isStarting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Starting Pipeline...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Essay Writing
                </>
              )}
            </button>

            {!setupComplete && (
              <p className="text-center text-sm text-amber-600">
                Please select a university to continue
              </p>
            )}
          </>
        ) : (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
            <Loader className="w-6 h-6 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-800">Waiting for Teacher</p>
            <p className="text-xs text-blue-600 mt-1">
              The teacher will configure and start the session. Settings will update in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionSetupPanel;
