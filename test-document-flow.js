// Test script to verify document upload and retrieval flow
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testDocumentFlow() {
    const baseUrl = 'http://localhost:10000';

    // First, we need to authenticate to get a token
    // You'll need to replace these with actual credentials
    const authResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'test@example.com', // Replace with actual credentials
        password: 'password'
    });

    const token = authResponse.data.token;

    // Test document upload
    const formData = new FormData();
    // Create a simple test document
    const testContent = 'This is a test document for debugging.';
    fs.writeFileSync('test-doc.txt', testContent);

    formData.append('document', fs.createReadStream('test-doc.txt'));
    formData.append('sessionId', 'test-session-123');
    formData.append('courseId', '1');
    formData.append('instructions', 'Test document upload');
    formData.append('teacherId', 'test-teacher-id');

    console.log('1. Testing document upload...');
    const uploadResponse = await axios.post(`${baseUrl}/api/sessions/upload-document`, formData, {
        headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${token}`
        }
    });

    console.log('Upload response:', uploadResponse.data);

    if (uploadResponse.data.success) {
        const documentId = uploadResponse.data.documentId;
        console.log('Document ID:', documentId);

        // Test document retrieval by ID
        console.log('2. Testing document retrieval by ID...');
        const docResponse = await axios.get(`${baseUrl}/api/documents/${documentId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Document retrieval response:', docResponse.data);

        // Test session document retrieval
        console.log('3. Testing session document retrieval...');
        const sessionDocResponse = await axios.get(`${baseUrl}/api/sessions/test-session-123/document`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('Session document response:', sessionDocResponse.data);
    }

    // Clean up
    fs.unlinkSync('test-doc.txt');
}

testDocumentFlow().catch(console.error);