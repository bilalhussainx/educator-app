/**
 * Direct Puppeteer PDF generation test
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function testPuppeteerPDF() {
    console.log('🚀 Testing Puppeteer PDF generation...');

    let browser;
    try {
        console.log('📦 Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        console.log('✅ Browser launched');

        const page = await browser.newPage();

        const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
        }
        h1 {
            color: #2c3e50;
            font-size: 24pt;
        }
        p {
            font-size: 12pt;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <h1>Test PDF Document</h1>
    <p>This is a test to verify Puppeteer can generate PDFs correctly.</p>
    <p>If you can read this, the PDF generation is working!</p>
</body>
</html>
        `;

        console.log('📄 Setting page content...');
        await page.setContent(html, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        console.log('🖨️  Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0.5in',
                right: '0.5in',
                bottom: '0.5in',
                left: '0.5in'
            }
        });

        const outputPath = path.join(__dirname, '../test-simple.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);

        console.log(`✅ PDF generated: ${outputPath}`);
        console.log(`📊 File size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

        await browser.close();

        console.log('\n💡 Try opening the PDF to verify it works');

        return true;
    } catch (error) {
        console.error('❌ Puppeteer test failed:', error.message);
        console.error('Stack:', error.stack);

        if (browser) {
            await browser.close();
        }

        return false;
    }
}

testPuppeteerPDF();
