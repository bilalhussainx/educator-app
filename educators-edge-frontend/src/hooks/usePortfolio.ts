// src/hooks/usePortfolio.ts

import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import type { Portfolio } from '../types/trade';

exports.usePortfolio = () => {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // This is the secure, authenticated API call we created
        const response = await apiClient.get<Portfolio>('/api/trade/portfolio');
        setPortfolio(response.data);
      } catch (err) {
        console.error("Failed to fetch portfolio:", err);
        setError('Could not load your trading portfolio.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolio();
  }, []); // The empty dependency array ensures this runs once on component mount

  return { portfolio, isLoading, error };
};