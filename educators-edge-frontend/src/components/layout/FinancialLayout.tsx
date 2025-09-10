import React from 'react';
import { FinancialHeader } from './FinancialHeader';

interface FinancialLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const FinancialLayout: React.FC<FinancialLayoutProps> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 ${className}`}>
      <FinancialHeader />
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
};