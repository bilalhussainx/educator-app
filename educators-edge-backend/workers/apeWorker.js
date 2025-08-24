const { Worker } = require('bullmq');
require('dotenv').config();

const connectionOptions = process.env.REDIS_URL 
    ? { connection: process.env.REDIS_URL } 
    : { connection: { host: '127.0.0.1', port: 6379 } };

console.log("Initializing BullMQ Worker...");
if (process.env.REDIS_URL) {
    console.log("Worker connecting to Redis via URL.");
} else {
    console.log("Worker connecting to local Redis.");
}

const worker = new Worker('analyze-submission', async job => {
    console.log(`Processing job ${job.id}`);
}, connectionOptions);

worker.on('completed', job => {
  console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
  console.log(`${job.id} has failed with ${err.message}`);
});
// /*
//  * =================================================================
//  * FOLDER: src/workers/
//  * FILE:   apeWorker.js (Final, Consolidated Logic)
//  * =================================================================
//  * DESCRIPTION: This is the final version of the APE's "Brain". It
//  * correctly imports all AI generation functions from the consolidated
//  * aiProblemService and uses its full decision-making logic to provide
//  * either new challenges or dynamic, AI-generated refreshers.
//  */
// const { Worker } = require('bullmq');
// const redisConnection = require('../config/redis');
// const db = require('../db');

// // --- Import BOTH generation functions from the single, correct service ---
// const { 
//     generateMicroProblem,
//     generateAndSaveDynamicRefresher
// } = require('../services/aiProblemService');

// const APE_QUEUE_NAME = 'ape-analysis-queue';

// console.log("APE Worker starting...");

// const worker = new Worker(APE_QUEUE_NAME, async (job) => {
//     console.log(`[APE WORKER] Processing job: ${job.name} for user ${job.data.userId}`);
//     const { userId, lessonId, submissionId } = job.data;

//     console.log(`[APE WORKER DEBUG] Job Data: userId=${userId}, lessonId=${lessonId}, submissionId=${submissionId}`);

//     try {
//         // Step 1: FETCH DATA
//         const profileRes = await db.query('SELECT * FROM user_cognitive_profiles WHERE user_id = $1', [userId]);
//         const existingProfile = profileRes.rows[0];
//         const profile = existingProfile || { user_id: userId, concept_mastery: {}, frustration_level: 0.1 };
        
//         // Create a mutable copy to prevent silent update failures
//         profile.concept_mastery = JSON.parse(JSON.stringify(profile.concept_mastery || {}));
        
//         const lessonConceptsRes = await db.query('SELECT concept_id, mastery_level FROM lesson_concepts WHERE lesson_id = $1', [lessonId]);
//         const lessonConcepts = lessonConceptsRes.rows;
        
//         console.log(`[APE WORKER DEBUG] Found ${lessonConcepts.length} concepts for lessonId ${lessonId}.`);

//         const submissionRes = await db.query('SELECT submitted_code, time_to_solve_seconds, code_churn, error_types FROM submissions WHERE id = $1', [submissionId]);
//         if (submissionRes.rows.length === 0) {
//             throw new Error(`Submission with ID ${submissionId} not found.`);
//         }
//         const submission = submissionRes.rows[0];

//         // Step 2: ANALYZE & INFER
//         for (const concept of lessonConcepts) {
//             console.log(`[APE WORKER DEBUG] Analyzing concept ID: ${concept.concept_id}`);
//             const currentMastery = profile.concept_mastery[concept.concept_id] || 0;
//             let masteryGain = 0.05 + (concept.mastery_level / 100);
//             if (submission.time_to_solve_seconds < 60) masteryGain += 0.02;
//             if (submission.code_churn < 50) masteryGain += 0.01;
//             profile.concept_mastery[concept.concept_id] = Math.min(1.0, currentMastery + masteryGain);
//         }
//         profile.frustration_level = Math.max(0, profile.frustration_level - 0.1);

