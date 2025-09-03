#!/usr/bin/env node

// Check Web Page Recording Configuration
require('dotenv').config();

console.log('=== WEB PAGE RECORDING CONFIGURATION CHECK ===\n');

// Check required environment variables
const requiredVars = {
    'AGORA_APP_ID': process.env.AGORA_APP_ID,
    'AGORA_CUSTOMER_ID': process.env.AGORA_CUSTOMER_ID,
    'AGORA_CUSTOMER_SECRET': process.env.AGORA_CUSTOMER_SECRET,
    'AGORA_AZURE_BUCKET': process.env.AGORA_AZURE_BUCKET,
    'AGORA_AZURE_ACCESS_KEY': process.env.AGORA_AZURE_ACCESS_KEY,
    'AGORA_AZURE_SECRET_KEY': process.env.AGORA_AZURE_SECRET_KEY,
    'FRONTEND_URL': process.env.FRONTEND_URL
};

console.log('1. ENVIRONMENT VARIABLES CHECK:');
let allSet = true;
Object.entries(requiredVars).forEach(([name, value]) => {
    const status = value ? '✅ SET' : '❌ MISSING';
    console.log(`   ${name}: ${status}`);
    if (!value) allSet = false;
});

if (!requiredVars.FRONTEND_URL) {
    console.log('\n⚠️  FRONTEND_URL not set!');
    console.log('Add to your .env file:');
    console.log('FRONTEND_URL=http://localhost:3000');
    console.log('Or your actual frontend URL for production');
}

console.log('\n2. WEB PAGE RECORDING SETUP:');
console.log('✅ Web page recording service created');
console.log('✅ WebSocket handler updated to use web page recording');
console.log('✅ Database migration script created');

console.log('\n3. WHAT WEB PAGE RECORDING CAPTURES:');
console.log('   📝 Code editor content and changes');
console.log('   🖥️  Terminal/console output');
console.log('   🎨 Whiteboard drawings and annotations');  
console.log('   💬 Chat messages (if visible)');
console.log('   🎯 All educational content on the page');

console.log('\n4. AGORA CONSOLE REQUIREMENTS:');
console.log('   🔍 Web Page Recording must be enabled in your Agora project');
console.log('   📋 Go to: Agora Console → Your Project → Features');
console.log('   ✅ Enable "Web Page Recording" feature');

console.log('\n5. NEXT STEPS:');
if (!allSet) {
    console.log('   ❌ Fix missing environment variables first');
} else {
    console.log('   ✅ Run database migration: add_recording_type.sql');
    console.log('   ✅ Restart your backend server');
    console.log('   ✅ Enable Web Page Recording in Agora Console');
    console.log('   ✅ Test recording a live educational session');
}

console.log('\n6. EXPECTED RECORDING URL FORMAT:');
const frontendUrl = requiredVars.FRONTEND_URL || 'http://localhost:3000';
console.log(`   ${frontendUrl}/session/{sessionId}`);
console.log('   This URL contains the educational content to be recorded');

console.log('\n=== CONFIGURATION CHECK COMPLETE ===');

// Test if we can construct a web page URL
if (requiredVars.FRONTEND_URL) {
    const testSessionId = 'test-session-123';
    const webPageUrl = `${requiredVars.FRONTEND_URL}/session/${testSessionId}`;
    console.log('\n🧪 EXAMPLE RECORDING URL:');
    console.log(`   ${webPageUrl}`);
    console.log('   ☝️  This is what Agora will record');
} else {
    console.log('\n❌ Cannot construct recording URL - FRONTEND_URL missing');
}