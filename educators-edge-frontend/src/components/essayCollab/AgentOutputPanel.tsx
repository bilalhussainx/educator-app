/**
 * Agent Output Panel
 *
 * Displays the output from AI agents with formatting
 */

import React, { useState } from 'react';
import {
  Brain,
  Search,
  FileText,
  PenTool,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from 'lucide-react';
import { STAGES, STAGE_LABELS } from '@/services/essayCollabService';

interface AngleOption {
  title: string;
  description: string;
  strengths: string[];
  risks: string[];
  fitScore?: number;
  openingHook?: string;
}

interface AgentOutput {
  content?: string;
  angles?: AngleOption[];
  recommendedAngle?: number;
  insights?: Array<{ category: string; points: string[] }>;
  sections?: Array<{ title: string; wordCount: number; keyPoints: string[] }>;
  suggestions?: Array<{ type: string; location: string; original: string; suggestion: string; reason: string }>;
  score?: number;
  wordCount?: number;
  durationMs?: number;
  modelUsed?: string;
}

interface AgentOutputPanelProps {
  stage: string;
  output: AgentOutput | null;
  isLoading?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  selectedAngle?: number;
  onSelectAngle?: (index: number) => void;
  isSelectable?: boolean;
}

const stageIcons: Record<string, React.FC<{ className?: string }>> = {
  [STAGES.TOPIC_ANALYSIS]: Brain,
  [STAGES.RESEARCH]: Search,
  [STAGES.OUTLINE]: FileText,
  [STAGES.DRAFT]: PenTool,
  [STAGES.EDITING]: Edit3,
  [STAGES.POLISH]: Sparkles
};

const AgentOutputPanel: React.FC<AgentOutputPanelProps> = ({
  stage,
  output,
  isLoading = false,
  isExpanded = true,
  onToggleExpand,
  selectedAngle,
  onSelectAngle,
  isSelectable = false
}) => {
  const [copied, setCopied] = useState(false);

  const Icon = stageIcons[stage] || Brain;

  const handleCopy = async () => {
    if (!output?.content) return;
    await navigator.clipboard.writeText(output.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTopicAnalysis = (data: AgentOutput) => {
    if (!data.angles) return null;

    const recommendedIdx = data.recommendedAngle ?? 0;
    const currentSelection = selectedAngle ?? recommendedIdx;

    return (
      <div className="space-y-4">
        {isSelectable && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Select one of the essay angles below. The AI recommends option {recommendedIdx + 1}.
          </div>
        )}

        <div className="space-y-3">
          {data.angles.map((angle, idx) => {
            const isSelected = currentSelection === idx;
            const isRecommended = idx === recommendedIdx;

            return (
              <div
                key={idx}
                onClick={() => isSelectable && onSelectAngle?.(idx)}
                className={`
                  border rounded-lg p-4 transition-all
                  ${isSelectable ? 'cursor-pointer hover:border-blue-400' : ''}
                  ${isSelected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'bg-gray-50 border-gray-200'}
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isSelectable && (
                      <input
                        type="radio"
                        name="angle-selection"
                        checked={isSelected}
                        onChange={() => onSelectAngle?.(idx)}
                        className="w-4 h-4 text-blue-600"
                      />
                    )}
                    <h4 className="font-medium text-gray-900">{angle.title}</h4>
                    {isRecommended && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  {angle.fitScore && (
                    <span className="text-xs text-gray-500">Score: {angle.fitScore}/10</span>
                  )}
                </div>

                <p className="text-sm text-gray-600 mb-3">{angle.description}</p>

                {angle.openingHook && (
                  <div className="mb-3 p-2 bg-white rounded border border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Opening Hook:</p>
                    <p className="text-sm text-gray-700 italic">"{angle.openingHook}"</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <h5 className="text-xs font-medium text-green-600 mb-1">Strengths</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {angle.strengths?.map((s, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-green-500 mt-0.5">+</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs font-medium text-red-600 mb-1">Risks</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {angle.risks?.map((r, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-red-500 mt-0.5">-</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResearch = (data: AgentOutput) => {
    if (!data.insights) return <p className="text-sm text-gray-600">{data.content}</p>;

    return (
      <div className="space-y-4">
        {data.insights.map((insight, idx) => (
          <div key={idx} className="border-l-2 border-blue-400 pl-3">
            <h4 className="font-medium text-blue-700 text-sm mb-2">{insight.category}</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {insight.points?.map((point, i) => (
                <li key={i}>• {point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const renderOutline = (data: AgentOutput) => {
    if (!data.sections) return <p className="text-sm text-gray-600">{data.content}</p>;

    return (
      <div className="space-y-3">
        {data.sections.map((section, idx) => (
          <div key={idx} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{section.title}</h4>
              <span className="text-xs text-gray-500">{section.wordCount} words</span>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              {section.keyPoints?.map((point, i) => (
                <li key={i} className="pl-3 border-l border-gray-300">{point}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  const renderEditing = (data: AgentOutput) => {
    return (
      <div className="space-y-4">
        {data.score !== undefined && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Quality Score:</span>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${data.score >= 8 ? 'bg-green-500' :
                  data.score >= 6 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                style={{ width: `${(data.score / 10) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">{data.score}/10</span>
          </div>
        )}

        {data.suggestions && data.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Suggestions</h4>
            {data.suggestions.map((suggestion, idx) => (
              <div key={idx} className="border rounded-lg p-3 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${suggestion.type === 'grammar' ? 'bg-red-100 text-red-700' :
                    suggestion.type === 'style' ? 'bg-purple-100 text-purple-700' :
                      suggestion.type === 'clarity' ? 'bg-blue-100 text-blue-700' :
                        suggestion.type === 'voice' ? 'bg-orange-100 text-orange-700' :
                          suggestion.type === 'flow' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-gray-100 text-gray-700'
                    }`}>
                    {suggestion.type}
                  </span>
                  {suggestion.priority && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      suggestion.priority === 'high' ? 'bg-red-50 text-red-600' :
                        suggestion.priority === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                          'bg-gray-50 text-gray-600'
                    }`}>
                      {suggestion.priority}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {typeof suggestion.location === 'object'
                      ? `Paragraph ${suggestion.location?.paragraph || '?'}, ${suggestion.location?.approximate || ''}`
                      : suggestion.location}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="bg-red-50 p-2 rounded border-l-2 border-red-400">
                    <p className="text-xs text-red-500 mb-1">Original:</p>
                    <p className="text-sm text-red-700">{suggestion.original}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded border-l-2 border-green-400">
                    <p className="text-xs text-green-500 mb-1">Suggested:</p>
                    <p className="text-sm text-green-700">{suggestion.suggested || suggestion.suggestion}</p>
                  </div>
                  <p className="text-xs text-gray-500 italic">{suggestion.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!data.suggestions && data.content && (
          <p className="text-sm text-gray-600">{data.content}</p>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (!output) return null;

    switch (stage) {
      case STAGES.TOPIC_ANALYSIS:
        return renderTopicAnalysis(output);
      case STAGES.RESEARCH:
        return renderResearch(output);
      case STAGES.OUTLINE:
        return renderOutline(output);
      case STAGES.EDITING:
        return renderEditing(output);
      case STAGES.DRAFT:
      case STAGES.POLISH:
        return (
          <div className="space-y-3">
            {output.wordCount && (
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Word count: {output.wordCount}</span>
                {output.score && <span>Score: {output.score}/10</span>}
              </div>
            )}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {output.content}
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-gray-700">
              {typeof output === 'string' ? output : output.content || JSON.stringify(output, null, 2)}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isLoading ? 'bg-blue-100 animate-pulse' : 'bg-blue-50'}`}>
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{STAGE_LABELS[stage]}</h3>
            {output?.modelUsed && (
              <span className="text-xs text-gray-500">{output.modelUsed}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {output?.durationMs && (
            <span className="text-xs text-gray-400">
              {(output.durationMs / 1000).toFixed(1)}s
            </span>
          )}

          {output?.content && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors"
              title="Copy content"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}

          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="ml-3 text-sm text-gray-500">AI agent working...</span>
            </div>
          ) : output ? (
            renderContent()
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              No output yet for this stage
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentOutputPanel;
