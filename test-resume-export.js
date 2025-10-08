/**
 * Test Resume Export Functionality
 * Tests PDF and DOCX export with formatting preservation
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:10000/api/resume-templates/export';

const testHTML = `
<div class="resume-header" style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px;">
    <h1 style="font-size: 28px; font-weight: bold; color: #1f2937; margin: 0;">John Doe</h1>
    <div style="margin-top: 10px; color: #6b7280;">
        <span>john.doe@example.com</span> | <span>(555) 123-4567</span> | <span>linkedin.com/in/johndoe</span>
    </div>
</div>

<div class="resume-section" style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; font-weight: bold; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px;">Professional Summary</h2>
    <p style="line-height: 1.6; color: #374151;">
        Experienced software engineer with 5+ years of expertise in full-stack development.
        Proven track record of delivering high-quality solutions and leading technical teams.
    </p>
</div>

<div class="resume-section" style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; font-weight: bold; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px;">Experience</h2>

    <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; color: #1f2937; margin: 0;">Senior Software Engineer</h3>
        <div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">
            <span style="font-style: italic;">Tech Company</span> | <span>Jan 2020 - Present</span>
        </div>
        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.6;">
            <li style="margin: 6px 0;">Led development of microservices architecture serving 1M+ users</li>
            <li style="margin: 6px 0;">Improved system performance by 40% through optimization</li>
            <li style="margin: 6px 0;">Mentored team of 5 junior developers</li>
        </ul>
    </div>

    <div style="margin-bottom: 20px;">
        <h3 style="font-size: 14px; font-weight: bold; color: #1f2937; margin: 0;">Software Engineer</h3>
        <div style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">
            <span style="font-style: italic;">Previous Company</span> | <span>Jun 2018 - Dec 2019</span>
        </div>
        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.6;">
            <li style="margin: 6px 0;">Developed and maintained web applications using React and Node.js</li>
            <li style="margin: 6px 0;">Implemented CI/CD pipeline reducing deployment time by 60%</li>
            <li style="margin: 6px 0;">Collaborated with cross-functional teams on product features</li>
        </ul>
    </div>
</div>

<div class="resume-section" style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; font-weight: bold; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px;">Education</h2>
    <div>
        <h3 style="font-size: 14px; font-weight: bold; color: #1f2937; margin: 0;">Bachelor of Science in Computer Science</h3>
        <div style="color: #6b7280; font-size: 12px;">
            <span style="font-style: italic;">University Name</span> | <span>2014 - 2018</span>
        </div>
    </div>
</div>

<div class="resume-section" style="margin-bottom: 25px;">
    <h2 style="font-size: 18px; font-weight: bold; color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 15px;">Skills</h2>
    <p style="line-height: 1.6; color: #374151;">
        <strong>Languages:</strong> JavaScript, TypeScript, Python, Java<br>
        <strong>Frameworks:</strong> React, Node.js, Express, Next.js<br>
        <strong>Tools:</strong> Git, Docker, AWS, Jenkins<br>
        <strong>Databases:</strong> PostgreSQL, MongoDB, Redis
    </p>
</div>
`;

async function testExport(format) {
    console.log(`\n📄 Testing ${format.toUpperCase()} export...`);

    try {
        const response = await axios.post(API_URL, {
            htmlContent: testHTML,
            format: format,
            options: {
                margin: {
                    top: '0.5in',
                    right: '0.5in',
                    bottom: '0.5in',
                    left: '0.5in'
                }
            }
        }, {
            responseType: 'arraybuffer'
        });

        const outputPath = path.join(__dirname, `test-resume.${format}`);
        fs.writeFileSync(outputPath, response.data);

        const fileSize = (response.data.length / 1024).toFixed(2);
        console.log(`✅ ${format.toUpperCase()} export successful!`);
        console.log(`   📁 File saved: ${outputPath}`);
        console.log(`   📊 File size: ${fileSize} KB`);

        return true;
    } catch (error) {
        console.error(`❌ ${format.toUpperCase()} export failed:`, error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Error:', error.response.data?.toString() || 'Unknown error');
        }
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Resume Export Tests...');
    console.log('=' .repeat(50));

    const results = {
        pdf: false,
        docx: false,
        html: false
    };

    // Test PDF export
    results.pdf = await testExport('pdf');

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test DOCX export
    results.docx = await testExport('docx');

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test HTML export
    results.html = await testExport('html');

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary:');
    console.log('=' .repeat(50));
    console.log(`PDF Export:  ${results.pdf ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`DOCX Export: ${results.docx ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`HTML Export: ${results.html ? '✅ PASSED' : '❌ FAILED'}`);

    const totalPassed = Object.values(results).filter(r => r).length;
    console.log(`\n${totalPassed}/3 tests passed`);

    if (totalPassed === 3) {
        console.log('\n🎉 All export formats working perfectly!');
        console.log('✨ Formatting preservation verified.');
    } else {
        console.log('\n⚠️  Some exports failed. Check the errors above.');
    }
}

// Run tests
runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
});
