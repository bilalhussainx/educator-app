// services/translationService.js
// Service for translating recorded session content using Gemini AI

const { GoogleGenerativeAI } = require("@google/generative-ai");
const db = require('../db');

class TranslationService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('[TRANSLATION] GOOGLE_AI_API_KEY not configured');
        }
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Supported languages
        this.supportedLanguages = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French', 
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese (Simplified)',
            'ja': 'Japanese',
            'ko': 'Korean',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'no': 'Norwegian',
            'da': 'Danish',
            'fi': 'Finnish',
            'pl': 'Polish',
            'tr': 'Turkish',
            'th': 'Thai',
            'vi': 'Vietnamese'
        };
    }

    // Get list of supported languages
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    // Translate recording transcript and summary
    async translateRecording(recordingId, targetLanguage) {
        try {
            console.log(`[TRANSLATION] Translating recording ${recordingId} to ${targetLanguage}`);

            // Validate language
            if (!this.supportedLanguages[targetLanguage]) {
                throw new Error(`Unsupported language: ${targetLanguage}`);
            }

            // Get recording data
            const recording = await db.query(
                'SELECT id, title, description, transcript, ai_summary, ai_topics FROM recorded_sessions WHERE id = $1',
                [recordingId]
            );

            if (recording.rows.length === 0) {
                throw new Error('Recording not found');
            }

            const recordingData = recording.rows[0];
            
            if (!recordingData.transcript) {
                throw new Error('Recording has no transcript to translate');
            }

            // Check if translation already exists
            const existingTranslation = await db.query(
                'SELECT * FROM recording_translations WHERE recording_id = $1 AND language_code = $2',
                [recordingId, targetLanguage]
            );

            if (existingTranslation.rows.length > 0) {
                return existingTranslation.rows[0];
            }

            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const languageName = this.supportedLanguages[targetLanguage];

            // Create translation prompt
            const prompt = `You are a professional translator specializing in educational content. Please translate the following programming tutorial content into ${languageName}. Maintain technical accuracy and preserve code snippets unchanged.

IMPORTANT: Keep all code examples, variable names, function names, and technical terms in English. Only translate the explanatory text and comments.

Content to translate:

TITLE: ${recordingData.title}

DESCRIPTION: ${recordingData.description || 'No description'}

TRANSCRIPT: ${recordingData.transcript}

SUMMARY: ${recordingData.ai_summary || 'No summary'}

TOPICS: ${recordingData.ai_topics?.join(', ') || 'No topics'}

Please respond in JSON format:
{
  "translatedTitle": "Translated title in ${languageName}",
  "translatedDescription": "Translated description in ${languageName}",
  "translatedTranscript": "Translated transcript in ${languageName}",
  "translatedSummary": "Translated summary in ${languageName}",
  "translatedTopics": ["Translated", "topics", "in", "${languageName}"]
}`;

            console.log(`[TRANSLATION] Sending translation request for ${languageName}`);
            const result = await model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            let translationResult;
            try {
                translationResult = JSON.parse(text);
            } catch (parseError) {
                console.error('[TRANSLATION] Failed to parse translation response:', text);
                throw new Error('Failed to parse translation response');
            }

            // Store translation in database
            const savedTranslation = await db.query(`
                INSERT INTO recording_translations 
                (recording_id, language_code, language_name, translated_title, translated_description, 
                 translated_transcript, translated_summary, translated_topics, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
                RETURNING *
            `, [
                recordingId,
                targetLanguage,
                languageName,
                translationResult.translatedTitle,
                translationResult.translatedDescription,
                translationResult.translatedTranscript,
                translationResult.translatedSummary,
                translationResult.translatedTopics
            ]);

            console.log(`[TRANSLATION] Translation completed for recording ${recordingId} in ${languageName}`);
            return savedTranslation.rows[0];

        } catch (error) {
            console.error(`[TRANSLATION] Error translating recording ${recordingId}:`, error);
            throw error;
        }
    }

    // Get translation for a recording
    async getTranslation(recordingId, targetLanguage) {
        try {
            const translation = await db.query(
                'SELECT * FROM recording_translations WHERE recording_id = $1 AND language_code = $2',
                [recordingId, targetLanguage]
            );

            return translation.rows[0] || null;
        } catch (error) {
            console.error('[TRANSLATION] Error getting translation:', error);
            throw error;
        }
    }

    // Get all translations for a recording
    async getRecordingTranslations(recordingId) {
        try {
            const translations = await db.query(
                'SELECT language_code, language_name, created_at FROM recording_translations WHERE recording_id = $1 ORDER BY created_at DESC',
                [recordingId]
            );

            return translations.rows;
        } catch (error) {
            console.error('[TRANSLATION] Error getting recording translations:', error);
            throw error;
        }
    }

    // Batch translate multiple recordings
    async batchTranslateRecordings(courseId, targetLanguage) {
        try {
            console.log(`[TRANSLATION] Starting batch translation for course ${courseId} to ${targetLanguage}`);

            // Get all completed recordings for the course that don't have this translation
            const recordings = await db.query(`
                SELECT r.id, r.title 
                FROM recorded_sessions r
                LEFT JOIN recording_translations rt ON r.id = rt.recording_id AND rt.language_code = $2
                WHERE r.course_id = $1 
                AND r.processing_status = 'completed' 
                AND r.transcript IS NOT NULL
                AND rt.id IS NULL
                ORDER BY r.recorded_at DESC
            `, [courseId, targetLanguage]);

            const results = [];
            for (const recording of recordings.rows) {
                try {
                    const translation = await this.translateRecording(recording.id, targetLanguage);
                    results.push({
                        recordingId: recording.id,
                        title: recording.title,
                        success: true,
                        translation
                    });
                } catch (error) {
                    console.error(`[TRANSLATION] Failed to translate recording ${recording.id}:`, error);
                    results.push({
                        recordingId: recording.id,
                        title: recording.title,
                        success: false,
                        error: error.message
                    });
                }

                // Add a small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`[TRANSLATION] Batch translation completed: ${results.filter(r => r.success).length}/${results.length} successful`);
            return results;

        } catch (error) {
            console.error('[TRANSLATION] Error in batch translation:', error);
            throw error;
        }
    }

    // Delete translation
    async deleteTranslation(recordingId, targetLanguage) {
        try {
            await db.query(
                'DELETE FROM recording_translations WHERE recording_id = $1 AND language_code = $2',
                [recordingId, targetLanguage]
            );
            console.log(`[TRANSLATION] Deleted translation for recording ${recordingId} in ${targetLanguage}`);
        } catch (error) {
            console.error('[TRANSLATION] Error deleting translation:', error);
            throw error;
        }
    }
}

module.exports = new TranslationService();