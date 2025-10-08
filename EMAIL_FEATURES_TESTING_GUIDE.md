# 🧪 Email-Like Features Testing Guide

## ✅ **What to Test as a Teacher**

### **1. Access the Enhanced Interface**
- Navigate to `/sessions` route (your existing calendar page)
- **Should see 5 new tabs**: Inbox | Calendar | Appointments | Calendly | Settings

### **2. Test Email-Style Inbox**
- Click **"Inbox"** tab
- **Should see**: Gmail-like interface with session requests
- **Look for**:
  - ✅ Threaded conversation view
  - ✅ Unread indicators (orange badges)  
  - ✅ Priority color bars (red, orange, blue)
  - ✅ Star/favorite functionality
  - ✅ Search and filter options

### **3. Test Visual Calendar**
- Click **"Calendar"** tab  
- **Should see**: Month grid with appointment blocks
- **Look for**:
  - ✅ Green blocks for internal sessions
  - ✅ Blue blocks for Calendly events
  - ✅ Today highlighted in blue
  - ✅ Legend showing appointment types
  - ✅ Click appointments for details

### **4. Test Enhanced Appointments**
- Click **"Appointments"** tab
- **Should see**: Detailed appointment cards
- **Each appointment should show**:
  - ✅ **Exact date and time** (e.g., "Jan 15, 2025 at 3:00 PM")
  - ✅ **Full meeting link** with copy button
  - ✅ **Meeting ID** for reference
  - ✅ **Start Session** button (green)
  - ✅ **Email Reminder** button (pre-filled template)
  - ✅ **Message Student** button
  - ✅ **Professional status badges**

### **5. Test Calendly Integration**
- Click **"Calendly"** tab
- **Should see**: Integration setup interface
- **To test connection**:
  - Enter Calendly Personal Access Token
  - Click "Connect Account"
  - Should sync external events
  - Events appear in unified calendar

## 🔧 **Database Setup Required**

Before testing, make sure you've run:
```sql
-- Run both migration files:
\i create_messages_table_simple.sql
\i add_calendly_fields_enhanced.sql
```

## 📱 **Testing Scenarios**

### **Scenario 1: Email-Style Request Management**
```
1. Student sends session request via TrustGraph
2. Go to /sessions → Inbox tab
3. Should see request as unread thread
4. Click thread → View details panel
5. Click Accept → Thread updates status
6. Request moves to Appointments tab
```

### **Scenario 2: Professional Appointment Management**
```
1. Go to /sessions → Appointments tab  
2. Should see appointment with:
   - Student name and avatar
   - Exact meeting time
   - Full meeting link (copyable)
   - Start Session button
3. Click "Start Session" → Navigate to video call
4. Click "Email Reminder" → Opens email client
```

### **Scenario 3: Visual Calendar Planning**
```
1. Go to /sessions → Calendar tab
2. Should see month view with appointment blocks
3. Green blocks = internal platform sessions
4. Blue blocks = Calendly bookings (if connected)
5. Click on appointment blocks for details
```

### **Scenario 4: Calendly Synchronization**
```
1. Go to /sessions → Calendly tab
2. Enter your Calendly Personal Access Token
3. Click "Connect Account"
4. Should sync your external events
5. Go to Calendar tab → See unified view
```

## 🎯 **Key Features to Verify**

### **Professional Meeting Details:**
- ✅ **Time Display**: "Jan 15, 2025 at 3:00 PM" format
- ✅ **Meeting Links**: Full URLs with copy buttons
- ✅ **Status Indicators**: "Upcoming", "Ready to Start", "In Progress"
- ✅ **Action Buttons**: Context-aware (Start vs Join vs Email)

### **Email-Like Experience:**
- ✅ **Thread Organization**: Conversations grouped by student
- ✅ **Unread Indicators**: Bold text, background highlighting
- ✅ **Priority System**: Color-coded importance levels
- ✅ **Search & Filter**: Find specific requests quickly

### **Visual Calendar:**
- ✅ **Appointment Blocks**: Color-coded on calendar grid
- ✅ **Today Highlighting**: Current date stands out
- ✅ **Legend**: Clear indication of appointment sources
- ✅ **Click Interaction**: View appointment details

## 🚨 **Common Issues & Solutions**

### **"No appointments showing"**
- **Check**: Session requests have been accepted
- **Verify**: Database migrations ran successfully  
- **Test**: Try accepting a new session request

### **"Calendly not connecting"**
- **Check**: Personal Access Token is valid
- **Verify**: Token has proper permissions
- **Test**: Try with a new token from Calendly settings

### **"Meeting links not working"**
- **Check**: Video session service is configured
- **Verify**: Agora credentials are set up
- **Test**: Links should follow pattern `/video-session/{id}`

### **"Times not displaying"**
- **Check**: Session requests have scheduled_time set
- **Verify**: Timezone handling is working
- **Test**: Create new appointment with specific time

## 📈 **Success Indicators**

The email-like features are working correctly when:

1. **Professional Appearance**: Interface looks like Gmail/Outlook
2. **Complete Information**: All appointment details visible
3. **Functional Actions**: Buttons work and navigate properly
4. **Real-time Updates**: Status changes reflect immediately
5. **Unified Experience**: Internal + Calendly events combined

## 🔄 **Testing Flow for Both Users**

### **As Teacher (bilalhussain.v1@gmail.com):**
1. Login → `/sessions`
2. **Inbox tab**: See incoming requests in email format
3. **Calendar tab**: View appointments visually
4. **Appointments tab**: Manage sessions with full details
5. **Calendly tab**: Connect external calendar
6. **Settings tab**: Configure preferences

### **As Student (bilalhussain.v12@gmail.com):**
1. Request session via `/trust-graph-simple`
2. Check `/student-sessions` for status updates
3. Wait for teacher acceptance
4. See "Join Session" when teacher starts

## 💯 **Professional Quality Checklist**

- ✅ **Meeting times clearly displayed**
- ✅ **Session links easily copyable**  
- ✅ **Email reminders pre-formatted**
- ✅ **Status updates in real-time**
- ✅ **Professional visual design**
- ✅ **Responsive on all devices**
- ✅ **Intuitive navigation**
- ✅ **Error handling graceful**

## 🎉 **Expected User Experience**

Teachers should feel like they're using a **professional email client** specifically designed for managing teaching sessions. The interface should be **intuitive**, **informative**, and **actionable** - making session management as easy as managing email.