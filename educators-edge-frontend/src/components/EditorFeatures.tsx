import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Zap, Code2, Keyboard } from 'lucide-react';

interface EditorFeaturesIndicatorProps {
  language: string;
}

export const EditorFeaturesIndicator: React.FC<EditorFeaturesIndicatorProps> = ({ language }) => {
  const features = [
    { icon: Code2, label: 'IntelliSense', description: 'Smart code completion' },
    { icon: Zap, label: 'Snippets', description: 'Common patterns & algorithms' },
    { icon: Keyboard, label: 'Shortcuts', description: 'Cmd/Ctrl+Enter to run tests' },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="font-medium">{language.toUpperCase()} Enhanced</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="hover:text-cyan-400 transition-colors">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-slate-800 border-slate-700 p-3 max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold text-sm text-cyan-300 mb-2">Editor Features Active</p>
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <feature.icon className="h-3.5 w-3.5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-xs text-slate-200">{feature.label}</p>
                    <p className="text-xs text-slate-400">{feature.description}</p>
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-300 font-medium mb-1">Keyboard Shortcuts:</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Run Tests:</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">⌘ + Enter</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Save:</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">⌘ + S</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Format:</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">⇧ + ⌥ + F</kbd>
                  </div>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default EditorFeaturesIndicator;
