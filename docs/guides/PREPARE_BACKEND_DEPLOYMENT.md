# Prepare Backend for AWS Deployment

## Quick Steps to Create Deployment Package

### Option 1: Using File Explorer (Easiest - 2 minutes)

1. **Open File Explorer**
   - Navigate to: `C:\Users\bilal\projects\educator-app\educator-app\educators-edge-backend`

2. **Select ALL files and folders EXCEPT:**
   - ❌ `node_modules` folder (AWS will install this)
   - ❌ `.git` folder (not needed)
   - ❌ `.env` file (we'll set variables in AWS Console)
   - ❌ `test-upstash-redis.js` (test file, not needed)
   - ❌ Any `.log` files

3. **Select what TO include:**
   - ✅ All `.js` files (server.js, etc.)
   - ✅ `package.json` and `package-lock.json`
   - ✅ All `routes/` folder
   - ✅ All `controllers/` folder
   - ✅ All `services/` folder
   - ✅ All `middleware/` folder
   - ✅ All `config/` folder
   - ✅ All other folders (workers/, queues/, etc.)
   - ✅ `.ebignore` file
   - ✅ `Procfile`
   - ✅ `.elasticbeanstalk/` folder

4. **Create ZIP:**
   - Select all the files/folders (Ctrl+Click to select multiple)
   - Right-click → "Send to" → "Compressed (zipped) folder"
   - Name it: `backend-deploy.zip`
   - Move it to parent folder: `C:\Users\bilal\projects\educator-app\educator-app\`

### Option 2: Using PowerShell Script (If Option 1 fails)

1. Open PowerShell in the backend folder
2. Run this script:

```powershell
# Navigate to backend folder
cd C:\Users\bilal\projects\educator-app\educator-app\educators-edge-backend

# Get all items except node_modules and .git
$items = Get-ChildItem | Where-Object {
    $_.Name -ne 'node_modules' -and
    $_.Name -ne '.git' -and
    $_.Name -ne '.env' -and
    $_.Extension -ne '.log'
}

# Create ZIP
Compress-Archive -Path $items -DestinationPath ..\backend-deploy.zip -Force

Write-Host "✅ Deployment package created: backend-deploy.zip"
```

### Option 3: Let AWS Install Dependencies

Actually, the **EASIEST** way:

1. Create a ZIP with EVERYTHING (including node_modules)
2. Or exclude node_modules and let AWS run `npm install` automatically
3. AWS Elastic Beanstalk will detect `package.json` and install dependencies

**Recommendation:** Exclude `node_modules` to keep ZIP small (under 50MB)

---

## What Should Be In Your ZIP

Your `backend-deploy.zip` should contain:

```
backend-deploy.zip
├── server.js
├── package.json
├── package-lock.json
├── Procfile
├── .ebignore
├── .elasticbeanstalk/
│   └── config.yml
├── routes/
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   └── ... (all route files)
├── controllers/
│   ├── authController.js
│   └── ... (all controller files)
├── services/
│   ├── sessionStore.js
│   └── ... (all service files)
├── middleware/
│   └── ... (all middleware files)
├── config/
│   └── ... (config files)
├── workers/
│   └── ... (worker files)
└── queues/
    └── ... (queue files)
```

**Total ZIP size should be:** 5-15 MB (without node_modules)

---

## After Creating ZIP

1. Verify the ZIP file exists at:
   `C:\Users\bilal\projects\educator-app\educator-app\backend-deploy.zip`

2. Check the size:
   - ✅ Under 50 MB: Good!
   - ❌ Over 100 MB: Probably includes node_modules (too big)

3. Tell me when ready: "ZIP file is ready"

---

## Next: Create AWS Account

Once the ZIP is ready, we'll:
1. Create your AWS account (10 minutes)
2. Upload this ZIP to Elastic Beanstalk
3. Configure environment variables
4. Launch your backend!

---

**Current Task:** Create the deployment ZIP using Option 1 (File Explorer method)

Let me know when the ZIP is created!
