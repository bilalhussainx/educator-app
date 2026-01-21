# AWS Deployment Checklist - Quick Start

Follow this checklist step-by-step. Check off each item as you complete it!

## Pre-Deployment Preparation

### Local Testing (Do this first!)
- [ ] Backend running successfully on `localhost:10000`
- [ ] Frontend running successfully on `localhost:5173`
- [ ] Can login successfully
- [ ] Redis Docker container is running
- [ ] Database connection working (Neon PostgreSQL)
- [ ] All environment variables in `.env` files are correct

### Code Repository
- [ ] Create GitHub account (if you don't have one)
- [ ] Create new repository: `educator-app`
- [ ] Push code to GitHub:
  ```bash
  git add .
  git commit -m "Prepare for AWS deployment"
  git push origin main
  ```

---

## Part 1: AWS Account Setup (30 minutes)

- [ ] **1.1** Go to [aws.amazon.com](https://aws.amazon.com) and create account
- [ ] **1.2** Verify email address
- [ ] **1.3** Add payment method (required, but won't be charged in free tier)
- [ ] **1.4** Complete phone verification
- [ ] **1.5** Select "Basic Support - Free" plan
- [ ] **1.6** Wait for account activation email (5-10 minutes)
- [ ] **1.7** Sign in to AWS Console
- [ ] **1.8** Enable MFA (Multi-Factor Authentication) on root account
  - AWS Console → Security Credentials → MFA → Activate MFA
  - Use Google Authenticator or Authy app
- [ ] **1.9** Create IAM admin user:
  - IAM → Users → Add user
  - Username: `your-name-admin`
  - Attach policy: `AdministratorAccess`
  - Save sign-in URL and credentials!
- [ ] **1.10** Sign out and sign back in as IAM user

### Install AWS CLI
- [ ] Download AWS CLI: [Windows Installer](https://awscli.amazonaws.com/AWSCLIV2.msi)
- [ ] Install and verify: `aws --version`
- [ ] Create access keys:
  - IAM → Users → Your user → Security credentials
  - Create access key → CLI
  - Save Access Key ID and Secret Access Key!
- [ ] Configure AWS CLI:
  ```bash
  aws configure
  # Enter: Access Key ID
  # Enter: Secret Access Key
  # Region: us-east-1
  # Output: json
  ```

---

## Part 2: Deploy Redis (15 minutes)

### Option A: Use Upstash (Recommended - FREE)
- [ ] You already have Upstash URL in `.env`!
- [ ] Test connection from local backend
- [ ] ✅ Skip to Part 3!

### Option B: AWS ElastiCache (~$15/month)
- [ ] Create ElastiCache cluster
- [ ] Configure security groups
- [ ] Get Redis endpoint URL
- [ ] Update backend `.env` with new Redis URL

**💡 Recommendation:** Start with Upstash (free), upgrade to ElastiCache later when needed

---

## Part 3: Deploy Backend to Elastic Beanstalk (45 minutes)

### Prepare Backend Code
- [ ] **3.1** Verify `package.json` has start script: `"start": "node server.js"`
- [ ] **3.2** Create `.ebignore` file (already created!)
- [ ] **3.3** Update server to use PORT from environment:
  ```javascript
  const PORT = process.env.PORT || 10000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  ```
- [ ] **3.4** Test locally one more time!

### Create Deployment Package
- [ ] **3.5** Open terminal in `educators-edge-backend` folder
- [ ] **3.6** Create ZIP file:
  ```bash
  # PowerShell
  Compress-Archive -Path * -DestinationPath ../backend-deploy.zip -Force

  # Or Git Bash
  zip -r ../backend-deploy.zip . -x "node_modules/*" ".git/*"
  ```

### Deploy to Elastic Beanstalk
- [ ] **3.7** Go to AWS Console → Elastic Beanstalk
- [ ] **3.8** Click "Create Application"
- [ ] **3.9** Configure:
  - Application name: `CoreZenith-Backend`
  - Platform: `Node.js`
  - Platform branch: `Node.js 20`
  - Application code: Upload `backend-deploy.zip`
- [ ] **3.10** Choose "Single instance (free tier eligible)"
- [ ] **3.11** Click "Create application"
- [ ] **3.12** Wait 10-15 minutes for deployment...
- [ ] **3.13** Copy the environment URL (example: `corzenith-backend.us-east-1.elasticbeanstalk.com`)

### Configure Environment Variables
- [ ] **3.14** Elastic Beanstalk → Configuration → Software → Edit
- [ ] **3.15** Add ALL environment variables from your `.env`:
  ```
  PORT=8080
  DATABASE_URL=postgresql://...
  JWT_SECRET=...
  REDIS_URL=rediss://...
  CLOUDINARY_API_KEY=...
  CLOUDINARY_API_SECRET=...
  CLOUDINARY_CLOUD_NAME=...
  AGORA_APP_ID=...
  AGORA_APP_CERTIFICATE=...
  LIVEBLOCKS_SECRET_KEY=...
  GEMINI_API_KEY=...
  ANTHROPIC_API_KEY=...
  AZURE_DOCUMENT_INTELLIGENCE_KEY=...
  AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=...
  ALLOWED_ORIGINS=https://main.d123456.amplifyapp.com
  FRONTEND_URL=https://main.d123456.amplifyapp.com
  ```

  **⚠️ Note:** We'll update ALLOWED_ORIGINS and FRONTEND_URL after deploying frontend!

- [ ] **3.16** Click "Apply" and wait for environment update

### Test Backend
- [ ] **3.17** Visit backend URL in browser
- [ ] **3.18** Test endpoint: `https://your-backend-url.com/api/auth/login`
  - Should see error (that's okay - needs POST request)
- [ ] **3.19** Check logs if issues: Elastic Beanstalk → Logs → Request Logs

---

## Part 4: Deploy Frontend to AWS Amplify (30 minutes)

### Prepare Frontend
- [ ] **4.1** Commit all changes:
  ```bash
  git add .
  git commit -m "Add AWS deployment configs"
  git push origin main
  ```

### Create Amplify App
- [ ] **4.2** AWS Console → Amplify → Get Started
- [ ] **4.3** Choose "Host web app" → GitHub
- [ ] **4.4** Authorize Amplify to access GitHub
- [ ] **4.5** Select repository: `educator-app`
- [ ] **4.6** Select branch: `main`
- [ ] **4.7** App name: `CoreZenith-Frontend`
- [ ] **4.8** Verify build settings (should auto-detect)
- [ ] **4.9** Add environment variables:
  ```
  VITE_API_URL=https://your-backend-url.elasticbeanstalk.com
  VITE_WS_URL=wss://your-backend-url.elasticbeanstalk.com
  VITE_AGORA_APP_ID=877b35a99f9a4a299944f0583af1ab94
  VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY=your-key
  VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=your-endpoint
  ```
- [ ] **4.10** Click "Save and deploy"
- [ ] **4.11** Wait 5-10 minutes for build...
- [ ] **4.12** Copy Amplify URL (example: `https://main.d123456.amplifyapp.com`)

### Update Backend CORS
- [ ] **4.13** Go back to Elastic Beanstalk
- [ ] **4.14** Configuration → Software → Edit
- [ ] **4.15** Update:
  - `ALLOWED_ORIGINS`: Add Amplify URL
  - `FRONTEND_URL`: Set to Amplify URL
- [ ] **4.16** Apply changes

### Test Complete Application
- [ ] **4.17** Visit your Amplify URL
- [ ] **4.18** Try to login
- [ ] **4.19** Test main features:
  - [ ] Login/Register
  - [ ] Dashboard loads
  - [ ] Can create course/lesson
  - [ ] WebSocket connections work
- [ ] **4.20** Check browser console for errors

---

## Part 5: Optional Enhancements

### Custom Domain (Optional)
- [ ] Buy domain from Route 53 or use existing
- [ ] Add domain to Amplify (auto-configures HTTPS)
- [ ] Add domain to Elastic Beanstalk
- [ ] Update DNS records

### Monitoring & Alerts
- [ ] Set up CloudWatch billing alarm
- [ ] Configure health check alerts
- [ ] Enable detailed monitoring

### CI/CD Pipeline (Optional)
- [ ] Install EB CLI: `pip install awsebcli`
- [ ] Initialize EB in backend folder: `eb init`
- [ ] Set up GitHub Actions (workflow file already created!)
- [ ] Add AWS credentials to GitHub Secrets

---

## Post-Deployment Checklist

### Security
- [ ] **Verify MFA is enabled** on AWS account
- [ ] **Never commit `.env` files** to Git
- [ ] **Rotate API keys** regularly
- [ ] **Enable CloudWatch logs** for monitoring
- [ ] **Set up billing alerts**: CloudWatch → Billing

### Cost Management
- [ ] **Set billing alarm** at $10 threshold
- [ ] **Monitor usage** weekly in Cost Explorer
- [ ] **Delete unused resources** immediately
- [ ] **Use free tier wisely**: Track limits

### Backup & Recovery
- [ ] Database backups enabled (Neon handles this)
- [ ] Code in GitHub (version controlled)
- [ ] Document all environment variables
- [ ] Save access keys securely (password manager)

---

## Troubleshooting Common Issues

### Backend shows "Degraded" health
1. Check logs: EB → Logs → Request Logs
2. Verify PORT=8080 in environment variables
3. Check all environment variables are set
4. Look for startup errors in logs

### Frontend build fails
1. Check Amplify build logs
2. Verify all VITE_* variables are set
3. Test build locally: `npm run build`
4. Check `amplify.yml` configuration

### CORS errors
1. Verify ALLOWED_ORIGINS includes Amplify URL
2. Check backend is running
3. Verify VITE_API_URL is correct
4. Check browser console for exact error

### Redis connection fails
1. Verify REDIS_URL format
2. Test Upstash URL from local machine
3. Check ElastiCache security groups (if using AWS Redis)

---

## Success Criteria

You're done when:
- ✅ Backend is accessible via HTTPS
- ✅ Frontend loads without errors
- ✅ Can login successfully
- ✅ All features work as expected
- ✅ WebSocket connections work
- ✅ No errors in browser console
- ✅ Billing alerts are set up

---

## Next Steps After Successful Deployment

1. **Test thoroughly** from different devices
2. **Share with friends** - get feedback!
3. **Monitor costs** daily for first week
4. **Learn more AWS services**:
   - CloudFront (CDN)
   - Lambda (Serverless functions)
   - S3 (File storage)
   - RDS (Managed databases)

5. **Get AWS Certified**:
   - AWS Certified Cloud Practitioner (great starting point!)

---

## Quick Reference URLs

- **AWS Console:** https://console.aws.amazon.com
- **Elastic Beanstalk:** https://console.aws.amazon.com/elasticbeanstalk
- **Amplify:** https://console.aws.amazon.com/amplify
- **CloudWatch:** https://console.aws.amazon.com/cloudwatch
- **IAM:** https://console.aws.amazon.com/iam
- **Billing:** https://console.aws.amazon.com/billing

---

## Emergency Contacts

- **AWS Support** (Basic - Free): Help via console
- **AWS Forums:** https://forums.aws.amazon.com
- **Stack Overflow:** Tag with `amazon-web-services`

---

**Estimated Time: 2-3 hours for complete deployment**

Good luck! You got this! 🚀
