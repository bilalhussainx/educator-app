# Educator's Edge Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (for frontend)
- Render account (for backend)
- PostgreSQL database (Render provides free tier)
- Redis instance (Render provides free tier)

## Step 1: GitHub Repository Setup

1. Create a new repository on GitHub named `educator-app`
2. Don't initialize with README (you already have code)
3. Run these commands in your project root:

```bash
git remote add origin https://github.com/YOUR_USERNAME/educator-app.git
git branch -M main
git push -u origin main
```

## Step 2: Backend Deployment (Render)

### Database Setup
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Create a new PostgreSQL database:
   - Click "New +" → "PostgreSQL"
   - Name: `educator-app-db`
   - Choose free tier
   - Copy the database URL for later

### Redis Setup
1. Create a new Redis instance:
   - Click "New +" → "Redis"  
   - Name: `educator-app-redis`
   - Choose free tier
   - Copy the Redis URL for later

### Web Service Setup
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure settings:
   - **Name**: `educator-app-backend`
   - **Root Directory**: `educators-edge-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Environment Variables (Render)
Add these environment variables in Render:
- `DATABASE_URL`: (from your PostgreSQL database)
- `REDIS_URL`: (from your Redis instance)
- `JWT_SECRET`: (generate a random secure string)
- `GEMINI_API_KEY`: (get from Google AI Studio)
- `PORT`: `10000` (Render default)

## Step 3: Frontend Deployment (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `educators-edge-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Environment Variables (Vercel)
Add these environment variables:
- `VITE_API_URL`: (your Render backend URL, e.g., `https://educator-app-backend.onrender.com`)

## Step 4: API Keys Setup

### Google AI (Gemini) API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to Render environment variables

### JWT Secret
Generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 5: Testing Deployment

1. Wait for both deployments to complete
2. Your frontend will be available at: `https://your-app.vercel.app`
3. Your backend will be available at: `https://your-backend.onrender.com`
4. Test the connection by checking if API calls work

## Troubleshooting

### Common Issues:
1. **CORS errors**: Make sure your frontend URL is allowed in backend CORS settings
2. **Database connection**: Verify DATABASE_URL is correct
3. **Build failures**: Check build logs for missing dependencies
4. **Environment variables**: Ensure all required vars are set

### Build Commands Reference:
- **Backend**: `npm install && npm start`
- **Frontend**: `npm install && npm run build`

## Post-Deployment

1. Update your frontend .env to use the production backend URL
2. Test all features (auth, course creation, code execution)
3. Monitor logs for any errors
4. Set up custom domains if needed

## Free Tier Limitations

- **Render**: 512MB RAM, sleeps after 15 minutes of inactivity
- **Vercel**: 100GB bandwidth, 6000 build minutes/month
- **PostgreSQL**: 1GB storage, 97 hours/month
- **Redis**: 25MB storage

Consider upgrading to paid plans for production use.