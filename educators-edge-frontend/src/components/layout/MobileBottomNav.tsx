/**
 * Mobile Bottom Navigation
 *
 * Fixed bottom navigation bar for quick access to main features
 * iOS/Android style bottom tabs
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Badge } from '@/components/ui/badge';
import {
  Home, Compass, Code, Users, Trophy, BookOpen, Calendar, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  user: User | null;
  className?: string;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

const NavButton: React.FC<{
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: number;
}> = ({ icon: Icon, label, isActive, onClick, badge }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex-1 flex flex-col items-center justify-center gap-1 py-2 px-1 transition-all relative',
      'active:scale-95',
      isActive ? 'text-cyan-400' : 'text-slate-400'
    )}
  >
    <div className="relative">
      <Icon className={cn(
        'h-6 w-6 transition-all',
        isActive && 'scale-110'
      )} />
      {badge && badge > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1">
          <span className="text-[10px] font-bold text-white">{badge > 9 ? '9+' : badge}</span>
        </div>
      )}
    </div>
    <span className={cn(
      'text-[10px] font-medium transition-all truncate max-w-full',
      isActive && 'font-semibold'
    )}>
      {label}
    </span>
    {isActive && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-cyan-400 rounded-full" />
    )}
  </button>
);

export const MobileBottomNav: React.FC<Props> = ({ user, className }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  // Different nav items based on role
  const getNavItems = (): NavItem[] => {
    if (user.role === 'teacher') {
      return [
        { path: '/dashboard', icon: Home, label: 'Home' },
        { path: '/courses/discover', icon: Compass, label: 'Courses' },
        { path: '/courses/new', icon: Plus, label: 'Create' },
        { path: '/sessions', icon: Calendar, label: 'Sessions' },
        { path: '/trust-graph', icon: Users, label: 'Network' },
      ];
    } else {
      return [
        { path: '/dashboard', icon: Home, label: 'Home' },
        { path: '/courses/discover', icon: Compass, label: 'Learn' },
        { path: '/leetcode', icon: Code, label: 'Practice' },
        { path: '/trust-graph', icon: Users, label: 'Connect' },
        { path: '/solved-problems', icon: Trophy, label: 'Achieve' },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav className={cn(
      'fixed bottom-0 left-0 right-0 z-30',
      'bg-slate-900/95 backdrop-blur-xl',
      'border-t border-slate-700/50',
      'lg:hidden', // Hide on desktop
      'safe-bottom', // Account for iOS notch
      className
    )}>
      <div className="flex items-center justify-around px-2 pb-safe">
        {navItems.map((item) => (
          <NavButton
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
            onClick={() => navigate(item.path)}
            badge={item.badge}
          />
        ))}
      </div>
    </nav>
  );
};