//         // Step 3: DECISION LOGIC (Prioritized)
//         let actionTaken = false;
        
//         // Condition 1: Check for student excellence FIRST
//         const BOREDOM_THRESHOLD_SECONDS = 30;
//         if (submission.time_to_solve_seconds < BOREDOM_THRESHOLD_SECONDS && lessonConcepts.length > 0) {
//             console.log(`[APE DECISION] User ${userId} is excelling. Attempting to generate a challenge problem.`);
//             const sourceConceptId = lessonConcepts[0].concept_id;
//             const targetConceptId = lessonConcepts[lessonConcepts.length - 1].concept_id;
//             const [sourceRes, targetRes] = await Promise.all([
//                 db.query('SELECT * FROM concepts WHERE id = $1', [sourceConceptId]),
//                 db.query('SELECT * FROM concepts WHERE id = $1', [targetConceptId])
//             ]);
//             if (sourceRes.rows.length > 0 && targetRes.rows.length > 0) {
//                 const newProblemId = await generateMicroProblem(sourceRes.rows[0], targetRes.rows[0]);
//                 if (newProblemId) {
//                     await db.query(`INSERT INTO adaptive_actions (user_id, action_type, related_id) VALUES ($1, 'GENERATE_PROBLEM', $2)`, [userId, newProblemId]);
//                     console.log(`[APE ACTION] Logged 'GENERATE_PROBLEM' action for user ${userId} with problem ${newProblemId}.`);
//                     actionTaken = true;
//                 }
//             }
//         }
        
//         // Condition 2: If no challenge was generated, check if the student is struggling
//         const REMEDIAL_THRESHOLD = 0.4;
//         if (!actionTaken) {
//             for (const conceptIdStr in profile.concept_mastery) {
//                 const conceptId = parseInt(conceptIdStr, 10);
//                 const masteryScore = profile.concept_mastery[conceptId];
//                 if (masteryScore < REMEDIAL_THRESHOLD) {
//                     console.log(`[APE DECISION] User ${userId} has low mastery (${masteryScore}). Generating a dynamic refresher.`);
                    
//                     const [lessonRes, conceptRes] = await Promise.all([
//                         db.query('SELECT * FROM lessons WHERE id = $1', [lessonId]),
//                         db.query('SELECT * FROM concepts WHERE id = $1', [conceptId])
//                     ]);

//                     if (lessonRes.rows.length > 0 && conceptRes.rows.length > 0) {
//                         const newFragmentId = await generateAndSaveDynamicRefresher(lessonRes.rows[0], conceptRes.rows[0]);
//                         if (newFragmentId) {
//                             await db.query(`INSERT INTO adaptive_actions (user_id, action_type, related_id) VALUES ($1, 'INJECT_FRAGMENT', $2)`, [userId, newFragmentId]);
//                             console.log(`[APE ACTION] Logged 'INJECT_FRAGMENT' with DYNAMIC refresher for user ${userId}.`);
//                             actionTaken = true;
//                             break; 
//                         }
//                     }
//                 }
//             }
//         }

//         // STEP 4: PERSIST UPDATED PROFILE
//         console.log(`[APE WORKER] Preparing to save profile for user ${userId}. Profile exists:`, !!existingProfile);
//         if (existingProfile) {
//             console.log(`[APE WORKER] Updating existing profile. New mastery:`, profile.concept_mastery);
//             await db.query(`UPDATE user_cognitive_profiles SET concept_mastery = $1, frustration_level = $2, updated_at = NOW() WHERE user_id = $3;`, [JSON.stringify(profile.concept_mastery), profile.frustration_level, userId]);
//         } else {
//             console.log(`[APE WORKER] Inserting new profile. Mastery:`, profile.concept_mastery);
//             await db.query(`INSERT INTO user_cognitive_profiles (user_id, concept_mastery, frustration_level) VALUES ($1, $2, $3);`, [userId, JSON.stringify(profile.concept_mastery), profile.frustration_level]);
//         }
//         console.log(`[APE WORKER] Successfully saved profile for user ${userId}`);

