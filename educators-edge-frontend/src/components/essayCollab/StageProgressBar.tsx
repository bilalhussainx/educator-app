/**
 * Stage Progress Bar
 *
 * Visual representation of the essay pipeline stages
 */

import React from 'react';
import { CheckCircle, Circle, Loader2, AlertCircle, Clock } from 'lucide-react';
import { STAGE_ORDER, STAGE_LABELS, STAGES } from '@/services/essayCollabService';

interface StageProgressBarProps {
  currentStage: string;
  completedStages: string[];
  pendingApproval: boolean;
  stageStatuses?: Record<string, 'pending' | 'approved' | 'rejected' | 'revision_requested'>;
}

const StageProgressBar: React.FC<StageProgressBarProps> = ({
  currentStage,
  completedStages,
  pendingApproval,
  stageStatuses = {}
}) => {
  const getStageStatus = (stage: string) => {
    if (completedStages.includes(stage)) return 'completed';
    if (stage === currentStage) {
      if (pendingApproval) return 'pending_approval';
      return 'in_progress';
    }
    if (stageStatuses[stage] === 'revision_requested') return 'revision';
    return 'upcoming';
  };

  const getStageIcon = (stage: string) => {
    const status = getStageStatus(stage);

    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'pending_approval':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'revision':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  const getStageColor = (stage: string) => {
    const status = getStageStatus(stage);

    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending_approval':
        return 'bg-amber-500';
      case 'revision':
        return 'bg-orange-500';
      default:
        return 'bg-gray-200';
    }
  };

  const currentIndex = STAGE_ORDER.indexOf(currentStage as typeof STAGE_ORDER[number]);

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-700">Pipeline Progress</h3>
        <span className="text-xs text-gray-500">
          {currentStage === STAGES.COMPLETE
            ? 'Complete!'
            : `Stage ${currentIndex + 1} of ${STAGE_ORDER.length}`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />

        {/* Progress line */}
        <div
          className="absolute top-4 left-0 h-0.5 bg-blue-500 transition-all duration-500"
          style={{
            width: `${Math.max(0, (currentIndex / (STAGE_ORDER.length - 1)) * 100)}%`
          }}
        />

        {/* Stage nodes */}
        <div className="relative flex justify-between">
          {STAGE_ORDER.map((stage, index) => (
            <div key={stage} className="flex flex-col items-center" style={{ width: '16.66%' }}>
              {/* Icon */}
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center bg-white
                  border-2 transition-all duration-300
                  ${getStageStatus(stage) === 'completed' ? 'border-green-500' :
                    getStageStatus(stage) === 'in_progress' ? 'border-blue-500' :
                      getStageStatus(stage) === 'pending_approval' ? 'border-amber-500' :
                        getStageStatus(stage) === 'revision' ? 'border-orange-500' :
                          'border-gray-200'}
                `}
              >
                {getStageIcon(stage)}
              </div>

              {/* Label */}
              <span
                className={`
                  mt-2 text-xs text-center font-medium
                  ${getStageStatus(stage) === 'completed' ? 'text-green-600' :
                    getStageStatus(stage) === 'in_progress' || getStageStatus(stage) === 'pending_approval' ? 'text-blue-600' :
                      'text-gray-400'}
                `}
              >
                {STAGE_LABELS[stage]}
              </span>

              {/* Status label */}
              {getStageStatus(stage) === 'pending_approval' && (
                <span className="mt-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  Needs Review
                </span>
              )}
              {getStageStatus(stage) === 'revision' && (
                <span className="mt-1 text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                  Revision
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StageProgressBar;
