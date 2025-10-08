// Quick test instructions for Calendly URL integration

console.log(`
📋 CALENDLY INTEGRATION TEST INSTRUCTIONS

🔧 SETUP:
1. Set up a teacher with Calendly URL in database:
   UPDATE user_profiles 
   SET calendly_url = 'https://calendly.com/your-username/30min' 
   WHERE user_id = 'teacher_user_id';

2. Restart backend server to pick up the database changes

🧪 TESTING STEPS:

1️⃣ Backend API Test:
   - Open browser dev tools → Network tab
   - Login as student
   - Navigate to /trust-graph
   - Look for these API calls:
     ✅ GET /api/ascendia/connections/my-connections (should include calendly_url)
     ✅ GET /api/ascendia/network/search (should include calendly_url)
     ✅ GET /api/calendly/user/:userId (should return calendlyUrl)

2️⃣ Frontend Widget Test:
   - Find a teacher/mentor in TrustGraph
   - Click "Request Session" button
   - Click "Pick Time" button
   - Verify:
     ✅ Calendly widget loads (not "URL not found")
     ✅ Teacher's calendar shows available slots
     ✅ No console errors

3️⃣ End-to-End Booking Test:
   - Select a time slot in Calendly widget
   - Fill in student details
   - Complete booking
   - Verify:
     ✅ Success message appears
     ✅ Session request created in database
     ✅ Modal closes properly

🐛 TROUBLESHOOTING:

❌ "URL not found" error:
   - Check teacher's calendly_url in database
   - Verify URL format: https://calendly.com/username/eventtype
   - Ensure Calendly event is published (not draft)

❌ Widget doesn't load:
   - Check browser console for CORS errors
   - Verify API endpoints return calendly_url field
   - Check CalendlyBooking component receives mentorCalendlyUrl prop

❌ API returns null calendly_url:
   - Confirm database field is set
   - Check API queries include 'up.calendly_url' in SELECT
   - Restart backend server

✅ EXPECTED WORKING STATE:
- Teacher has valid Calendly URL in database
- TrustGraph shows teacher with calendar option
- CalendlyBooking component loads teacher's calendar
- Students can book sessions through Calendly widget
- Bookings create session requests in system

📧 If issues persist, check:
1. Database schema has calendly_url column
2. All API endpoints include calendly_url in queries  
3. CalendlyBooking uses correct API endpoint
4. Teacher's Calendly URL is valid and published
`);

// Database query to check Calendly URLs
console.log(`
🔍 DATABASE CHECK QUERIES:

-- Check if calendly_url column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'calendly_url';

-- Check teachers with Calendly URLs
SELECT u.username, up.display_name, up.calendly_url, up.is_mentor, up.is_teacher
FROM users u 
JOIN user_profiles up ON u.id = up.user_id 
WHERE up.calendly_url IS NOT NULL;

-- Test API query for connections
SELECT u.id, u.username, up.display_name, up.calendly_url
FROM users u 
LEFT JOIN user_profiles up ON u.id = up.user_id 
WHERE up.calendly_url IS NOT NULL 
LIMIT 5;
`);