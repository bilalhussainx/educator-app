# Gemini API Quota Troubleshooting Guide

## Issue: Getting "Free Tier Quota Exceeded" Despite Having Paid Plan

**Error Message:**
```
[429 Too Many Requests] You exceeded your current quota, please check your plan and billing details.
"quotaMetric":"generativelanguage.googleapis.com/generate_content_free_tier_requests"
```

## Root Cause Analysis

Even with a paid Gemini plan, you might hit free tier limits due to:

### 1. **Project Configuration Issues**
- API key from wrong Google Cloud project
- Project doesn't have billing enabled  
- Project not linked to paid Gemini plan

### 2. **API Key Problems**
- Using old/cached API key
- Key from different account than paid plan
- Insufficient permissions on API key

### 3. **Model & Quota Settings**
- Using `gemini-1.5-flash` with free tier quotas
- Not upgraded to paid tier properly
- Mixed free/paid usage

## Step-by-Step Solutions

### Solution 1: Verify Project Billing ✅

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Check Current Project**: Ensure you're in the correct project (top dropdown)
3. **Navigate to Billing**: 
   - Click hamburger menu → Billing
   - Verify your project has active billing account linked
4. **Check Gemini API Billing**:
   - Go to Google AI Studio: https://aistudio.google.com
   - Check if same project is selected
   - Verify billing status there

### Solution 2: Update API Configuration 🔧

**Current Configuration** (in `aiBotService.js`):
```javascript
this.model = this.genAI.getGenerativeModel({ 
    model: 'gemini-1.5-flash',  // This might be using free tier
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2000,
    }
});
```

**Recommended Changes**:

#### Option A: Switch to Pro Model (Higher Quotas)
```javascript
this.model = this.genAI.getGenerativeModel({ 
    model: 'gemini-1.5-pro',  // Pro model has higher paid quotas
    generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2000,
    }
});
```

#### Option B: Add Retry Logic with Exponential Backoff
```javascript
// Add this method to AIBotService class
async generateContentWithRetry(prompt, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await this.model.generateContent(prompt);
            return result;
        } catch (error) {
            if (error.status === 429 && attempt < maxRetries) {
                // Extract retry delay from error
                const retryDelay = error.errorDetails?.find(d => d.retryDelay)?.retryDelay;
                const delayMs = retryDelay ? 
                    parseInt(retryDelay.replace('s', '')) * 1000 : 
                    Math.pow(2, attempt) * 1000; // Exponential backoff
                
                console.log(`Rate limited. Retrying in ${delayMs/1000}s (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
                continue;
            }
            throw error;
        }
    }
}
```

### Solution 3: Generate New API Key 🔑

1. **Go to Google AI Studio**: https://aistudio.google.com
2. **Ensure Correct Project**: Check project selector (top-right)
3. **Get API Key**:
   - Click "Get API Key" 
   - Select the project with billing enabled
   - Copy new key
4. **Update Environment Variable**:
   ```bash
   # In your .env file
   GEMINI_API_KEY=your_new_api_key_here
   ```
5. **Restart Backend Server**

### Solution 4: Check Quotas & Usage 📊

1. **Google Cloud Console**: https://console.cloud.google.com
2. **Navigate to APIs & Services** → **Quotas**
3. **Search for**: "Generative Language API"
4. **Check Current Usage**:
   - `generate_content_requests_per_day`
   - `generate_content_free_tier_requests`
5. **Request Quota Increase** if needed

### Solution 5: Immediate Workaround 🚀

**Backend Changes** (already implemented):
- Enhanced error handling with detailed messages
- Graceful fallbacks when quota exceeded
- Retry delay information passed to frontend

**Frontend Changes** (already implemented):
- Local analysis fallback system
- User-friendly error messages
- Category-specific suggestions without AI

## Quick Test Commands

### Test 1: Verify API Key Works
```bash
curl -H "Content-Type: application/json" \
     -d '{"contents":[{"parts":[{"text":"Hello"}]}]}' \
     -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_API_KEY"
```

### Test 2: Check Quota Status
```bash
# Check current usage in Google Cloud Console
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud logging read "resource.type=gce_instance" --limit=10
```

## Recommended Implementation Order

1. **Immediate**: Switch to `gemini-1.5-pro` model
2. **Short-term**: Implement retry logic with exponential backoff  
3. **Long-term**: Add request caching to reduce API calls

## Model Comparison

| Model | Free Tier Limit | Paid Tier Limit | Best For |
|-------|----------------|------------------|----------|
| `gemini-1.5-flash` | 50/day | 1000/day | Development |
| `gemini-1.5-pro` | 15/day | 500/day | Production |

## Emergency Fallback Features ✨

**System now provides**:
- ✅ Automatic category detection
- ✅ Local writing analysis
- ✅ Pattern-based suggestions  
- ✅ Category-specific advice
- ✅ Graceful error messages
- ✅ Retry timing information

## Support Resources

- **Gemini API Docs**: https://ai.google.dev/gemini-api/docs
- **Rate Limits Guide**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Billing Help**: https://support.google.com/googleapi/answer/6158867
- **Quota Management**: https://console.cloud.google.com/quotas

---

**Status**: ✅ System now handles quota limits gracefully with local fallback analysis
**Next**: Try switching to `gemini-1.5-pro` model for higher quotas