//     } catch (error) {
//         console.error(`[APE WORKER] Job failed for user ${job.data.userId}:`, error);
//         throw error;
//     }
// }, { connection: redisConnection });

// worker.on('completed', (job) => {
//     console.log(`[APE WORKER] Job ${job.id} for user ${job.data.userId} has completed!`);
// });

// worker.on('failed', (job, err) => {
//     console.error(`[APE WORKER] Job ${job.id} for user ${job.data.userId} has failed with error: ${err.message}`);
// });

// /*
//  * =================================================================
//  * FOLDER: src/workers/
//  * FILE:   apeWorker.js (Corrected - Final)
//  * =================================================================
//  * DESCRIPTION: This version fixes a reference error and includes
//  * critical debugging logs to verify the data being processed.
//  */
// const { Worker } = require('bullmq');

// // --- KEY FIX: Add the missing require statement for the Redis connection ---
// const redisConnection = require('../config/redis');
// // --- END FIX ---

// const db = require('../db');
// const { generateMicroProblem, generateAndSaveDynamicRefresher  } = require('../services/aiProblemService');

// const APE_QUEUE_NAME = 'ape-analysis-queue';

// console.log("APE Worker starting...");

// const worker = new Worker(APE_QUEUE_NAME, async (job) => {
//     console.log(`[APE WORKER] Processing job: ${job.name} for user ${job.data.userId}`);
//     const { userId, lessonId, submissionId } = job.data;

//     console.log(`[APE WORKER DEBUG] Job Data: userId=${userId}, lessonId=${lessonId}, submissionId=${submissionId}`);

//     try {
//         // Step 1: FETCH DATA
//         const profileRes = await db.query('SELECT * FROM user_cognitive_profiles WHERE user_id = $1', [userId]);
//         const existingProfile = profileRes.rows[0];
//         const profile = existingProfile || { user_id: userId, concept_mastery: {}, frustration_level: 0.1 };
//         profile.concept_mastery = JSON.parse(JSON.stringify(profile.concept_mastery || {}));
        
//         const lessonConceptsRes = await db.query('SELECT concept_id, mastery_level FROM lesson_concepts WHERE lesson_id = $1', [lessonId]);
//         const lessonConcepts = lessonConceptsRes.rows;
        
//         console.log(`[APE WORKER DEBUG] Found ${lessonConcepts.length} concepts for lessonId ${lessonId}.`);

//         const submissionRes = await db.query('SELECT time_to_solve_seconds, code_churn FROM submissions WHERE id = $1', [submissionId]);
//         const submission = submissionRes.rows[0];

//         // Step 2: ANALYZE & INFER
//         for (const concept of lessonConcepts) {
//             console.log(`[APE WORKER DEBUG] Analyzing concept ID: ${concept.concept_id}`);
//             const currentMastery = profile.concept_mastery[concept.concept_id] || 0;
//             let masteryGain = 0.05 + (concept.mastery_level / 100);
//             if (submission.time_to_solve_seconds < 60) masteryGain += 0.02;
//             if (submission.code_churn < 50) masteryGain += 0.01;
//             profile.concept_mastery[concept.concept_id] = Math.min(1.0, currentMastery + masteryGain);
//         }
//         profile.frustration_level = Math.max(0, profile.frustration_level - 0.1);

