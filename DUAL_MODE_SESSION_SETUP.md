# Dual-Mode Live Session Setup Guide

This guide will help you set up the dual-mode live session system that allows teachers to choose between code editor sessions and essay writing sessions.

## 🚀 Database Setup

### Step 1: Run the Safe Schema
Run the safe schema file that avoids foreign key constraint issues:

```bash
psql -d your_database_name -f create_dual_mode_sessions_safe.sql
```

This creates all necessary tables without problematic foreign key constraints.

### Alternative: If you know your user ID type
If you want proper foreign key constraints and know your users table structure:

- For UUID-based users: `psql -d your_database_name -f create_dual_mode_session_schema_fixed.sql`
- For INTEGER-based users: `psql -d your_database_name -f create_dual_mode_session_schema.sql`

## 🔧 Backend Setup

### Step 1: Add the Routes to Your Server
Add this line to your main server file (usually `server.js` or `app.js`):

```javascript
// Add dual-mode session routes
app.use('/api/dual-mode-sessions', require('./routes/dualModeSessionRoutes'));
```

### Step 2: Install Dependencies
Make sure you have the required npm packages:

```bash
npm install uuid
```

## 🎨 Frontend Setup

### Step 1: Add the Route
Add this route to your React Router configuration:

```jsx
import DualModeLiveSession from './pages/DualModeLiveSession';

// In your routes
<Route path="/dual-session/:sessionId" component={DualModeLiveSession} />
```

### Step 2: Verify Dependencies
Make sure you have these dependencies in your frontend:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-highlight
npm install agora-rtc-sdk-ng  # For video functionality
npm install react-resizable-panels  # For layout panels
```

## 📋 Components Created

### Core Components:
- `SessionModeSelector` - Mode selection dialog for teachers
- `LiveEssayEditor` - Enhanced essay editor with homework features
- `EssayHomeworkView` - Student homework workspace
- `EssayMonitoringPanel` - Teacher monitoring dashboard
- `EssayVideoPanel` - Video communication for essay sessions
- `DualModeLiveSession` - Main session page

### Integration Points:
- Uses existing `ChatPanel`, `WhiteboardPanel`, `HomeworkView`
- Compatible with existing `LiveTutorialPage` for code sessions
- Integrates with Agora SDK for video/audio

## 🎯 Usage Flow

### For Teachers:
1. Create a live session (use existing flow or create new endpoint)
2. Navigate to `/dual-session/:sessionId`
3. Select session mode (Code Editor or Essay Writing)
4. Students see the selected mode
5. In essay mode: assign homework, monitor students, provide feedback
6. Use video/audio communication as needed

### For Students:
1. Join session via `/dual-session/:sessionId`
2. See the mode selected by teacher
3. Participate in collaborative editing or homework assignments
4. Raise hand for help, participate in video calls

## 🔄 WebSocket Messages

The system uses these WebSocket message types:

### Session Management:
- `JOIN_SESSION` - Join a session
- `SESSION_MODE_SET` - Teacher sets session mode
- `LEAVE_SESSION` - Leave session

### Essay Mode:
- `ESSAY_CONTENT_UPDATE` - Real-time content sync
- `ESSAY_HOMEWORK_ASSIGNED` - New homework assignment
- `ESSAY_HOMEWORK_UPDATE` - Student homework progress
- `ESSAY_COMMENT_ADDED` - Teacher feedback

### General:
- `CHAT_MESSAGE` - Chat messages
- `HAND_RAISED/LOWERED` - Student help requests
- `VIDEO_SESSION_JOINED/LEFT` - Video participation

## 🛠️ Configuration

### Environment Variables:
```bash
REACT_APP_AGORA_APP_ID=your_agora_app_id  # For video functionality
JWT_SECRET=your_jwt_secret  # For authentication
```

### Database Connection:
Make sure your `db/db.js` file is properly configured to connect to your PostgreSQL database.

## 🚨 Troubleshooting

### Foreign Key Errors:
If you get foreign key constraint errors, use the safe schema (`create_dual_mode_sessions_safe.sql`) which stores user references as VARCHAR without foreign key constraints.

### Missing Components:
If you get import errors, make sure you have all the UI components. You may need to install additional shadcn/ui components:

```bash
npx shadcn-ui@latest add dialog tabs badge avatar button input textarea
```

### Video Not Working:
1. Check Agora App ID is set correctly
2. Verify network permissions for WebRTC
3. Test in production environment (some features require HTTPS)

## 📊 Database Tables Created

- `dual_mode_sessions` - Main session data
- `session_participants` - Who's in each session
- `essay_homework_assignments` - Homework assignments
- `essay_homework_submissions` - Student submissions
- `essay_collaboration_sessions` - Real-time collaboration data
- `essay_comments` - Teacher feedback
- `session_analytics` - Activity tracking
- `session_chat_messages` - Chat history

## 🎉 Features

### Essay Mode Features:
✅ Real-time collaborative editing
✅ Teacher homework assignments
✅ Student progress monitoring
✅ Word count and time tracking
✅ Reference document support
✅ Teacher feedback system
✅ Hand raising for help
✅ Video/audio communication

### Code Mode Features:
✅ All existing LiveTutorialPage functionality
✅ Monaco code editor
✅ Docker terminal integration
✅ Homework assignments
✅ Real-time collaboration
✅ Video/audio communication

The system provides a seamless experience for teachers to switch between different types of educational content while maintaining all the collaborative and monitoring features students and teachers expect.