# Homework Session Bridge System

## Problem
When teachers assign homework from **LeetCode courses** or **external courses** in a live session, the teacher cannot properly view the student's workspace because:

1. **LiveTutorialPage.tsx** (teacher view) expects: `{ files[], activeFileName, language }`
2. **LeetCodeIDE.tsx** (student view) has: `{ code, problem, testResults, language }`
3. Different course types have different UIs → workspace switching breaks

## Solution: Unified Homework Session Protocol

### 1. Homework Type Metadata

```typescript
interface HomeworkAssignment {
  lessonId: string;
  teacherSessionId: string;
  title: string;
  homeworkType: 'native' | 'leetcode' | 'external';  // NEW
  courseType?: string;  // e.g., 'enhanced-course', 'leetcode'
  problemId?: string;   // For LeetCode problems
}
```

### 2. Universal Workspace Format

Create an adapter that translates all homework types to a common format:

```typescript
interface UniversalWorkspace {
  type: 'native' | 'leetcode' | 'external';

  // For native lessons
  files?: LessonFile[];
  activeFileName?: string;

  // For LeetCode/code problems
  code?: string;
  language?: string;
  problemTitle?: string;
  testResults?: TestResult[];

  // Common fields
  lastUpdate: number;
  studentId: string;
}
```

### 3. WebSocket Message Updates

Add new message types:

```typescript
// Student → Server (when working on LeetCode problem)
{
  type: 'LEETCODE_HOMEWORK_UPDATE',
  payload: {
    studentId: string,
    code: string,
    language: string,
    problemId: string,
    testResults: TestResult[]
  }
}

// Server → Teacher (transformed to UniversalWorkspace)
{
  type: 'STUDENT_WORKSPACE_UPDATE',
  payload: {
    studentId: string,
    workspace: UniversalWorkspace
  }
}
```

### 4. Implementation Steps

#### Step A: Modify `handleAssignHomework` in LiveTutorialPage.tsx

```typescript
const handleAssignHomework = async (studentId: string, lessonId: number | string) => {
  // Detect homework type
  let homeworkType: 'native' | 'leetcode' | 'external' = 'native';
  let courseType = '';

  if (lesson.courseType === 'leetcode' || lesson.isLeetCodeProblem) {
    homeworkType = 'leetcode';
    courseType = 'leetcode-course';
  } else if (lesson.courseType === 'enhanced') {
    homeworkType = 'external';
    courseType = 'enhanced-course';
  }

  sendWsMessage('ASSIGN_HOMEWORK', {
    studentId,
    lessonId,
    homeworkType,      // NEW
    courseType,        // NEW
    problemId: lesson.problemId  // NEW (for LeetCode)
  });
};
```

#### Step B: Add WebSocket Support to LeetCodeIDE.tsx

```typescript
// In LeetCodeIDE.tsx
const [sessionId, setSessionId] = useState<string | null>(null);
const [isLiveHomework, setIsLiveHomework] = useState(false);
const wsRef = useRef<WebSocket | null>(null);

useEffect(() => {
  // Check if opened from live session
  const params = new URLSearchParams(window.location.search);
  const teacherSessionId = params.get('sessionId');

  if (teacherSessionId) {
    setIsLiveHomework(true);
    connectToLiveSession(teacherSessionId);
  }
}, []);

const connectToLiveSession = (teacherSessionId: string) => {
  const ws = new WebSocket(`${WS_URL}?sessionId=${teacherSessionId}&type=leetcode`);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'TEACHER_TAKE_CONTROL') {
      // Teacher is now viewing - enable real-time sync
      setTeacherViewing(true);
    }
  };

  wsRef.current = ws;
};

// Broadcast code changes
useEffect(() => {
  if (isLiveHomework && wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({
      type: 'LEETCODE_HOMEWORK_UPDATE',
      payload: {
        code,
        language: currentLanguage,
        problemId: problem?.id,
        testResults
      }
    }));
  }
}, [code, currentLanguage, testResults, isLiveHomework]);
```