//         // Step 3: DECISION LOGIC
//         let actionTaken = false;
//         const BOREDOM_THRESHOLD_SECONDS = 30;
//         if (submission.time_to_solve_seconds < BOREDOM_THRESHOLD_SECONDS && lessonConcepts.length > 0) {
//             console.log(`[APE DECISION] User ${userId} is excelling. Attempting to generate a challenge problem.`);
//             const sourceConceptId = lessonConcepts[0].concept_id;
//             const targetConceptId = lessonConcepts[lessonConcepts.length - 1].concept_id;
//             const [sourceRes, targetRes] = await Promise.all([
//                 db.query('SELECT * FROM concepts WHERE id = $1', [sourceConceptId]),
//                 db.query('SELECT * FROM concepts WHERE id = $1', [targetConceptId])
//             ]);
//             if (sourceRes.rows.length > 0 && targetRes.rows.length > 0) {
//                 const newProblemId = await generateMicroProblem(sourceRes.rows[0], targetRes.rows[0]);
//                 if (newProblemId) {
//                     await db.query(`INSERT INTO adaptive_actions (user_id, action_type, related_id) VALUES ($1, 'GENERATE_PROBLEM', $2)`, [userId, newProblemId]);
//                     console.log(`[APE ACTION] Logged 'GENERATE_PROBLEM' action for user ${userId} with problem ${newProblemId}.`);
//                     actionTaken = true;
//                 }
//             }
//         }
        
//         const REMEDIAL_THRESHOLD = 0.4;
//         if (!actionTaken) {
//             for (const conceptIdStr in profile.concept_mastery) {
//                 const conceptId = parseInt(conceptIdStr, 10);
//                 const masteryScore = profile.concept_mastery[conceptId];
//                 if (masteryScore < REMEDIAL_THRESHOLD) {
//                     console.log(`[APE DECISION] User ${userId} has low mastery (${masteryScore}). Searching for intervention.`);
//                     const fragmentRes = await db.query('SELECT id FROM content_fragments WHERE concept_id = $1 ORDER BY RANDOM() LIMIT 1', [conceptId]);
//                     if (fragmentRes.rows.length > 0) {
//                         const fragmentId = fragmentRes.rows[0].id;
//                         await db.query(`INSERT INTO adaptive_actions (user_id, action_type, related_id) VALUES ($1, 'INJECT_FRAGMENT', $2)`, [userId, fragmentId]);
//                         console.log(`[APE ACTION] Logged 'INJECT_FRAGMENT' action for user ${userId} with fragment ${fragmentId}.`);
//                         actionTaken = true;
//                         break;
//                     }
//                 }
//             }
//         }

//         // STEP 4: PERSIST UPDATED PROFILE
//         console.log(`[APE WORKER] Preparing to save profile for user ${userId}. Profile exists:`, !!existingProfile);
//         if (existingProfile) {
//             console.log(`[APE WORKER] Updating existing profile. New mastery:`, profile.concept_mastery);
//             await db.query(`UPDATE user_cognitive_profiles SET concept_mastery = $1, frustration_level = $2, updated_at = NOW() WHERE user_id = $3;`, [JSON.stringify(profile.concept_mastery), profile.frustration_level, userId]);
//         } else {
//             console.log(`[APE WORKER] Inserting new profile. Mastery:`, profile.concept_mastery);
//             await db.query(`INSERT INTO user_cognitive_profiles (user_id, concept_mastery, frustration_level) VALUES ($1, $2, $3);`, [userId, JSON.stringify(profile.concept_mastery), profile.frustration_level]);
//         }
//         console.log(`[APE WORKER] Successfully saved profile for user ${userId}`);

//     } catch (error) {
//         console.error(`[APE WORKER] Job failed for user ${job.data.userId}:`, error);
//         throw error;
//     }
// }, { connection: redisConnection }); // This line now works because redisConnection is defined

// worker.on('completed', (job) => {
//     console.log(`[APE WORKER] Job ${job.id} for user ${job.data.userId} has completed!`);
// });

// worker.on('failed', (job, err) => {
//     console.error(`[APE WORKER] Job ${job.id} for user ${job.data.userId} has failed with error: ${err.message}`);
// });

