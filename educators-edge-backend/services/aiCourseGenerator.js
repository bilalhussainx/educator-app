// src/services/aiCourseGenerator.js
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

// Initialize the Gemini client.
// Make sure to set your GOOGLE_API_KEY in your .env file.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

/**
 * A robust function to clean and parse JSON from an LLM response.
 * @param {string} rawText - The raw text response from the Gemini API.
 * @returns {object|Array} The parsed JSON object or array.
 */
function sanitizeAndParseJson(rawText) {
    const jsonStart = rawText.indexOf('{');
    const jsonEnd = rawText.lastIndexOf('}');
    const arrayStart = rawText.indexOf('[');
    const arrayEnd = rawText.lastIndexOf(']');
    let jsonText;

    if (arrayStart !== -1 && (arrayStart < jsonStart || jsonStart === -1)) {
        jsonText = rawText.substring(arrayStart, arrayEnd + 1);
    } else if (jsonStart !== -1) {
        jsonText = rawText.substring(jsonStart, jsonEnd + 1);
    } else {
        throw new Error("No valid JSON object or array found in the AI response.");
    }
    return JSON.parse(jsonText);
}


async function selectLessons(topic, lessonCount, candidateLessons) {
    console.log(`  [AI Scout] Selecting ${lessonCount} best lessons for "${topic}" from ${candidateLessons.length} candidates...`);
    
    // --- UPGRADE: Send both ID and Title to the AI ---
    const candidatePayload = candidateLessons.map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description_snippet: lesson.description ? lesson.description.substring(0, 150) + '...' : ''
    }));
    const language = candidateLessons[0]?.language || 'the specified language';

    const prompt = `
        You are a world-class curriculum architect for a course on ${language}.
        From the list of available lessons below, select the best ${lessonCount} for a course on "${topic}".
        
        Principles:
        1.  **Pedagogical Flow:** Lessons must be in a logical, progressive order.
        2.  **Relevance:** Your selection must be 100% relevant. Reject unrelated lessons.
        3.  **Quality Control:** If a lesson seems bad, do not include it.

        Here is the list of available lessons with their unique IDs and titles:
        ${JSON.stringify(candidatePayload, null, 2)}

        Respond ONLY with a single, raw JSON array of objects. Each object must contain the "id" and "title" for the lessons you have chosen, in the correct pedagogical order.
        Example format: [{ "id": "uuid-goes-here", "title": "Lesson Title" }]
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    try {
        const chosenLessonsInfo = sanitizeAndParseJson(responseText);
        if (!Array.isArray(chosenLessonsInfo)) throw new Error("AI response was not a JSON array.");
        
        console.log(`  [AI Scout] Gemini has intelligently selected ${chosenLessonsInfo.length} lessons.`);
        // Return the array of {id, title} objects
        return chosenLessonsInfo;
    } catch (e) {
        console.error("  [AI Scout] FAILED to parse Gemini's lesson selection response:", responseText);
        throw new Error("AI failed to select lessons in the correct format.");
    }
}

async function generateCourseStructure(topic, lessons) {
    console.log(`  [AI Architect] Generating course structure for "${topic}"...`);
    
    // --- UPGRADE: Send ID with the lesson data ---
    const lessonPayload = lessons.map(l => ({ id: l.id, title: l.title, description: l.description }));

    const prompt = `
        You are a master educator for the CoreZenith platform.
        Based on the provided sequence of lessons (each with a unique ID), generate a complete course structure.

        The general course topic is: "${topic}".

        Here are the lessons you must build the course around, in order:
        ${JSON.stringify(lessonPayload, null, 2)}

        Respond ONLY with a single, raw JSON object following this exact structure:
        {
          "course_title": "A creative, compelling, and professional title.",
          "course_description": "A compelling, one-paragraph marketing summary.",
          "lesson_sequence": [
            {
              "id": "The exact 'id' of the first lesson",
              "lesson_title": "The exact 'title' of the first lesson",
              "ai_generated_objective": "A concise learning objective starting with 'The student will be able to...'"
            }
          ]
        }
        Ensure the 'lesson_sequence' array contains an object for EVERY lesson provided.
    `;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    try {
        const courseStructure = sanitizeAndParseJson(responseText);
        console.log(`  [AI Architect] Gemini has generated the course structure.`);
        return courseStructure;
    } catch (e) {
        console.error("  [AI Architect] FAILED to parse Gemini's course generation response:", responseText);
        throw new Error("AI failed to generate the course in the correct format.");
    }
}

module.exports = {
    selectLessons,
    generateCourseStructure
};

// // src/services/aiCourseGenerator.js
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const db = require('../db');

// // Initialize the Gemini client.
// // Make sure to set your GOOGLE_API_KEY in your .env file.
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

// /**
//  * A robust function to clean and parse JSON from an LLM response.
//  * @param {string} rawText - The raw text response from the Gemini API.
//  * @returns {object|Array} The parsed JSON object or array.
//  */
// function sanitizeAndParseJson(rawText) {
//     // Find the start and end of the JSON block, even if it's inside markdown fences
//     const jsonStart = rawText.indexOf('{');
//     const jsonEnd = rawText.lastIndexOf('}');
//     const arrayStart = rawText.indexOf('[');
//     const arrayEnd = rawText.lastIndexOf(']');

//     let jsonText;

//     // Check if the primary content is an array or an object
//     if (arrayStart !== -1 && (arrayStart < jsonStart || jsonStart === -1)) {
//         // It's likely an array
//         jsonText = rawText.substring(arrayStart, arrayEnd + 1);
//     } else if (jsonStart !== -1) {
//         // It's likely an object
//         jsonText = rawText.substring(jsonStart, jsonEnd + 1);
//     } else {
//         // No JSON found
//         throw new Error("No valid JSON object or array found in the AI response.");
//     }

//     return JSON.parse(jsonText);
// }


// /**
//  * PHASE 1: The "Scout"
//  * Uses Gemini to select the most relevant lessons from a list of candidates.
//  * @param {string} topic - The high-level topic (e.g., "Introduction to JavaScript Arrays").
//  * @param {number} lessonCount - The desired number of lessons.
//  * @param {Array<object>} candidateLessons - Lessons found via a simple keyword search.
//  * @returns {Array<string>} An array of the chosen lesson titles in order.
//  */
// async function selectLessons(topic, lessonCount, candidateLessons) {
//     console.log(`  [AI Scout] Selecting ${lessonCount} best lessons for "${topic}" from ${candidateLessons.length} candidates...`);

//     const candidateTitles = candidateLessons.map(lesson => lesson.title).join('\n - ');

//     const prompt = `
//         You are an expert computer science curriculum designer.
//         From the following list of available lesson titles, please select the best ${lessonCount} for a beginner's course on "${topic}".
//         The lessons should be in a logical, progressive order, starting with the most fundamental concepts.

