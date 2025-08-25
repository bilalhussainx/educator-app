// src/services/apiClient.ts (Definitive, Single Source of Truth)

import axios from 'axios';

// 1. Read the environment variable from Vercel.
//    This is the ONLY place this variable is read.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// 2. Add a crucial check. If the variable is missing in production,
//    throw an error. This prevents deploying a broken app.
if (process.env.NODE_ENV === 'production' && !API_URL) {
  console.error("FATAL ERROR: NEXT_PUBLIC_API_URL is not set in the Vercel environment.");
  throw new Error("Application is not configured for production.");
}

// 3. Log the URL for easy debugging in the browser console.
console.log(`[API Client] Initializing with base URL: ${API_URL || 'http://localhost:5000'}`);

const apiClient = axios.create({
  // Use the variable, or fall back to localhost for local development.
  baseURL: API_URL || 'http://localhost:5000',
});

// 4. The interceptor to automatically add the auth token.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;