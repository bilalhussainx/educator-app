# 🚀 AI Course Generation System

A comprehensive AI-powered system that creates premium coding courses from multiple sources including FreeCodeCamp, LeetCode, and AI-generated content. Features real-time AI supervision and adaptive learning.

## 🎯 Overview

This system transforms raw coding problems into polished, pedagogically-sound courses similar to "Grokking the Coding Interview" and other premium coding education platforms. It includes:

- **Multi-source Content Aggregation**: FreeCodeCamp, LeetCode, AI-generated problems
- **Intelligent Course Generation**: AI creates structured learning paths with progressive difficulty
- **Real-time AI Supervision**: Provides hints, guidance, and feedback during coding sessions
- **Adaptive Learning**: Adjusts difficulty based on student performance
- **Premium Course Templates**: Pre-built templates for popular course formats

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Course System                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React)          │  Backend (Node.js)              │
│  ┌─────────────────────┐   │  ┌─────────────────────────┐    │
│  │ AscentIDE.tsx       │   │  │ AI Services             │    │
│  │ - Code Editor       │◄─►│  │ - aiCourseService.js    │    │
│  │ - Real-time hints   │   │  │ - aiSupervisor.js       │    │
│  │ - Progress tracking │   │  │ - contentAggregator.js  │    │
│  └─────────────────────┘   │  └─────────────────────────┘    │
│  ┌─────────────────────┐   │  ┌─────────────────────────┐    │
│  │ CreateLessonPage    │   │  │ Course Generators       │    │
│  │ - Lesson creation   │◄─►│  │ - smartCourseGen.js     │    │
│  │ - Content editor    │   │  │ - ultimateCourseGen.js  │    │
│  └─────────────────────┘   │  └─────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL)                                      │
│  ┌─────────────────────┐   ┌─────────────────────────┐      │
│  │ ingested_lessons    │   │ enhanced_courses        │      │
│  │ content_sources     │   │ ai_tutors               │      │
│  │ ai_sessions         │   │ course_generation_logs  │      │
│  └─────────────────────┘   └─────────────────────────┘      │
├─────────────────────────────────────────────────────────────┤
│  External APIs                                              │
│  │ Gemini AI API     │ GitHub APIs    │ Content Sources    │
│  │ (Google)          │ (LeetCode)     │ (FreeCodeCamp)     │
│  └─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### 1. Setup

```bash
# Clone and install dependencies
cd educators-edge-backend
npm install

# Set up environment variables
cp .env.example .env
# Add your GEMINI_API_KEY and DATABASE_URL

# Run complete system setup
node setupAICourseSystem.js
```

### 2. Generate Your First Course

```bash
# Generate smart course from FreeCodeCamp content
node smartCourseGenerator.js javascript 3 intermediate "algorithms"

# Generate premium Grokking-style course
node ultimateCourseGenerator.js grokking-coding-interview

# Generate all popular course templates
node ultimateCourseGenerator.js all
```

### 3. Integrate with Frontend

```javascript
// Start AI supervision in AscentIDE
const supervision = await startAISupervision(lessonId, studentProfile);

// Analyze code changes in real-time
const analysis = await analyzeCode(sessionId, {
    code: currentCode,
    previousCode: lastCode,
    type: 'modification'
});
```

## 📚 Core Components

### 1. AI Course Service (`services/aiCourseService.js`)

The foundation service providing:
- **Advanced Rate Limiting**: Handles API quotas intelligently
- **Exponential Backoff**: Recovers from temporary failures
- **Comprehensive Logging**: Tracks all AI interactions
- **JSON Sanitization**: Parses AI responses reliably

```javascript
const aiService = new AIService();
const result = await aiService.generateWithRetries(prompt, description, {
    maxRetries: 5,
    timeout: 30000,
    temperature: 0.7
});
```

### 2. Content Aggregator (`services/contentAggregator.js`)

Pulls content from multiple sources:
- **FreeCodeCamp**: Existing lesson solutions
- **LeetCode**: Popular interview problems
- **AI Generated**: Original problems based on patterns
- **Smart Merging**: Deduplicates and scores content

### 3. Smart Course Generator (`smartCourseGenerator.js`)

Creates courses from FreeCodeCamp solutions:

```bash
node smartCourseGenerator.js [language] [maxCourses] [difficulty] [focusAreas]

# Examples:
node smartCourseGenerator.js javascript 5 intermediate "algorithms,data-structures"
node smartCourseGenerator.js python 3 beginner "loops,functions"
```

### 4. Ultimate Course Generator (`ultimateCourseGenerator.js`)

Creates premium courses using popular templates:

