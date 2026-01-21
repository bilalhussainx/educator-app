#!/usr/bin/env node

// Azure Storage Configuration Debugger
// Run this script to verify your Azure storage setup

require('dotenv').config();
const axios = require('axios');

console.log('=== AZURE STORAGE CONFIGURATION DEBUG ===\n');

// Check environment variables
console.log('1. ENVIRONMENT VARIABLES:');
const requiredVars = [
    'AGORA_AZURE_BUCKET',
    'AGORA_AZURE_ACCESS_KEY', 
    'AGORA_AZURE_SECRET_KEY'
];

let allVarsSet = true;
requiredVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✓ SET' : '✗ MISSING';
    const display = value ? (value.length > 20 ? `${value.substring(0,10)}...${value.substring(value.length-10)}` : value) : 'undefined';
    console.log(`   ${varName}: ${status} ${value ? `(${display})` : ''}`);
    if (!value) allVarsSet = false;
});

if (!allVarsSet) {
    console.log('\n❌ MISSING ENVIRONMENT VARIABLES!');
    console.log('Please ensure all Azure environment variables are set in your .env file:');
    console.log('   AGORA_AZURE_BUCKET=your-container-name');
    console.log('   AGORA_AZURE_ACCESS_KEY=your-storage-account-name');
    console.log('   AGORA_AZURE_SECRET_KEY=your-storage-access-key');
    process.exit(1);
}

console.log('\n2. AZURE STORAGE URL CONSTRUCTION:');
const containerName = process.env.AGORA_AZURE_BUCKET;
const accountName = process.env.AGORA_AZURE_ACCESS_KEY;
const testFileName = 'test-video.mp4';
const constructedUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${testFileName}`;

console.log(`   Container: ${containerName}`);
console.log(`   Account: ${accountName}`);
console.log(`   Sample URL: ${constructedUrl}`);

console.log('\n3. AZURE BLOB STORAGE CONNECTIVITY TEST:');
console.log('   Testing if storage account is accessible...');

// Test Azure storage account accessibility
const testStorageUrl = `https://${accountName}.blob.core.windows.net/${containerName}?comp=list&maxresults=1`;

axios.get(testStorageUrl, { 
    timeout: 10000,
    validateStatus: () => true // Accept any status code
}).then(response => {
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
        console.log('   ✓ Storage account and container are accessible');
    } else if (response.status === 403) {
        console.log('   ⚠️  Storage account exists but access denied (this is expected without proper authentication)');
        console.log('   ✓ Storage account name and container appear to be valid');
    } else if (response.status === 404) {
        console.log('   ❌ Storage account or container not found');
        console.log('   Check your AGORA_AZURE_ACCESS_KEY (storage account name) and AGORA_AZURE_BUCKET (container name)');
    } else {
        console.log(`   ❓ Unexpected response: ${response.status} ${response.statusText}`);
    }
    
    console.log('\n4. AGORA CONFIGURATION:');
    console.log(`   App ID: ${process.env.AGORA_APP_ID ? '✓ SET' : '✗ MISSING'}`);
    console.log(`   Customer ID: ${process.env.AGORA_CUSTOMER_ID ? '✓ SET' : '✗ MISSING'}`);
    console.log(`   Customer Secret: ${process.env.AGORA_CUSTOMER_SECRET ? '✓ SET' : '✗ MISSING'}`);
    
    console.log('\n=== DEBUG COMPLETE ===');
    console.log('\nTo test recording:');
    console.log('1. Start a live session');
    console.log('2. Check backend logs for detailed Azure storage information');
    console.log('3. Monitor the recorded_sessions table in your database');
    
}).catch(error => {
    console.log(`   ❌ Network error testing storage: ${error.message}`);
    console.log('   This could indicate network issues or invalid storage account name');
});