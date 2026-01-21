# Network Access Setup Guide

This guide helps you access the Educator App from multiple devices on your network (phones, tablets, other computers).

## Quick Setup

1. **Run the network configuration helper:**
   ```bash
   node get-network-info.js
   ```

2. **Update your frontend environment:**
   - Copy the suggested IP address
   - Update `educators-edge-frontend/.env` with: `VITE_API_URL=http://YOUR-IP:5000`

3. **Restart servers** (if not auto-restarted):
   ```bash
   # Backend
   cd educators-edge-backend
   npm run dev

   # Frontend  
   cd educators-edge-frontend
   npm run dev
   ```

4. **Access from other devices:**
   - Main app: `http://YOUR-IP:5173`
   - Backend API: `http://YOUR-IP:5000`

## Current Configuration

- **Network IP**: `192.168.2.11`
- **Frontend URL**: `http://192.168.2.11:5173`
- **Backend API**: `http://192.168.2.11:5000`

## Troubleshooting

### Connection Refused Errors
- ✅ Backend configured to listen on `0.0.0.0` (all interfaces)
- ✅ Frontend using environment variable for API URL
- Check Windows Firewall settings for port 5000
- Ensure all devices are on the same WiFi network

### Environment Variables Not Working
- Restart the frontend dev server after changing `.env`
- Make sure `.env` file is in `educators-edge-frontend/` directory
- Environment variables must start with `VITE_` for Vite to detect them

### API Configuration
The app now uses a centralized API configuration:
- File: `src/config/api.ts`
- Automatically uses `VITE_API_URL` environment variable
- Falls back to `localhost:5000` if not set

## Security Notes
- Only enable network access when needed
- The backend is configured to allow CORS from any origin
- Consider firewall rules for production deployments