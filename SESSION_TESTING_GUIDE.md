# Session System Testing Guide

## Quick Test Results ✅

The backend test shows:
- **4 active sessions** in the database
- **46 session requests** (pending, accepted, completed)
- All SQL queries working correctly
- User sessions properly mapped

## How to Test the Session System

### 1. **Start the Servers**

```bash
# Terminal 1 - Backend
cd educators-edge-backend
npm start

# Terminal 2 - Frontend
cd educators-edge-frontend
npm run dev
```

### 2. **Navigate to Sessions Page**

Open your browser to: `http://localhost:5173/sessions`

**Expected Behavior:**
- Should show "Session Requests" and "Active & Completed Sessions" tabs
- Sessions tab should show 4 sessions
- Requests tab should show multiple session requests

### 3. **Check Browser Console**

Open Developer Tools (F12) and look for:
```
[SessionsPage] Fetching session data...
[SessionsPage] Requests response: {...}
[SessionsPage] Sessions response: {...}
[SessionsPage] Setting sessions: [array of 4 sessions]
```

### 4. **Test Complete Flow**

#### As a Student:

1. **Browse Teachers**
   - Go to `/trust-graph`
   - You should see teacher profiles

2. **Request a Session**
   - Click "Request Session" on a teacher
   - Choose platform (Essay Editor / Code Editor / Video)
   - Fill description
   - Submit

3. **View Your Request**
   - Go to `/sessions`
   - Click "Session Requests" tab
   - Your request should appear with status "pending"

4. **After Teacher Accepts**
   - Session moves to "Active Sessions" tab
   - Click "Join Session" button
   - Should route to appropriate platform:
     - Essay → `/live-essay-session/:id`
     - Code → `/ascent-ide?session=:id`
     - Video → `/video-session/:id`

#### As a Teacher:

1. **View Incoming Requests**
   - Go to `/sessions`
   - Click "Session Requests" tab
   - See incoming requests

2. **Accept a Request**
   - Click "Accept" button
   - Optionally set scheduled time and price
   - Confirm

3. **View Active Sessions**
   - Switch to "Active Sessions" tab
   - See all scheduled sessions
   - Click "Join Session" to start

## Troubleshooting

### Sessions Not Showing Up

**Issue:** Sessions page is empty even though database has sessions

**Solutions:**

1. **Check Auth Token**
   ```javascript
   // In browser console
   localStorage.getItem('authToken')
   ```
   - Make sure you're logged in
   - Token should be a valid JWT

2. **Check User ID**
   ```javascript
   // In browser console
   const token = localStorage.getItem('authToken');
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('User ID:', decoded.user.id);
   ```
   - Verify the user ID matches the one in the database
   - User ID: `09b275f8-3aa1-49ed-9683-f4d26f1008d5` (bilalhussain.v12)
   - Or: `eb03e344-252f-42ab-8187-602fc30384fa` (bilalhussain.v1)

3. **Check API Response**
   - Open Network tab in DevTools
   - Look for `/api/sessions?status=all` request
   - Check if it returns 200 OK
   - Verify response contains sessions array

4. **Check Backend Logs**
   ```bash
   # You should see in backend console:
   [SESSIONS] API called by user: bilalhussain.v12 ID: 09b275f8-3aa1-49ed-9683-f4d26f1008d5
   [SESSIONS] Query result rows: 4
   ```

### "Join Session" Not Working

**Issue:** Clicking "Join Session" doesn't navigate

**Solution:**
- Check `handleJoinSession` function is being called
- Verify session.session_type value
- Check if route exists in App.tsx
- Ensure platforms are deployed (Essay Editor, Ascent IDE, Video Session)

### Sessions Tab Shows "No Sessions Yet"

**Possible Causes:**

1. **Wrong User Logged In**
   - Log in as `bilalhussain.v12` (has 4 sessions as student)
   - Or `bilalhussain.v1` (has 4 sessions as teacher)

2. **API Not Returning Data**
   - Check browser console for errors
   - Verify `sessionsRes.data.success === true`
   - Check `sessionsRes.data.sessions` is an array

3. **React State Not Updating**
   - Add console.log in `fetchData` function
   - Check if `setSessions` is being called
   - Verify `sessions` state variable

## Database Verification

To verify sessions exist in the database:

```bash
cd educators-edge-backend
node ../test_session_flow.js
```

**Expected Output:**
```
✅ Session flow test completed!

📊 Summary:
   Total session_requests: 5
   Total sessions: 4
   User's sessions: 4
   User's requests: 46
```

## API Endpoints to Test Manually

### Get All Sessions
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/sessions?status=all
```

### Get Session Requests
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/sessions/requests?type=all
```

### Create Session Request
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mentorId": "eb03e344-252f-42ab-8187-602fc30384fa",
    "sessionType": "essay_editing",
    "description": "Need help with my essay"
  }' \
  http://localhost:5000/api/sessions/request
```

## Next Steps

If sessions are still not appearing:

1. **Check the exact error in browser console**
2. **Verify the SessionsPage component is rendering**
3. **Check if the route `/sessions` is correct in App.tsx**
4. **Ensure apiClient is configured with correct base URL**
5. **Test the API endpoints directly using curl or Postman**

## Success Criteria

✅ Sessions page loads without errors
✅ Can see session requests tab
✅ Can see active sessions tab
✅ Sessions from database appear in UI
✅ "Join Session" button routes to correct platform
✅ Can accept/decline session requests as teacher
✅ Can create new session requests as student

---

**Note:** The backend is confirmed working. The issue (if any) is likely:
- Frontend not calling the API
- API response not being processed
- React state not updating
- Component not rendering

Check browser console for all `[SessionsPage]` log messages to diagnose.
