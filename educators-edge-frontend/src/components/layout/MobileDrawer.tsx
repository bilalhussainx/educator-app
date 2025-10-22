/**
 * Mobile Drawer Component
 *
 * Slide-out navigation drawer for mobile devices
 * Replaces the desktop sidebar
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  X, Home, Compass, Trophy, Code, Users, Calendar,
  MessageSquare, FileText, Brain, Activity, Sparkles,
  LogOut, Settings, BookOpen, PlusCircle, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  badge?: string;
  premium?: boolean;
  teacher?: boolean;
}

export const MobileDrawer: React.FC<Props> = ({ user, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
    onClose();
  };

  // Dynamic nav items based on user role
  const getNavItems = (): NavItem[] => {
    const baseItems = [
      { path: '/dashboard', icon: Home, label: user.role === 'teacher' ? 'Teaching Hub' : 'Career Launchpad' },
    ];

    if (user.role === 'teacher') {
      return [
        ...baseItems,
        { path: '/courses/discover', icon: Compass, label: '🎓 Discover Courses' },
        { path: '/courses/new', icon: PlusCircle, label: '📚 Create Course', teacher: true },
        { path: '/admin/leetcode-enrichment', icon: Database, label: '🤖 LeetCode Enrichment', teacher: true },
        { path: '/messages', icon: MessageSquare, label: '💬 Messages' },
        { path: '/session-documents', icon: FileText, label: '📄 Session Documents' },
        { path: '/ai-writing-assistant', icon: Brain, label: '🤖 AI Assistant' },
        { path: '/trading-terminal', icon: Activity, label: '🔨 Trading Terminal' },
        { path: '/trust-graph', icon: Users, label: '🤝 Trust Graph' },
        { path: '/sessions', icon: Calendar, label: '📅 Sessions' },
        { path: '/solved-problems', icon: Sparkles, label: '🏆 Achievements' },
      ];
    } else {
      return [
        ...baseItems,
        { path: '/trust-graph', icon: Users, label: '🤝 Connect - Trust Graph' },
        { path: '/leetcode', icon: Trophy, label: '🔨 Build - LeetCode' },
        { path: '/courses/discover', icon: Compass, label: '🎓 Learn - Courses' },
        { path: '/sessions', icon: Calendar, label: '📅 Sessions' },
        { path: '/messages', icon: MessageSquare, label: '💬 Messages' },
        { path: '/ascent-ide', icon: Code, label: '💻 IDE Projects' },
        { path: '/session-documents', icon: FileText, label: '📄 Documents' },
        { path: '/ai-writing-assistant', icon: Brain, label: '🤖 AI Assistant' },
        { path: '/trading-terminal', icon: Activity, label: '📊 Trading' },
        { path: '/solved-problems', icon: Sparkles, label: '🏆 Achievements' },
        { path: '/talent-crucible', icon: Sparkles, label: '🏆 Certifications', premium: true },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div className={cn(
        'fixed top-0 left-0 h-full w-80 max-w-[85vw]',
        'bg-slate-900 border-r border-slate-700/50',
        'z-50 lg:hidden',
        'transform transition-transform duration-300 ease-out',
        'flex flex-col',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user.username}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all',
                  'text-left',
                  isActive
                    ? 'bg-cyan-500/10 text-cyan-400 font-medium'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5 flex-shrink-0',
                  isActive ? 'text-cyan-400' : 'text-slate-400'
                )} />
                <span className="flex-1 truncate text-sm">{item.label}</span>
                {item.premium && (
                  <Badge variant="warning" className="text-xs">Pro</Badge>
                )}
                {item.badge && (
                  <Badge variant="default" className="text-xs">{item.badge}</Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-700/50 space-y-2">
          <button
            onClick={() => handleNavigate('/settings')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all"
          >
            <Settings className="h-5 w-5 text-slate-400" />
            <span className="text-sm">Settings</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};