//         Available Lessons:
//         - ${candidateTitles}

//         Respond ONLY with a single, raw JSON array of the exact titles you have chosen. Do not include any other text or markdown formatting.
//     `;

//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();
    
//     try {
//         const chosenTitles = sanitizeAndParseJson(responseText);
//         if (!Array.isArray(chosenTitles)) {
//             throw new Error("AI response was not a JSON array.");
//         }
//         console.log(`  [AI Scout] Gemini has selected ${chosenTitles.length} lessons.`);
//         return chosenTitles;
//     } catch (e) {
//         console.error("  [AI Scout] FAILED to parse Gemini's lesson selection response:", responseText);
//         console.error("Underlying Error:", e.message);
//         throw new Error("AI failed to select lessons in the correct format.");
//     }
// }

// /**
//  * PHASE 2: The "Architect"
//  * Uses Gemini to generate a course title, description, and objectives for a given sequence of lessons.
//  * @param {string} topic - The original high-level topic.
//  * @param {Array<object>} lessons - The full data for the lessons selected by the Scout.
//  * @returns {object} The complete, structured course object.
//  */
// async function generateCourseStructure(topic, lessons) {
//     console.log(`  [AI Architect] Generating course structure for "${topic}"...`);
    
//     const lessonSummaries = lessons.map(l => ({ title: l.title, description: l.description }));

//     const prompt = `
//         You are a master educator creating a course for the CoreZenith platform.
//         Based on the following sequence of lessons, generate a complete course structure.

//         The course topic is: "${topic}".

//         Here are the lessons in order:
//         ${JSON.stringify(lessonSummaries, null, 2)}

//         Your task is to respond ONLY with a single, raw JSON object with the following structure:
//         {
//           "course_title": "A creative and engaging title for the course (e.g., 'JavaScript Arrays: From Zero to Hero').",
//           "course_description": "A compelling, one-paragraph summary of what the student will learn and why it's important.",
//           "lesson_sequence": [
//             {
//               "lesson_title": "The exact title of the first lesson",
//               "ai_generated_objective": "A concise, one-sentence objective for this specific lesson. Start with 'The student will be able to...'"
//             }
//           ]
//         }
//         Ensure the 'lesson_sequence' array contains an object for EVERY lesson provided.
//     `;
    
