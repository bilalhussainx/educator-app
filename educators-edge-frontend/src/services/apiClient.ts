import axios from 'axios';

// For production deployment, detect if we're on the deployed URL and use production backend
// TEMPORARY: Using CORS proxy for testing until backend CORS is fixed
const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname.includes('vercel.app') || window.location.hostname.includes('educator-')) 
    ? 'https://cors-anywhere.herokuapp.com/https://educator-app.onrender.com' 
    : 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
