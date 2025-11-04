/**
 * =================================================================
 * AUTH CALLBACK PAGE
 * =================================================================
 * Handles the OAuth callback from Google authentication
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import type { User } from '../types';

interface AuthCallbackPageProps {
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
}

const AuthCallbackPage: React.FC<AuthCallbackPageProps> = ({ setToken, setUser }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      // Handle authentication error
      console.error('Authentication error:', error);
      navigate('/login?error=' + error);
      return;
    }

    if (token) {
      try {
        // Store token
        setToken(token);
        localStorage.setItem('authToken', token);

        // Decode and set user
        const decodedPayload: { user: User } = jwtDecode(token);
        setUser(decodedPayload.user);

        // Redirect to dashboard
        navigate('/dashboard');
      } catch (err) {
        console.error('Token decoding error:', err);
        navigate('/login?error=invalid_token');
      }
    } else {
      // No token provided
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, setToken, setUser]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-cyan-400 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Completing Sign In...</h2>
        <p className="text-gray-400">Please wait while we log you in</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
