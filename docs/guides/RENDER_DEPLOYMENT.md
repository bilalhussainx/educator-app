# Deployment Guide - Render.com

This guide will help you deploy your Educator App backend to Render so it's accessible from anywhere.

## Prerequisites

- GitHub repository (already done ✅)
- Neon database (already configured ✅)  
- Render.com account (free tier available)

## Step 1: Deploy Backend to Render

1. **Go to [Render.com](https://render.com)** and sign up/login with GitHub

2. **Create New Web Service:**
   - Click "New +"
   - Select "Web Service"
   - Connect your GitHub repository: `bilalhussainx/educator-app`
   - Select the repository

3. **Configure the service:**
   - **Name**: `educator-app-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `educators-edge-backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Set Environment Variables:**
   Copy these from your local `.env` file to Render's Environment Variables:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://neondb_owner:npg_AX7NorpK3bLU@ep-calm-dawn-aeeyn1n1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   DB_USER=neondb_owner
   DB_PASSWORD=npg_AX7NorpK3bLU
   DB_HOST=ep-calm-dawn-aeeyn1n1-pooler.c-2.us-east-2.aws.neon.tech
   DB_DATABASE=neondb
   DB_PORT=5432
   JWT_SECRET=yourSuperSecretAndLongKeyForSigningTokens
   GEMINI_API_KEY=AIzaSyB3B-tV02soEQUHwE_eHE-kWuUEhcLxZvc
   GLOT_API_KEY=468cf485-822e-4608-a6a8-b87e47e54db5
   NETLIFY_AUTH_TOKEN=nfp_Uer1dXsfei9eVjT8kpmAsVWAXycrqKzX803e
   NETLIFY_SITE_ID=37599287-1f88-485d-b095-94224ddc2711
   UPSTASH_REDIS_REST_URL=https://possible-elephant-36405.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AY41AAIjcDE0MzRkZWJlMTQyMWI0OGZkOTBiOWM2Yzc3YTA2YWIwN3AxMA
   ```

5. **Click "Create Web Service"** and wait for deployment

## Step 2: Update Frontend Configuration

Once your backend is deployed, you'll get a URL like: `https://educator-app-backend.onrender.com`

1. **Update Vercel Environment Variables:**
   - Go to your Vercel dashboard
   - Select your educator-app project
   - Go to Settings > Environment Variables
   - Update/Add: `VITE_API_URL=https://your-render-url.onrender.com`

2. **Trigger Vercel Redeploy:**
   - Go to Deployments tab
   - Click "..." next to latest deployment
   - Click "Redeploy"

## Step 3: Test the Deployment

1. **Test Backend Health:**
   Visit: `https://your-render-url.onrender.com`
   Should show: `{"status":"ok","message":"Educator App Backend is running",...}`

2. **Test Authentication:**
   Try logging in from your Vercel frontend URL from any device

## Troubleshooting

### Common Issues:

**Backend Build Fails:**
- Check Render build logs
- Ensure all dependencies are in package.json
- Verify environment variables are set correctly

**Database Connection Fails:**
- Verify Neon database credentials
- Check DATABASE_URL format
- Ensure SSL is configured correctly

**CORS Errors:**
- Backend should already have CORS enabled for all origins
- If issues persist, can restrict to specific domains

**Frontend Can't Connect:**
- Verify VITE_API_URL environment variable in Vercel
- Ensure URL doesn't have trailing slash
- Check that Vercel redeployed with new environment variables

### Performance Notes:

- **Render Free Tier**: May spin down after 15 minutes of inactivity (cold starts)
- **First Request**: May take 30-60 seconds if service was sleeping
- **Consider**: Upgrading to paid tier for production use

## Expected URLs:

- **Backend**: `https://educator-app-backend.onrender.com`
- **Frontend**: `https://your-vercel-domain.vercel.app`
- **Database**: Neon (already configured)

After deployment, your app will be accessible from any device worldwide! 🌐