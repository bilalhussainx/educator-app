#!/usr/bin/env node

// Check environment variables and format
require('dotenv').config();

console.log('=== ENVIRONMENT VARIABLES CHECK ===\n');

const vars = [
    'AGORA_APP_ID',
    'AGORA_CUSTOMER_ID', 
    'AGORA_CUSTOMER_SECRET'
];

vars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`${varName}: SET`);
        console.log(`  Length: ${value.length} characters`);
        console.log(`  First 8 chars: ${value.substring(0, 8)}`);
        console.log(`  Last 4 chars: ...${value.substring(value.length - 4)}`);
        console.log('');
    } else {
        console.log(`${varName}: ❌ NOT SET`);
        console.log('');
    }
});

// Show the Basic Auth header that will be generated
if (process.env.AGORA_CUSTOMER_ID && process.env.AGORA_CUSTOMER_SECRET) {
    const credentials = `${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET}`;
    const basicAuth = Buffer.from(credentials).toString('base64');
    console.log('Generated Basic Auth:');
    console.log(`  Raw: ${process.env.AGORA_CUSTOMER_ID}:${process.env.AGORA_CUSTOMER_SECRET.substring(0,10)}...`);
    console.log(`  Base64: ${basicAuth.substring(0,50)}...`);
}

console.log('\n=== NOTES ===');
console.log('- AGORA_CUSTOMER_ID should be a UUID-like string (32 chars with dashes)');
console.log('- AGORA_CUSTOMER_SECRET should be a longer string (40+ chars)');
console.log('- These are from Agora Console → Project → Config → RESTful API');
console.log('- NOT the App Certificate or App ID');