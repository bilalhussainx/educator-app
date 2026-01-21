# Intelligent Resume Template Engine

## Overview

Added an **AI-powered template engine** to the Liveblocks Resume Editor that creates **industry-standard resume templates** with intelligent Claude AI recommendations.

## Features

### ✅ 7 Industry-Standard Templates

1. **Modern Tech** - For software engineers, developers
   - Single-column layout
   - Emphasis on technical skills
   - 95% ATS score
   - Sections: Header, Summary, Skills, Experience, Projects, Education

2. **Professional Finance** - For finance professionals
   - Two-column layout
   - Emphasis on achievements
   - 98% ATS score
   - Sections: Header, Summary, Experience, Education, Certifications, Skills

3. **Creative Portfolio** - For designers, artists
   - Modern grid layout
   - Emphasis on visual impact
   - 85% ATS score
   - Sections: Header, Portfolio, Experience, Skills, Education

4. **Clinical Professional** - For healthcare workers
   - Traditional layout
   - Emphasis on credentials
   - 97% ATS score
   - Sections: Header, Credentials, Experience, Education, Certifications, Skills

5. **Management Consulting** - For consultants
   - Executive layout
   - Emphasis on impact metrics
   - 96% ATS score
   - Sections: Header, Summary, Experience, Education, Skills, Leadership

6. **Academic CV** - For researchers, professors
   - Detailed layout
   - Emphasis on publications
   - 90% ATS score
   - Sections: Header, Education, Publications, Research, Teaching, Awards

7. **Marketing Professional** - For marketers
   - Modern layout
   - Emphasis on results
   - 93% ATS score
   - Sections: Header, Summary, Experience, Campaigns, Skills, Education

### ✅ AI-Powered Recommendations

**Claude AI analyzes your resume and recommends the best template:**
- Considers target role and industry
- Analyzes content structure
- Provides confidence score
- Explains why the template fits
- Suggests customizations
- Gives industry-specific insights

### ✅ Smart Template Application

**When applying a template:**
- Claude restructures content to match template sections
- Optimizes bullet points for ATS
- Formats according to template layout
- Maintains all important information
- Removes redundancy
- Enhances impact statements

### ✅ Custom Template Saving

**Save your own templates:**
- Save current resume as reusable template
- Add metadata (role, industry)
- Load templates later for new applications
- Build a personal template library

## Backend Architecture

### Service: `resumeTemplateEngineService.js`

**Key Functions:**

1. **`recommendTemplate()`** - AI recommends best template
   ```javascript
   const result = await recommendTemplate(
     resumeContent,
     'Software Engineer',
     'Technology'
   );
   // Returns: recommended template, confidence, reasoning, alternatives
   ```

2. **`applyTemplate()`** - Transforms resume to match template
   ```javascript
   const result = await applyTemplate(
     resumeContent,
     'tech', // template key
     customizations
   );
   // Returns: transformed HTML, sections, optimizations
   ```

3. **`saveAsTemplate()`** - Saves custom template
   ```javascript
   await saveAsTemplate(
     userId,
     resumeContent,
     'My SWE Template',
     metadata
   );
   ```

4. **`getUserTemplates()`** - Loads user's saved templates
5. **`generateTemplatePreview()`** - Creates template preview HTML
6. **`getAllTemplates()`** - Lists all available templates

### Routes: `resumeTemplateRoutes.js`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/resume-templates` | GET | Get all available templates |
| `/api/resume-templates/recommend` | POST | Get AI recommendation |
| `/api/resume-templates/apply` | POST | Apply template to resume |
| `/api/resume-templates/save` | POST | Save as custom template |
| `/api/resume-templates/user/:userId` | GET | Get user's templates |
| `/api/resume-templates/preview/:key` | GET | Get template preview |

## Frontend Components

### `TemplateManager.tsx`

**Tabbed modal interface:**

1. **Browse Tab** - Grid of all industry templates
   - Shows template name, layout, ATS score
   - Displays sections and emphasis
   - One-click template application

