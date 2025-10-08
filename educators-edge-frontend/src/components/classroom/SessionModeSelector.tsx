import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Code2, FileText, Users, Video, MessageCircle, Monitor, Brush } from 'lucide-react';
import { cn } from "@/lib/utils";

export type SessionMode = 'code' | 'essay';

interface SessionModeOptions {
  mode: SessionMode;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  color: string;
}

interface SessionModeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onModeSelect: (mode: SessionMode) => void;
  currentMode?: SessionMode;
}

export const SessionModeSelector: React.FC<SessionModeSelectorProps> = ({
  isOpen,
  onClose,
  onModeSelect,
  currentMode
}) => {
  const [selectedMode, setSelectedMode] = useState<SessionMode | null>(currentMode || null);

  const sessionModes: SessionModeOptions[] = [
    {
      mode: 'code',
      title: 'Code Editor Session',
      description: 'Interactive coding session with terminal, code execution, and real-time collaboration',
      icon: <Code2 className="h-8 w-8" />,
      features: [
        'Monaco Code Editor',
        'Docker Terminal Integration',
        'Real-time Code Synchronization',
        'Multiple Language Support',
        'Homework Assignment System',
        'Video/Audio Communication',
        'Whiteboard & Chat'
      ],
      color: 'bg-blue-500/20 border-blue-500/30 text-blue-300'
    },
    {
      mode: 'essay',
      title: 'Essay Writing Session',
      description: 'Collaborative essay writing with rich text editor and teacher feedback system',
      icon: <FileText className="h-8 w-8" />,
      features: [
        'Rich Text Editor (TipTap)',
        'Real-time Collaborative Editing',
        'Teacher Comment System',
        'Document Reference Panel',
        'Homework Assignment System',
        'Video/Audio Communication',
        'Student Hand Raising'
      ],
      color: 'bg-green-500/20 border-green-500/30 text-green-300'
    }
  ];

  const handleModeSelect = () => {
    if (selectedMode) {
      onModeSelect(selectedMode);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-100">
            Select Live Session Mode
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
          {sessionModes.map((mode) => (
            <Card
              key={mode.mode}
              className={cn(
                "cursor-pointer transition-all duration-200 hover:scale-105",
                "bg-slate-800/50 border-slate-600",
                selectedMode === mode.mode
                  ? mode.color
                  : "hover:bg-slate-700/50"
              )}
              onClick={() => setSelectedMode(mode.mode)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedMode === mode.mode
                      ? "bg-current/10"
                      : "bg-slate-700"
                  )}>
                    {mode.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg text-slate-100">
                      {mode.title}
                    </CardTitle>
                    {selectedMode === mode.mode && (
                      <Badge variant="secondary" className="mt-1">
                        Selected
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-slate-300">
                  {mode.description}
                </p>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-200">
                    Key Features:
                  </h4>
                  <ul className="space-y-1">
                    {mode.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-1 h-1 bg-slate-500 rounded-full" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Common Features Section */}
        <div className="mx-4 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Available in Both Modes:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Video className="h-4 w-4 text-cyan-400" />
              Agora Video/Audio
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MessageCircle className="h-4 w-4 text-cyan-400" />
              Real-time Chat
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-4 w-4 text-cyan-400" />
              Student Monitoring
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Monitor className="h-4 w-4 text-cyan-400" />
              Screen Sharing
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-slate-700 border-slate-600 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleModeSelect}
            disabled={!selectedMode}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            Start {selectedMode ? sessionModes.find(m => m.mode === selectedMode)?.title : 'Session'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};