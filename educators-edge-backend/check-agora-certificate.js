#!/usr/bin/env node

// Check Agora App Certificate
require('dotenv').config();

console.log('=== CHECKING AGORA APP CERTIFICATE ===\n');

const { AGORA_APP_ID, AGORA_APP_CERTIFICATE } = process.env;

console.log('Required for Cloud Recording with Tokens:');
console.log(`AGORA_APP_ID: ${AGORA_APP_ID ? '✅ SET' : '❌ MISSING'}`);
console.log(`AGORA_APP_CERTIFICATE: ${AGORA_APP_CERTIFICATE ? '✅ SET' : '❌ MISSING'}`);

if (!AGORA_APP_CERTIFICATE) {
    console.log('\n❌ AGORA_APP_CERTIFICATE is missing!');
    console.log('\nTo get your App Certificate:');
    console.log('1. Go to https://console.agora.io');
    console.log('2. Navigate to: Project Management');
    console.log('3. Find your project and click the "eye" icon');
    console.log('4. Copy the "App Certificate" (not the App ID)');
    console.log('5. Add to your .env file: AGORA_APP_CERTIFICATE=your_certificate_here');
    console.log('\nWithout the App Certificate, token generation will fail and recording won\'t work.');
} else {
    console.log(`\n✅ App Certificate configured (${AGORA_APP_CERTIFICATE.length} characters)`);
    console.log('✅ Ready for token-based cloud recording');
}

console.log('\n=== CERTIFICATE CHECK COMPLETE ===');