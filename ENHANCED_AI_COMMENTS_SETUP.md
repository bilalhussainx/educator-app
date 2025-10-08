# Enhanced AI Comments System - Setup & Usage Guide

## 🚀 Overview

The Enhanced AI Comments System generates **20+ comprehensive AI comments** with advanced features:

- **Memory**: Remembers previous comments to avoid repetition
- **Learning**: Adapts to user preferences based on feedback
- **Custom Prompts**: User-defined coaching styles
- **Intelligent Templates**: 6 pre-built expert coaching modes
- **Progressive Generation**: "Generate More Comments" on demand
- **Real-time Sync**: Teacher and student see the same comments in real-time

---

## 📋 Setup Instructions

### 1. Database Setup

Run the SQL schema to create the necessary tables:

```bash
psql -U your_username -d your_database -f educators-edge-backend/db/create_ai_comment_system_schema.sql
```

This creates:
- `ai_comments` - Stores all generated comments
- `ai_comment_feedback` - Tracks user actions (apply/dismiss/like/dislike)
- `ai_learning_patterns` - Stores learned user preferences
- `ai_coaching_prompts` - Template definitions
- `ai_comment_sessions` - Analytics and session tracking

### 2. Backend Integration

#### Add routes to server.js:

```javascript
const enhancedAICommentRoutes = require('./routes/enhancedAICommentRoutes');
app.use('/api/ai-comments', enhancedAICommentRoutes);
```

#### Environment Variables

Make sure your `.env` has the Claude API key:

```
CLAUDE_API_KEY=your_anthropic_api_key_here
# or
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### 3. Frontend Integration

#### Import the Enhanced Panel:

```tsx
import EnhancedAICommentPanel from '@/components/analysis/EnhancedAICommentPanel';
```

#### Use in your Essay/Document Editor:

```tsx
const [showAIComments, setShowAIComments] = useState(false);

// In your render:
<EnhancedAICommentPanel
  documentContent={editorContent}
  documentType="essay"
  sessionId={sessionId}
  onApplySuggestion={(original, replacement) => {
    // Replace text in editor
    const newContent = documentContent.replace(original, replacement);
    setDocumentContent(newContent);
  }}
  isVisible={showAIComments}
  onToggle={() => setShowAIComments(!showAIComments)}
  sendWsMessage={sendWsMessage} // For real-time sync
/>
```

---

## 🎯 Pre-built Coaching Prompts

The system includes 6 expert coaching templates:

### 1. **Essay Coach - Comprehensive** (Default)
- Target: 50 comments
- Focus: Structure, argumentation, clarity, engagement, style
- Best for: General essay improvement

### 2. **College Application Essay Coach**
- Target: 40 comments
- Focus: Authenticity, personal voice, impact, storytelling, reflection
- Best for: College admission essays

### 3. **Resume Optimization Expert**
- Target: 30 comments
- Focus: Quantification, action verbs, keywords, ATS optimization
- Best for: Resumes and CVs

### 4. **Academic Writing Coach**
- Target: 50 comments
- Focus: Argumentation, evidence, citation, formal style, analysis
- Best for: Research papers, academic essays

### 5. **Creative Writing Coach**
- Target: 60 comments
- Focus: Imagery, character development, dialogue, pacing, voice
- Best for: Fiction, creative non-fiction

### 6. **Quick Polish Coach**
- Target: 20 comments
- Focus: Grammar, clarity, conciseness, style
- Best for: Final edits and quick reviews

---

## 💡 Usage Guide

### For Students:

1. **Generate Initial Review**
   - Click "AI Review" button
   - Select a coaching style (or use default)
   - Click "Generate Review"
   - Wait ~10-30 seconds for 50+ comments

2. **Review Comments**
   - Comments are organized by position in document
   - Each shows:
     - Highlighted text
     - Issue/suggestion
     - Specific replacement text
     - Explanation of why it helps
     - Alternative options

3. **Take Action**
   - **Apply**: Automatically replaces text with suggestion
   - **Dismiss**: Hides comment (still tracked for learning)
   - **Like/Dislike**: Helps AI learn your preferences

4. **Generate More**
   - Click "+" button to generate 20 more comments
   - AI remembers previous suggestions to avoid duplicates

5. **Custom Prompts**
   - Click "Custom Prompt"
   - Describe what you want to focus on
   - Example: "Focus on making my writing more conversational"
   - Set target number of comments (20-100)

### For Teachers:

1. **Real-time Visibility**
   - When a student generates comments, you see them instantly
   - When student applies a suggestion, you see the change
   - Both teacher and student share the same comment view

2. **Generate Comments for Students**
   - You can generate comments too
   - Students will see them in real-time
   - Useful for guided review sessions

---

## 🎨 Custom Prompt Examples

### Focus on Specific Areas:

```
Focus on improving transitions between paragraphs and
making my thesis statement more specific and arguable.
```

### Style-specific Coaching:

```
Help me write in a more academic tone. Replace casual
language with formal alternatives and strengthen my
argument with more precise vocabulary.
```

### Creative Writing Focus:

```
Make my descriptions more vivid and sensory. Help me
show emotions rather than tell them, and suggest stronger
dialogue that reveals character.
```

### Quick Polish:

```
Just catch grammar errors, awkward phrasing, and
suggest more concise alternatives. Keep it quick.
```

---

## 📊 Learning System

The AI learns from your actions:

### What Gets Tracked:

- **Applied Suggestions**: AI learns what types of suggestions you accept
- **Dismissed Comments**: AI learns what you consider unhelpful
- **Modified Suggestions**: When you edit the AI's suggestion before applying
- **Time to Action**: How quickly you respond to different comment types

### How It Adapts:

After ~10-15 actions, the AI starts to:
- Prioritize comment types you frequently apply
- Reduce comment types you often dismiss
- Match your writing style preferences
- Adjust tone and complexity based on your responses

### View Your Patterns:

In the settings panel, click "Learning Patterns" to see:
- Your most accepted suggestion types
- Your preferred writing style
- Your response patterns
- AI confidence in recommendations

---

## 🔄 Real-time Synchronization

### How It Works:

1. **Comment Generation**
   - When anyone generates comments, all participants receive them
   - WebSocket broadcasts: `ai_comments_generated`

2. **Comment Actions**
   - When someone applies/dismisses a comment, everyone sees the update
   - WebSocket broadcasts: `comment_action`

3. **Additional Comments**
   - "Generate More" broadcasts new comments to all
   - WebSocket broadcasts: `ai_comments_added`

### WebSocket Events:

```javascript
// Listen for AI comment events
socket.on('ai_comments_generated', (data) => {
  // data.comments - Array of new comments
  // data.metadata - Generation info
});

