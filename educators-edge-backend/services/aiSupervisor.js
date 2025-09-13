// FILE: services/aiSupervisor.js
// AI Supervisor for Real-time Coding Sessions

require('dotenv').config();
const { AIService, Logger } = require('./aiCourseService');

class AISupervisor {
    constructor(options = {}) {
        this.aiService = new AIService();
        this.sessionData = new Map(); // Store session contexts
        this.config = {
            maxHints: 3,
            hintDelay: 30000, // 30 seconds before first hint
            maxResponseTime: 10000, // 10 seconds max response time
            personalityType: options.personality || 'encouraging',
            difficultyAdaptation: true,
            realTimeAnalysis: true,
            ...options
        };
        
        this.personalities = {
            encouraging: {
                tone: 'supportive and motivating',
                style: 'Always positive, focuses on progress',
                phrases: ['Great job!', 'You\'re on the right track!', 'Let\'s break this down together']
            },
            socratic: {
                tone: 'questioning and thought-provoking',
                style: 'Guides through questions rather than direct answers',
                phrases: ['What do you think happens if...?', 'How might we approach this differently?']
            },
            direct: {
                tone: 'clear and concise',
                style: 'Direct feedback with actionable advice',
                phrases: ['Here\'s the issue:', 'Try this approach:', 'The problem is:']
            },
            mentor: {
                tone: 'wise and patient',
                style: 'Shares experience and best practices',
                phrases: ['In my experience...', 'A common pattern here is...', 'Let me share a technique...']
            }
        };
    }

    async startSession(sessionId, lessonData, studentProfile) {
        await Logger.info(`Starting AI supervision for session ${sessionId}`);

        const sessionContext = {
            sessionId,
            startTime: Date.now(),
            lesson: lessonData,
            student: studentProfile,
            codeHistory: [],
            mistakes: [],
            hints: [],
            hintsUsed: 0,
            currentProblem: lessonData.problems?.[0] || null,
            difficulty: lessonData.difficulty || 'medium',
            progress: {
                linesWritten: 0,
                errorsFixed: 0,
                testsRun: 0,
                testsPassed: 0
            },
            personality: this.personalities[this.config.personalityType],
            adaptations: []
        };

        this.sessionData.set(sessionId, sessionContext);

        // Generate initial context and lesson plan
        await this.generateSessionStrategy(sessionContext);

        return {
            sessionId,
            welcomeMessage: await this.generateWelcomeMessage(sessionContext),
            initialHints: sessionContext.initialHints || [],
            estimatedDifficulty: sessionContext.difficulty,
            learningObjectives: lessonData.objectives || []
        };
    }

    async analyzeCodeChange(sessionId, codeChange) {
        const session = this.sessionData.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        const analysis = {
            timestamp: Date.now(),
            codeSnippet: codeChange.code,
            changeType: codeChange.type, // 'addition', 'deletion', 'modification'
            lineNumbers: codeChange.lineNumbers,
            syntaxErrors: [],
            logicErrors: [],
            improvements: [],
            nextSteps: [],
            encouragement: null,
            shouldIntervene: false
        };

        try {
            // Real-time code analysis using AI
            const aiAnalysis = await this.performAICodeAnalysis(codeChange, session);
            Object.assign(analysis, aiAnalysis);

            // Update session context
            session.codeHistory.push(analysis);
            this.updateSessionProgress(session, analysis);

            // Determine if intervention is needed
            analysis.shouldIntervene = this.shouldIntervene(session, analysis);

            if (analysis.shouldIntervene) {
                analysis.intervention = await this.generateIntervention(session, analysis);
            }

            await Logger.debug(`Code analysis completed for session ${sessionId}`, {
                changeType: analysis.changeType,
                errorsFound: analysis.syntaxErrors.length + analysis.logicErrors.length,
                shouldIntervene: analysis.shouldIntervene
            });

            return analysis;

        } catch (error) {
            await Logger.error(`Code analysis failed for session ${sessionId}`, { error: error.message });
            return {
                ...analysis,
                error: 'Analysis temporarily unavailable',
                shouldIntervene: false
            };
        }
    }

