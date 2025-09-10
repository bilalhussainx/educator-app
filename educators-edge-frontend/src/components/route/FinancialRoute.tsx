import React from 'react';
import { SimulationProvider } from '../../context/SimulationContext';

interface FinancialRouteProps {
  children: React.ReactNode;
}

/**
 * Wrapper component for financial routes that provides simulation context
 * This ensures the SimulationProvider is available to all financial pages
 */
export const FinancialRoute: React.FC<FinancialRouteProps> = ({ children }) => {
  return (
    <SimulationProvider>
      {children}
    </SimulationProvider>
  );
};