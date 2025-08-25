// src/services/apiClient.ts (Definitive Vite Version)

import axios from 'axios';

// 1. Read the environment variable using the VITE_ prefix required by Vite.
//    Vite uses `import.meta.env`, not `process.env`.
const API_URL = import.meta.env.VITE_API_URL;

// 2. Add the crucial check for the VITE_ variable.
if (import.meta.env.PROD && !API_URL) {
  // `import.meta.env.PROD` is Vite's way of checking for a production build.
  console.error("FATAL ERROR: VITE_API_URL is not set in the Vercel environment.");
  throw new Error("Application is not configured for production.");
}

// 3. Log the URL for easy debugging.
console.log(`[API Client] Initializing with base URL: ${API_URL || 'http://localhost:5000'}`);

const apiClient = axios.create({
  // Fall back to localhost ONLY if the VITE_ variable is not found (for local dev).
  baseURL: API_URL || 'http://localhost:5000',
});

// 4. The interceptor to add the auth token remains the same.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
