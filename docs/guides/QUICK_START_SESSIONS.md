# Quick Start - Session System

## 🚀 Start Testing in 3 Steps

### 1. Start Servers
```bash
# Terminal 1
cd educators-edge-backend && npm start

# Terminal 2
cd educators-edge-frontend && npm run dev
```

### 2. Open Sessions Page
```
http://localhost:5173/sessions
```

### 3. What You Should See
- ✅ Two tabs: "Session Requests" and "Active & Completed Sessions"
- ✅ 4 sessions in the "Active Sessions" tab
- ✅ Multiple session requests in the "Requests" tab
- ✅ "Join Session" buttons that work

---

## 🔍 Quick Debugging

### Sessions Not Showing?

**Check 1: Are you logged in?**
```javascript
// Browser console (F12)
localStorage.getItem('authToken')
```
Should return a JWT token. If null, go to `/login`

**Check 2: Who are you logged in as?**
```javascript
// Browser console
const token = localStorage.getItem('authToken');
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log(decoded.user.username, decoded.user.id);
```
Log in as:
- `bilalhussain.v12` - Has 4 sessions as student
- `bilalhussain.v1` - Has 4 sessions as teacher

**Check 3: Is the API returning data?**
- Open Network tab (F12)
- Look for `/api/sessions?status=all`
- Should return `200 OK` with sessions array

**Check 4: Are console logs showing?**
Look for:
```
[SessionsPage] Fetching session data...
[SessionsPage] Sessions response: {success: true, sessions: [4 items]}
```

### Still Not Working?

**Verify Database:**
```bash
node test_session_flow.js
```

Should show:
```
✅ Session flow test completed!
   Total sessions: 4
   User's sessions: 4
```

---

## 📱 Test the Complete Flow

### As Student:

1. **Discover** → `/trust-graph`
2. **Request Session** → Click on teacher → Choose platform (Essay/Code/Video)
3. **Track Request** → `/sessions` → "Session Requests" tab
4. **Join After Acceptance** → "Active Sessions" tab → "Join Session" button

### As Teacher:

1. **View Requests** → `/sessions` → "Session Requests" tab
2. **Accept Request** → Click "Accept" → Optionally set time/price
3. **Join Session** → "Active Sessions" tab → "Join Session" button

---

## 🎯 Platform Routing

When you click "Join Session", it routes to:

| Session Type | Platform | Route |
|--------------|----------|-------|
| `essay_editing` | Essay Editor | `/live-essay-session/:id` |
| `tutoring` | Ascent IDE | `/ascent-ide?session=:id` |
| `video_call` | Video Call | `/video-session/:id` |
| `mentoring` | Video Call | `/video-session/:id` |
| `counseling` | Video Call | `/video-session/:id` |

---

## 📚 Documentation

- **Architecture & Flow:** `END_TO_END_SESSION_SYSTEM.md`
- **Testing Guide:** `SESSION_TESTING_GUIDE.md`
- **Final Status:** `SESSION_SYSTEM_FINAL_STATUS.md`

---

## ✅ Success = Seeing This

```
┌─────────────────────────────────────┐
│ My Sessions                         │
├─────────────────────────────────────┤
│ [Session Requests] [Active Sessions]│
├─────────────────────────────────────┤
│ Session #4: tutoring                │
│ With: bilalhussain.v1               │
│ Status: Scheduled                   │
│ [Join Session]                      │
└─────────────────────────────────────┘
```

---

**If you see your sessions, the system is working! 🎉**

If not, check browser console and follow debugging steps above.
