// WebSocket URL configuration with automatic production detection
export const getWebSocketUrl = (): string => {
  // First try environment variable
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  
  // Auto-detect production environment
  const hostname = window.location.hostname;
  if (hostname.includes('vercel.app') || hostname.includes('educator-')) {
    return 'wss://educator-app.onrender.com';
  }
  
  // Default to localhost for development
  return 'ws://localhost:5000';
};