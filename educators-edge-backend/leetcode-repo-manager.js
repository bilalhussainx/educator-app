/**
 * =================================================================
 * LEETCODE REPOSITORY MANAGER
 * =================================================================
 * Clones and manages LeetCode repositories for real IDE integration
 * Uses actual LeetCode solutions from GitHub repositories
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class LeetCodeRepoManager {
    constructor() {
        this.repoUrl = 'https://github.com/neetcode-gh/leetcode.git';
        this.repoPath = path.join(__dirname, 'leetcode-solutions');
        this.supportedLanguages = ['javascript', 'python', 'java'];
    }

    /**
     * Clone or update LeetCode repository
     */
    async setupRepository() {
        console.log('🔄 Setting up LeetCode repository...');
        
        try {
            // Check if repo already exists
            const repoExists = await this.checkRepoExists();
            
            if (repoExists) {
                console.log('📂 Repository exists, updating...');
                await this.updateRepository();
            } else {
                console.log('📥 Cloning LeetCode repository...');
                await this.cloneRepository();
            }
            
            console.log('✅ Repository setup complete!');
            return true;
        } catch (error) {
            console.error('❌ Repository setup failed:', error.message);
            throw error;
        }
    }

    /**
     * Check if repository exists
     */
    async checkRepoExists() {
        try {
            await fs.access(this.repoPath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Clone the repository
     */
    async cloneRepository() {
        try {
            await execAsync(`git clone ${this.repoUrl} ${this.repoPath}`);
            console.log('✅ Repository cloned successfully');
        } catch (error) {
            console.error('❌ Failed to clone repository:', error.message);
            throw error;
        }
    }

    /**
     * Update existing repository
     */
    async updateRepository() {
        try {
            await execAsync('git pull origin main', { cwd: this.repoPath });
            console.log('✅ Repository updated successfully');
        } catch (error) {
            console.error('❌ Failed to update repository:', error.message);
            throw error;
        }
    }

    /**
     * Get all available problems across languages
     */
    async getAvailableProblems() {
        console.log('📋 Scanning available problems...');
        
        const problems = new Map();
        
        for (const language of this.supportedLanguages) {
            const languagePath = path.join(this.repoPath, language);
            
            try {
                const files = await fs.readdir(languagePath);
                const problemFiles = files.filter(file => file.endsWith(this.getFileExtension(language)));
                
                console.log(`📁 Found ${problemFiles.length} ${language} solutions`);
                
                for (const file of problemFiles) {
                    const problemInfo = this.parseProblemFileName(file);
                    if (problemInfo) {
                        const key = problemInfo.number;
                        if (!problems.has(key)) {
                            problems.set(key, {
                                number: problemInfo.number,
                                title: problemInfo.title,
                                languages: new Map()
                            });
                        }
                        problems.get(key).languages.set(language, {
                            fileName: file,
                            filePath: path.join(languagePath, file)
                        });
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Could not read ${language} directory:`, error.message);
            }
        }
        
        // Convert to array and sort by problem number
        const problemsArray = Array.from(problems.values())
            .filter(p => p.languages.size >= 2) // Only include problems with multiple language solutions
            .sort((a, b) => parseInt(a.number) - parseInt(b.number));
        
        console.log(`✅ Found ${problemsArray.length} problems with multi-language solutions`);
        return problemsArray;
    }

    /**
     * Get file extension for language
     */
    getFileExtension(language) {
        const extensions = {
            'javascript': '.js',
            'python': '.py',
            'java': '.java'
        };
        return extensions[language];
    }

    /**
     * Parse problem file name to extract number and title
     */
    parseProblemFileName(fileName) {
        // Format: 0001-two-sum.js
        const match = fileName.match(/^(\d{4})-(.+)\.[a-z]+$/);
        if (match) {
            return {
                number: match[1],
                title: match[2].replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            };
        }
        return null;
    }

    /**
     * Read solution code for a specific problem and language
     */
    async getSolutionCode(problemNumber, language) {
        try {
            const problems = await this.getAvailableProblems();
            const problem = problems.find(p => p.number === problemNumber);
            
            if (!problem || !problem.languages.has(language)) {
                throw new Error(`Solution not found for problem ${problemNumber} in ${language}`);
            }
            
            const filePath = problem.languages.get(language).filePath;
            const code = await fs.readFile(filePath, 'utf-8');
            
            return {
                code,
                fileName: problem.languages.get(language).fileName,
                title: problem.title
            };
        } catch (error) {
            console.error(`❌ Error reading solution for ${problemNumber} in ${language}:`, error.message);
            throw error;
        }
    }

    /**
     * Create starter code from solution (remove implementation, keep structure)
     */
    createStarterCode(solutionCode, language) {
        if (language === 'javascript') {
            return this.createJavaScriptStarterCode(solutionCode);
        } else if (language === 'python') {
            return this.createPythonStarterCode(solutionCode);
        } else if (language === 'java') {
            return this.createJavaStarterCode(solutionCode);
        }
        return solutionCode;
    }

    /**
     * Create JavaScript starter code
     */
    createJavaScriptStarterCode(solutionCode) {
        // Find function definitions and replace implementation with TODO
        const lines = solutionCode.split('\n');
        const starterLines = [];
        let inFunction = false;
        let braceCount = 0;
        
        for (const line of lines) {
            if (line.includes('function ') || line.includes('var ') || line.includes('const ') || line.includes('let ')) {
                starterLines.push(line);
                if (line.includes('{')) {
                    inFunction = true;
                    braceCount = 1;
                    starterLines.push('    // TODO: Implement solution');
                }
            } else if (inFunction) {
                // Count braces to find end of function
                braceCount += (line.match(/\{/g) || []).length;
                braceCount -= (line.match(/\}/g) || []).length;
                
                if (braceCount === 0) {
                    starterLines.push('}');
                    starterLines.push('');
                    inFunction = false;
                }
            } else if (!inFunction && (line.trim().startsWith('//') || line.trim() === '')) {
                // Keep comments and empty lines
                starterLines.push(line);
            }
        }
        
        return starterLines.join('\n');
    }

    /**
     * Create Python starter code
     */
    createPythonStarterCode(solutionCode) {
        const lines = solutionCode.split('\n');
        const starterLines = [];
        let inFunction = false;
        let indentLevel = 0;
        
        for (const line of lines) {
            if (line.trim().startsWith('def ') || line.trim().startsWith('class ')) {
                starterLines.push(line);
                inFunction = true;
                indentLevel = line.search(/\S/);
                starterLines.push(' '.repeat(indentLevel + 4) + '# TODO: Implement solution');
                starterLines.push(' '.repeat(indentLevel + 4) + 'pass');
            } else if (inFunction && line.trim() && line.search(/\S/) <= indentLevel) {
                // End of function/class
                starterLines.push('');
                starterLines.push(line);
                inFunction = false;
            } else if (!inFunction && (line.trim().startsWith('#') || line.trim() === '')) {
                // Keep comments and empty lines
                starterLines.push(line);
            }
        }
        
        return starterLines.join('\n');
    }

    /**
     * Create Java starter code
     */
    createJavaStarterCode(solutionCode) {
        const lines = solutionCode.split('\n');
        const starterLines = [];
        let inMethod = false;
        let braceCount = 0;
        
        for (const line of lines) {
            if (line.includes('public ') || line.includes('private ') || line.includes('protected ')) {
                starterLines.push(line);
                if (line.includes('{')) {
                    inMethod = true;
                    braceCount = 1;
                    starterLines.push('        // TODO: Implement solution');
                }
            } else if (inMethod) {
                braceCount += (line.match(/\{/g) || []).length;
                braceCount -= (line.match(/\}/g) || []).length;
                
                if (braceCount === 0) {
                    starterLines.push('    }');
                    starterLines.push('');
                    inMethod = false;
                }
            } else if (!inMethod && (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim() === '' || line.includes('class ') || line.includes('import '))) {
                // Keep comments, imports, class definitions, and empty lines
                starterLines.push(line);
            }
        }
        
        return starterLines.join('\n');
    }

    /**
     * Get problem statistics
     */
    async getStatistics() {
        const problems = await this.getAvailableProblems();
        
        const stats = {
            totalProblems: problems.length,
            languageCoverage: {},
            difficultyDistribution: {
                easy: 0,
                medium: 0,
                hard: 0
            }
        };
        
        // Count language coverage
        for (const language of this.supportedLanguages) {
            stats.languageCoverage[language] = problems.filter(p => p.languages.has(language)).length;
        }
        
        console.log('📊 Repository Statistics:');
        console.log(`   Total Problems: ${stats.totalProblems}`);
        console.log(`   JavaScript: ${stats.languageCoverage.javascript}`);
        console.log(`   Python: ${stats.languageCoverage.python}`);
        console.log(`   Java: ${stats.languageCoverage.java}`);
        
        return stats;
    }
}

// CLI Interface
async function main() {
    const manager = new LeetCodeRepoManager();
    const command = process.argv[2];
    
    try {
        switch (command) {
            case 'setup':
                await manager.setupRepository();
                break;
                
            case 'scan':
                await manager.setupRepository();
                await manager.getStatistics();
                break;
                
            case 'test':
                await manager.setupRepository();
                const problems = await manager.getAvailableProblems();
                console.log('🧪 Testing problem access...');
                
                if (problems.length > 0) {
                    const testProblem = problems[0];
                    console.log(`Testing problem: ${testProblem.number} - ${testProblem.title}`);
                    
                    for (const language of ['javascript', 'python', 'java']) {
                        if (testProblem.languages.has(language)) {
                            const solution = await manager.getSolutionCode(testProblem.number, language);
                            const starter = manager.createStarterCode(solution.code, language);
                            console.log(`✅ ${language}: ${solution.code.length} chars solution, ${starter.length} chars starter`);
                        }
                    }
                }
                break;
                
            default:
                console.log(`
🚀 LeetCode Repository Manager

Commands:
  setup    Clone/update LeetCode repository
  scan     Setup and show statistics  
  test     Test problem access and code generation

Examples:
  node leetcode-repo-manager.js setup
  node leetcode-repo-manager.js scan
  node leetcode-repo-manager.js test
                `);
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = LeetCodeRepoManager;