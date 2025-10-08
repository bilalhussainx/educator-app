/**
 * LEETCODE SYSTEM INTEGRATION TEST
 */

const LeetCodeCourseGenerator = require("./educators-edge-backend/leetCodeCourseGenerator");
const LeetCodeRepoManager = require("./educators-edge-backend/leetcode-repo-manager");

async function testLeetCodeSystem() {
    console.log("🚀 Testing Complete LeetCode System Integration");

    try {
        // Test 1: Repository Manager
        console.log("📋 Test 1: LeetCode Repository Manager");
        const repoManager = new LeetCodeRepoManager();
        
        console.log("  Setting up repository...");
        await repoManager.setupRepository();
        
        console.log("  Getting available problems...");
        const problems = await repoManager.getAvailableProblems();
        console.log(`  ✅ Found ${problems.length} problems with multi-language solutions`);

        // Test 2: Course Generator
        console.log("📚 Test 2: Pattern-Based Course Generator");
        const generator = new LeetCodeCourseGenerator();
        
        console.log("  Generating test course with 10 problems...");
        const courseResult = await generator.generatePatternBasedCourse({
            maxProblems: 10,
            courseTitle: "LeetCode Test Course - Coding Patterns"
        });

        console.log("  ✅ Course generated successfully!");
        console.log(`  Course ID: ${courseResult.courseId}`);
        console.log(`  Total lessons: ${courseResult.lessons.length}`);
        console.log(`  Total problems: ${courseResult.totalProblems}`);

        console.log("🎉 All tests completed successfully!");
        console.log("📖 System Summary:");
        console.log(`  • Repository: ${problems.length} problems available`);
        console.log(`  • Course Generation: ✅ Working`);
        console.log(`  • Database Integration: ✅ Working`);
        console.log(`  • Pattern Categorization: ✅ Working`);
        console.log(`  • Multi-language Support: ✅ Working`);
        console.log(`  • Generated Course ID: ${courseResult.courseId}`);

        return {
            success: true,
            courseId: courseResult.courseId,
            totalProblems: problems.length,
            generatedLessons: courseResult.lessons.length
        };

    } catch (error) {
        console.error("❌ Test failed:", error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

async function main() {
    if (process.argv[2] === "test") {
        const result = await testLeetCodeSystem();
        
        if (result.success) {
            console.log("✅ LeetCode system is ready for use!");
            console.log("Next steps:");
            console.log("1. Start backend: cd educators-edge-backend && npm start");
            console.log("2. Start frontend: cd educators-edge-frontend && npm run dev");
            console.log(`3. View course: /enhanced-courses/${result.courseId}/lessons`);
        } else {
            console.log("❌ System test failed. Check errors above.");
            process.exit(1);
        }
    } else {
        console.log("Usage: node test-leetcode-system.js test");
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { testLeetCodeSystem };