//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();

//     try {
//         const courseStructure = sanitizeAndParseJson(responseText);
//         console.log(`  [AI Architect] Gemini has generated the course structure.`);
//         return courseStructure;
//     } catch (e) {
//         console.error("  [AI Architect] FAILED to parse Gemini's course generation response:", responseText);
//         console.error("Underlying Error:", e.message);
//         throw new Error("AI failed to generate the course in the correct format.");
//     }
// }

// module.exports = {
//     selectLessons,
//     generateCourseStructure
// };

// // src/services/aiCourseGenerator.js
// const { GoogleGenerativeAI } = require('@google/generative-ai');
// const db = require('../db');

// // Initialize the Gemini client.
// // Make sure to set your GOOGLE_API_KEY in your .env file.
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"}); // Using the fast and capable Flash model

// /**
//  * PHASE 1: The "Scout"
//  * Uses Gemini to select the most relevant lessons from a list of candidates.
//  * @param {string} topic - The high-level topic (e.g., "Introduction to JavaScript Arrays").
//  * @param {number} lessonCount - The desired number of lessons.
//  * @param {Array<object>} candidateLessons - Lessons found via a simple keyword search.
//  * @returns {Array<string>} An array of the chosen lesson titles in order.
//  */
// async function selectLessons(topic, lessonCount, candidateLessons) {
//     console.log(`  [AI Scout] Selecting ${lessonCount} best lessons for "${topic}" from ${candidateLessons.length} candidates...`);

//     const candidateTitles = candidateLessons.map(lesson => lesson.title).join('\n - ');

//     const prompt = `
//         You are an expert computer science curriculum designer.
//         From the following list of available lesson titles, please select the best ${lessonCount} for a beginner's course on "${topic}".
//         The lessons should be in a logical, progressive order, starting with the most fundamental concepts.

//         Available Lessons:
//         - ${candidateTitles}

//         Respond ONLY with a single, raw JSON array of the exact titles you have chosen. Do not include any other text or markdown formatting.
//     `;

//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();
    
//     try {
//         const chosenTitles = JSON.parse(responseText);
//         console.log(`  [AI Scout] Gemini has selected ${chosenTitles.length} lessons.`);
//         return chosenTitles;
//     } catch (e) {
//         console.error("  [AI Scout] FAILED to parse Gemini's lesson selection response:", responseText);
//         throw new Error("AI failed to select lessons in the correct format.");
//     }
// }

// /**
//  * PHASE 2: The "Architect"
//  * Uses Gemini to generate a course title, description, and objectives for a given sequence of lessons.
//  * @param {string} topic - The original high-level topic.
//  * @param {Array<object>} lessons - The full data for the lessons selected by the Scout.
//  * @returns {object} The complete, structured course object.
//  */
// async function generateCourseStructure(topic, lessons) {
//     console.log(`  [AI Architect] Generating course structure for "${topic}"...`);
    
//     // We only need to send the title and description for the prompt
//     const lessonSummaries = lessons.map(l => ({ title: l.title, description: l.description }));

//     const prompt = `
//         You are a master educator creating a course for the CoreZenith platform.
//         Based on the following sequence of lessons, generate a complete course structure.

//         The course topic is: "${topic}".

//         Here are the lessons in order:
//         ${JSON.stringify(lessonSummaries, null, 2)}

//         Your task is to respond ONLY with a single, raw JSON object with the following structure:
//         {
//           "course_title": "A creative and engaging title for the course (e.g., 'JavaScript Arrays: From Zero to Hero').",
//           "course_description": "A compelling, one-paragraph summary of what the student will learn and why it's important.",
//           "lesson_sequence": [
//             {
//               "lesson_title": "The exact title of the first lesson",
//               "ai_generated_objective": "A concise, one-sentence objective for this specific lesson. Start with 'The student will be able to...'"
//             }
//           ]
//         }
//         Ensure the 'lesson_sequence' array contains an object for EVERY lesson provided.
//     `;
    
//     const result = await model.generateContent(prompt);
//     const responseText = result.response.text();

//     try {
//         const courseStructure = JSON.parse(responseText);
//         console.log(`  [AI Architect] Gemini has generated the course structure.`);
//         return courseStructure;
//     } catch (e) {
//         console.error("  [AI Architect] FAILED to parse Gemini's course generation response:", responseText);
//         throw new Error("AI failed to generate the course in the correct format.");
//     }
// }

// module.exports = {
//     selectLessons,
//     generateCourseStructure
// };