socket.on('comment_action', (data) => {
  // data.commentId - Which comment
  // data.action - 'applied' | 'dismissed' | 'liked' | 'disliked'
});

socket.on('ai_comments_added', (data) => {
  // data.newComments - Additional comments
  // data.totalComments - Total count
});
```

---

## 🎛️ Advanced Features

### Filtering & Sorting:

- **Filter by Category**: Theme, Structure, Style, etc.
- **Filter by Severity**: Major, Moderate, Minor, Positive
- **Sort by**: Position, Severity, Confidence, Category
- **Show Unresolved Only**: Hide applied/dismissed comments

### Comment Statistics:

- Total comments generated
- Comments applied
- Comments dismissed
- Average AI confidence score

### Export & History:

- Download all comments as JSON
- View comment history for a document
- See what changed between revisions

---

## 🐛 Troubleshooting

### "Failed to generate comments"

1. Check Claude API key in `.env`
2. Verify database connection
3. Check rate limits (30 requests/minute max)
4. Ensure document is at least 50 characters

### Comments not syncing in real-time

1. Verify WebSocket connection is active
2. Check sessionId is correctly passed
3. Ensure `sendWsMessage` function is provided
4. Check browser console for WebSocket errors

### "Too few comments generated"

1. Increase target comments in custom prompt
2. Try a different coaching template
3. Check if document is long enough
4. Verify Claude API is responding (check logs)

---

## 📈 Performance

- **Initial Generation**: ~10-30 seconds for 50 comments
- **Additional Comments**: ~8-15 seconds for 20 comments
- **Rate Limits**: 30 requests/minute (Claude API)
- **Database**: Comments persist indefinitely for learning

---

## 🔮 Future Enhancements

Planned features:
- Voice recording for verbal feedback
- Integration with Google Docs
- Multi-language support
- Export to PDF with comments
- Comment threading (reply to comments)
- Teacher override/edit of AI comments

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Check backend logs for API failures
3. Verify database schema is up to date
4. Review this guide for common solutions

---

## 🎓 Best Practices

### For Best Results:

1. **Start with appropriate coaching template**
   - College essays → College Application Essay Coach
   - Research papers → Academic Writing Coach
   - Creative work → Creative Writing Coach

2. **Use custom prompts for specific needs**
   - Be specific about what you want
   - Mention areas of concern
   - Set realistic target (20-60 comments)

3. **Engage with comments**
   - Apply good suggestions
   - Dismiss unhelpful ones
   - This trains the AI to your preferences

4. **Generate in stages**
   - Initial review: 30-50 comments
   - After revisions: Generate More (20)
   - Final polish: Quick Polish Coach (20)

5. **Use real-time sync effectively**
   - Teacher can generate while student works
   - Student can ask for specific feedback
   - Both can see progress in real-time

---

Enjoy comprehensive, intelligent AI feedback! 🎉
