import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Icons
import {
    Bot, Sparkles, Wand2, Star, Zap, Crown, Gem,
    MessageCircle, Lightbulb, Target, Brain, X,
    ChevronUp, ChevronDown, Award, TrendingUp
} from 'lucide-react';

interface FloatingAIAssistantProps {
    onQuickAction: (action: string) => void;
    selectedText?: string;
    isVisible?: boolean;
    position?: { x: number; y: number };
}

const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
    onQuickAction,
    selectedText,
    isVisible = true,
    position = { x: 20, y: 100 }
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const quickActions = [
        {
            id: 'improve',
            label: 'Improve',
            icon: Wand2,
            color: 'from-blue-500 to-indigo-600',
            description: 'Enhance selected text'
        },
        {
            id: 'grammar',
            label: 'Grammar',
            icon: Star,
            color: 'from-emerald-500 to-green-600',
            description: 'Fix grammar issues'
        },
        {
            id: 'clarity',
            label: 'Clarity',
            icon: Lightbulb,
            color: 'from-amber-500 to-orange-600',
            description: 'Make it clearer'
        },
        {
            id: 'tone',
            label: 'Tone',
            icon: Target,
            color: 'from-purple-500 to-pink-600',
            description: 'Adjust writing tone'
        }
    ];

    useEffect(() => {
        if (selectedText && selectedText.length > 0) {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 600);
        }
    }, [selectedText]);

    if (!isVisible) return null;

    return (
        <div
            className="fixed z-50 transition-all duration-300"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        >
            {/* Main AI Button */}
            <div className="relative">
                <Button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "w-14 h-14 rounded-full shadow-lg transition-all duration-300",
                        "bg-gradient-to-r from-indigo-500 to-purple-600",
                        "hover:from-indigo-600 hover:to-purple-700",
                        "border-4 border-white",
                        isAnimating && "animate-pulse scale-110",
                        isExpanded && "scale-110"
                    )}
                >
                    <div className="relative">
                        <Crown className="w-6 h-6 text-white" />
                        {selectedText && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center">
                                <Sparkles className="w-2 h-2 text-white" />
                            </div>
                        )}
                    </div>
                </Button>

                {/* Floating Badge */}
                {selectedText && (
                    <div className="absolute -top-2 -right-2 transition-all duration-300">
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs animate-bounce">
                            Text Selected
                        </Badge>
                    </div>
                )}

                {/* Premium Glow Effect */}
                <div className={cn(
                    "absolute inset-0 rounded-full transition-opacity duration-300",
                    "bg-gradient-to-r from-indigo-400 to-purple-500 opacity-20 blur-lg",
                    isExpanded && "opacity-40 scale-125"
                )} />
            </div>

            {/* Quick Actions Panel */}
            {isExpanded && (
                <Card className={cn(
                    "absolute top-16 left-0 w-64 shadow-xl border-0",
                    "bg-white/95 backdrop-blur-sm transition-all duration-300",
                    "animate-in slide-in-from-top-2 fade-in"
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                                <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                                    <Bot className="w-3 h-3 text-white" />
                                </div>
                                <h3 className="font-semibold text-slate-900 text-sm">AI Assistant</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(false)}
                                className="w-6 h-6 p-0"
                            >
                                <X className="w-3 h-3" />
                            </Button>
                        </div>

                        {selectedText ? (
                            <div>
                                <div className="bg-indigo-50 p-3 rounded-lg mb-3">
                                    <p className="text-xs text-indigo-700 mb-1">Selected text:</p>
                                    <p className="text-sm text-slate-900 italic line-clamp-2">
                                        "{selectedText.length > 60 ? selectedText.substring(0, 60) + '...' : selectedText}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {quickActions.map((action) => {
                                        const Icon = action.icon;
                                        return (
                                            <Button
                                                key={action.id}
                                                onClick={() => {
                                                    onQuickAction(action.id);
                                                    setIsExpanded(false);
                                                }}
                                                variant="outline"
                                                size="sm"
                                                className="h-auto p-2 flex flex-col items-center space-y-1 hover:shadow-md transition-all"
                                            >
                                                <div className={cn(
                                                    "w-6 h-6 rounded-full flex items-center justify-center",
                                                    `bg-gradient-to-r ${action.color}`
                                                )}>
                                                    <Icon className="w-3 h-3 text-white" />
                                                </div>
                                                <span className="text-xs font-medium">{action.label}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Brain className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-600">Select text to get AI suggestions</p>
                                <p className="text-xs text-slate-500">Or click to open full AI chat</p>
                                <Button
                                    onClick={() => {
                                        onQuickAction('open_chat');
                                        setIsExpanded(false);
                                    }}
                                    size="sm"
                                    className="mt-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                                >
                                    <MessageCircle className="w-3 h-3 mr-1" />
                                    Open AI Chat
                                </Button>
                            </div>
                        )}

                        {/* Premium Features Indicator */}
                        <div className="mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center justify-center space-x-1">
                                <Gem className="w-3 h-3 text-indigo-500" />
                                <span className="text-xs font-medium text-indigo-600">Premium AI Features</span>
                                <Badge variant="secondary" className="text-xs">
                                    Urgent Session
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Pulse Animation for Attention */}
            {selectedText && !isExpanded && (
                <div className="absolute inset-0 rounded-full animate-ping bg-gradient-to-r from-emerald-400 to-green-500 opacity-20" />
            )}
        </div>
    );
};

export default FloatingAIAssistant;