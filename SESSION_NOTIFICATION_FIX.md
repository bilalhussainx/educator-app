# Session Notification Fix - Essay Editor Sessions

## Problem Summary
When a teacher started a live session using the sidebar modal for a modern essay editor session, students were not receiving notifications to join the session.

## Root Cause Analysis

### Critical Bug Identified
The `sessions` table was **missing a `course_id` column**, which prevented the notification system from broadcasting session creation events to enrolled students.

### Why This Caused the Issue

1. **No Persistent Course ID**: When a teacher started a session, the `courseId` was passed in the request body but was never saved to the database.

2. **Notification Handler Dependency**: The `broadcastSessionCreated()` function in `sessionNotificationHandler.js` (line 105-108) checks for `courseId` and silently skips broadcasting if it's missing:
   ```javascript
   if (!courseId) {
       console.warn('[Session Notifications] No courseId provided, skipping broadcast');
       return; // ← Notifications are skipped entirely!
   }
   ```

3. **Failed Fallback**: The session start endpoint tried to get courseId from either the request body OR the database:
   ```javascript
   const courseId = req.body.courseId || updatedSession.course_id;
   ```
   But since `updatedSession.course_id` was always `null` (column didn't exist), notifications were only sent if `req.body.courseId` was present, which was inconsistent.

## Fixes Applied

### 1. Database Schema Migration ✅
**File**: `educators-edge-backend/migrations/add_course_id_to_sessions.sql`

Added `course_id` column to the `sessions` table:
```sql
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES enhanced_courses(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_sessions_course_id ON sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_course_status ON sessions(course_id, status);
```

**Result**: ✅ Migration completed successfully
- Column `course_id` added (type: uuid, nullable: YES)
- Two indexes created for query optimization

### 2. Session Start Endpoint Fix ✅
**File**: `educators-edge-backend/routes/sessionRoutes.js` (Lines 1114-1120)

**Before**:
```javascript
UPDATE sessions SET status = 'active', started_at = NOW(), session_mode = $2
WHERE id = $1
```

**After**:
```javascript
UPDATE sessions SET status = 'active', started_at = NOW(), session_mode = $2, course_id = $3
WHERE id = $1
```

Now when a teacher starts a session, the `courseId` from the request body is persisted to the database.

### 3. Session Create Endpoint Fix ✅
**File**: `educators-edge-backend/routes/sessionRoutes.js` (Lines 92-110)

**Before**:
```javascript
INSERT INTO sessions (
    mentor_id, student_id, session_type, description, status, scheduled_time
) VALUES ($1, $1, $2, $3, 'active', NOW())
```

**After**:
```javascript
INSERT INTO sessions (
    mentor_id, student_id, session_type, description, status, scheduled_time, session_mode, course_id
) VALUES ($1, $1, $2, $3, 'active', NOW(), $4, $5)
```

Now when creating a new live session, both `session_mode` and `course_id` are saved.

### 4. Enhanced Debug Logging ✅
**File**: `educators-edge-backend/src/handlers/sessionNotificationHandler.js` (Lines 105-117)

Added comprehensive logging to track notification flow:
```javascript
console.log('[Session Notifications] ========================================');
console.log('[Session Notifications] BROADCAST SESSION CREATED');
console.log('[Session Notifications] Session Data:', JSON.stringify(sessionData, null, 2));
console.log('[Session Notifications] ========================================');
console.log(`[Session Notifications] 📡 Broadcasting for course: ${courseId}`);
console.log(`[Session Notifications] Session ID: ${sessionId}, Mode: ${mode}`);
```

This makes it much easier to debug notification issues in the future.

## How the Flow Works Now

### Teacher Starts Essay Session via Sidebar Modal:

1. **Teacher Action**:
   - Teacher selects a course
   - Chooses "Essay Editing" mode
   - Clicks "Start Essay Session"

2. **Frontend** (`LiveSessionModal.tsx`, Line 152-154):
   ```javascript
   POST /api/sessions/${existingSessionId}/start
   Body: {
       mode: 'essay',
       courseId: selectedCourseId  // ← This is now saved!
   }
   ```

3. **Backend** (`sessionRoutes.js`):
   - Updates session status to 'active'
   - **SAVES courseId to database** (NEW!)
   - **SAVES session_mode to database**

4. **Notification Handler** (`sessionNotificationHandler.js`):
   - Retrieves courseId from the updated session record
   - Queries `enrollments` table for all students enrolled in the course
   - Creates notification payload with correct essay editor joinUrl:
     ```javascript
     joinUrl: `/urgent-session/${sessionId}/essay?session=${sessionId}&mentor=teacher&type=live&role=student`
     ```
   - Broadcasts `session:created` event to all enrolled students' connected sockets

5. **Student Side** (`LiveSessionNotification.tsx`):
   - Student's browser listens for `session:created` event
   - Displays toast notification: "🎓 [Teacher] has started a live essay editing session!"
   - Shows "Join Now" button
   - Clicking button navigates to essay editor with session context

## Verification Checklist

### Database Schema ✅
```bash
node run_course_id_migration.js
```

**Confirmed**:
- ✅ `course_id` column exists in `sessions` table
- ✅ `session_mode` column exists
- ✅ `description` column exists
- ✅ Indexes created for performance

### Code Changes ✅
- ✅ Session start endpoint saves courseId
- ✅ Session create endpoint saves courseId and mode
- ✅ Notification handler has enhanced logging
- ✅ Both code and essay modes supported

## Testing Guide

### Prerequisites
1. Teacher account with at least one course created
2. Student account enrolled in that course
3. Student must be logged in with browser open (to receive real-time notifications)

### Test Steps

#### Test 1: Start Existing Essay Session
1. **As Teacher**:
   - Click "Live Sessions" button in sidebar
   - Select a course from the dropdown
   - Choose an existing session (if available)
   - Select "Essay Editing" mode
   - Click "Start Essay Session"

2. **Expected Backend Logs**:
   ```
   [START_SESSION] Session started: <session-id>
   [START_SESSION] Broadcasting to enrolled students in course: <course-id>
   [Session Notifications] BROADCAST SESSION CREATED
   [Session Notifications] Session Data: { courseId, sessionId, mode: 'essay', ... }
   [Session Notifications] Found X enrolled students
   [Session Notifications] ✅ Sent notification to student <student-id>
   [Session Notifications] 📢 Broadcast complete: X notifications sent
   ```

3. **As Student** (should see):
   - Toast notification appears in top-right corner
   - Message: "🎓 [TeacherName] has started a live essay editing session!"
   - "Join Now" button visible
   - Clicking "Join Now" → navigates to `/urgent-session/<id>/essay?...`

#### Test 2: Create New Essay Session
1. **As Teacher**:
   - Click "Live Sessions" button
   - Select a course
   - Select "Essay Editing" mode
   - Optionally upload a document
   - Click "Create Essay Editing Session"

2. **Expected Backend Logs**:
   ```
   [CREATE_LIVE_SESSION] Creating live session: { mode: 'essay', courseId: '...' }
   [CREATE_LIVE_SESSION] ✅ Session created: <session-id>
   [CREATE_LIVE_SESSION] Broadcasting to enrolled students in course: <course-id>
   [Session Notifications] Found X enrolled students
   [Session Notifications] 📢 Broadcast complete: X notifications sent
   ```

3. **As Student**:
   - Same as Test 1 - should receive notification immediately

#### Test 3: Student Not Enrolled (Edge Case)
1. Create a course with NO students enrolled
2. Start an essay session for that course
3. **Expected**: No notifications sent (no students to notify)
4. **Backend Logs**: Should show "No enrolled students found for course X"

## Troubleshooting

### Students Not Receiving Notifications?

**Check 1**: Verify courseId is being saved
```sql
SELECT id, course_id, session_mode, status FROM sessions WHERE id = '<session-id>';
```
Should show `course_id` as a valid UUID, not NULL.

**Check 2**: Verify student enrollment
```sql
SELECT student_id FROM enrollments WHERE course_id = '<course-id>';
-- OR
SELECT student_id FROM enhanced_course_enrollments WHERE course_id = '<course-id>';
```
Should return the student IDs that should receive notifications.

**Check 3**: Check backend logs for notification handler
Look for these log patterns:
- `[Session Notifications] BROADCAST SESSION CREATED` - Broadcast started
- `[Session Notifications] Found X enrolled students` - Students queried
- `[Session Notifications] ✅ Sent notification to student...` - Socket emission

**Check 4**: Verify student socket connection
In student's browser console, look for:
```
[Live Session Notifications] Socket connected: <socket-id>
[Live Session Notifications] 📢 Registered for notifications with userId: <user-id>
```

If not visible, student's socket is not connected → notifications can't be delivered.

**Check 5**: Verify socket registration timing
If a student just refreshed the page, their socket might not be registered yet when the teacher starts the session. The notification will be missed. Solution: Student should refresh or the system could store notifications in database for retrieval.

### Notification Received But Wrong URL?

**Check session mode**: Verify `session_mode` is saved correctly
```sql
SELECT session_mode FROM sessions WHERE id = '<session-id>';
```
Should be 'essay' for essay sessions, 'code' for code sessions.

The notification handler uses this to construct the correct joinUrl:
- Essay: `/urgent-session/{id}/essay?...`
- Code: `/session/{id}`

## Files Modified

### Backend
1. `educators-edge-backend/migrations/add_course_id_to_sessions.sql` - ✅ NEW
2. `educators-edge-backend/run_course_id_migration.js` - ✅ NEW
3. `educators-edge-backend/routes/sessionRoutes.js`:
   - Line 1115-1120: Save courseId when starting session
   - Line 92-110: Save courseId when creating session
4. `educators-edge-backend/src/handlers/sessionNotificationHandler.js`:
   - Line 105-117: Enhanced debug logging

### Frontend
No changes required - frontend was already correctly passing courseId!

## Migration Commands

### Run Migration (Already Done)
```bash
cd educators-edge-backend
node run_course_id_migration.js
```

### Verify Migration
```bash
# Check if column exists
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'course_id';"

# Check indexes
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename = 'sessions' AND indexname LIKE '%course%';"
```

## Next Steps

1. ✅ Database migration completed
2. ✅ Code changes deployed
3. ⏳ Test with real teacher and student accounts
4. ⏳ Monitor backend logs for notification delivery
5. ⏳ Verify students receive notifications for both essay and code sessions

## Success Criteria

- ✅ Teacher can start essay editing session from sidebar modal
- ✅ courseId is saved to sessions table
- ✅ session_mode is saved to sessions table
- ⏳ All enrolled students receive real-time notification
- ⏳ Notification shows correct session type (essay editing)
- ⏳ "Join Now" button navigates to correct essay editor URL
- ⏳ Student can join the session successfully

## Notes

- The notification system requires students to be logged in and have an active browser tab open
- Notifications are **real-time only** - if a student is offline when the session starts, they won't receive the notification (consider adding database-backed notifications for offline users in the future)
- The system uses Socket.IO for real-time communication
- Multiple socket connections per user are supported (e.g., multiple tabs)

---

**Status**: 🟢 Fixes Applied and Ready for Testing
**Date**: 2025-01-04
**Fixed By**: Claude Code (AI Assistant)