```bash
node ultimateCourseGenerator.js [courseType] [mode] [maxProblems]

# Available course types:
- grokking-coding-interview
- system-design-interview  
- dynamic-programming-patterns
- data-structures-deep-dive
- behavioral-interviews
```

### 5. AI Supervisor (`services/aiSupervisor.js`)

Provides real-time coding assistance:

```javascript
const supervisor = new AISupervisor({
    personality: 'encouraging', // 'encouraging', 'socratic', 'direct', 'mentor'
    maxHints: 3,
    difficultyAdaptation: true
});

const session = await supervisor.startSession(sessionId, lessonData, studentProfile);
const analysis = await supervisor.analyzeCodeChange(sessionId, codeChange);
```

## 🎓 Generated Course Types

### Smart Courses (From FreeCodeCamp)
- Analyzes existing FreeCodeCamp solutions
- Groups by programming patterns
- Creates progressive difficulty curves
- Adds real-world applications

### Premium Courses (Grokking-Style)
- **Grokking the Coding Interview**: 16 core patterns
- **System Design Mastery**: Scalable architecture patterns  
- **Dynamic Programming Decoded**: DP patterns and variations
- **Data Structures Deep Dive**: Comprehensive DS coverage
- **Behavioral Excellence**: Interview soft skills

### Custom Courses
- Define your own themes and patterns
- AI generates original problems
- Tailored to specific audiences
- Adaptive difficulty progression

## 🤖 AI Supervision Features

### Real-time Code Analysis
- **Syntax Error Detection**: Immediate feedback on syntax issues
- **Logic Error Identification**: Catches logical mistakes
- **Performance Suggestions**: Code optimization hints
- **Best Practice Guidance**: Industry standard recommendations

### Adaptive Learning
- **Difficulty Adjustment**: Adapts based on student performance
- **Personalized Hints**: Context-aware assistance
- **Progress Tracking**: Detailed analytics and insights
- **Learning Path Optimization**: Suggests optimal next steps

### Multiple Personalities
- **Encouraging**: Positive, motivating feedback
- **Socratic**: Guides through strategic questions
- **Direct**: Clear, actionable advice
- **Mentor**: Experience-based wisdom and patterns

## 🛠️ API Endpoints

### Course Generation
```http
POST /api/generate-smart-course
Content-Type: application/json

{
    "targetLanguage": "javascript",
    "maxCourses": 3,
    "difficulty": "intermediate", 
    "focusAreas": ["algorithms", "data-structures"]
}
```

### Premium Course Creation
```http
POST /api/generate-premium-course
Content-Type: application/json

{
    "courseType": "grokking-coding-interview",
    "options": {
        "maxProblems": 50,
        "languages": ["javascript", "python"],
        "practiceMode": "guided"
    }
}
```

### AI Supervision
```http
POST /api/start-supervision/:lessonId
Content-Type: application/json

{
    "studentProfile": {
        "skillLevel": "intermediate",
        "preferredLanguage": "javascript",
        "learningStyle": "visual"
    }
}
```

```http
POST /api/analyze-code/:sessionId
Content-Type: application/json

{
    "codeChange": {
        "code": "function solve(arr) { return arr.filter(x => x > 0); }",
        "previousCode": "function solve(arr) { // TODO }",
        "type": "addition",
        "language": "javascript"
    }
}
```

## 🎯 Integration Examples

### AscentIDE Integration

