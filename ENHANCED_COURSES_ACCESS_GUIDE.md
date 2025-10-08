# Enhanced Courses Access Guide

## 📍 Where Enhanced Courses Are Located

### Database
- **Table**: `enhanced_courses`
- **Count**: 8 published courses
- **Status**: All courses are published (`is_published = true`)

### Courses List:
1. **Data Structures & Algorithms: The Complete Masterclass** (6 lessons)
2. **Mastering Coding Interviews: Pattern-Based Problem Solving** (6 lessons)
3. **System Design Mastery: Scalable Architecture Patterns** (6 lessons)
4. **Mastering Coding Interviews: Crack the Top Tech Companies** (3 lessons each)

## 🔍 How to Access Enhanced Courses

### Frontend Access

1. **Navigate to Discover Page**
   ```
   http://localhost:5173/courses/discover
   ```

2. **Toggle to AI-Enhanced Courses**
   - Look for toggle buttons at the top of the page
   - Click on **"AI-Enhanced"** button (should be selected by default)
   - The button shows count like: `AI-Enhanced (8)`

3. **Alternative Direct Routes**
   - Enhanced course detail: `/enhanced-courses/{course-id}`
   - Example: `/enhanced-courses/d24f96f1-5a0d-41c0-bc02-69d4b35451be`

### Backend API Endpoints

1. **Get All Enhanced Courses (Discovery)**
   ```
   GET /api/enhanced-courses/discover
   Headers: Authorization: Bearer {token}
   ```

2. **Get Specific Enhanced Course**
   ```
   GET /api/enhanced-courses/public/{courseId}
   Headers: Authorization: Bearer {token}
   ```

3. **Enroll in Enhanced Course**
   ```
   POST /api/enhanced-courses/{courseId}/enroll
   Headers: Authorization: Bearer {token}
   ```

## 🚀 Quick Start Testing

### 1. Start Backend Server
```bash
cd educators-edge-backend
npm start
```

### 2. Start Frontend Server
```bash
cd educators-edge-frontend
npm run dev
```

### 3. Login as Student or Teacher
- Use existing credentials to login
- Navigate to `/courses/discover`

### 4. View Enhanced Courses
- Click the **"AI-Enhanced"** toggle button
- You should see 8 courses listed

## 🔧 Troubleshooting

### If Enhanced Courses Don't Appear:

1. **Check Backend is Running**
   - The backend server must be running on port 3000
   - Check console for any errors

2. **Check Authentication**
   - Make sure you're logged in
   - Token should be stored in localStorage

3. **Check Console for Errors**
   - Open browser DevTools (F12)
   - Check Console tab for any API errors
   - Check Network tab to see if API calls are being made

4. **Verify API Response**
   - In Network tab, look for `/api/enhanced-courses/discover`
   - Check if it returns data or errors

5. **Check Toggle Button**
   - Make sure "AI-Enhanced" is selected, not "Traditional"
   - The count should show (8) next to AI-Enhanced

## 📊 Database Verification

Run this to verify courses exist:
```bash
cd educators-edge-backend
node test_enhanced_query.js
```

Expected output:
```
✅ Query successful! Found 8 enhanced courses
```

## 🎯 Key Points

1. **Enhanced courses are in a separate table** (`enhanced_courses` not `courses`)
2. **Frontend has a toggle** to switch between traditional and AI-enhanced courses
3. **Default view is AI-Enhanced** (`showEnhanced` defaults to `true`)
4. **All 8 courses are published** and should be visible
5. **Each course has lessons** with boilerplate, solutions, and tests

## 🔗 Course IDs for Testing

Use these IDs to directly access courses:

1. `d24f96f1-5a0d-41c0-bc02-69d4b35451be` - Data Structures & Algorithms
2. `4a2d5f71-932d-4622-9c2b-e274c7753998` - Coding Interviews: Pattern-Based
3. `36ecdb74-015e-4db6-9ca8-bb20238446c7` - System Design Mastery
4. `b76d03c0-6aeb-4e8f-940e-86c0e81b4459` - System Design Mastery (v2)

## 📱 UI Flow

1. **Login** → 2. **Navigate to Discover** → 3. **Toggle to AI-Enhanced** → 4. **See 8 Courses** → 5. **Click "Start AI Course"**

The enhanced courses should appear in a grid layout with:
- Course title
- "AI" badge
- Teacher name (bilalhussain.v1)
- Difficulty level (intermediate)
- Duration (8-12 weeks)
- "Start AI Course" button

## ✅ Verification Checklist

- [ ] Backend server running on port 3000
- [ ] Frontend server running on port 5173
- [ ] User logged in with valid token
- [ ] Navigate to `/courses/discover`
- [ ] "AI-Enhanced" toggle selected
- [ ] Count shows (8) next to AI-Enhanced
- [ ] 8 course cards visible in grid
- [ ] Each course has "Start AI Course" button

If all checks pass but courses still don't show, the issue may be with the API response or frontend state management.