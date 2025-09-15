const express = require('express');
const router = express.Router();
const vmExecutionService = require('../services/vmExecutionService');

/**
 * Execute code and validate against test cases
 * POST /api/vm-execution/validate
 */
router.post('/validate', async (req, res) => {
    try {
        const {
            code,
            testCases,
            language = 'javascript',
            timeout = 5000
        } = req.body;

        // Validate required fields
        if (!code) {
            return res.status(400).json({
                error: 'Code is required',
                success: false
            });
        }

        if (!testCases || !Array.isArray(testCases)) {
            return res.status(400).json({
                error: 'Test cases must be provided as an array',
                success: false
            });
        }

        console.log('🖥️ [VM_API] Code validation request:', {
            language,
            codeLength: code.length,
            testCaseCount: testCases.length,
            timeout
        });

        // Execute code validation
        const result = await vmExecutionService.executeAndValidate(
            code,
            testCases,
            language,
            { timeout }
        );

        // Add request metadata
        result.requestId = Date.now().toString();
        result.timestamp = new Date().toISOString();

        console.log('✅ [VM_API] Validation completed:', {
            success: result.success,
            passed: result.passed,
            failed: result.failed,
            executionTime: result.totalExecutionTime
        });

        res.json(result);

    } catch (error) {
        console.error('❌ [VM_API] Validation failed:', error);

        res.status(500).json({
            error: 'Code validation failed',
            details: error.message,
            success: false,
            passed: 0,
            failed: 0,
            total: 0,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Quick syntax check without test validation
 * POST /api/vm-execution/syntax-check
 */
router.post('/syntax-check', async (req, res) => {
    try {
        const { code, language = 'javascript' } = req.body;

        if (!code) {
            return res.status(400).json({
                error: 'Code is required',
                valid: false
            });
        }

        console.log('🔍 [VM_API] Syntax check request:', {
            language,
            codeLength: code.length
        });

        let result = { valid: true, language };

        if (language === 'javascript') {
            try {
                const vm = require('vm');
                const context = vm.createContext({});
                vm.runInContext(code, context, {
                    timeout: 1000,
                    displayErrors: true
                });
                result.message = 'JavaScript syntax is valid';
            } catch (syntaxError) {
                result.valid = false;
                result.error = syntaxError.message;
                result.message = 'JavaScript syntax error detected';
            }
        } else {
            result.message = `Syntax checking for ${language} not implemented yet`;
        }

        res.json(result);

    } catch (error) {
        console.error('❌ [VM_API] Syntax check failed:', error);
        res.status(500).json({
            error: 'Syntax check failed',
            details: error.message,
            valid: false
        });
    }
});

/**
 * Get service health status
 * GET /api/vm-execution/health
 */
router.get('/health', (req, res) => {
    try {
        const health = vmExecutionService.healthCheck();
        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Get supported languages
 * GET /api/vm-execution/languages
 */
router.get('/languages', (req, res) => {
    res.json({
        supported: [
            {
                name: 'JavaScript',
                id: 'javascript',
                aliases: ['js'],
                status: 'fully_supported',
                features: ['syntax_check', 'test_validation', 'secure_execution']
            },
            {
                name: 'Python',
                id: 'python',
                aliases: ['py'],
                status: 'fully_supported',
                features: ['test_validation', 'secure_execution'],
                requirements: 'Python interpreter must be installed'
            },
            {
                name: 'Java',
                id: 'java',
                status: 'planned',
                features: ['test_validation'],
                requirements: 'Java SDK required'
            }
        ],
        default: 'javascript'
    });
});

module.exports = router;