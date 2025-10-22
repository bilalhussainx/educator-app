/**
 * Intelligent Navigation Companion
 *
 * The AI-powered unified navigation system that transforms how users interact
 * with the platform. Features conversational navigation, smart search,
 * contextual assistance, and proactive suggestions.
 *
 * Design Philosophy: Top 0.1% product thinking
 * - Anticipatory, not reactive
 * - Conversational, not menu-driven
 * - Contextual, not generic
 * - Delightful, not functional
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Bot, Send, Sparkles, Search, Calendar, Trophy, BookOpen,
  Code, Users, MessageSquare, Clock, CheckCircle2, Circle,
  Zap, TrendingUp, Target, Lightbulb, ArrowRight, X,
  Command, ChevronRight, Star, Bell, Home, Compass
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import apiClient from '@/services/apiClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  quickActions?: QuickAction[];
  searchResults?: SearchResult[];
}

interface QuickAction {
  label: string;
  icon: React.ElementType;
  action: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
}

interface SearchResult {
  id: string;
  category: 'course' | 'lesson' | 'mentor' | 'session' | 'problem' | 'page' | 'feature';
  title: string;
  description: string;
  relevance: number;
  path: string;
  metadata?: any;
  icon: React.ElementType;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'cyan' | 'purple';
}

interface SmartTodo {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  completed: boolean;
  type: 'lesson' | 'problem' | 'session' | 'custom';
  dueDate?: Date;
  linkedPath?: string;
  xpReward: number;
}

interface Props {
  user: User | null;
  className?: string;
}

// Predefined quick action templates based on user context
const getContextualQuickActions = (user: User, location: any, navigate: any): QuickAction[] => {
  const isTeacher = user.role === 'teacher';

  const teacherActions: QuickAction[] = [
    { label: 'Create Course', icon: BookOpen, action: () => navigate('/courses/new'), variant: 'primary' },
    { label: 'Start Live Session', icon: Calendar, action: () => navigate('/sessions'), variant: 'success' },
    { label: 'View Students', icon: Users, action: () => navigate('/students'), variant: 'secondary' },
    { label: 'Messages', icon: MessageSquare, action: () => navigate('/messages') },
  ];

  const studentActions: QuickAction[] = [
    { label: 'Continue Learning', icon: BookOpen, action: () => navigate('/courses/discover'), variant: 'primary' },
    { label: 'Practice LeetCode', icon: Code, action: () => navigate('/leetcode'), variant: 'success' },
    { label: 'Find Mentor', icon: Users, action: () => navigate('/trust-graph'), variant: 'secondary' },
    { label: 'Check Progress', icon: Trophy, action: () => navigate('/solved-problems') },
  ];

  return isTeacher ? teacherActions : studentActions;
};

// Sample knowledge base for AI responses
const getAIResponse = async (query: string, user: User, context: any): Promise<{ text: string; suggestions?: QuickAction[]; results?: SearchResult[] }> => {
  const queryLower = query.toLowerCase();

  // Navigation queries
  if (queryLower.includes('take me to') || queryLower.includes('go to') || queryLower.includes('show me')) {
    if (queryLower.includes('leetcode') || queryLower.includes('practice') || queryLower.includes('problems')) {
      return {
        text: "I'll take you to the LeetCode browser where you can practice coding problems and build your algorithmic thinking skills! 🔨",
        suggestions: [
          { label: 'Go to LeetCode', icon: Code, action: () => context.navigate('/leetcode'), variant: 'primary' }
        ]
      };
    }
    if (queryLower.includes('course') || queryLower.includes('learn')) {
      return {
        text: "Let me show you the available courses! You can discover new skills or continue where you left off. 🎓",
        suggestions: [
          { label: 'Discover Courses', icon: Compass, action: () => context.navigate('/courses/discover'), variant: 'primary' },
          { label: 'My Courses', icon: BookOpen, action: () => context.navigate('/dashboard'), variant: 'secondary' }
        ]
      };
    }
    if (queryLower.includes('mentor') || queryLower.includes('trust graph') || queryLower.includes('network')) {
      return {
        text: "The Trust Graph is your professional network! Connect with mentors, build relationships, and grow your career network. 🤝",
        suggestions: [
          { label: 'Open Trust Graph', icon: Users, action: () => context.navigate('/trust-graph'), variant: 'primary' }
        ]
      };
    }
  }

  // Progress queries
  if (queryLower.includes('progress') || queryLower.includes('stats') || queryLower.includes('how am i doing')) {
    return {
      text: `Great question! You're making excellent progress:\n• 128 problems solved on LeetCode 🏆\n• 12-day streak going strong 🔥\n• 2,450 XP earned this week ⚡\n\nKeep up the amazing work!`,
      suggestions: [
        { label: 'View Full Stats', icon: TrendingUp, action: () => context.navigate('/solved-problems'), variant: 'primary' }
      ]
    };
  }

  // Todo/task queries
  if (queryLower.includes('todo') || queryLower.includes('tasks') || queryLower.includes('what should i do')) {
    return {
      text: "Here's what you're working on:\n✓ Finish Recursion lesson (High priority)\n⏳ Complete Two Sum problem (+15 XP)\n📅 Session with mentor at 2pm today\n\nWant to tackle the Recursion lesson next?",
      suggestions: [
        { label: 'Continue Lesson', icon: BookOpen, action: () => context.navigate('/courses/discover'), variant: 'primary' },
        { label: 'View All Tasks', icon: CheckCircle2, action: () => {}, variant: 'secondary' }
      ]
    };
  }

  // Session queries
  if (queryLower.includes('session') || queryLower.includes('meeting') || queryLower.includes('live')) {
    return {
      text: "You have 1 upcoming session:\n📅 Live coding session with bilalhussain.v1\n⏰ Today at 2:00 PM\n📝 Topic: React Hooks Advanced Patterns\n\nI'll remind you 5 minutes before it starts!",
      suggestions: [
        { label: 'View Sessions', icon: Calendar, action: () => context.navigate('/sessions'), variant: 'primary' },
        { label: 'Set Reminder', icon: Bell, action: () => toast.success('Reminder set for 1:55 PM'), variant: 'secondary' }
      ]
    };
  }

  // Search/discovery
  if (queryLower.includes('find') || queryLower.includes('search') || queryLower.includes('looking for')) {
    // This would integrate with actual search - simplified for demo
    const results: SearchResult[] = [
      {
        id: '1',
        category: 'course',
        title: 'React Fundamentals',
        description: '65% complete • 12 lessons remaining',
        relevance: 95,
        path: '/courses/react-fundamentals',
        icon: BookOpen,
        badge: 'In Progress',
        badgeVariant: 'cyan'
      },
      {
        id: '2',
        category: 'problem',
        title: 'Two Sum - LeetCode',
        description: 'Array • Easy • Recommended for you',
        relevance: 88,
        path: '/leetcode/two-sum',
        icon: Code,
        badge: 'Recommended',
        badgeVariant: 'success'
      },
      {
        id: '3',
        category: 'mentor',
        title: 'bilalhussain.v1',
        description: 'React & Algorithms expert • 4.9★',
        relevance: 82,
        path: '/trust-graph',
        icon: Users,
        badge: 'Available',
        badgeVariant: 'success'
      }
    ];

    return {
      text: "I found several relevant resources for you! Here are the top matches:",
      results
    };
  }

  // Help/guidance
  if (queryLower.includes('help') || queryLower.includes('how do i') || queryLower.includes('what is')) {
    return {
      text: "I'm here to help! I can assist you with:\n\n🧭 Navigation - \"Take me to LeetCode\"\n📊 Progress - \"Show my stats\"\n📋 Tasks - \"What's on my todo list?\"\n🔍 Search - \"Find React courses\"\n📅 Sessions - \"When is my next meeting?\"\n\nWhat would you like to do?",
      suggestions: getContextualQuickActions(user, null, context.navigate)
    };
  }

  // Default intelligent response
  return {
    text: `I understand you're asking about "${query}". I can help you navigate the platform, check your progress, manage tasks, find resources, and much more!\n\nTry asking me things like:\n• "Show my progress"\n• "Take me to LeetCode"\n• "What's my next task?"\n• "Find a React mentor"`,
    suggestions: getContextualQuickActions(user, null, context.navigate)
  };
};

export const IntelligentNavigationCompanion: React.FC<Props> = ({ user, className }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (!user) return;

    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `👋 Welcome back, **${user.username}**! I'm your AI navigation companion.\n\nI can help you:\n• Navigate anywhere on the platform\n• Track your progress and tasks\n• Find courses, mentors, and resources\n• Answer questions about features\n\nWhat would you like to do today?`,
      timestamp: new Date(),
      quickActions: getContextualQuickActions(user, location, navigate)
    };
    setMessages([welcomeMessage]);
  }, [user]);

  // Auto-scroll to bottom on new messages (only if user sent a message)
  useEffect(() => {
    // Only auto-scroll if the last message is from the user (to prevent initial page auto-scroll)
    if (messages.length > 1 && messages[messages.length - 2]?.role === 'user') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Keyboard shortcut: Cmd/Ctrl + K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        if (!isExpanded) setIsExpanded(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // Simulate AI processing delay for better UX
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const aiResponse = await getAIResponse(input, user, { navigate, location });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.text,
        timestamp: new Date(),
        quickActions: aiResponse.suggestions,
        searchResults: aiResponse.results
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI response error:', error);
      toast.error('Sorry, I encountered an error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    action.action();
    toast.success(`Navigating to ${action.label}...`);
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        className={cn(
          'flex gap-3 animate-in slide-in-from-bottom-2 duration-300',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {/* Avatar */}
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-gradient-to-br from-cyan-500 to-blue-500'
            : 'bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-purple-400/30'
        )}>
          {isUser ? (
            <span className="text-white text-base font-bold">{user?.username?.[0]?.toUpperCase() || 'U'}</span>
          ) : (
            <Bot className="h-5 w-5 text-white" />
          )}
        </div>

        {/* Message content */}
        <div className={cn(
          'flex-1 space-y-2 max-w-[85%]',
          isUser && 'flex flex-col items-end'
        )}>
          <div className={cn(
            'rounded-2xl px-5 py-4 backdrop-blur-sm',
            isUser
              ? 'bg-cyan-500/20 border border-cyan-500/30 text-cyan-100'
              : 'bg-slate-800/80 border border-slate-700/50 text-slate-200'
          )}>
            <div className="whitespace-pre-wrap text-base leading-relaxed">
              {message.content.split('\n').map((line, i) => {
                // Parse markdown-style bold
                const parts = line.split('**');
                return (
                  <div key={i} className={i > 0 ? 'mt-1' : ''}>
                    {parts.map((part, j) =>
                      j % 2 === 1 ? <strong key={j} className="font-bold text-white">{part}</strong> : part
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          {message.quickActions && message.quickActions.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={idx}
                    size="default"
                    variant="outline"
                    className={cn(
                      'rounded-xl border-2 backdrop-blur-sm transition-all hover:scale-105 text-sm font-medium px-4 py-2',
                      action.variant === 'primary' && 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/30',
                      action.variant === 'success' && 'bg-green-500/20 border-green-500/50 text-green-300 hover:bg-green-500/30',
                      action.variant === 'secondary' && 'bg-purple-500/20 border-purple-500/50 text-purple-300 hover:bg-purple-500/30',
                      !action.variant && 'bg-slate-800/50 border-slate-600/50 text-slate-300 hover:bg-slate-700/50'
                    )}
                    onClick={() => handleQuickAction(action)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Search results */}
          {message.searchResults && message.searchResults.length > 0 && (
            <div className="space-y-3 mt-4">
              {message.searchResults.map((result) => {
                const Icon = result.icon;
                return (
                  <div
                    key={result.id}
                    onClick={() => navigate(result.path)}
                    className="bg-slate-800/60 backdrop-blur-sm border-2 border-slate-700/50 rounded-xl p-4 hover:bg-slate-700/60 hover:border-slate-600/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'p-3 rounded-xl',
                        result.category === 'course' && 'bg-cyan-500/20',
                        result.category === 'problem' && 'bg-orange-500/20',
                        result.category === 'mentor' && 'bg-purple-500/20'
                      )}>
                        <Icon className={cn(
                          'h-5 w-5',
                          result.category === 'course' && 'text-cyan-400',
                          result.category === 'problem' && 'text-orange-400',
                          result.category === 'mentor' && 'text-purple-400'
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-white truncate">{result.title}</h4>
                          {result.badge && (
                            <Badge variant={result.badgeVariant} className="text-xs">{result.badge}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{result.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-400 transition-colors flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Timestamp */}
          <div className={cn(
            'text-sm text-slate-500 flex items-center gap-1.5 mt-2',
            isUser && 'justify-end'
          )}>
            <Clock className="h-3.5 w-3.5" />
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  };

  // Don't render if no user
  if (!user) return null;

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-6 right-6 z-50 group"
      >
        <div className="relative">
          <div className="absolute -inset-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 p-4 rounded-full shadow-2xl group-hover:scale-110 transition-transform">
            <Bot className="h-6 w-6 text-white" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <Card className={cn(
      'bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl',
      'flex flex-col h-full',
      className
    )}>
      {/* Header */}
      <CardHeader className="border-b border-slate-700/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                <Bot className="h-7 w-7 text-purple-400" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                Your AI Guide
                <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
              </CardTitle>
              <p className="text-base text-slate-400 mt-1">Always here to help navigate your journey</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm px-3 py-1 bg-slate-800/50 border-slate-600 hidden sm:flex">
              <Command className="h-4 w-4 mr-1" />
              Cmd+K
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="h-8 w-8 p-0 hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-5 space-y-5 max-h-[500px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {messages.map(renderMessage)}
        {isProcessing && (
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 ring-2 ring-purple-400/30 flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl px-5 py-4">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2.5 h-2.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Input */}
      <div className="border-t border-slate-700/50 p-5">
        <div className="flex gap-3">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 bg-slate-800/50 border-2 border-slate-700 text-white text-base placeholder:text-slate-500 focus:ring-2 focus:ring-purple-500/50 h-12 px-4 rounded-xl"
            disabled={isProcessing}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 h-12 w-12 p-0 rounded-xl"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
        <p className="text-sm text-slate-500 mt-3 text-center">
          Try: "Show my progress" • "Take me to LeetCode" • "What's next?"
        </p>
      </div>
    </Card>
  );
};
