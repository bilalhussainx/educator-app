// Quick test to see what Azure Document Intelligence returns
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const AZURE_DOCUMENT_INTELLIGENCE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;
const AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;

async function testAzure() {
    // Find a resume file
    const resumeFile = path.join(__dirname, 'uploads/resumes/resume-1759280721014-399540595.docx');

    const endpoint = AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT.replace(/\/+$/, '');
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-07-31-preview`;

    const fileBuffer = await fs.readFile(resumeFile);
    console.log('[TEST] File size:', fileBuffer.length);

    // Submit for analysis
    const analyzeResponse = await fetch(analyzeUrl, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY,
            'Content-Type': 'application/octet-stream'
        },
        body: fileBuffer
    });

    console.log('[TEST] Submit status:', analyzeResponse.status);
    const operationLocation = analyzeResponse.headers.get('Operation-Location');

    // Poll for results
    await new Promise(resolve => setTimeout(resolve, 2000));

    const resultResponse = await fetch(operationLocation, {
        headers: {
            'Ocp-Apim-Subscription-Key': AZURE_DOCUMENT_INTELLIGENCE_KEY
        }
    });

    const result = await resultResponse.json();

    if (result.status === 'succeeded') {
        const azureResults = result.analyzeResult;

        console.log('\n=== AZURE RESPONSE STRUCTURE ===');
        console.log('Top-level keys:', Object.keys(azureResults));
        console.log('\nHas content field:', !!azureResults.content);
        console.log('Has paragraphs field:', !!azureResults.paragraphs);
        console.log('Has pages field:', !!azureResults.pages);

        if (azureResults.content) {
            console.log('\n=== CONTENT FIELD ===');
            console.log('Type:', typeof azureResults.content);
            console.log('Length:', azureResults.content.length);
            console.log('Preview:', azureResults.content.substring(0, 500));

            // Check for bullet points in content
            const contentLines = azureResults.content.split('\n');
            const bulletLines = contentLines.filter(line =>
                line.match(/^[•●○◦▪▫-]\s/) || line.trim().match(/^[•●○◦▪▫-]/)
            );
            console.log('Bullet lines in content:', bulletLines.length);
            if (bulletLines.length > 0) {
                console.log('Sample bullets:');
                bulletLines.slice(0, 3).forEach(line => console.log('  -', line.substring(0, 80)));
            }
        }

        if (azureResults.paragraphs) {
            console.log('\n=== PARAGRAPHS FIELD ===');
            console.log('Count:', azureResults.paragraphs.length);
            console.log('First paragraph:', JSON.stringify(azureResults.paragraphs[0], null, 2));

            // Look for bullet points
            console.log('\n=== BULLET POINT DETECTION ===');
            const bulletsFound = azureResults.paragraphs.filter(p => {
                const content = p.content || '';
                return content.match(/^[•●○◦▪▫-]\s/) || content.trim().startsWith('•');
            });
            console.log('Bullet points found:', bulletsFound.length);
            if (bulletsFound.length > 0) {
                console.log('First bullet:', JSON.stringify(bulletsFound[0], null, 2));
                console.log('Second bullet:', JSON.stringify(bulletsFound[1], null, 2));
            }
        }

        if (azureResults.pages) {
            console.log('\n=== PAGES FIELD ===');
            console.log('Page count:', azureResults.pages.length);
            if (azureResults.pages[0]) {
                console.log('First page keys:', Object.keys(azureResults.pages[0]));
                if (azureResults.pages[0].paragraphs) {
                    console.log('First page has paragraphs:', azureResults.pages[0].paragraphs.length);
                }
                if (azureResults.pages[0].lines) {
                    console.log('First page has lines:', azureResults.pages[0].lines.length);
                }
            }
        }
    } else {
        console.log('Status:', result.status);
        console.log('Result:', JSON.stringify(result, null, 2));
    }
}

testAzure().catch(console.error);
