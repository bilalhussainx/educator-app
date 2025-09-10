// src/hooks/useUser.ts

import { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import type { User } from '../types/index';

export const useUser = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedToken: { user: User } = jwtDecode(token);
        setUser(decodedToken.user);
      } catch (error) {
        console.error("Failed to decode JWT token:", error);
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  return { user, isLoading };
};