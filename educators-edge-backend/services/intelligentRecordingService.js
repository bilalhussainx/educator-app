// services/intelligentRecordingService.js
// Service for intelligent querying of recorded sessions using Gemini AI

const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../db');

class IntelligentRecordingService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('[INTELLIGENT_RECORDINGS] GOOGLE_AI_API_KEY not configured');
        }
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    }

    // Search recordings using AI semantic matching
    async searchRecordingsByQuery(courseId, userQuery) {
        try {
            console.log(`[INTELLIGENT_RECORDINGS] Searching recordings for query: ${userQuery}`);

            // First, get all completed recordings for the course
            const recordings = await db.query(`
                SELECT 
                    id,
                    title,
                    description,
                    video_url,
                    ai_summary,
                    ai_topics,
                    recorded_at
                FROM recorded_sessions 
                WHERE course_id = $1 AND processing_status = 'completed'
                ORDER BY recorded_at DESC
            `, [courseId]);

            if (recordings.rows.length === 0) {
                return {
                    matches: [],
                    aiResponse: "I don't have any recorded sessions for this course yet. Recordings will appear here after your instructor records live sessions.",
                    suggestions: []
                };
            }

            // Use Gemini to analyze the query and match it with recordings
            const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            
            const recordingContext = recordings.rows.map((recording, index) => {
                return `Recording ${index + 1}:
Title: ${recording.title}
Description: ${recording.description || 'No description'}
Topics: ${recording.ai_topics ? recording.ai_topics.join(', ') : 'No topics'}
Summary: ${recording.ai_summary || 'No summary available'}
---`;
            }).join('\n');

            const prompt = `You are an intelligent teaching assistant helping a student find relevant recorded tutorial sessions. The student asked: "${userQuery}"

Here are the available recorded sessions for this course:
${recordingContext}

Your task:
1. Analyze which recordings are most relevant to the student's question
2. Provide a helpful response that explains the concept they're asking about
3. Recommend specific recordings that would help them

Response format (JSON):
{
  "relevantRecordings": [1, 3], // Array of recording numbers (1-based) that are most relevant
  "aiResponse": "Your helpful explanation of the concept...",
  "suggestions": ["Try watching Recording 1 which covers...", "Recording 3 explains..."]
}

If no recordings match well, return empty relevantRecordings array but still provide helpful general guidance.`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            let aiResult;
            try {
                aiResult = JSON.parse(text);
            } catch (parseError) {
                console.error('[INTELLIGENT_RECORDINGS] Failed to parse AI response:', text);
                // Fallback response
                aiResult = {
                    relevantRecordings: [],
                    aiResponse: "I can help you find relevant recordings. Here are the available sessions for this course.",
                    suggestions: recordings.rows.slice(0, 3).map(r => `Check out "${r.title}" which covers topics like ${r.ai_topics?.slice(0, 2).join(', ') || 'various concepts'}`)
                };
            }

            // Map AI results back to actual recording objects
            const matchedRecordings = aiResult.relevantRecordings
                .map(recordingNum => recordings.rows[recordingNum - 1])
                .filter(Boolean); // Remove any undefined entries

            return {
                matches: matchedRecordings,
                aiResponse: aiResult.aiResponse,
                suggestions: aiResult.suggestions,
                totalRecordings: recordings.rows.length
            };

        } catch (error) {
            console.error('[INTELLIGENT_RECORDINGS] Error in searchRecordingsByQuery:', error);
            throw error;
        }
    }

    // Get semantic search suggestions based on topics
    async getSuggestedRecordings(courseId, currentTopics = []) {
        try {
            // Get recordings with similar topics
            const recordings = await db.query(`
                SELECT 
                    id,
                    title,
                    description,
                    video_url,
                    ai_summary,
                    ai_topics,
                    recorded_at
                FROM recorded_sessions 
                WHERE course_id = $1 
                AND processing_status = 'completed'
                AND (
                    $2::text[] IS NULL OR 
                    ai_topics && $2::text[]
                )
                ORDER BY recorded_at DESC
                LIMIT 5
            `, [courseId, currentTopics.length > 0 ? currentTopics : null]);

            return recordings.rows;

        } catch (error) {
            console.error('[INTELLIGENT_RECORDINGS] Error in getSuggestedRecordings:', error);
            throw error;
        }
    }

    // Generate study plan based on recordings
    async generateStudyPlan(courseId, studentGoals = '') {
        try {
            const recordings = await db.query(`
                SELECT 
                    title,
                    ai_summary,
                    ai_topics,
                    recorded_at
                FROM recorded_sessions 
                WHERE course_id = $1 AND processing_status = 'completed'
                ORDER BY recorded_at ASC
            `, [courseId]);

            if (recordings.rows.length === 0) {
                return {
                    studyPlan: [],
                    recommendation: "No recordings available yet. Your study plan will be generated once your instructor creates recorded sessions."
                };
            }

            const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
            
            const recordingsText = recordings.rows.map((r, i) => 
                `${i + 1}. ${r.title} (Topics: ${r.ai_topics?.join(', ') || 'Various'}) - ${r.ai_summary?.substring(0, 100)}...`
            ).join('\n');

            const prompt = `Create a personalized study plan for a student based on these recorded tutorial sessions:

${recordingsText}

Student goals: ${studentGoals || 'General mastery of course content'}

Create a structured study plan that:
1. Orders the recordings in a logical learning sequence
2. Explains why each recording is important
3. Suggests how long to spend on each session
4. Provides learning objectives for each recording

Format as JSON:
{
  "studyPlan": [
    {
      "recordingTitle": "Recording title",
      "order": 1,
      "estimatedTime": "45 minutes",
      "objectives": ["Learn X", "Practice Y"],
      "why": "This recording builds foundational knowledge..."
    }
  ],
  "recommendation": "Overall study strategy recommendation..."
}`;

            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            try {
                return JSON.parse(text);
            } catch (parseError) {
                return {
                    studyPlan: recordings.rows.map((r, i) => ({
                        recordingTitle: r.title,
                        order: i + 1,
                        estimatedTime: '30-45 minutes',
                        objectives: ['Review key concepts', 'Practice examples'],
                        why: 'Important for understanding course material'
                    })),
                    recommendation: 'Work through these recordings in chronological order for best understanding.'
                };
            }

        } catch (error) {
            console.error('[INTELLIGENT_RECORDINGS] Error in generateStudyPlan:', error);
            throw error;
        }
    }
}

module.exports = new IntelligentRecordingService();