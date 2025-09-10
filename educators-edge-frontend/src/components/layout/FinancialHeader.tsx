import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, TrendingUp, Search, PieChart } from 'lucide-react';

interface FinancialHeaderProps {
  className?: string;
}

export const FinancialHeader: React.FC<FinancialHeaderProps> = ({ className = '' }) => {
  const location = useLocation();
  
  const navigation = [
    {
      name: 'Command Center',
      href: '/trading-terminal',
      icon: Activity,
      description: 'Day trading interface'
    },
    {
      name: 'Discover',
      href: '/discover',
      icon: Search,
      description: 'Find investment opportunities'
    },
    {
      name: 'Analysis',
      href: '/analysis',
      icon: TrendingUp,
      description: 'Deep asset analysis'
    },
    {
      name: 'Portfolio',
      href: '/portfolio',
      icon: PieChart,
      description: 'Portfolio management'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/analysis') {
      return location.pathname.startsWith('/analysis');
    }
    return location.pathname === path;
  };

  return (
    <header className={`bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 ${className}`}>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Zenith Trade</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Financial Hub</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                  title={item.description}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile Navigation - Hamburger */}
          <div className="md:hidden">
            <button className="text-slate-400 hover:text-white p-2">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className="md:hidden border-t border-slate-800">
          <div className="px-2 py-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(item.href)
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <div>{item.name}</div>
                    <div className="text-xs text-slate-500">{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};