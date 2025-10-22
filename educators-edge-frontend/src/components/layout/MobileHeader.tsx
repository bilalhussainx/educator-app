/**
 * Mobile Header Component
 *
 * Sticky header for mobile devices with:
 * - Hamburger menu button
 * - Logo
 * - Notifications
 * - Profile avatar
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@/types/index.ts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Menu, Bell, User as UserIcon, Search, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileDrawer } from './MobileDrawer';

interface Props {
  user: User | null;
  className?: string;
}

const CoreZenithLogo = () => (
  <div className="flex items-center gap-2">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-cyan-400">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
      CoreZenith
    </span>
  </div>
);

export const MobileHeader: React.FC<Props> = ({ user, className }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Main Header */}
      <header className={cn(
        'sticky top-0 z-40',
        'bg-slate-900/95 backdrop-blur-xl',
        'border-b border-slate-700/50',
        'lg:hidden', // Hide on desktop (sidebar takes over)
        className
      )}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Menu button */}
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <Menu className="h-6 w-6 text-slate-300" />
            </button>

            {/* Center: Logo */}
            <CoreZenithLogo />

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors relative"
              >
                {isSearchOpen ? (
                  <X className="h-5 w-5 text-slate-300" />
                ) : (
                  <Search className="h-5 w-5 text-slate-300" />
                )}
              </button>

              {/* Notifications */}
              <button
                onClick={() => navigate('/messages')}
                className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors relative"
              >
                <Bell className="h-5 w-5 text-slate-300" />
                {/* Notification badge */}
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
              </button>

              {/* Profile */}
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1 hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user.username[0].toUpperCase()}
                </div>
              </button>
            </div>
          </div>

          {/* Search bar (expandable) */}
          {isSearchOpen && (
            <div className="mt-3 animate-in slide-in-from-top-2">
              <input
                type="text"
                placeholder="Search courses, lessons, mentors..."
                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                autoFocus
              />
            </div>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        user={user}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </>
  );
};
