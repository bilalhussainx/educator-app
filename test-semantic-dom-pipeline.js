/**
 * Test Script for Complete Semantic JSON DOM Pipeline
 * Tests the multi-model Azure approach with robust formatting detection
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

class SemanticDOMPipelineTest {
    constructor() {
        this.baseURL = process.env.TEST_BASE_URL || 'http://localhost:5000';
        this.testResults = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: {
                total: 0,
                passed: 0,
                failed: 0,
                duration: 0
            }
        };
    }

    /**
     * Run complete test suite
     */
    async runTests() {
        console.log('🚀 Starting Semantic DOM Pipeline Test Suite...');
        const startTime = Date.now();

        try {
            // Test 1: Health Check
            await this.testHealthCheck();

            // Test 2: Capabilities Check
            await this.testCapabilities();

            // Test 3: Document Processing (if test files available)
            await this.testDocumentProcessing();

            // Test 4: Error Handling
            await this.testErrorHandling();

            // Test 5: Performance Testing
            await this.testPerformance();

        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }

        this.testResults.summary.duration = Date.now() - startTime;
        this.generateTestReport();
    }

    /**
     * Test 1: Health Check
     */
    async testHealthCheck() {
        console.log('\n📋 Test 1: Health Check');

        try {
            const response = await fetch(`${this.baseURL}/api/semantic-dom/health`);
            const data = await response.json();

            const test = {
                name: 'Health Check',
                status: 'passed',
                details: {
                    responseStatus: response.status,
                    serviceStatus: data.status,
                    features: data.features,
                    azureConfigured: !data.warnings
                }
            };

            if (response.status !== 200 || !data.success) {
                test.status = 'failed';
                test.error = 'Health check failed';
            }

            this.addTestResult(test);
            console.log(`✅ Health check: ${data.status}`);

        } catch (error) {
            this.addTestResult({
                name: 'Health Check',
                status: 'failed',
                error: error.message
            });
            console.log('❌ Health check failed:', error.message);
        }
    }

    /**
     * Test 2: Capabilities Check
     */
    async testCapabilities() {
        console.log('\n📋 Test 2: Capabilities Check');

        try {
            const response = await fetch(`${this.baseURL}/api/semantic-dom/capabilities`);
            const data = await response.json();

            const test = {
                name: 'Capabilities Check',
                status: 'passed',
                details: {
                    responseStatus: response.status,
                    hasMultiModel: !!data.systemCapabilities?.documentIntelligence?.multiModelApproach,
                    hasFormatting: !!data.systemCapabilities?.documentIntelligence?.formattingDetection,
                    supportedFormats: data.technicalSpecs?.supportedFormats || [],
                    apiEndpoints: data.apiEndpoints?.length || 0
                }
            };

            if (response.status !== 200 || !data.success) {
                test.status = 'failed';
                test.error = 'Capabilities check failed';
            }

            this.addTestResult(test);
            console.log(`✅ Capabilities: ${data.apiEndpoints?.length || 0} endpoints available`);

        } catch (error) {
            this.addTestResult({
                name: 'Capabilities Check',
                status: 'failed',
                error: error.message
            });
            console.log('❌ Capabilities check failed:', error.message);
        }
    }

    /**
     * Test 3: Document Processing
     */
    async testDocumentProcessing() {
        console.log('\n📋 Test 3: Document Processing');

        // Create a simple test document programmatically
        const testDocument = await this.createTestDocument();

        if (!testDocument) {
            this.addTestResult({
                name: 'Document Processing',
                status: 'skipped',
                reason: 'No test document available'
            });
            console.log('⏭️ Document processing test skipped - no test file');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('document', testDocument.buffer, {
                filename: testDocument.filename,
                contentType: testDocument.mimeType
            });

            const response = await fetch(`${this.baseURL}/api/semantic-dom/generate`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer test-token', // You'll need to implement auth
                    ...formData.getHeaders()
                },
                body: formData
            });

            const data = await response.json();

            const test = {
                name: 'Document Processing',
                status: 'passed',
                details: {
                    responseStatus: response.status,
                    processingTime: data.metadata?.processingTime,
                    elementsFound: data.semanticDOM?.metadata?.document?.totalElements,
                    hierarchyElements: data.semanticDOM?.content?.hierarchy?.length,
                    bulletPoints: data.semanticDOM?.content?.bulletPoints?.length,
                    confidence: data.semanticDOM?.quality?.overall,
                    htmlGenerated: !!data.htmlContent,
                    cssGenerated: !!data.cssStyles
                }
            };

            if (response.status !== 200 || !data.success) {
                test.status = 'failed';
                test.error = data.error || 'Processing failed';
            }

            this.addTestResult(test);

            if (test.status === 'passed') {
                console.log(`✅ Document processed: ${test.details.elementsFound} elements found`);
                console.log(`   Confidence: ${Math.round((test.details.confidence || 0) * 100)}%`);
            } else {
                console.log(`❌ Document processing failed: ${test.error}`);
            }

        } catch (error) {
            this.addTestResult({
                name: 'Document Processing',
                status: 'failed',
                error: error.message
            });
            console.log('❌ Document processing failed:', error.message);
        }
    }

    /**
     * Test 4: Error Handling
     */
    async testErrorHandling() {
        console.log('\n📋 Test 4: Error Handling');

        const errorTests = [
            {
                name: 'No File Upload',
                test: async () => {
                    const response = await fetch(`${this.baseURL}/api/semantic-dom/generate`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer test-token',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({})
                    });
                    return { response, expectedStatus: 400 };
                }
            },
            {
                name: 'Invalid File Type',
                test: async () => {
                    const formData = new FormData();
                    formData.append('document', Buffer.from('test'), {
                        filename: 'test.txt',
                        contentType: 'text/plain'
                    });

                    const response = await fetch(`${this.baseURL}/api/semantic-dom/generate`, {
                        method: 'POST',
                        headers: {
                            'Authorization': 'Bearer test-token',
                            ...formData.getHeaders()
                        },
                        body: formData
                    });
                    return { response, expectedStatus: 400 };
                }
            },
            {
                name: 'No Authentication',
                test: async () => {
                    const response = await fetch(`${this.baseURL}/api/semantic-dom/generate`, {
                        method: 'POST'
                    });
                    return { response, expectedStatus: 401 };
                }
            }
        ];

        for (const errorTest of errorTests) {
            try {
                const { response, expectedStatus } = await errorTest.test();
                const data = await response.json();

                const test = {
                    name: `Error Handling - ${errorTest.name}`,
                    status: response.status === expectedStatus ? 'passed' : 'failed',
                    details: {
                        expectedStatus,
                        actualStatus: response.status,
                        errorMessage: data.error
                    }
                };

                this.addTestResult(test);

                if (test.status === 'passed') {
                    console.log(`✅ ${errorTest.name}: Correctly returned ${response.status}`);
                } else {
                    console.log(`❌ ${errorTest.name}: Expected ${expectedStatus}, got ${response.status}`);
                }

            } catch (error) {
                this.addTestResult({
                    name: `Error Handling - ${errorTest.name}`,
                    status: 'failed',
                    error: error.message
                });
                console.log(`❌ ${errorTest.name} test failed:`, error.message);
            }
        }
    }

    /**
     * Test 5: Performance Testing
     */
    async testPerformance() {
        console.log('\n📋 Test 5: Performance Testing');

        const performanceTest = {
            name: 'Performance Test',
            status: 'passed',
            details: {
                healthCheckTime: 0,
                capabilitiesTime: 0,
                averageResponseTime: 0
            }
        };

        try {
            // Test health check response time
            const healthStart = Date.now();
            await fetch(`${this.baseURL}/api/semantic-dom/health`);
            performanceTest.details.healthCheckTime = Date.now() - healthStart;

            // Test capabilities response time
            const capabilitiesStart = Date.now();
            await fetch(`${this.baseURL}/api/semantic-dom/capabilities`);
            performanceTest.details.capabilitiesTime = Date.now() - capabilitiesStart;

            performanceTest.details.averageResponseTime =
                (performanceTest.details.healthCheckTime + performanceTest.details.capabilitiesTime) / 2;

            // Performance thresholds
            const maxHealthTime = 1000; // 1 second
            const maxCapabilitiesTime = 2000; // 2 seconds

            if (performanceTest.details.healthCheckTime > maxHealthTime ||
                performanceTest.details.capabilitiesTime > maxCapabilitiesTime) {
                performanceTest.status = 'failed';
                performanceTest.error = 'Response times exceeded thresholds';
            }

            this.addTestResult(performanceTest);

            if (performanceTest.status === 'passed') {
                console.log(`✅ Performance: Avg response time ${performanceTest.details.averageResponseTime}ms`);
            } else {
                console.log(`❌ Performance: Response times too slow`);
            }

        } catch (error) {
            performanceTest.status = 'failed';
            performanceTest.error = error.message;
            this.addTestResult(performanceTest);
            console.log('❌ Performance test failed:', error.message);
        }
    }

    /**
     * Create a simple test document for testing
     */
    async createTestDocument() {
        // Create a simple HTML document that can be converted to PDF
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Test Resume</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { font-size: 24px; font-weight: bold; }
        h2 { font-size: 18px; font-weight: bold; margin-top: 20px; }
        ul { margin: 10px 0; }
        li { margin-bottom: 5px; }
    </style>
</head>
<body>
    <h1>John Doe</h1>
    <p>Software Engineer | john.doe@email.com | (555) 123-4567</p>

    <h2>Experience</h2>
    <ul>
        <li>Developed web applications using React and Node.js</li>
        <li>Implemented automated testing frameworks</li>
        <li>Led team of 5 developers on multiple projects</li>
    </ul>

    <h2>Education</h2>
    <ul>
        <li>Bachelor of Science in Computer Science</li>
        <li>University of Technology, 2020</li>
    </ul>

    <h2>Skills</h2>
    <ul>
        <li>JavaScript, Python, Java</li>
        <li>React, Node.js, Express</li>
        <li>MongoDB, PostgreSQL</li>
    </ul>
</body>
</html>`;

        return {
            buffer: Buffer.from(htmlContent),
            filename: 'test-resume.html',
            mimeType: 'text/html'
        };
    }

    /**
     * Add test result to collection
     */
    addTestResult(test) {
        this.testResults.tests.push(test);
        this.testResults.summary.total++;

        if (test.status === 'passed') {
            this.testResults.summary.passed++;
        } else if (test.status === 'failed') {
            this.testResults.summary.failed++;
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        console.log('\n📊 Test Results Summary');
        console.log('====================================');
        console.log(`Total Tests: ${this.testResults.summary.total}`);
        console.log(`Passed: ${this.testResults.summary.passed}`);
        console.log(`Failed: ${this.testResults.summary.failed}`);
        console.log(`Duration: ${this.testResults.summary.duration}ms`);
        console.log(`Success Rate: ${Math.round((this.testResults.summary.passed / this.testResults.summary.total) * 100)}%`);

        // Detailed results
        console.log('\n📋 Detailed Results:');
        this.testResults.tests.forEach((test, index) => {
            const status = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
            console.log(`${index + 1}. ${status} ${test.name}`);

            if (test.error) {
                console.log(`   Error: ${test.error}`);
            }

            if (test.details) {
                console.log(`   Details:`, test.details);
            }
        });

        // Save detailed report to file
        const reportPath = path.join(__dirname, 'semantic-dom-test-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);

        // Overall result
        if (this.testResults.summary.failed === 0) {
            console.log('\n🎉 All tests passed! Semantic DOM pipeline is working correctly.');
        } else {
            console.log(`\n⚠️ ${this.testResults.summary.failed} test(s) failed. Please check the details above.`);
        }
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    const tester = new SemanticDOMPipelineTest();
    tester.runTests().catch(console.error);
}

module.exports = SemanticDOMPipelineTest;