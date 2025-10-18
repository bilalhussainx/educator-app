import React from 'react';
import { Loader2 } from 'lucide-react';

interface TestRunningLoaderProps {
  totalTests: number;
  currentTest?: number;
  message?: string;
}

export const TestRunningLoader: React.FC<TestRunningLoaderProps> = ({
  totalTests,
  currentTest,
  message
}) => {
  const progress = currentTest ? (currentTest / totalTests) * 100 : 0;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="relative">
        {/* Spinning loader */}
        <Loader2 className="h-16 w-16 text-cyan-400 animate-spin" />

        {/* Center text */}
        {currentTest && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-200">
              {currentTest}/{totalTests}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md mt-6 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status message */}
      <div className="mt-4 text-center">
        <p className="text-lg font-medium text-slate-200">
          {message || 'Running tests...'}
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Please wait while we validate your solution
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-2 mt-4">
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

export default TestRunningLoader;
