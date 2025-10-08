/**
 * Comprehensive AI Review System Test
 * Tests all AI review endpoints and functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_EMAIL = 'bilalhussain.v1@gmail.com';
const TEST_PASSWORD = 'abcdefgh';

// Sample essay content for testing
const SAMPLE_ESSAY = `
Ali stood in the rain-soaked streets of Lahore, his mind racing with thoughts of mortality and purpose. The monsoon had arrived early this year, bringing with it memories of his childhood friend Murtaza, who had recently passed away under mysterious circumstances.

He felt a pang of longing, a yearning for a sanctuary he had never known, a world where the whispers of fear were muted by the gentle hum of privilege. The manicured lawns, the elegant facades of the houses, the meticulously pruned rose bushes – it was a world of order and tranquility, a stark contrast to the chaotic symphony of his own Lahore neighborhood.

As he drifted off to sleep, his physical body pulled upwards, haunted by the image of an empty chair, a chilling question lingered in his mind: was this the first domino to fall, a harbinger of a darker fate that awaited him on his own journey?
`;

let authToken = null;
let testSessionId = null;

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function logTest(name, status, details = '') {
  const symbol = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  const color = status === 'pass' ? 'green' : status === 'fail' ? 'red' : 'yellow';
  log(`${symbol} ${name}`, color);
  if (details) {
    console.log(`  ${details}`);
  }
}

// Test 1: Login and get auth token
async function testLogin() {
  logSection('TEST 1: Authentication');

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data.token) {
      authToken = response.data.token;
      logTest('Login successful', 'pass', `Token: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      logTest('Login failed', 'fail', 'No token received');
      return false;
    }
  } catch (error) {
    logTest('Login failed', 'fail', error.message);
    return false;
  }
}

// Test 2: Check Claude API configuration
async function testClaudeConfig() {
  logSection('TEST 2: Claude API Configuration');

  try {
    const response = await axios.get(`${BASE_URL}/api/config/claude-status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    logTest('Claude API config check', 'pass', JSON.stringify(response.data, null, 2));
    return response.data.configured || false;
  } catch (error) {
    logTest('Claude API config check', 'warn', 'Endpoint not found - checking environment variables');

    // Check if Claude API key exists
    const hasClaudeKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (hasClaudeKey) {
      logTest('Claude API key found in environment', 'pass');
      return true;
    } else {
      logTest('Claude API key NOT found', 'fail', 'Set ANTHROPIC_API_KEY or CLAUDE_API_KEY in .env');
      return false;
    }
  }
}

// Test 3: Test AI Supervisor endpoint
async function testAISupervisor() {
  logSection('TEST 3: AI Supervisor Endpoint');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai-supervisor/analyze-document`,
      {
        documentContent: SAMPLE_ESSAY,
        documentType: 'essay',
        analysisType: 'mozart_stroke_review',
        sessionId: 'test-session-123',
        requirements: {
          type: 'college_essay',
          focusAreas: ['personal_growth', 'storytelling', 'authenticity', 'impact']
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      const analysis = response.data.analysis;
      logTest('AI Supervisor analysis', 'pass', `Found ${analysis.paragraphAnalysis?.length || 0} paragraph analyses`);
      console.log('Sample analysis:', JSON.stringify(analysis.paragraphAnalysis?.[0], null, 2));
      return true;
    } else {
      logTest('AI Supervisor analysis', 'fail', response.data.error);
      return false;
    }
  } catch (error) {
    logTest('AI Supervisor endpoint', 'fail', error.response?.data?.error || error.message);
    log('Full error:', 'red');
    console.log(error.response?.data || error.message);
    return false;
  }
}

// Test 4: Test Claude Inline Analysis endpoint
async function testClaudeInlineAnalysis() {
  logSection('TEST 4: Claude Inline Analysis Endpoint');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/scribe/claude-inline-analysis`,
      {
        documentContent: SAMPLE_ESSAY,
        config: {
          documentType: 'college_essay',
          analysisDepth: 'dense',
          focusAreas: ['structure', 'clarity', 'style', 'engagement'],
          userLevel: 'intermediate'
        },
        analysisType: 'inline_comments'
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      const comments = response.data.comments || [];
      logTest('Claude inline analysis', 'pass', `Generated ${comments.length} comments`);

      if (comments.length > 0) {
        console.log('\nSample comment:');
        console.log(JSON.stringify(comments[0], null, 2));
      }

      return true;
    } else {
      logTest('Claude inline analysis', 'fail', response.data.error);
      return false;
    }
  } catch (error) {
    logTest('Claude inline analysis endpoint', 'fail', error.response?.data?.error || error.message);
    return false;
  }
}

// Test 5: Test Enhanced Scribe Analysis endpoint
async function testEnhancedScribeAnalysis() {
  logSection('TEST 5: Enhanced Scribe Analysis Endpoint');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/scribe/enhanced-analyze`,
      {
        documentContent: SAMPLE_ESSAY,
        config: {
          documentType: 'college_essay',
          customRequirements: [],
          focusAreas: ['structure', 'clarity', 'engagement'],
          analysisDepth: 'comprehensive'
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      logTest('Enhanced scribe analysis', 'pass', 'Analysis completed');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return true;
    } else {
      logTest('Enhanced scribe analysis', 'fail', response.data.error);
      return false;
    }
  } catch (error) {
    logTest('Enhanced scribe analysis endpoint', 'fail', error.response?.data?.error || error.message);
    return false;
  }
}

// Test 6: Check available routes
async function testAvailableRoutes() {
  logSection('TEST 6: Available AI Routes');

  const routesToTest = [
    '/api/ai-supervisor/analyze-document',
    '/api/ai/scribe/claude-inline-analysis',
    '/api/ai/scribe/enhanced-analyze',
    '/api/enhanced-ai-comments/generate',
    '/api/smart-prompts/generate'
  ];

  for (const route of routesToTest) {
    try {
      // Try OPTIONS request to see if route exists
      const response = await axios.options(`${BASE_URL}${route}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      logTest(`Route exists: ${route}`, 'pass');
    } catch (error) {
      if (error.response?.status === 404) {
        logTest(`Route NOT found: ${route}`, 'fail');
      } else {
        logTest(`Route exists: ${route}`, 'pass', 'Returns error but route exists');
      }
    }
  }
}

// Test 7: Analyze comment quality
async function analyzeCommentQuality() {
  logSection('TEST 7: Comment Quality Analysis');

  log('Checking if comments are generic/repetitive...', 'yellow');

  try {
    const response = await axios.post(
      `${BASE_URL}/api/ai/scribe/claude-inline-analysis`,
      {
        documentContent: SAMPLE_ESSAY,
        config: {
          documentType: 'college_essay',
          analysisDepth: 'dense',
          focusAreas: ['structure', 'clarity', 'style', 'engagement'],
          userLevel: 'intermediate'
        }
      },
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );

    const comments = response.data.comments || [];

    if (comments.length === 0) {
      logTest('Comment generation', 'fail', 'No comments generated');
      return;
    }

    // Check for repetitive messages
    const messages = comments.map(c => c.message);
    const uniqueMessages = new Set(messages);
    const repetitionRate = 1 - (uniqueMessages.size / messages.length);

    if (repetitionRate > 0.5) {
      logTest('Comment uniqueness', 'fail', `${Math.round(repetitionRate * 100)}% are repetitive`);
    } else {
      logTest('Comment uniqueness', 'pass', `${Math.round((1 - repetitionRate) * 100)}% are unique`);
    }

    // Check for generic phrases
    const genericPhrases = [
      'Consider',
      'Long sentences can be difficult',
      'Breaking them into shorter sentences',
      'Active voice makes your writing more direct'
    ];

    let genericCount = 0;
    for (const comment of comments) {
      for (const phrase of genericPhrases) {
        if (comment.message?.includes(phrase) || comment.suggestion?.includes(phrase)) {
          genericCount++;
          break;
        }
      }
    }

    const genericRate = genericCount / comments.length;
    if (genericRate > 0.6) {
      logTest('Comment quality', 'fail', `${Math.round(genericRate * 100)}% use generic templates`);
    } else {
      logTest('Comment quality', 'pass', `Only ${Math.round(genericRate * 100)}% use templates`);
    }

    // Display sample comments
    console.log('\nSample comments:');
    comments.slice(0, 3).forEach((comment, i) => {
      console.log(`\n${i + 1}. ${comment.category || 'General'}`);
      console.log(`   Message: ${comment.message}`);
      console.log(`   Suggestion: ${comment.suggestion || 'N/A'}`);
    });

  } catch (error) {
    logTest('Comment quality test', 'fail', error.message);
  }
}

// Main test runner
async function runAllTests() {
  log('\n🧪 AI Review System Comprehensive Test Suite', 'magenta');
  log('Testing backend at: ' + BASE_URL, 'blue');

  const startTime = Date.now();

  // Run tests sequentially
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    log('\n❌ Cannot proceed without authentication', 'red');
    return;
  }

  const claudeConfigured = await testClaudeConfig();

  await testAvailableRoutes();
  await testAISupervisor();
  await testClaudeInlineAnalysis();
  await testEnhancedScribeAnalysis();
  await analyzeCommentQuality();

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  logSection('TEST SUMMARY');
  log(`Total time: ${duration}s`, 'blue');

  if (!claudeConfigured) {
    log('\n⚠️  WARNING: Claude API not configured', 'yellow');
    log('The system is falling back to basic pattern-matching analysis', 'yellow');
    log('To fix: Set ANTHROPIC_API_KEY in backend/.env file', 'yellow');
  }

  log('\n✅ Test suite completed', 'green');
  log('\nNext steps:', 'cyan');
  log('1. Review failed tests above', 'reset');
  log('2. Check backend console for errors', 'reset');
  log('3. Verify Claude API key if configured', 'reset');
  log('4. Run: npm test in backend directory', 'reset');
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ Test suite failed with error:', 'red');
  console.error(error);
  process.exit(1);
});
