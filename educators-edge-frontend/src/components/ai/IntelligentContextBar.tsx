/**
 * Intelligent Context Bar
 *
 * Always-visible context bar that shows:
 * - Current location breadcrumb
 * - Active sessions/notifications
 * - Smart todo preview
 * - Quick actions
 *
 * Sticky to the top for persistent awareness
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Home, ChevronRight, Bell, CheckCircle2, Circle, Flame,
  Calendar, Zap, Clock, Play, AlertCircle, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  user: User | null;
  className?: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: React.ElementType;
}

interface ActiveNotification {
  id: string;
  type: 'session' | 'task' | 'alert' | 'achievement';
  title: string;
  priority: 'critical' | 'high' | 'normal';
  action?: () => void;
  icon: React.ElementType;
}

export const IntelligentContextBar: React.FC<Props> = ({ user, className }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't render if no user
  if (!user) return null;
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);
  const [todosCompleted, setTodosCompleted] = useState(3);
  const [todosTotal, setTodosTotal] = useState(5);
  const [streak, setStreak] = useState(12);
  const [weeklyXP, setWeeklyXP] = useState(2450);

  // Generate breadcrumbs from current path
  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', path: '/dashboard', icon: Home }
    ];

    const pathMap: Record<string, string> = {
      'courses': '🎓 Courses',
      'discover': 'Discover',
      'leetcode': '🔨 LeetCode',
      'trust-graph': '🤝 Trust Graph',
      'sessions': '📅 Sessions',
      'messages': '💬 Messages',
      'ecosystem-dashboard': '🏆 Ecosystem',
      'ascent-ide': '💻 IDE',
      'solved-problems': '🏆 Achievements'
    };

    pathSegments.forEach((segment, index) => {
      const label = pathMap[segment] || segment.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase());
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      crumbs.push({ label, path });
    });

    setBreadcrumbs(crumbs);
  }, [location.pathname]);

  // Sample notifications - would be from real data
  useEffect(() => {
    const sampleNotifications: ActiveNotification[] = [
      {
        id: '1',
        type: 'session',
        title: 'Live session in 5 minutes',
        priority: 'critical',
        icon: Calendar,
        action: () => navigate('/sessions')
      }
    ];
    setNotifications(sampleNotifications);
  }, []);

  return (
    <div className={cn(
      'sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50',
      className
    )}>
      <div className="max-w-7xl mx-auto px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Breadcrumb */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {breadcrumbs.map((crumb, index) => {
              const Icon = crumb.icon;
              return (
                <React.Fragment key={crumb.path}>
                  <button
                    onClick={() => navigate(crumb.path)}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all text-sm',
                      index === breadcrumbs.length - 1
                        ? 'text-cyan-400 font-medium bg-cyan-500/10'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'
                    )}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" />}
                    <span className="truncate max-w-[150px]">{crumb.label}</span>
                  </button>
                  {index < breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Center: Notifications & Quick Stats */}
          <div className="flex items-center gap-3">
            {/* Critical Notifications */}
            {notifications.filter(n => n.priority === 'critical').map(notification => {
              const Icon = notification.icon;
              return (
                <button
                  key={notification.id}
                  onClick={notification.action}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-all animate-pulse"
                >
                  <Icon className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs text-red-300 font-medium">{notification.title}</span>
                </button>
              );
            })}

            {/* Todo Progress */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs text-slate-300 font-medium">
                {todosCompleted}/{todosTotal} Tasks
              </span>
            </div>

            {/* Streak */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              <span className="text-xs text-orange-300 font-medium">{streak} day streak</span>
            </div>

            {/* Weekly XP */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs text-cyan-300 font-medium">{weeklyXP.toLocaleString()} XP</span>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs bg-slate-800/50 border-slate-600 hover:bg-slate-700/50"
              onClick={() => navigate('/dashboard')}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Jump Back In
            </Button>

            <button className="relative p-2 hover:bg-slate-800/50 rounded-lg transition-colors">
              <Bell className="h-4 w-4 text-slate-400" />
              {notifications.length > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
