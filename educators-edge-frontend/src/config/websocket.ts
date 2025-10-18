export const getWebSocketUrl = (): string => {
  let url = '';

  // For Vite projects, use import.meta.env instead of process.env
  // First try environment variable
  if (import.meta.env.VITE_WS_URL) {
    url = import.meta.env.VITE_WS_URL;
  }
  // Auto-detect production environment
  else if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname.includes('educator-')) {
      url = 'wss://educator-app-backend-vxtu.onrender.com';
    }
  }
  // Default to localhost for development (port 5000 is where backend runs)
  else {
    url = 'ws://localhost:5000';
  }

  // Remove trailing slash to prevent ws://localhost:10000/?sessionId format
  return url.replace(/\/$/, '');
};