2. **AI Recommended Tab** - Get AI suggestions
   - Input target role and industry
   - Claude analyzes and recommends
   - Shows confidence and reasoning
   - Provides industry insights
   - Apply recommended template

3. **My Templates Tab** - User's saved templates
   - List of custom templates
   - Shows creation date
   - Load template with one click

4. **Save Template Tab** - Save current resume
   - Enter template name
   - Optional role/industry metadata
   - Save for future reuse

### Integration with `LiveblocksResumeEditor.tsx`

**Added:**
- "Templates" button in header
- Template manager modal
- `handleApplyTemplate()` function
- State management for templates

## User Flow

### Scenario 1: Browse and Apply Template

1. User uploads resume
2. AI analyzes with inline comments
3. User clicks "Templates" button
4. Browse tab shows 7 industry templates
5. User clicks "Apply Template" on "Modern Tech"
6. Claude restructures resume to match template
7. Editor updates with new formatted content
8. User sees optimized layout instantly

### Scenario 2: Get AI Recommendation

1. User clicks "Templates" → "AI Recommended" tab
2. Enters target role: "Data Scientist"
3. Enters industry: "Healthcare"
4. Clicks "Get AI Recommendation"
5. Claude analyzes resume content and target
6. Recommends "Clinical Professional" template
7. Shows 92% confidence with reasoning
8. Provides healthcare industry insights
9. User clicks "Apply Recommended Template"
10. Resume restructured for healthcare industry

### Scenario 3: Save Custom Template

1. User perfects resume in editor
2. Clicks "Templates" → "Save Template" tab
3. Names it "My Senior Engineer Template"
4. Adds role: "Senior SWE" and industry: "Tech"
5. Clicks "Save as Template"
6. Template saved to user's library
7. Next time, loads from "My Templates" tab

## AI Intelligence

### Template Recommendation Logic

Claude considers:
- **Content analysis**: What's currently in the resume
- **Target role**: What position they're applying for
- **Industry norms**: What that industry expects
- **ATS compatibility**: How well it'll parse
- **Visual hierarchy**: How information is presented

**Example prompt to Claude:**
```
Analyze this resume and recommend the best industry-standard template.

RESUME CONTENT:
[resume text]

TARGET ROLE: Software Engineer
TARGET INDUSTRY: Technology

AVAILABLE TEMPLATES:
tech: Modern Tech (Layout: single-column, ATS: 95%, Emphasis: technical-skills)
finance: Professional Finance (Layout: two-column, ATS: 98%, Emphasis: achievements)
...

Respond with JSON:
{
  "recommendedTemplate": "tech",
  "confidence": 0.95,
  "reasoning": "Strong technical background...",
  "customizations": {...},
  "industryInsights": "Tech industry values..."
}
```

### Template Application Intelligence

When applying a template, Claude:
1. **Restructures sections** to match template order
2. **Optimizes bullets** for ATS (action verbs, metrics)
3. **Formats content** per template style
4. **Maintains information** (nothing lost)
5. **Removes redundancy** (cleaner)
6. **Enhances impact** (stronger statements)

**Example transformation:**