    async performAICodeAnalysis(codeChange, session) {
        const prompt = `
You are an expert programming tutor analyzing a student's code in real-time.

Student Profile: ${JSON.stringify(session.student)}
Current Problem: ${session.currentProblem?.title || 'Unknown'}
Problem Description: ${session.currentProblem?.description?.substring(0, 500) || 'N/A'}
Session Progress: ${JSON.stringify(session.progress)}

Code Change:
\`\`\`${codeChange.language || 'javascript'}
${codeChange.code}
\`\`\`

Previous Code (for context):
\`\`\`${codeChange.language || 'javascript'}
${codeChange.previousCode?.substring(-500) || '// No previous code'}
\`\`\`

Analyze this code change and provide:
1. Syntax errors (if any)
2. Logic errors or potential bugs
3. Code quality improvements
4. Next suggested steps
5. Encouraging feedback (use ${session.personality.tone} tone)

Respond with JSON:
{
    "syntaxErrors": [
        {
            "line": 5,
            "message": "Missing semicolon",
            "severity": "error|warning",
            "suggestion": "Add semicolon at end of line"
        }
    ],
    "logicErrors": [
        {
            "line": 10,
            "message": "Potential infinite loop",
            "explanation": "Loop condition never changes",
            "suggestion": "Update the loop variable inside the loop"
        }
    ],
    "improvements": [
        {
            "type": "performance|readability|best-practice",
            "message": "Consider using const instead of var",
            "line": 3,
            "explanation": "const prevents accidental reassignment"
        }
    ],
    "nextSteps": [
        "Try implementing the base case for recursion",
        "Add input validation",
        "Test with edge cases"
    ],
    "encouragement": "Great progress! Your algorithm structure is solid.",
    "progressAssessment": "The student is 60% through the problem",
    "confidenceLevel": 0.8,
    "estimatedTimeToCompletion": "10-15 minutes"
}
        `;

        return await this.aiService.generateWithRetries(prompt, `Code Analysis: ${session.sessionId}`);
    }

    shouldIntervene(session, analysis) {
        // Intervention logic
        const timeSinceStart = Date.now() - session.startTime;
        const timeSinceLastHint = session.hints.length > 0 ? 
            Date.now() - session.hints[session.hints.length - 1].timestamp : 
            timeSinceStart;

        // Intervene if:
        return (
            // Student is stuck (no progress for 2 minutes)
            timeSinceLastHint > 120000 ||
            
            // Critical errors detected
            analysis.syntaxErrors.some(e => e.severity === 'error') ||
            
            // Student seems frustrated (many deletions)
            session.codeHistory.slice(-5).filter(h => h.changeType === 'deletion').length >= 3 ||
            
            // Hints available and student would benefit
            (session.hintsUsed < this.config.maxHints && analysis.confidenceLevel < 0.3) ||
            
            // Logic error that prevents progress
            analysis.logicErrors.some(e => e.blocking === true)
        );
    }

    async generateIntervention(session, analysis) {
        const interventionType = this.determineInterventionType(session, analysis);
        
        const prompt = `
You are a ${session.personality.tone} programming tutor providing real-time help.

Student Context:
- Current problem: ${session.currentProblem?.title}
- Hints used: ${session.hintsUsed}/${this.config.maxHints}
- Time in session: ${Math.round((Date.now() - session.startTime) / 60000)} minutes
- Recent struggles: ${session.mistakes.slice(-3).map(m => m.type).join(', ')}

Current Code Issues:
${JSON.stringify({
    syntaxErrors: analysis.syntaxErrors,
    logicErrors: analysis.logicErrors,
    progressLevel: analysis.progressAssessment
})}

Intervention Type: ${interventionType}

Generate a helpful intervention using ${session.personality.style}:

{
    "message": "Personalized message to student",
    "type": "${interventionType}",
    "actionItems": ["specific step 1", "specific step 2"],
    "codeExample": "// Small code snippet if helpful (optional)",
    "explanation": "Why this approach works",
    "timeEstimate": "Expected time to implement",
    "followUp": "What to do after completing these steps"
}
        `;

        const intervention = await this.aiService.generateWithRetries(prompt, `Intervention: ${session.sessionId}`);
        
        // Record the intervention
        session.hints.push({
            timestamp: Date.now(),
            type: interventionType,
            message: intervention.message,
            used: false
        });
        
        session.hintsUsed++;
        
        return intervention;
    }

    determineInterventionType(session, analysis) {
        if (analysis.syntaxErrors.length > 0) return 'syntax_help';
        if (analysis.logicErrors.length > 0) return 'logic_guidance';
        if (session.progress.testsRun === 0) return 'testing_reminder';
        if (analysis.progressAssessment.includes('stuck')) return 'approach_suggestion';
        if (session.hintsUsed === 0) return 'gentle_hint';
        return 'encouragement';
    }

    async generateSessionStrategy(session) {
        const prompt = `
Create a personalized tutoring strategy for this coding session:

Student: ${JSON.stringify(session.student)}
Lesson: ${session.lesson.title}
Problem: ${session.currentProblem?.title}
Difficulty: ${session.difficulty}

Generate a tutoring plan:
{
    "teachingApproach": "How to guide this specific student",
    "anticipatedChallenges": ["challenge1", "challenge2"],
    "preparedHints": [
        {
            "trigger": "when to show this hint",
            "message": "hint content",
            "type": "conceptual|implementation|debugging"
        }
    ],
    "adaptationStrategies": [
        {
            "condition": "if student struggles with X",
            "action": "do Y"
        }
    ],
    "successMetrics": ["metric1", "metric2"]
}
        `;

        const strategy = await this.aiService.generateWithRetries(prompt, `Session Strategy: ${session.sessionId}`);
        session.strategy = strategy;
        session.preparedHints = strategy.preparedHints;
    }

