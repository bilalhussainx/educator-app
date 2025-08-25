export const getWebSocketUrl = (): string => {
  // This function reads the environment variable set by Vercel in production,
  // and falls back to localhost for local development.
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000';
  return wsUrl;
};