// ... (worker event listeners are the same)
// /*
//  * =================================================================
//  * FOLDER: src/workers/
//  * FILE:   apeWorker.js (Final Version - Phase 7)
//  * =================================================================
//  * DESCRIPTION: This is the "Brain" of the APE. It processes student
//  * submissions asynchronously to update their cognitive profile and
//  * decides on the next adaptive intervention, which can be injecting
//  * remedial content OR generating a new dynamic problem.
//  */
// const { Worker } = require('bullmq');
// const redisConnection = require('../config/redis');
// const db = require('../db'); // Your database connection
// // require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });

// // --- APE PHASE 7: Import the new AI problem generation service ---
// const { generateMicroProblem } = require('../services/aiProblemService');

// const APE_QUEUE_NAME = 'ape-analysis-queue';

// console.log("APE Worker starting...");

// // The worker listens for jobs on the specified queue
// const worker = new Worker(APE_QUEUE_NAME, async (job) => {
//     console.log(`[APE WORKER] Processing job: ${job.name} for user ${job.data.userId}`);
//     const { userId, lessonId, submissionId } = job.data;

//     try {
//         // ===================================
//         // ===       THE APE TICK          ===
//         // ===================================

//         // 1. FETCH DATA: Get all necessary info from the database
//         let profileRes = await db.query('SELECT * FROM user_cognitive_profiles WHERE user_id = $1', [userId]);
//         let profile = profileRes.rows[0];
//         if (!profile) {
//             profile = { user_id: userId, concept_mastery: {}, frustration_level: 0.1 };
//         }
//         const lessonConceptsRes = await db.query('SELECT concept_id, mastery_level FROM lesson_concepts WHERE lesson_id = $1', [lessonId]);
//         const lessonConcepts = lessonConceptsRes.rows;
//         const submissionRes = await db.query('SELECT time_to_solve_seconds, code_churn FROM submissions WHERE id = $1', [submissionId]);
//         const submission = submissionRes.rows[0];

//         // 2. ANALYZE & INFER: Update the profile based on the data
//         for (const concept of lessonConcepts) {
//             const currentMastery = profile.concept_mastery[concept.concept_id] || 0;
//             let masteryGain = 0.05 + (concept.mastery_level / 100);
//             if (submission.time_to_solve_seconds < 60) masteryGain += 0.02; 
//             if (submission.code_churn < 50) masteryGain += 0.01;
//             profile.concept_mastery[concept.concept_id] = Math.min(1.0, currentMastery + masteryGain);
//         }
//         profile.frustration_level = Math.max(0, profile.frustration_level - 0.1);


//         // --- APE DECISION & ACTION LOGIC (UPDATED FOR PHASE 7) ---
//         let actionTaken = false;

//         // Condition 1: Student is struggling (low mastery)
//         const REMEDIAL_THRESHOLD = 0.4;
//         for (const conceptIdStr in profile.concept_mastery) {
//             const conceptId = parseInt(conceptIdStr, 10);
//             const masteryScore = profile.concept_mastery[conceptId];

//             if (masteryScore < REMEDIAL_THRESHOLD) {
//                 console.log(`[APE DECISION] User ${userId} has low mastery (${masteryScore}) for concept ${conceptId}. Searching for intervention.`);
//                 const fragmentRes = await db.query(
//                     'SELECT id FROM content_fragments WHERE concept_id = $1 ORDER BY RANDOM() LIMIT 1',
//                     [conceptId]
//                 );
//                 if (fragmentRes.rows.length > 0) {
//                     const fragmentId = fragmentRes.rows[0].id;
//                     await db.query(
//                         `INSERT INTO adaptive_actions (user_id, action_type, related_id) VALUES ($1, 'INJECT_FRAGMENT', $2)`,
//                         [userId, fragmentId]
//                     );
//                     console.log(`[APE ACTION] Logged 'INJECT_FRAGMENT' action for user ${userId} with fragment ${fragmentId}.`);
//                     actionTaken = true;
//                     break; 
//                 }
//             }
//         }