**Before (user's resume):**
```
WORK EXPERIENCE
TechCorp - Developer
- Worked on backend systems
- Fixed bugs
- Helped team
```

**After (tech template applied):**
```
PROFESSIONAL EXPERIENCE

Software Engineer | TechCorp | 2020 - Present
• Architected and deployed microservices backend handling 10M+ daily requests
• Reduced system bugs by 40% through comprehensive test coverage implementation
• Mentored team of 3 junior developers, improving code review cycle time by 50%
```

## Template Structure

Each template defines:

```javascript
{
  name: 'Modern Tech',
  layout: 'single-column',
  fonts: { heading: 'Inter', body: 'Inter' },
  colors: { primary: '#2563EB', accent: '#3B82F6' },
  sections: ['header', 'summary', 'skills', 'experience', 'projects', 'education'],
  emphasis: 'technical-skills',
  atsScore: 95
}
```

## Storage

**User templates saved to:**
```
educators-edge-backend/templates/user-templates/
  └── {userId}-{timestamp}.json
```

**Template file structure:**
```json
{
  "id": "user123-1759280000000",
  "userId": "user123",
  "name": "My SWE Template",
  "content": "<html content>",
  "metadata": {
    "targetRole": "Software Engineer",
    "targetIndustry": "Technology",
    "baseTemplate": "tech"
  },
  "createdAt": "2025-10-01T00:00:00.000Z"
}
```

## Benefits

### For Users
- ✅ **Industry-standard layouts** - Professional templates for every industry
- ✅ **AI guidance** - Smart recommendations based on goals
- ✅ **ATS optimization** - High compatibility scores
- ✅ **Time-saving** - Apply templates instantly
- ✅ **Reusable** - Save and load custom templates
- ✅ **Consistent** - Maintain formatting across applications

### For System
- ✅ **Intelligent** - Claude AI provides context-aware recommendations
- ✅ **Flexible** - Easy to add new templates
- ✅ **Scalable** - User templates stored efficiently
- ✅ **Integrated** - Works seamlessly with Liveblocks editor

## Example Usage

```typescript
// Get AI recommendation
const recommendation = await axios.post('/api/resume-templates/recommend', {
  resumeContent: editor.getHTML(),
  targetRole: 'Data Scientist',
  targetIndustry: 'Healthcare'
});

// Apply template
const result = await axios.post('/api/resume-templates/apply', {
  resumeContent: editor.getHTML(),
  templateKey: 'clinical',
  customizations: {}
});

// Save custom template
await axios.post('/api/resume-templates/save', {
  userId: 'user123',
  resumeContent: editor.getHTML(),
  templateName: 'My Perfect Template',
  templateMetadata: {
    targetRole: 'Senior Engineer',
    targetIndustry: 'Tech'
  }
});
```

## Files Created/Modified

### New Files
1. `educators-edge-backend/services/resumeTemplateEngineService.js` - Core template engine
2. `educators-edge-backend/routes/resumeTemplateRoutes.js` - API routes
3. `educators-edge-frontend/src/components/resume/TemplateManager.tsx` - UI component

### Modified Files
1. `educators-edge-backend/server.js` - Registered template routes
2. `educators-edge-frontend/src/components/resume/LiveblocksResumeEditor.tsx` - Added template management

## Testing

### Test Scenarios

1. **Browse templates**
   - Open template manager
   - Verify all 7 templates display
   - Check ATS scores and descriptions

2. **Apply template**
   - Select "Modern Tech" template
   - Verify content restructured
   - Check ATS optimizations applied

3. **Get AI recommendation**
   - Enter role: "Marketing Manager"
   - Enter industry: "Technology"
   - Verify Claude recommends appropriate template
   - Check reasoning provided

4. **Save custom template**
   - Create perfect resume
   - Save as "My Template"
   - Verify appears in "My Templates" tab
   - Load template in new session

5. **Template persistence**
   - Save template
   - Refresh page
   - Verify template still available

## Future Enhancements

### Phase 2
- [ ] **Visual template previews** - Show actual formatted preview
- [ ] **Template customization** - Edit colors, fonts, spacing
- [ ] **Industry-specific keywords** - Auto-suggest keywords for ATS
- [ ] **Template ratings** - Users rate templates
- [ ] **Template sharing** - Share templates with others

### Phase 3
- [ ] **AI template generation** - Create templates from scratch
- [ ] **Multi-page templates** - Support longer CVs
- [ ] **Export variations** - Different formats (PDF, Word, HTML)
- [ ] **Version control** - Track template versions
- [ ] **Template analytics** - See which templates perform best

## Summary

Successfully implemented an **intelligent resume template engine** with:

1. **7 industry-standard templates** optimized for different careers
2. **Claude AI recommendations** based on target role and industry
3. **Smart template application** that restructures and optimizes content
4. **Custom template saving** for personal template libraries
5. **Seamless integration** with Liveblocks collaborative editor

The system provides a **professional, AI-guided** approach to resume formatting that helps users create industry-appropriate resumes quickly and effectively.
