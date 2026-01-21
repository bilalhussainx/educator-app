# 📅 Calendly Integration Setup Guide

## For Teachers & Mentors

### Step 1: Create Your Calendly Account
1. Go to [calendly.com](https://calendly.com)
2. Sign up with your educator email
3. Choose "I schedule meetings for yourself"

### Step 2: Create Your Event Type
1. Click "Create" → "Event Type"
2. Choose "One-on-One" meeting
3. Configure your event:
   - **Event name**: "30 Minute Teaching Session" 
   - **Duration**: 30 minutes (or your preference)
   - **Location**: Add Zoom, Google Meet, or "I'll provide details later"
   - **Description**: "Book a personalized learning session"

### Step 3: Set Your Availability
1. Go to "Availability" in your Calendly dashboard
2. Set your weekly schedule
3. Configure buffer times if needed
4. Set timezone

### Step 4: Get Your Booking URL
1. Go to your event type
2. Copy the booking URL (looks like: `https://calendly.com/your-username/30min`)
3. This is what you'll add to your profile

### Step 5: Add URL to Your Profile
1. In the app, go to Sessions → Settings (or use the API endpoint)
2. Paste your Calendly URL
3. Save changes

## For Students

**You don't need to do anything!** 

Students can book directly through teachers' calendars without needing their own Calendly account. Just:
1. Browse teachers in TrustGraph
2. Click "Request Session" 
3. Click "Pick Time" to see their calendar
4. Select a time slot and provide your details

## Testing Your Setup

### Demo URL for Testing
If you want to test the booking flow without setting up Calendly yet, the system uses:
`https://calendly.com/acuityscheduling/15min`

### Verify Your URL
Your Calendly URL should:
- Start with `https://calendly.com/`
- Include your username
- Include an event type
- Example: `https://calendly.com/john-teacher/30min`

## Troubleshooting

**"This Calendly URL is not valid" Error:**
- Check that your event type is published (not draft)
- Verify the URL is publicly accessible
- Make sure you're using the correct event type URL

**Calendar Not Loading:**
- The system will automatically fall back to manual booking
- Students can still request sessions normally
- You'll receive the requests and can respond with your availability

**For Advanced Users:**
- Set up Calendly webhooks pointing to: `/api/calendly/webhook`
- Configure custom questions for session types
- Add buffer times and meeting preferences

## Support
If you need help setting up your Calendly integration, please reach out to support with your:
- Calendly username
- Event type URL
- Any error messages you're seeing

---
*This integration ensures professional-grade booking while maintaining the flexibility of manual scheduling when needed.*