//         // Condition 2: Student is excelling and might be bored (NEW)
//         const BOREDOM_THRESHOLD_SECONDS = 30; // Solved in under 30 seconds
//         if (!actionTaken && submission.time_to_solve_seconds < BOREDOM_THRESHOLD_SECONDS && lessonConcepts.length > 0) {
//             console.log(`[APE DECISION] User ${userId} is excelling. Attempting to generate a challenge problem.`);
            
//             // We need a source concept (what they know) and a target concept (what the lesson was about)
//             // to create a good bridge problem.
//             const sourceConceptId = lessonConcepts[0].concept_id; // Simple logic: pick the first concept
//             const targetConceptId = lessonConcepts[lessonConcepts.length - 1].concept_id; // Simple logic: pick the last

//             const [sourceRes, targetRes] = await Promise.all([
//                 db.query('SELECT * FROM concepts WHERE id = $1', [sourceConceptId]),
//                 db.query('SELECT * FROM concepts WHERE id = $1', [targetConceptId])
//             ]);

//             if (sourceRes.rows.length > 0 && targetRes.rows.length > 0) {
//                 const newProblemId = await generateMicroProblem(sourceRes.rows[0], targetRes.rows[0]);
                
//                 if (newProblemId) {
//                     await db.query(
//                         `INSERT INTO adaptive_actions (user_id, action_type, related_id) VALUES ($1, 'GENERATE_PROBLEM', $2)`,
//                         [userId, newProblemId]
//                     );
//                     console.log(`[APE ACTION] Logged 'GENERATE_PROBLEM' action for user ${userId} with problem ${newProblemId}.`);
//                     actionTaken = true;
//                 }
//             }
//         }
        
//         // --- END OF DECISION LOGIC ---

//         // 3. PERSIST UPDATED PROFILE: Save the new cognitive state to the database
//         const upsertQuery = `
//             INSERT INTO user_cognitive_profiles (user_id, concept_mastery, frustration_level, updated_at)
//             VALUES ($1, $2, $3, NOW())
//             ON CONFLICT (user_id)
//             DO UPDATE SET 
//                 concept_mastery = EXCLUDED.concept_mastery,
//                 frustration_level = EXCLUDED.frustration_level,
//                 updated_at = NOW();
//         `;
//         await db.query(upsertQuery, [userId, JSON.stringify(profile.concept_mastery), profile.frustration_level]);

//         console.log(`[APE WORKER] Successfully updated profile for user ${userId}`);

//     } catch (error) {
//         console.error(`[APE WORKER] Job failed for user ${job.data.userId}:`, error);
//         throw error;
//     }
// }, { connection: redisConnection });

// worker.on('completed', (job) => {
//     console.log(`[APE WORKER] Job ${job.id} for user ${job.data.userId} has completed!`);
// });

// worker.on('failed', (job, err) => {
//     console.error(`[APE WORKER] Job ${job.id} for user ${job.data.userId} has failed with error: ${err.message}`);
// });

// // src/workers/apeWorker.js (Upgraded for Phase 4)
// const { Worker } = require('bullmq');
// const redisConnection = require('../config/redis');
// const db = require('../db'); // Your database connection

// const APE_QUEUE_NAME = 'ape-analysis-queue';

// console.log("APE Worker starting...");

// const worker = new Worker(APE_QUEUE_NAME, async (job) => {
//     console.log(`[APE WORKER] Processing job: ${job.name} for user ${job.data.userId}`);
//     const { userId, lessonId, submissionId } = job.data;

//     try {
//         // ===================================
//         // ===       THE APE TICK          ===
//         // ===================================

