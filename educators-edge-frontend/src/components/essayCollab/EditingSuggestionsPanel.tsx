/**
 * Editing Suggestions Panel
 *
 * A beautiful, interactive panel that displays AI editing suggestions
 * with one-click "Apply" functionality that integrates with the Liveblocks editor.
 */

import React, { useState, useEffect } from 'react';
import {
  Check,
  Undo2,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Zap,
  MessageSquare,
  Palette,
  Move,
  Type,
  Edit3,
  Volume2,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react';

interface Suggestion {
  type: string;
  priority?: string;
  location?: { paragraph?: number; approximate?: string } | string;
  original: string;
  suggested: string;
  reason: string;
}

interface EditingSuggestionsPanelProps {
  suggestions: Suggestion[];
  overallFeedback?: string;
  currentScore?: number;
  targetScore?: number;
  onApplySuggestion: (index: number, original: string, suggested: string) => boolean;
  onUndoSuggestion: (index: number, original: string, suggested: string) => boolean;
  appliedSuggestions: Set<number>;
}

// Icon mapping for suggestion types
const typeIcons: Record<string, React.FC<{ className?: string }>> = {
  voice: Volume2,
  flow: Move,
  clarity: Zap,
  grammar: Type,
  style: Palette,
  content: MessageSquare,
  structure: Edit3,
  word_choice: Type,
  punctuation: Type,
  tone: Volume2
};

// Color mapping for suggestion types
const typeColors: Record<string, { bg: string; text: string; border: string; light: string }> = {
  voice: { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', light: 'bg-orange-50' },
  flow: { bg: 'bg-cyan-500', text: 'text-cyan-700', border: 'border-cyan-200', light: 'bg-cyan-50' },
  clarity: { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-200', light: 'bg-blue-50' },
  grammar: { bg: 'bg-red-500', text: 'text-red-700', border: 'border-red-200', light: 'bg-red-50' },
  style: { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200', light: 'bg-purple-50' },
  content: { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-200', light: 'bg-green-50' },
  structure: { bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-200', light: 'bg-indigo-50' },
  word_choice: { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', light: 'bg-amber-50' },
  punctuation: { bg: 'bg-gray-500', text: 'text-gray-700', border: 'border-gray-200', light: 'bg-gray-50' },
  tone: { bg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-200', light: 'bg-pink-50' }
};

// Priority colors
const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-gray-100 text-gray-600 border-gray-200'
};

const EditingSuggestionsPanel: React.FC<EditingSuggestionsPanelProps> = ({
  suggestions,
  overallFeedback,
  currentScore,
  targetScore,
  onApplySuggestion,
  onUndoSuggestion,
  appliedSuggestions
}) => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(true);

  // Calculate progress
  const appliedCount = appliedSuggestions.size;
  const totalCount = suggestions.length;
  const progressPercent = totalCount > 0 ? (appliedCount / totalCount) * 100 : 0;

  const toggleExpand = (index: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleApply = async (index: number, suggestion: Suggestion) => {
    setApplyingIndex(index);

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 150));

    const success = onApplySuggestion(index, suggestion.original, suggestion.suggested);

    setApplyingIndex(null);

    if (!success) {
      // Could show an error toast here
      console.warn('Failed to apply suggestion - text not found in editor');
    }
  };

  const handleUndo = (index: number, suggestion: Suggestion) => {
    onUndoSuggestion(index, suggestion.suggested, suggestion.original);
  };

  const getTypeColor = (type: string) => {
    return typeColors[type.toLowerCase()] || typeColors.style;
  };

  const getTypeIcon = (type: string) => {
    return typeIcons[type.toLowerCase()] || Edit3;
  };

  const formatLocation = (location: Suggestion['location']) => {
    if (!location) return '';
    if (typeof location === 'string') return location;
    return `Paragraph ${location.paragraph || '?'}${location.approximate ? `, ${location.approximate}` : ''}`;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header with Score and Progress */}
      <div className="p-4 border-b bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-200">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Suggestions</h3>
              <p className="text-xs text-gray-500">{totalCount} improvements found</p>
            </div>
          </div>

          {/* Score Display */}
          {currentScore !== undefined && (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-gray-900">{currentScore}</span>
                  {targetScore && (
                    <>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-2xl font-bold text-green-600">{targetScore}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">Quality Score</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">
              {appliedCount} of {totalCount} applied
            </span>
            <span className="font-medium text-purple-600">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Overall Feedback Collapsible */}
        {overallFeedback && (
          <div className="mt-3">
            <button
              onClick={() => setShowFeedback(!showFeedback)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showFeedback ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>Overall Feedback</span>
            </button>
            {showFeedback && (
              <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <p className="text-sm text-gray-700 leading-relaxed">{overallFeedback}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Suggestions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {suggestions.map((suggestion, index) => {
          const isApplied = appliedSuggestions.has(index);
          const isApplying = applyingIndex === index;
          const isExpanded = expandedCards.has(index);
          const colors = getTypeColor(suggestion.type);
          const TypeIcon = getTypeIcon(suggestion.type);

          return (
            <div
              key={index}
              className={`
                group relative rounded-xl border-2 transition-all duration-300 overflow-hidden
                ${isApplied
                  ? 'border-green-200 bg-green-50/50'
                  : `${colors.border} bg-white hover:shadow-lg hover:shadow-gray-100`
                }
              `}
            >
              {/* Applied Overlay Badge */}
              {isApplied && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    Applied
                  </div>
                </div>
              )}

              {/* Card Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(index)}
              >
                <div className="flex items-start gap-3">
                  {/* Type Icon */}
                  <div className={`p-2 rounded-lg ${colors.light} flex-shrink-0`}>
                    <TypeIcon className={`w-4 h-4 ${colors.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} text-white`}>
                        {suggestion.type}
                      </span>
                      {suggestion.priority && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityColors[suggestion.priority] || priorityColors.medium}`}>
                          {suggestion.priority}
                        </span>
                      )}
                    </div>

                    {/* Original Text Preview */}
                    <p className={`text-sm mt-2 ${isApplied ? 'line-through text-gray-400' : 'text-gray-600'}`}>
                      "{suggestion.original.length > 80 ? suggestion.original.slice(0, 80) + '...' : suggestion.original}"
                    </p>

                    {/* Location */}
                    {suggestion.location && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatLocation(suggestion.location)}
                      </p>
                    )}
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0 ml-2">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {/* Original → Suggested Comparison */}
                  <div className="grid grid-cols-1 gap-2">
                    {/* Original */}
                    <div className={`p-3 rounded-lg ${isApplied ? 'bg-gray-100' : 'bg-red-50'} border ${isApplied ? 'border-gray-200' : 'border-red-100'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Circle className={`w-3 h-3 ${isApplied ? 'text-gray-400' : 'text-red-400'}`} />
                        <span className={`text-xs font-medium ${isApplied ? 'text-gray-500' : 'text-red-600'}`}>Original</span>
                      </div>
                      <p className={`text-sm ${isApplied ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {suggestion.original}
                      </p>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRight className={`w-4 h-4 ${isApplied ? 'text-green-400' : 'text-gray-300'} rotate-90`} />
                    </div>

                    {/* Suggested */}
                    <div className={`p-3 rounded-lg ${isApplied ? 'bg-green-100 border-green-200' : 'bg-green-50 border-green-100'} border`}>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className={`w-3 h-3 ${isApplied ? 'text-green-600' : 'text-green-400'}`} />
                        <span className={`text-xs font-medium ${isApplied ? 'text-green-700' : 'text-green-600'}`}>Suggested</span>
                      </div>
                      <p className={`text-sm ${isApplied ? 'text-green-800 font-medium' : 'text-gray-700'}`}>
                        {suggestion.suggested}
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Why this change?</p>
                    <p className="text-sm text-gray-600 italic">{suggestion.reason}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    {isApplied ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUndo(index, suggestion);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all text-sm font-medium"
                        >
                          <Undo2 className="w-4 h-4" />
                          Undo
                        </button>
                        <span className="flex items-center gap-1 text-sm text-green-600 ml-auto">
                          <Check className="w-4 h-4" />
                          Change applied to editor
                        </span>
                      </>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApply(index, suggestion);
                        }}
                        disabled={isApplying}
                        className={`
                          flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium
                          ${isApplying
                            ? 'bg-purple-100 text-purple-400 cursor-wait'
                            : 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300'
                          }
                        `}
                      >
                        {isApplying ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Apply Change
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {suggestions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 rounded-full bg-green-100 mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Looking great!</h4>
            <p className="text-sm text-gray-500">No suggestions at this time.</p>
          </div>
        )}

        {/* All Applied State */}
        {suggestions.length > 0 && appliedCount === totalCount && (
          <div className="flex flex-col items-center justify-center py-8 text-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
            <div className="p-3 rounded-full bg-green-500 mb-3 shadow-lg shadow-green-200">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-semibold text-green-800 mb-1">All suggestions applied!</h4>
            <p className="text-sm text-green-600">Your essay is ready for the final polish.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditingSuggestionsPanel;
