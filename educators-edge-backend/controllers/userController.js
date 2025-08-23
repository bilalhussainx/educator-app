/*
 * =================================================================
 * FOLDER: src/controllers/
 * FILE:   userController.js (NEW FILE for APE)
 * =================================================================
 * DESCRIPTION: Handles logic for user-specific data like goals,
 * which are inputs for the Adaptive Path Engine.
 */
const db = require('../db');
const { executeCode } = require('../services/executionService');


/**
 * Retrieves the current user's goal from the database.
 */
exports.getUserGoal = async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await db.query(
            'SELECT goal_description FROM user_goals WHERE user_id = $1',
            [userId]
        );

        // If a goal exists, return it.
        if (result.rows.length > 0) {
            return res.status(200).json(result.rows[0]);
        }

        // If no goal is found, it's not an error. Just return an empty object.
        res.status(200).json({ goal_description: null });

    } catch (err) {
        console.error("Error in getUserGoal:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * Creates a new user goal or updates an existing one (Upsert).
 */
exports.saveOrUpdateUserGoal = async (req, res) => {
    const userId = req.user.id;
    const { goal_description } = req.body;

    if (typeof goal_description !== 'string') {
        return res.status(400).json({ error: 'Invalid goal description provided.' });
    }

    try {
        // Use an UPSERT query.
        // If a record with the user_id exists, it updates it.
        // Otherwise, it inserts a new record.
        const query = `
            INSERT INTO user_goals (user_id, goal_description)
            VALUES ($1, $2)
            ON CONFLICT (user_id)
            DO UPDATE SET goal_description = $2, updated_at = NOW()
            RETURNING *;
        `;
        
        const result = await db.query(query, [userId, goal_description]);

        // IMPORTANT: Send a success response back to the client.
        // This is what makes the frontend's promise resolve.
        res.status(201).json({ 
            message: 'Goal saved successfully.', 
            goal: result.rows[0] 
        });

    } catch (err) {
        console.error("Error in saveOrUpdateUserGoal:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// src/controllers/userController.js

// ... (keep your existing getUserGoal and saveOrUpdateUserGoal functions) ...

/**
 * Checks for and retrieves the next pending adaptive action for the current user.
 */
exports.getNextAction = async (req, res) => {
    const userId = req.user.id;
    try {
        // Find the oldest, uncompleted action for the user.
        const actionRes = await db.query(
            `SELECT * FROM adaptive_actions WHERE user_id = $1 AND is_completed = FALSE ORDER BY created_at ASC LIMIT 1`,
            [userId]
        );

        // If no pending action, that's fine. Return null.
        if (actionRes.rows.length === 0) {
            return res.status(200).json(null);
        }

        const action = actionRes.rows[0];
        let payload = { ...action }; // Base payload is the action itself

        // --- Fetch the related content for the action ---
        // This makes the frontend's job much easier.
        if (action.action_type === 'INJECT_FRAGMENT') {
            const fragmentRes = await db.query(
                'SELECT * FROM content_fragments WHERE id = $1',
                [action.related_id]
            );
            if (fragmentRes.rows.length > 0) {
                payload.details = fragmentRes.rows[0]; // Attach the full content fragment
            }
        } 
        // In the future, you could add a similar block for 'GENERATE_PROBLEM'
        // else if (action.action_type === 'GENERATE_PROBLEM') { ... }
         else if (action.action_type === 'GENERATE_PROBLEM') {
            const problemRes = await db.query(
                'SELECT * FROM generated_problems WHERE id = $1',
                [action.related_id]
            );
            if (problemRes.rows.length > 0) {
                payload.details = problemRes.rows[0]; // Attach the full problem details
            }
        }
        res.status(200).json(payload);

    } catch (err) {
        console.error("Error in getNextAction:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

/**
 * Marks an adaptive action as completed.
 */
exports.completeAction = async (req, res) => {
    const userId = req.user.id;
    const { actionId } = req.params;

    try {
        const result = await db.query(
            // Ensure the user can only complete their OWN actions.
            'UPDATE adaptive_actions SET is_completed = TRUE WHERE id = $1 AND user_id = $2 RETURNING id',
            [actionId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Action not found or you do not have permission to complete it.' });
        }

        res.status(200).json({ message: 'Action marked as complete.' });

    } catch (err) {
        console.error("Error in completeAction:", err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};
exports.solveGeneratedProblem = async (req, res) => {
    const userId = req.user.id;
    const { actionId } = req.params;
    const { code: studentCode } = req.body;

    try {
        // 1. Find the adaptive action to ensure it's assigned to this user and not completed
        const actionRes = await db.query(
            'SELECT related_id FROM adaptive_actions WHERE id = $1 AND user_id = $2 AND is_completed = FALSE',
            [actionId, userId]
        );

        if (actionRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Challenge not found or already completed." });
        }
        const problemId = actionRes.rows[0].related_id;

        // 2. Get the problem's test cases
        const problemRes = await db.query('SELECT test_cases FROM generated_problems WHERE id = $1', [problemId]);
        if (problemRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Test cases for this challenge could not be found." });
        }
        const { test_cases } = problemRes.rows[0];

        // 3. Execute the code against the test cases
        try {
            const fullCode = `${studentCode}\n\n${test_cases}`;
            const execution = await executeCode(fullCode, 'javascript');

            // The executeCode service now likely returns an object with a 'success' flag.
            // If the code runs but tests fail, it should not throw an error but return success: false.
            if (execution.success) {
                // If successful, the original action can be marked as complete.
                // We'll add this logic in a future step if needed, but for now, this is fine.
                res.status(200).json({ success: true, message: "Correct! Well done." });
            } else {
                // Test failed, but the execution was successful. Send back the reason.
                // We trim the output to give a clean message.
                const failureMessage = execution.output.split('\n').find(line => line.toLowerCase().includes('assertion failed')) || "Not quite. Check your logic and try again.";
                res.status(200).json({ success: false, message: failureMessage.replace('Assertion failed:', '').trim() });
            }
        } catch (executionError) {
            // This catches syntax errors or other code-breaking issues.
            console.log("Execution error in generated problem:", executionError.message);
            res.status(200).json({ success: false, message: `Your code has an error: ${executionError.message}` });
        }

    } catch (dbError) {
        // This outer catch now only handles database or server-level errors.
        console.error("Error in solveGeneratedProblem (DB):", dbError.message);
        res.status(500).json({ success: false, message: 'A server error occurred.' });
    }
    //     const fullCode = `${studentCode}\n\n${test_cases}`;
    //     const execution = await executeCode(fullCode, 'javascript');

    //     if (execution.success) {
    //         // If successful, we can implicitly mark the original action as complete in a future step,
    //         // but for now, just returning success is enough.
    //         res.status(200).json({ success: true, message: "Correct! Well done." });
    //     } else {
    //         res.status(200).json({ success: false, message: "Not quite. Check your logic and try again." });
    //     }
    // } catch (err) {
    //     console.error("Error in solveGeneratedProblem:", err.message);
    //     res.status(500).json({ success: false, message: 'A server error occurred.' });
    // }
};