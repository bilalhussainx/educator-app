// API Configuration
// This handles the base URL for all API calls, supporting both localhost and network access

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper function to create API URLs
export const createApiUrl = (endpoint: string): string => {
    // Remove leading slash if present to avoid double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${API_BASE_URL}/${cleanEndpoint}`;
};

// WebSocket URL (for terminal and live features)
export const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');

// Helper to create WebSocket URLs
export const createWsUrl = (params?: string): string => {
    return params ? `${WS_BASE_URL}?${params}` : WS_BASE_URL;
};

export default {
    API_BASE_URL,
    WS_BASE_URL,
    createApiUrl,
    createWsUrl
};
