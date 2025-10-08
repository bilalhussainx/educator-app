# Database Connection Fix

## Issue
The backend is getting `ENOTFOUND` errors when trying to connect to the Neon database:
```
Error: getaddrinfo ENOTFOUND ep-calm-dawn-aeeyn1n1-pooler.c-2.us-east-2.aws.neon.tech
```

## Root Cause
This indicates that either:
1. The database URL in your `.env` file is incorrect or expired
2. The Neon database instance has been suspended or deleted
3. Network connectivity issues

## Solutions

### 1. Check Your Environment Variables
Verify your `.env` file in the backend directory contains a valid DATABASE_URL:

```env
DATABASE_URL="postgresql://username:password@ep-calm-dawn-aeeyn1n1-pooler.c-2.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

### 2. Update Neon Database Connection
1. Go to your [Neon Console](https://console.neon.tech/)
2. Select your project
3. Go to the "Connection Details" tab
4. Copy the new connection string
5. Update your `.env` file with the new DATABASE_URL

### 3. Alternative: Use Local PostgreSQL
If you want to test locally, set up a local PostgreSQL database:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/educator_app"
```

### 4. Test Database Connection
Run this command to test the connection:

```bash
cd educators-edge-backend
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('Connection failed:', err.message);
  else console.log('Connection successful:', res.rows[0]);
  pool.end();
});
"
```

## After Fixing Connection

Once the database connection is restored, run the SQL migrations:

1. **First, run the messages table creation:**
```sql
-- Run the content of create_messages_table_simple.sql
```

2. **Test the new features:**
- Visit `/student-sessions` to see the new student interface
- Test session request flow: TrustGraph → Request Session → Teacher accepts → Student sees appointment
- Test messaging: Student can message teacher through appointments

## New Features Added

### 1. Student Sessions Page (`/student-sessions`)
- View session requests and their status
- See accepted appointments with join buttons
- Message teachers directly
- Calendar view of sessions

### 2. Enhanced Teacher Experience
- Existing SessionCalendarPage now has better appointment management
- Teachers can start sessions that generate video links
- Students see "Join Session" or "Waiting for Teacher" status

### 3. Messaging System
- Direct messaging between teachers and students
- Message history and conversations
- Context-aware messaging (linked to specific sessions)

## API Endpoints Added

- `POST /api/messages` - Send message
- `GET /api/messages` - Get messages  
- `GET /api/messages/conversations` - Get conversation threads
- `PUT /api/messages/:messageId/read` - Mark message as read

## Testing Flow

1. **As Student (bilalhussain.v12@gmail.com):**
   - Go to `/trust-graph-simple`
   - Find teacher bilalhussain.v1@gmail.com
   - Request a session
   - Go to `/student-sessions` to track request

2. **As Teacher (bilalhussain.v1@gmail.com):**
   - Go to `/sessions` 
   - See pending request in "Requests" tab
   - Accept the request
   - Start session when ready

3. **Back as Student:**
   - Refresh `/student-sessions`
   - See accepted appointment in "Appointments" tab
   - Use "Message Teacher" button
   - Use "Join Session" when teacher starts it

## Quick Fix Commands

```bash
# 1. Fix database connection in .env
echo 'DATABASE_URL="your_new_neon_connection_string"' > .env

# 2. Run migrations
psql $DATABASE_URL -f create_messages_table_simple.sql

# 3. Restart backend
npm start

# 4. Test the student sessions page
# Visit http://localhost:3000/student-sessions
```