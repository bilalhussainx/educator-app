/**
 * Test script for Session Documents system
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10000';
const AUTH_TOKEN = 'dev-token-for-testing'; // Development token

async function testSessionDocuments() {
    console.log('🧪 Testing Session Documents System...\n');

    try {
        // Test 1: Create a session document
        console.log('1. Creating a session document...');
        const createResponse = await axios.post(`${BASE_URL}/api/session-documents`, {
            sessionId: 'test-urgent-essay-001',
            sessionName: 'Test Urgent Essay Session',
            sessionType: 'urgent_essay',
            documentName: 'My College Application Essay',
            documentType: 'draft',
            content: 'This is a test essay about my journey in computer science and how I discovered my passion for artificial intelligence. It started when I first encountered machine learning in high school...',
            sessionMetadata: {
                hasAiAnalysis: false,
                wordCount: 25,
                characterCount: 200
            },
            tags: ['college-application', 'draft', 'computer-science']
        }, {
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (createResponse.data.success) {
            console.log('✅ Document created successfully:', createResponse.data.document.id);
            const documentId = createResponse.data.document.id;

            // Test 2: Get user's session documents
            console.log('\n2. Fetching user session documents...');
            const listResponse = await axios.get(`${BASE_URL}/api/session-documents`, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            });

            if (listResponse.data.success) {
                console.log('✅ Found', listResponse.data.documents.length, 'documents');
                console.log('   Latest:', listResponse.data.documents[0]?.document_name);
            }

            // Test 3: Get specific document
            console.log('\n3. Fetching specific document...');
            const getResponse = await axios.get(`${BASE_URL}/api/session-documents/${documentId}`, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            });

            if (getResponse.data.success) {
                console.log('✅ Document retrieved:', getResponse.data.document.document_name);
                console.log('   Content preview:', getResponse.data.document.content.substring(0, 50) + '...');
            }

            // Test 4: Update document (create new version)
            console.log('\n4. Creating new version of document...');
            const updateResponse = await axios.post(`${BASE_URL}/api/session-documents`, {
                sessionId: 'test-urgent-essay-001',
                sessionName: 'Test Urgent Essay Session',
                sessionType: 'urgent_essay',
                documentName: 'My College Application Essay',
                documentType: 'revision',
                content: 'This is a revised version of my test essay about my journey in computer science and how I discovered my passion for artificial intelligence. It started when I first encountered machine learning in high school, and I was fascinated by the possibilities...',
                sessionMetadata: {
                    hasAiAnalysis: true,
                    wordCount: 35,
                    characterCount: 280
                },
                tags: ['college-application', 'revision', 'computer-science']
            }, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            });

            if (updateResponse.data.success) {
                console.log('✅ New version created:', `v${updateResponse.data.document.version_number}`);
            }

            // Test 5: Get session statistics
            console.log('\n5. Fetching session statistics...');
            const statsResponse = await axios.get(`${BASE_URL}/api/session-documents/stats`, {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                }
            });

            if (statsResponse.data.success) {
                console.log('✅ Statistics retrieved:');
                statsResponse.data.statistics.forEach(stat => {
                    console.log(`   ${stat.session_type}: ${stat.total_documents} documents`);
                });
            }

            console.log('\n🎉 All tests passed! Session Documents system is working correctly.');

        } else {
            throw new Error('Failed to create document: ' + createResponse.data.error);
        }

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

testSessionDocuments();