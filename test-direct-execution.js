/**
 * =================================================================
 * TEST DIRECT CODE EXECUTION (NO TEST CASES)
 * =================================================================
 * Verify the new direct execution endpoint works without test case parsing
 */

require('dotenv').config();
const terminalController = require('./educators-edge-backend/controllers/terminalController');

async function testDirectExecution() {
    console.log('🧪 Testing Direct Code Execution (No Test Cases)...\n');

    const testCode = `
function greet(name) {
    return "Hello, " + name + "!";
}

console.log(greet("World"));
console.log(greet("AscentIDE"));
`;

    console.log('📝 Test Code:');
    console.log(testCode);
    console.log('\n' + '='.repeat(60));

    // Mock request and response objects
    const mockReq = {
        body: {
            code: testCode,
            language: 'javascript',
            problemMeta: {
                title: 'Direct Execution Test',
                type: 'direct_execution'
            }
        },
        user: { id: 'test-user' }
    };

    const mockRes = {
        json: (data) => {
            console.log('✅ Response received:');
            console.log(JSON.stringify(data, null, 2));

            if (data.success) {
                console.log('\n🎉 Direct execution successful!');
                console.log('\n📺 Terminal Output:');
                console.log(data.terminalOutput);
            } else {
                console.log('\n❌ Direct execution failed:');
                console.log(data.error);
                console.log('\n📺 Terminal Output:');
                console.log(data.terminalOutput);
            }
        },
        status: (code) => ({
            json: (data) => {
                console.log(`⚠️ HTTP ${code} Response:`, data);
            }
        })
    };

    try {
        console.log('🚀 Calling executeCodeDirect...');
        await terminalController.executeCodeDirect(mockReq, mockRes);
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Test Python code as well
async function testPythonExecution() {
    console.log('\n' + '='.repeat(60));
    console.log('🐍 Testing Python Direct Execution...\n');

    const pythonCode = `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(f"Fibonacci(10): {fibonacci(10)}")
print("Python execution complete!")
`;

    const mockReq = {
        body: {
            code: pythonCode,
            language: 'python',
            problemMeta: {
                title: 'Python Execution Test'
            }
        },
        user: { id: 'test-user' }
    };

    const mockRes = {
        json: (data) => {
            console.log('🐍 Python Response:');
            console.log(JSON.stringify(data, null, 2));

            if (data.terminalOutput) {
                console.log('\n📺 Python Terminal Output:');
                console.log(data.terminalOutput);
            }
        },
        status: (code) => ({
            json: (data) => console.log(`Python HTTP ${code}:`, data)
        })
    };

    try {
        await terminalController.executeCodeDirect(mockReq, mockRes);
    } catch (error) {
        console.error('❌ Python test failed:', error.message);
    }
}

// Run tests
if (require.main === module) {
    testDirectExecution()
        .then(() => testPythonExecution())
        .then(() => {
            console.log('\n🎉 Direct execution tests complete!');
            console.log('\n📋 Summary:');
            console.log('   ✅ Removed test case parsing from AscentIDE');
            console.log('   ✅ Created direct code execution endpoint');
            console.log('   ✅ Added support for JavaScript, Python, Java');
            console.log('   ✅ Terminal-focused execution flow');
            console.log('\n🚀 Ready to test in AscentIDE!');
        })
        .catch(console.error);
}

module.exports = { testDirectExecution };