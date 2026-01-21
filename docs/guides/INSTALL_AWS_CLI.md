# AWS CLI Installation Guide for Windows

## Quick Install Steps

### Method 1: Download MSI Installer (Recommended)

1. **Download AWS CLI v2 for Windows:**
   - Direct link: https://awscli.amazonaws.com/AWSCLIV2.msi
   - Or visit: https://aws.amazon.com/cli/

2. **Run the installer:**
   - Double-click the downloaded `AWSCLIV2.msi` file
   - Click "Next" through the installation wizard
   - Accept the license agreement
   - Click "Install"
   - Click "Finish"

3. **Verify Installation:**
   - Open a **NEW** terminal/command prompt (important - restart terminal!)
   - Run: `aws --version`
   - You should see: `aws-cli/2.x.x Python/3.x.x Windows/...`

### Method 2: Using winget (Windows Package Manager)

If you have winget installed:

```powershell
winget install Amazon.AWSCLI
```

Then restart your terminal and verify: `aws --version`

---

## After Installation - Configure AWS CLI

Once AWS CLI is installed, you'll need to configure it with your AWS credentials.

**We'll do this together after you create your AWS account!**

The configuration command is:
```bash
aws configure
```

You'll need:
- AWS Access Key ID (from IAM user)
- AWS Secret Access Key (from IAM user)
- Default region (us-east-1)
- Default output format (json)

---

## What Happens Next

1. Install AWS CLI ✅
2. Create AWS Account (we'll do this together)
3. Configure AWS CLI
4. Deploy your backend!

---

**Action Required:**
Download and install AWS CLI from: https://awscli.amazonaws.com/AWSCLIV2.msi

Let me know when it's installed and we'll continue!
