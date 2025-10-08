/**
 * 🧪 TEST RUNNER - Easy way to run Revolutionary Vision tests
 * Import this file to enable testing functions in console
 */

import RevolutionaryVisionIntegrationTester from './revolutionaryVisionIntegrationTest';
import RevolutionaryVisionPhase1Tester from './revolutionaryVisionPhase1Test';

console.log('🧪 REVOLUTIONARY VISION TEST RUNNER LOADED');
console.log('='.repeat(60));

/**
 * 🚀 QUICK TEST - Run this to verify the system is working
 */
export async function runQuickTest() {
    console.log('⚡ Running quick Revolutionary Vision test...');
    const tester = new RevolutionaryVisionIntegrationTester();
    await tester.runQuickTest();
}

/**
 * 📊 FULL INTEGRATION TEST - Run this for complete before/after comparison
 */
export async function runIntegrationTest() {
    console.log('📊 Running full Revolutionary Vision integration test...');
    const tester = new RevolutionaryVisionIntegrationTester();
    return await tester.runBeforeAfterTest();
}

/**
 * 🔧 PHASE 1 TEST - Run this to test all Phase 1 components
 */
export async function runPhase1Test() {
    console.log('🔧 Running Phase 1 comprehensive test...');
    const tester = new RevolutionaryVisionPhase1Tester();
    return await tester.runComprehensivePhase1Tests();
}

/**
 * 🎯 TEST ALL - Run all tests
 */
export async function runAllTests() {
    console.log('🎯 Running ALL Revolutionary Vision tests...');
    console.log('This may take a few minutes...\n');

    try {
        // Phase 1 Test
        console.log('1️⃣ Running Phase 1 tests...');
        const phase1Results = await runPhase1Test();

        // Integration Test
        console.log('\n2️⃣ Running integration tests...');
        const integrationResults = await runIntegrationTest();

        // Quick Test
        console.log('\n3️⃣ Running quick verification...');
        await runQuickTest();

        console.log('\n🎉 ALL TESTS COMPLETED!');
        console.log('📊 Check console output above for detailed results.');

        return {
            phase1: phase1Results,
            integration: integrationResults,
            allTestsPassed: phase1Results.overallSuccess && integrationResults.improvements
        };

    } catch (error) {
        console.error('❌ Test suite failed:', error);
        return { error: error.message };
    }
}

// Make functions available globally for console access
(window as any).runQuickTest = runQuickTest;
(window as any).runIntegrationTest = runIntegrationTest;
(window as any).runPhase1Test = runPhase1Test;
(window as any).runAllTests = runAllTests;

// Log instructions
console.log('📋 Available test functions:');
console.log('   ⚡ runQuickTest()        - Quick verification (30 seconds)');
console.log('   📊 runIntegrationTest() - Full before/after test (1 minute)');
console.log('   🔧 runPhase1Test()      - Phase 1 component test (2 minutes)');
console.log('   🎯 runAllTests()        - Complete test suite (5 minutes)');
console.log('');
console.log('💡 RECOMMENDED: Start with runQuickTest() to verify everything works!');
console.log('='.repeat(60));

export default {
    runQuickTest,
    runIntegrationTest,
    runPhase1Test,
    runAllTests
};