//         // 1. FETCH DATA (No Changes)
//         let profileRes = await db.query('SELECT * FROM user_cognitive_profiles WHERE user_id = $1', [userId]);
//         let profile = profileRes.rows[0];
//         if (!profile) {
//             profile = { user_id: userId, concept_mastery: {}, frustration_level: 0.1 };
//         }
//         const lessonConceptsRes = await db.query('SELECT concept_id, mastery_level FROM lesson_concepts WHERE lesson_id = $1', [lessonId]);
//         const lessonConcepts = lessonConceptsRes.rows;
//         const submissionRes = await db.query('SELECT time_to_solve_seconds, code_churn FROM submissions WHERE id = $1', [submissionId]);
//         const submission = submissionRes.rows[0];

//         // 2. ANALYZE & INFER (No Changes)
//         for (const concept of lessonConcepts) {
//             const currentMastery = profile.concept_mastery[concept.concept_id] || 0;
//             let masteryGain = 0.05 + (concept.mastery_level / 100);
//             if (submission.time_to_solve_seconds < 60) masteryGain += 0.02; 
//             if (submission.code_churn < 50) masteryGain += 0.01;
//             profile.concept_mastery[concept.concept_id] = Math.min(1.0, currentMastery + masteryGain);
//         }
//         profile.frustration_level = Math.max(0, profile.frustration_level - 0.1);


//         // --- APE PHASE 4: DECISION & ACTION LOGIC (NEW) ---
//         // After updating mastery, check if any concept is still below a remedial threshold.
//         const REMEDIAL_THRESHOLD = 0.4; // If mastery is below 40%, we should intervene.

//         for (const conceptIdStr in profile.concept_mastery) {
//             const conceptId = parseInt(conceptIdStr, 10);
//             const masteryScore = profile.concept_mastery[conceptId];

//             if (masteryScore < REMEDIAL_THRESHOLD) {
//                 console.log(`[APE DECISION] User ${userId} has low mastery (${masteryScore}) for concept ${conceptId}. Searching for intervention.`);

//                 // Find a relevant piece of content for this weak concept.
//                 const fragmentRes = await db.query(
//                     'SELECT id FROM content_fragments WHERE concept_id = $1 ORDER BY RANDOM() LIMIT 1',
//                     [conceptId]
//                 );

//                 if (fragmentRes.rows.length > 0) {
//                     const fragmentId = fragmentRes.rows[0].id;
                    
//                     // LOG THE ACTION: Create a record telling the frontend what to do.
//                     // This is the core of Phase 4's output.
//                     await db.query(
//                         `INSERT INTO adaptive_actions (user_id, action_type, related_id) VALUES ($1, 'INJECT_FRAGMENT', $2)`,
//                         [userId, fragmentId]
//                     );
//                     console.log(`[APE ACTION] Logged 'INJECT_FRAGMENT' action for user ${userId} with fragment ${fragmentId}.`);

//                     // We found an action for one concept, let's stop for now to not overwhelm the user.
//                     break; 
//                 }
//             }
//         }
//         // --- END OF NEW LOGIC ---


//         // 3. PERSIST UPDATED PROFILE (No Changes)
//         const upsertQuery = `
//             INSERT INTO user_cognitive_profiles (user_id, concept_mastery, frustration_level, updated_at)
//             VALUES ($1, $2, $3, NOW())
//             ON CONFLICT (user_id)
//             DO UPDATE SET 
//                 concept_mastery = EXCLUDED.concept_mastery,
//                 frustration_level = EXCLUDED.frustration_level,
//                 updated_at = NOW();
//         `;
//         await db.query(upsertQuery, [userId, JSON.stringify(profile.concept_mastery), profile.frustration_level]);

//         console.log(`[APE WORKER] Successfully updated profile for user ${userId}`);

//     } catch (error) {
//         console.error(`[APE WORKER] Job failed for user ${job.data.userId}:`, error);
//         throw error;
//     }
// }, { connection: redisConnection });

// worker.on('completed', (job) => {
//     console.log(`[APE WORKER] Job ${job.id} has completed!`);
// });

// worker.on('failed', (job, err) => {
//     console.error(`[APE WORKER] Job ${job.id} has failed with error: ${err.message}`);
// });