#### Step C: Create Workspace Adapter in LiveTutorialPage.tsx

```typescript
const adaptWorkspaceForDisplay = (workspace: UniversalWorkspace) => {
  if (workspace.type === 'leetcode' || workspace.type === 'external') {
    // Convert LeetCode format to file-based format for display
    return {
      files: [{
        name: `solution.${getExtension(workspace.language)}`,
        content: workspace.code || '',
        language: workspace.language || 'javascript'
      }],
      activeFileName: `solution.${getExtension(workspace.language)}`,
      metadata: {
        problemTitle: workspace.problemTitle,
        testResults: workspace.testResults
      }
    };
  }

  return {
    files: workspace.files,
    activeFileName: workspace.activeFileName
  };
};

// Update state handling
case 'STUDENT_WORKSPACE_UPDATE':
  const adaptedWorkspace = adaptWorkspaceForDisplay(message.payload.workspace);
  setStudentHomeworkStates(prev =>
    new Map(prev).set(message.payload.studentId, adaptedWorkspace)
  );
  break;
```

#### Step D: Update Backend WebSocket Handler

```javascript
// educators-edge-backend/src/handlers/liveTutorialHandler.js

case 'LEETCODE_HOMEWORK_UPDATE': {
  const { code, language, problemId, testResults } = parsed.payload;

  // Transform to UniversalWorkspace
  const universalWorkspace = {
    type: 'leetcode',
    code,
    language,
    problemId,
    testResults,
    lastUpdate: Date.now(),
    studentId: parsed.studentId
  };

  // Broadcast to teacher
  broadcastToSession(sessionId, {
    type: 'STUDENT_WORKSPACE_UPDATE',
    payload: {
      studentId: parsed.studentId,
      workspace: universalWorkspace
    }
  }, { except: [ws] });
  break;
}

case 'ASSIGN_HOMEWORK': {
  const { studentId, lessonId, homeworkType, courseType, problemId } = parsed.payload;

  // Send homework with type metadata
  sendToStudent(studentId, {
    type: 'HOMEWORK_ASSIGNED',
    payload: {
      lessonId,
      teacherSessionId: sessionId,
      title: lessonTitle,
      homeworkType,      // NEW
      courseType,        // NEW
      problemId          // NEW
    }
  });
  break;
}
```

#### Step E: Update Student Homework Modal

When student receives homework, open the correct IDE:

```typescript
// In LiveTutorialPage.tsx or homework modal
const openHomework = (homework: HomeworkAssignment) => {
  let url = '';

  switch (homework.homeworkType) {
    case 'leetcode':
      url = `/leetcode-ide/${homework.problemId}?sessionId=${homework.teacherSessionId}`;
      break;
    case 'external':
      url = `/enhanced-courses/${homework.courseId}/ide?sessionId=${homework.teacherSessionId}`;
      break;
    case 'native':
    default:
      url = `/ide/${homework.lessonId}?sessionId=${homework.teacherSessionId}`;
  }

  window.open(url, '_blank');
};
```

### 5. Testing Checklist

- [ ] Teacher assigns native lesson homework → student opens AscentIDE → teacher views
- [ ] Teacher assigns LeetCode problem → student opens LeetCodeIDE → teacher views
- [ ] Teacher takes control of student working on LeetCode problem
- [ ] Code changes sync in real-time for both homework types
- [ ] Teacher can see test results from LeetCode IDE
- [ ] Multiple students working on different homework types simultaneously

### 6. Benefits

✅ **Unified protocol** - All homework types use same WebSocket messages
✅ **Transparent to teacher** - Teacher sees all students in same roster regardless of homework type
✅ **Real-time sync** - Code changes broadcast immediately
✅ **Scalable** - Easy to add more course types (CodeWars, HackerRank, etc.)

## Next Steps

1. Implement `UniversalWorkspace` adapter
2. Add `homeworkType` to homework assignment flow
3. Connect LeetCodeIDE to WebSocket
4. Update backend handler with new message types
5. Test with multiple homework types simultaneously
