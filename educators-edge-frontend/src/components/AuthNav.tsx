/*
 * =================================================================
 * FOLDER: src/components/
 * FILE:   AuthNav.tsx
 * =================================================================
 */
import React from 'react';
import type { AuthNavProps } from '../types';

const AuthNav: React.FC<AuthNavProps> = ({ route, setRoute }) => (
  <nav className="flex justify-center space-x-4 mb-8">
    <button onClick={() => setRoute('login')} className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${ route === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200' }`}>Login</button>
    <button onClick={() => setRoute('register')} className={`px-4 py-2 text-lg font-medium rounded-md transition-colors ${ route === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200' }`}>Register</button>
  </nav>
);

export default AuthNav;