```typescript
// hooks/useAISupervision.ts
export const useAISupervision = (lessonId: string) => {
    const [session, setSession] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [hints, setHints] = useState([]);

    const startSupervision = async (studentProfile) => {
        const response = await fetch(`/api/start-supervision/${lessonId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentProfile })
        });
        const result = await response.json();
        setSession(result.session);
    };

    const analyzeCode = useCallback(async (codeChange) => {
        if (!session) return;
        
        const response = await fetch(`/api/analyze-code/${session.sessionId}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ codeChange })
        });
        const result = await response.json();
        
        setAnalysis(result.analysis);
        
        if (result.analysis.shouldIntervene) {
            setHints(prev => [...prev, result.analysis.intervention]);
        }
    }, [session]);

    return { session, analysis, hints, startSupervision, analyzeCode };
};
```

### Course Generation UI

```typescript
// components/CourseGenerator.tsx
const CourseGenerator = () => {
    const [generating, setGenerating] = useState(false);
    const [courses, setCourses] = useState([]);

    const generateSmartCourse = async (options) => {
        setGenerating(true);
        try {
            const response = await fetch('/api/generate-smart-course', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(options)
            });
            const result = await response.json();
            setCourses(result.courses);
        } finally {
            setGenerating(false);
        }
    };

    const generatePremiumCourse = async (courseType, options) => {
        setGenerating(true);
        try {
            const response = await fetch('/api/generate-premium-course', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseType, options })
            });
            const result = await response.json();
            setCourses([result.course]);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="course-generator">
            <button onClick={() => generateSmartCourse({
                targetLanguage: 'javascript',
                maxCourses: 3,
                focusAreas: ['algorithms']
            })}>
                Generate Smart Course
            </button>
            
            <button onClick={() => generatePremiumCourse('grokking-coding-interview', {
                maxProblems: 40,
                languages: ['javascript', 'python']
            })}>
                Generate Grokking Course
            </button>

            {generating && <LoadingSpinner />}
            {courses.length > 0 && <CourseList courses={courses} />}
        </div>
    );
};
```

## 📊 Monitoring & Analytics

### Logging System
All AI interactions are logged with:
- Timestamp and duration
- Token usage and costs
- Success/failure rates
- Error patterns and recovery

### Performance Metrics
- Course generation success rates
- AI response times
- Student engagement metrics
- Learning outcome tracking

### Dashboard Integration
- Real-time generation status
- Course popularity analytics
- Student progress insights
- AI supervision effectiveness

## 🔧 Configuration

### Environment Variables
```env
# Required
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:pass@host:port/dbname

# Optional
AI_MAX_RETRIES=5
AI_RATE_LIMIT_RPM=15
AI_TIMEOUT_MS=30000
LOG_LEVEL=info
```

### AI Service Configuration
```javascript
const aiService = new AIService({
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    requestsPerMinute: 15,
    personalityType: 'encouraging'
});
```

## 🚨 Troubleshooting

### Common Issues

1. **API Rate Limits**
   ```
   Error: Rate limit exceeded
   Solution: System automatically handles with exponential backoff
   ```

2. **Database Connection**
   ```
   Error: Connection failed
   Solution: Check DATABASE_URL and database server status
   ```

3. **Missing API Key**
   ```
   Error: GEMINI_API_KEY not found
   Solution: Add API key to .env file
   ```

4. **Course Generation Fails**
   ```
   Error: Insufficient lessons found
   Solution: Run hydrateDb.js to ingest FreeCodeCamp content
   ```

### Debug Mode
```bash
# Enable detailed logging
LOG_LEVEL=debug node smartCourseGenerator.js

# Check system status
node setupAICourseSystem.js --verify-only

# View generation logs
tail -f logs/ai-course-generation.log
```

## 🔄 Workflow Examples

### Complete Course Creation Workflow

```bash
# 1. Setup system (one-time)
node setupAICourseSystem.js

# 2. Ingest FreeCodeCamp content (if needed)
node hydrateDb.js

# 3. Enrich with AI categorization 
node enrichLibrary.js

# 4. Generate courses
node smartCourseGenerator.js javascript 5 all "algorithms,data-structures"
node ultimateCourseGenerator.js grokking-coding-interview

# 5. Review and publish through dashboard
# 6. Enable AI supervision for student sessions
```

### Development Workflow

```bash
# 1. Make changes to AI services
# 2. Test with sample data
node -e "
const { AIService } = require('./services/aiCourseService');
const ai = new AIService();
ai.generateWithRetries('Test prompt', 'Test').then(console.log);
"

# 3. Run integration tests
npm test

# 4. Generate test course
node ultimateCourseGenerator.js grokking-coding-interview single 10

# 5. Deploy and monitor
```

## 📈 Scaling Considerations

### Performance Optimization
- **Caching**: AI responses cached for common patterns
- **Batch Processing**: Multiple lessons generated in parallel
- **Database Indexing**: Optimized queries for content retrieval
- **Rate Limiting**: Intelligent API usage management

### Horizontal Scaling
- **Worker Processes**: Course generation can run in separate processes
- **Queue System**: Async course generation with job queues
- **Database Sharding**: Content sources can be distributed
- **CDN Integration**: Generated content cached at edge locations

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-enhancement`
3. **Make changes and add tests**
4. **Run the test suite**: `npm test`
5. **Submit pull request**

### Development Setup
```bash
git clone <repository>
cd educators-edge-backend
npm install
cp .env.example .env
# Add your API keys
node setupAICourseSystem.js
npm run dev
```

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: `/docs` folder
- **API Reference**: `/docs/api.md` 
- **Integration Guide**: `/docs/frontend-integration.md`
- **Troubleshooting**: This README's troubleshooting section
- **Logs**: `./logs/ai-course-generation.log`

---

🚀 **Ready to create amazing coding courses with AI?** Run `node setupAICourseSystem.js` to get started!