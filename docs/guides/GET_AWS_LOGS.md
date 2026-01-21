# How to Get Detailed AWS Elastic Beanstalk Logs

## Quick Steps to Download Logs

### Method 1: From AWS Console (Easiest)

1. **Go to Elastic Beanstalk Console:**
   - Navigate to: https://console.aws.amazon.com/elasticbeanstalk
   - Or search for "Elastic Beanstalk" in AWS Console

2. **Select Your Environment:**
   - Click on your environment name (e.g., "CoreZenith-Backend-prod")

3. **Request Logs:**
   - In the left sidebar, click **"Logs"**
   - Click **"Request Logs"** dropdown
   - Select **"Full Logs"**
   - Wait 10-30 seconds

4. **Download Logs:**
   - Once ready, click **"Download"** next to the log bundle
   - Save the ZIP file to your computer

5. **Extract and Find the Error:**
   - Extract the ZIP file
   - Look for these files:
     - `/var/log/eb-engine.log` - **Most important!**
     - `/var/log/nodejs/nodejs.log`
     - `/var/log/eb-activity.log`

6. **Share the Error:**
   - Open `eb-engine.log`
   - Look for lines with "ERROR" or "FATAL"
   - Share the error messages with me

### Method 2: View Last 100 Lines (Quick)

1. In Elastic Beanstalk console
2. Go to your environment
3. Click **"Logs"**
4. Click **"Request Logs"** → **"Last 100 Lines"**
5. View directly in browser without downloading

---

## Common Errors and What They Mean

### Error: "npm install failed"
**Cause:** Dependencies couldn't be installed
**Fix:** Check package.json for invalid dependencies

### Error: "Cannot find module"
**Cause:** Missing files in deployment package
**Fix:** Include all required files in ZIP

### Error: "Port already in use"
**Cause:** Application not listening on correct port
**Fix:** Use process.env.PORT in server.js

### Error: "Connection to database failed"
**Cause:** Environment variables not set
**Fix:** Add DATABASE_URL and other env vars in EB console

---

## What to Do Next

1. **Download the logs** using Method 1 above
2. **Find the specific error** in `eb-engine.log`
3. **Share the error with me** - paste the error lines here
4. **I'll help fix it!**

The error message will look something like:
```
[ERROR] npm ERR! code ENOTFOUND
[ERROR] npm install failed
[ERROR] Cannot find module 'xyz'
```

---

**Action Required:** Please download the Full Logs and share the error from `eb-engine.log`