    async generateWelcomeMessage(session) {
        const personality = session.personality;
        
        const welcomeOptions = [
            `${personality.phrases[0]} Ready to tackle "${session.currentProblem?.title}"? I'm here to help you succeed!`,
            `Welcome to your coding session! I'll be your AI mentor as you work through this challenge.`,
            `Let's dive into "${session.currentProblem?.title}" together. Remember, I'm here whenever you need guidance!`
        ];

        return welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];
    }

    updateSessionProgress(session, analysis) {
        if (analysis.changeType === 'addition') {
            session.progress.linesWritten += analysis.lineNumbers?.length || 1;
        }
        
        if (analysis.syntaxErrors.length === 0 && session.codeHistory.slice(-2)[0]?.syntaxErrors?.length > 0) {
            session.progress.errorsFixed++;
        }

        // Adaptive difficulty based on performance
        if (this.config.difficultyAdaptation) {
            this.adaptDifficulty(session, analysis);
        }
    }

    adaptDifficulty(session, analysis) {
        const recentPerformance = this.assessRecentPerformance(session);
        
        if (recentPerformance.tooEasy && session.difficulty !== 'hard') {
            session.adaptations.push({
                type: 'difficulty_increase',
                reason: 'Student performing well',
                timestamp: Date.now()
            });
        } else if (recentPerformance.tooHard && session.difficulty !== 'easy') {
            session.adaptations.push({
                type: 'difficulty_decrease',
                reason: 'Student struggling',
                timestamp: Date.now()
            });
        }
    }

    assessRecentPerformance(session) {
        const recent = session.codeHistory.slice(-10);
        const errorRate = recent.filter(h => h.syntaxErrors.length > 0 || h.logicErrors.length > 0).length / recent.length;
        const progressRate = recent.filter(h => h.progressAssessment?.includes('progress')).length / recent.length;

        return {
            tooEasy: errorRate < 0.1 && progressRate > 0.8,
            tooHard: errorRate > 0.7 || progressRate < 0.2,
            justRight: errorRate >= 0.1 && errorRate <= 0.3 && progressRate >= 0.4
        };
    }

    async endSession(sessionId) {
        const session = this.sessionData.get(sessionId);
        if (!session) return null;

        const sessionSummary = await this.generateSessionSummary(session);
        
        // Clean up session data
        this.sessionData.delete(sessionId);
        
        await Logger.info(`Session ${sessionId} completed`, {
            duration: Math.round((Date.now() - session.startTime) / 60000),
            hintsUsed: session.hintsUsed,
            linesWritten: session.progress.linesWritten
        });

        return sessionSummary;
    }

    async generateSessionSummary(session) {
        const duration = Math.round((Date.now() - session.startTime) / 60000);
        
        const prompt = `
Generate a personalized session summary for this coding session:

Session Data:
- Duration: ${duration} minutes
- Problem: ${session.currentProblem?.title}
- Hints used: ${session.hintsUsed}
- Progress: ${JSON.stringify(session.progress)}
- Mistakes made: ${session.mistakes.length}
- Adaptations: ${session.adaptations.length}

Create an encouraging summary that:
1. Highlights achievements
2. Identifies areas for improvement
3. Suggests next steps
4. Provides motivation for continued learning

Use ${session.personality.tone} tone.
        `;

        const summary = await this.aiService.generateWithRetries(prompt, `Session Summary: ${session.sessionId}`);
        
        return {
            ...summary,
            metrics: {
                duration,
                hintsUsed: session.hintsUsed,
                linesWritten: session.progress.linesWritten,
                errorsFixed: session.progress.errorsFixed,
                testsRun: session.progress.testsRun,
                testsPassed: session.progress.testsPassed
            },
            nextRecommendations: await this.generateNextSteps(session)
        };
    }

    async generateNextSteps(session) {
        // AI-powered recommendations for what to study next
        const recommendations = [];
        
        if (session.mistakes.filter(m => m.type === 'syntax').length > 2) {
            recommendations.push({
                type: 'skill_building',
                title: 'JavaScript Syntax Review',
                description: 'Practice basic syntax to reduce simple errors',
                estimatedTime: '30 minutes'
            });
        }
        
        if (session.progress.testsRun === 0) {
            recommendations.push({
                type: 'practice',
                title: 'Test-Driven Development',
                description: 'Learn to write and run tests effectively',
                estimatedTime: '45 minutes'
            });
        }

        return recommendations;
    }

    // Utility method for external integrations
    getSessionData(sessionId) {
        return this.sessionData.get(sessionId);
    }

    updatePersonality(sessionId, newPersonality) {
        const session = this.sessionData.get(sessionId);
        if (session && this.personalities[newPersonality]) {
            session.personality = this.personalities[newPersonality];
            return true;
        }
        return false;
    }
}

module.exports = { AISupervisor };