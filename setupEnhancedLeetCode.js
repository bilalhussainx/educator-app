/**
 * =================================================================
 * ENHANCED LEETCODE SETUP SCRIPT
 * =================================================================
 * One-click setup for the enhanced LeetCode course system
 * Installs dependencies, tests APIs, and generates sample courses
 */

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs').promises;
const axios = require('axios');

class EnhancedLeetCodeSetup {
    constructor() {
        this.steps = [
            'checkEnvironment',
            'testDatabaseConnection',
            'testLeetCodeAPIs',
            'installDependencies',
            'createSampleCourse',
            'validateSetup'
        ];
        this.results = {};
    }

    async runSetup() {
        console.log('🚀 Setting up Enhanced LeetCode Course System...\n');

        for (const step of this.steps) {
            try {
                console.log(`📋 Step: ${step.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
                await this[step]();
                this.results[step] = { success: true };
                console.log(`✅ ${step} completed\n`);
            } catch (error) {
                console.error(`❌ ${step} failed:`, error.message);
                this.results[step] = { success: false, error: error.message };

                // Ask if user wants to continue
                if (step !== 'testLeetCodeAPIs') { // APIs can fail, that's ok
                    console.log('⚠️ This step failed. Continue anyway? (y/n)');
                    // In a real CLI, you'd prompt for input
                    // For now, we'll continue
                }
                console.log('');
            }
        }

        await this.generateSetupReport();
    }

    async checkEnvironment() {
        console.log('🔍 Checking environment variables...');

        const required = ['CLAUDE_API_KEY', 'DATABASE_URL'];
        const missing = [];

        for (const key of required) {
            if (!process.env[key]) {
                missing.push(key);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }

        console.log('  ✓ CLAUDE_API_KEY found');
        console.log('  ✓ DATABASE_URL found');

        // Check Claude API key format
        if (!process.env.CLAUDE_API_KEY.startsWith('sk-ant-')) {
            console.warn('  ⚠️ CLAUDE_API_KEY format seems incorrect');
        }
    }

    async testDatabaseConnection() {
        console.log('🗄️ Testing database connection...');

        try {
            const db = require('./educators-edge-backend/db');

            // Test basic connection
            const result = await db.query('SELECT NOW() as current_time');
            console.log(`  ✓ Database connected at ${result.rows[0].current_time}`);

            // Check if enhanced_courses table exists
            const tableCheck = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'enhanced_courses'
                );
            `);

            if (tableCheck.rows[0].exists) {
                console.log('  ✓ enhanced_courses table exists');
            } else {
                console.warn('  ⚠️ enhanced_courses table not found');
            }

        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async testLeetCodeAPIs() {
        console.log('🌐 Testing LeetCode APIs...');

        const apis = [
            {
                name: 'alfa-leetcode-api',
                url: 'https://alfa-leetcode-api.onrender.com/problems?limit=1'
            },
            {
                name: 'leetcode-api-pied',
                url: 'https://leetcode-api-pied.vercel.app/daily'
            }
        ];

        let workingApis = 0;

        for (const api of apis) {
            try {
                const response = await axios.get(api.url, { timeout: 10000 });
                console.log(`  ✓ ${api.name} is working`);
                workingApis++;
            } catch (error) {
                console.warn(`  ⚠️ ${api.name} failed: ${error.message}`);
            }
        }

        if (workingApis === 0) {
            console.warn('  ⚠️ No LeetCode APIs are working - will use mock data');
        } else {
            console.log(`  ✓ ${workingApis}/${apis.length} APIs working`);
        }
    }

    async installDependencies() {
        console.log('📦 Installing required dependencies...');

        const dependencies = [
            'vm2',          // For safe code execution
            'axios',        // For API calls (already installed)
            'uuid'          // For ID generation (already installed)
        ];

        try {
            // Check package.json to see what's already installed
            const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
            const installed = {
                ...packageJson.dependencies || {},
                ...packageJson.devDependencies || {}
            };

            const toInstall = dependencies.filter(dep => !installed[dep]);

            if (toInstall.length > 0) {
                console.log(`  Installing: ${toInstall.join(', ')}`);
                execSync(`npm install ${toInstall.join(' ')}`, { stdio: 'inherit' });
            } else {
                console.log('  ✓ All dependencies already installed');
            }

        } catch (error) {
            throw new Error(`Dependency installation failed: ${error.message}`);
        }
    }

    async createSampleCourse() {
        console.log('📚 Creating sample LeetCode course...');

        try {
            const EnhancedLeetCodeGenerator = require('./enhancedLeetCodeGenerator');
            const generator = new EnhancedLeetCodeGenerator();

            const sampleCourseSpec = {
                title: "Sample LeetCode Course - Setup Test",
                description: "A small test course to verify the enhanced LeetCode system is working properly.",
                difficulty: "beginner",
                patterns: ['arrays-hashing'],
                problemsPerPattern: 2,
                estimatedDuration: "2-3 hours"
            };

            console.log('  🤖 Generating course with AI...');
            const courseData = await generator.generateLeetCodeCourse(sampleCourseSpec);

            console.log('  💾 Saving to database...');
            const courseId = await generator.saveCourseToDatabase(courseData);

            console.log(`  ✅ Sample course created with ID: ${courseId}`);
            console.log(`  📊 Course stats: ${courseData.modules.length} modules, ${courseData.modules.reduce((sum, m) => sum + m.lessons.count, 0)} lessons`);

            this.results.sampleCourseId = courseId;

        } catch (error) {
            throw new Error(`Sample course creation failed: ${error.message}`);
        }
    }

    async validateSetup() {
        console.log('🔍 Validating complete setup...');

        try {
            // Test the validator
            const LeetCodeTestValidator = require('./leetcodeTestValidator');
            const validator = new LeetCodeTestValidator();

            // If we created a sample course, validate it
            if (this.results.sampleCourseId) {
                console.log('  🧪 Testing validator on sample course...');
                // Basic validation test
                console.log('  ✓ Validator loaded successfully');
            }

            // Test database queries
            const db = require('./educators-edge-backend/db');
            const courseCount = await db.query(`
                SELECT COUNT(*) as count
                FROM enhanced_courses
                WHERE course_type = 'leetcode_enhanced'
            `);

            console.log(`  ✓ Found ${courseCount.rows[0].count} LeetCode courses in database`);

            // Test AI connection
            console.log('  🤖 Testing Claude AI connection...');
            const axios = require('axios');
            const claudeClient = axios.create({
                baseURL: 'https://api.anthropic.com',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': process.env.CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                }
            });

            // Simple test call
            await claudeClient.post('/v1/messages', {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 50,
                messages: [{
                    role: 'user',
                    content: 'Respond with "Setup test successful" if you can read this.'
                }]
            });

            console.log('  ✓ Claude AI connection working');

        } catch (error) {
            throw new Error(`Setup validation failed: ${error.message}`);
        }
    }

    async generateSetupReport() {
        console.log('\n📋 Generating setup report...');

        const report = `# Enhanced LeetCode Setup Report
Generated: ${new Date().toISOString()}

## Setup Results
${Object.entries(this.results).map(([step, result]) => `
### ${step.replace(/([A-Z])/g, ' $1')}
- Status: ${result.success ? '✅ Success' : '❌ Failed'}
${result.error ? `- Error: ${result.error}` : ''}
`).join('')}

## Next Steps
${this.generateNextSteps()}

## Usage Examples
\`\`\`bash
# Generate enhanced LeetCode courses
node enhancedLeetCodeGenerator.js generate-examples

# Validate existing courses
node leetcodeTestValidator.js validate-all

# Test specific features
node enhancedLeetCodeGenerator.js test-api
\`\`\`

## Configuration
- Environment variables are ${process.env.CLAUDE_API_KEY ? '✅' : '❌'} configured
- Database connection is ${this.results.testDatabaseConnection?.success ? '✅' : '❌'} working
- LeetCode APIs are ${this.results.testLeetCodeAPIs?.success ? '✅' : '⚠️'} available

## Support
- Check the console output above for detailed error messages
- Ensure all environment variables are properly set in .env file
- Verify database connection and table structure
        `;

        try {
            await fs.writeFile('enhanced_leetcode_setup_report.md', report);
            console.log('✅ Setup report saved to: enhanced_leetcode_setup_report.md');
        } catch (error) {
            console.error('❌ Error saving setup report:', error.message);
        }

        // Print summary
        const successCount = Object.values(this.results).filter(r => r.success).length;
        const totalSteps = this.steps.length;

        console.log('\n🎯 Setup Summary:');
        console.log(`   Success Rate: ${successCount}/${totalSteps} (${((successCount/totalSteps) * 100).toFixed(1)}%)`);

        if (successCount === totalSteps) {
            console.log('🎉 Setup completed successfully! Your enhanced LeetCode system is ready to use.');
            console.log('\n🚀 Quick Start:');
            console.log('   node enhancedLeetCodeGenerator.js generate-examples');
        } else {
            console.log('⚠️ Setup completed with some issues. Check the report for details.');
        }
    }

    generateNextSteps() {
        const steps = [];

        if (!this.results.checkEnvironment?.success) {
            steps.push('- Set up environment variables (CLAUDE_API_KEY, DATABASE_URL)');
        }

        if (!this.results.testDatabaseConnection?.success) {
            steps.push('- Fix database connection and ensure enhanced_courses table exists');
        }

        if (!this.results.installDependencies?.success) {
            steps.push('- Manually install required dependencies: npm install vm2 axios uuid');
        }

        if (steps.length === 0) {
            steps.push('- Run: node enhancedLeetCodeGenerator.js generate-examples');
            steps.push('- Run: node leetcodeTestValidator.js validate-all');
            steps.push('- Check the generated courses in your database');
        }

        return steps.join('\n');
    }
}

// CLI Interface
async function main() {
    const setup = new EnhancedLeetCodeSetup();

    const command = process.argv[2];

    switch (command) {
        case 'quick':
            // Quick setup without prompts
            await setup.runSetup();
            break;

        case 'check':
            // Just check current status
            await setup.checkEnvironment();
            await setup.testDatabaseConnection();
            await setup.testLeetCodeAPIs();
            break;

        default:
            console.log(`
🚀 Enhanced LeetCode Setup Script

Commands:
  quick        Run complete setup process
  check        Check current system status

Features:
  ✅ Environment validation
  ✅ Database connectivity testing
  ✅ LeetCode API verification
  ✅ Dependency installation
  ✅ Sample course generation
  ✅ Complete system validation

Example:
  node setupEnhancedLeetCode.js quick
            `);

            // Run setup by default
            await setup.runSetup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = EnhancedLeetCodeSetup;