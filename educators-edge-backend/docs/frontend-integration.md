
# Frontend Integration Guide

## AI Course Generation

### Smart Course Generation
```javascript
// Generate courses from FreeCodeCamp content
const generateSmartCourse = async (options) => {
    const response = await fetch('/api/generate-smart-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
    });
    return response.json();
};
```

### Premium Course Generation  
```javascript
// Generate Grokking-style courses
const generatePremiumCourse = async (courseType, options) => {
    const response = await fetch('/api/generate-premium-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseType, options })
    });
    return response.json();
};
```

## AI Supervision Integration

### Start Supervision Session
```javascript
const startAISupervision = async (lessonId, studentProfile) => {
    const response = await fetch(`/api/start-supervision/${lessonId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentProfile })
    });
    return response.json();
};
```

### Real-time Code Analysis
```javascript
const analyzeCode = async (sessionId, codeChange) => {
    const response = await fetch(`/api/analyze-code/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeChange })
    });
    return response.json();
};
```

## Integration with AscentIDE.tsx

Add this to your AscentIDE component:

```typescript
// AI Supervision Hook
const useAISupervision = (lessonId: string) => {
    const [session, setSession] = useState(null);
    const [analysis, setAnalysis] = useState(null);

    const startSupervision = async (studentProfile) => {
        const result = await startAISupervision(lessonId, studentProfile);
        setSession(result.session);
    };

    const analyzeCodeChange = async (codeChange) => {
        if (!session) return;
        const result = await analyzeCode(session.sessionId, codeChange);
        setAnalysis(result.analysis);
    };

    return { session, analysis, startSupervision, analyzeCodeChange };
};
```
        