/**
 * Approval Controls
 *
 * Controls for approving or requesting revision of agent outputs
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { STAGE_LABELS } from '@/services/essayCollabService';

interface ApprovalControlsProps {
  stage: string;
  isTeacher: boolean;
  onApprove: (feedback?: string) => void;
  onRequestRevision: (feedback: string) => void;
  onAddFeedback?: (feedback: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  compact?: boolean; // Compact mode for bottom navigation bar
}

const ApprovalControls: React.FC<ApprovalControlsProps> = ({
  stage,
  isTeacher,
  onApprove,
  onRequestRevision,
  onAddFeedback,
  isLoading = false,
  disabled = false,
  compact = false
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [action, setAction] = useState<'approve' | 'revise' | null>(null);

  const handleApprove = () => {
    onApprove(feedback || undefined);
    setFeedback('');
    setShowFeedback(false);
    setAction(null);
  };

  const handleRevision = () => {
    if (!feedback.trim()) {
      setAction('revise');
      setShowFeedback(true);
      return;
    }
    onRequestRevision(feedback);
    setFeedback('');
    setShowFeedback(false);
    setAction(null);
  };

  const handleAddFeedback = () => {
    if (!feedback.trim() || !onAddFeedback) return;
    onAddFeedback(feedback);
    setFeedback('');
    setShowFeedback(false);
  };

  // Compact mode for bottom navigation bar
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-700">Awaiting Review</span>
        </div>

        <button
          onClick={handleApprove}
          disabled={disabled || isLoading}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${disabled || isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 shadow-md hover:shadow-lg'
            }
          `}
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Approve & Continue
        </button>

        <button
          onClick={handleRevision}
          disabled={disabled || isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-200 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Request Revision
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-medium text-amber-800">Awaiting Review</h3>
          <p className="text-sm text-amber-600">
            {STAGE_LABELS[stage]} output needs approval to proceed
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={handleApprove}
          disabled={disabled || isLoading}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
            ${disabled || isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow'
            }
          `}
        >
          {isLoading && action === 'approve' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Approve & Continue
        </button>

        <button
          onClick={handleRevision}
          disabled={disabled || isLoading}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all
            ${disabled || isLoading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
            }
          `}
        >
          {isLoading && action === 'revise' ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Request Revision
        </button>

        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 transition-all"
        >
          <MessageSquare className="w-4 h-4" />
          Add Feedback
          {showFeedback ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Feedback Form */}
      {showFeedback && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {action === 'revise'
                ? 'What should be revised?'
                : isTeacher
                  ? 'Feedback for the agent (optional)'
                  : 'Your thoughts on this output'
              }
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={
                action === 'revise'
                  ? 'Explain what changes are needed...'
                  : 'Share your feedback or suggestions...'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowFeedback(false);
                setAction(null);
                setFeedback('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>

            {action === 'revise' ? (
              <button
                onClick={handleRevision}
                disabled={!feedback.trim() || isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Submit Revision Request
              </button>
            ) : (
              <>
                {!isTeacher && onAddFeedback && (
                  <button
                    onClick={handleAddFeedback}
                    disabled={!feedback.trim() || isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Add Feedback
                  </button>
                )}
                {isTeacher && (
                  <button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Approve with Feedback
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Info text */}
      <p className="mt-3 text-xs text-amber-600">
        {isTeacher
          ? 'As the teacher, your approval moves the pipeline forward. You can also edit the output before approving.'
          : 'Your feedback will be shared with the teacher. The teacher has final approval authority.'
        }
      </p>
    </div>
  );
};

export default ApprovalControls;
