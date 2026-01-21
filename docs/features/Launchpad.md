Of course. You have provided the definitive architectural blueprint for the Ascendia Launchpad. My task now is to translate this high-level architecture into a precise, actionable, and step-by-step implementation plan for your AI assistant, Claude.

This is not just a list of tasks. It is a detailed engineering work order, designed to be executed sequentially to ensure the final product is robust, scalable, and perfectly aligned with the strategic vision.

Definitive Implementation Plan for Claude: The Ascendia Launchpad

To: Claude, AI Assistant
From: Gemini, Chief Architect
Subject: Step-by-Step Engineering Plan for the Ascendia Launchpad Feature

Claude,

The following document provides the definitive, step-by-step instructions to implement the Ascendia Launchpad, a structured, collaborative, and AI-assisted project management tool for college applications.

Execute these phases in the specified order. Adhere strictly to the defined schemas, function signatures, and API contracts.

Phase 1: Database Architecture (The Foundation)

Objective: Create the persistent data layer for the Launchpad.

Task 1.1: Implement the Mentor Specialization Schema.

Action: Execute an ALTER TABLE query on the existing mentor_profiles table.

Specification: Add a new column: specialties TEXT[]. This will store an array of strings (e.g., {'STEM Applications', 'Ivy League Strategy'}).

Task 1.2: Implement the Core Launchpad Schema.

Action: Execute CREATE TABLE queries to create the three new tables as defined in the architectural blueprint.

Table applications:

id (UUID, Primary Key), user_id (UUID, Foreign Key to users), application_name (VARCHAR), status (VARCHAR).

Ensure a Foreign Key constraint with ON DELETE CASCADE is set on the user_id.

Table application_sections:

id (UUID, Primary Key), application_id (UUID, Foreign Key to applications), section_type (VARCHAR), content (TEXT), status (VARCHAR).

The status column must have a DEFAULT 'draft'.

Table application_reviews:

id (UUID, Primary Key), section_id (UUID, Foreign Key to application_sections), mentor_id (UUID, Foreign Key to users), comments (JSONB), status (VARCHAR).

Phase 2: Backend Services & Logic (The Engine)

Objective: Build the core business logic for the Launchpad and its AI features. All new files should follow the Integrated Monolith pattern and be placed in logically named folders.

Task 2.1: Build the ascendia_launchpadService.js.

File to Create: educators-edge-backend/src/services/ascendia_launchpadService.js.

Specification: Implement the following functions:

createApplication(userId, applicationName): Creates a new record in the applications table.

getApplication(userId, appId): Fetches an application and all its associated sections.

saveSectionDraft(sectionId, content): Updates the content of a specific application_sections record.

submitSectionForReview(studentId, sectionId, mentorId): This is a transactional function. It must:

Query the mentor's session_rate from mentor_profiles.

Query the student's spark_balance from user_wallets.

If the balance is sufficient, create a new record in the transactions table with a status of escrow.

Decrement the student's spark_balance.

Update the application_sections status to pending_review.

Return success. All steps must be wrapped in a database transaction (BEGIN/COMMIT/ROLLBACK).

postReview(reviewId, mentorId, comments): This is a transactional function. It must:

Update the application_reviews record with the comments.

Update the corresponding application_sections status to reviewed.

Find the original escrow transaction and update its status to completed.

Increment the mentor's spark_balance by the escrowed amount.

Task 2.2: Implement the "MozartStroke" AI Services.

File to Modify: educators-edge-backend/src/controllers/geminiController.js (or a new aiFeaturesController.js).

Specification: Implement the three AI helper functions as defined in the "AI Superpowers" section of the blueprint:

generateActivityDescription: Takes raw text notes as input. It must construct the exact Gemini prompt specified in the blueprint ("You are a world-class college admissions consultant...") and return the AI's generated text.

generateEssayOutline: Takes raw essay ideas as input. It must construct the exact Gemini prompt specified ("You are a master storyteller...") and return the AI's structured outline.

analyzeEssayTone: Takes a full essay text as input. It must construct the exact Gemini prompt specified ("You are a professional editor...") and return the AI's bulleted list of suggestions.

Phase 3: API and Real-Time Layer (The Interface)

Objective: Expose the backend logic via secure RESTful APIs and real-time WebSocket events.

Task 3.1: Create the Launchpad API Endpoints.

File to Create: educators-edge-backend/src/routes/ascendia_routes.js.

Specification: Create the new routes as defined in the blueprint. All routes must be protected by the existing verifyToken middleware.

POST /api/ascendia/launchpad/applications -> launchpadController.createApplication

GET /api/ascendia/launchpad/applications/:appId -> launchpadController.getApplication

PUT /api/ascendia/launchpad/sections/:sectionId -> launchpadController.saveSectionDraft

POST /api/ascendia/launchpad/sections/:sectionId/reviews -> launchpadController.submitForReview

Create a corresponding ascendia_applicationController.js to link these routes to the service functions.

Task 3.2: Integrate Real-Time Notifications.

File to Modify: educators-edge-backend/src/handlers/websocketHandler.js.

Specification:

In the submitSectionForReview service function, after the database transaction succeeds, use the WebSocket server instance to send a targeted message. You will need a way to look up a mentor's WebSocket connection by their userId. The message must be of type NEW_REVIEW_REQUEST and should contain the studentName, sectionType, and appId.

Similarly, in the postReview service function, after the transaction succeeds, send a REVIEW_COMPLETED message to the student's WebSocket connection with the relevant sectionId and appId.

Phase 4: Frontend Implementation (The User Experience)

Objective: Build the user-facing workspace for the Ascendia Launchpad.

Task 4.1: Create the Main Launchpad Workspace.

File to Create: src/pages/LaunchpadPage.tsx.

Specification:

This page should fetch data from the GET /api/ascendia/launchpad/applications/:appId endpoint.

The UI must be a tabbed interface with sections corresponding to the section_type (Profile, Education, Activities, Writing).

Each section should display its content and current status (e.g., a "Draft" or "Reviewed" badge).

Task 4.2: Implement the "Request Review" Workflow.

Specification:

In each section of the LaunchpadPage, there must be a "Request Review" button.

Clicking this button should open a modal that allows the student to search for mentors based on the new specialties tag.

Upon selecting a mentor and confirming, the frontend will call the POST /api/ascendia/launchpad/sections/:sectionId/reviews endpoint. The UI should update to show the "Pending Review" status.

Task 4.3: Integrate the "MozartStroke" AI Assistant.

Specification:

In the "Activities" section, create a UI where a student can input bullet points. Add an "Activate MozartStroke" button next to this input.

Clicking this button will call the new generateActivityDescription AI endpoint and display the polished, AI-generated suggestions to the user.

Implement similar workflows for the "Essay Architect" and "Clarity & Tone Analyzer" in the "Writing" section of the UI.

This detailed, phased plan provides a clear and unambiguous path to implementing the Ascendia Launchpad. Execute these tasks sequentially to ensure a robust and architecturally sound final product.