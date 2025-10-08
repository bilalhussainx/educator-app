/**
 * Test real resume export with actual formatting
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:10000/api/resume-templates/export';

// Real resume HTML with inline styles (like what comes from the resume page)
const realResumeHTML = `
<div class="resume-container" style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 8.5in; margin: 0 auto; padding: 0.75in; line-height: 1.4; background: white;">
  <div class="header" style="margin-bottom: 20px; text-align: center;">
    <h1 style="font-size: 24pt; font-weight: 700; color: #2c3e50; margin: 0 0 10px 0; letter-spacing: 1px;">BILAL HUSSAIN</h1>
    <div class="contact-info" style="font-size: 10pt; color: #555;">
      Toronto, Ontario, M9L 2C5 | 437-907-1483 | bilalhussain.v1@gmail.com | <a href="#" style="color: #3498db; text-decoration: none;">LinkedIn</a>
    </div>
  </div>

  <div class="section" style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: 600; color: #2c3e50; text-transform: uppercase; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 10px;">PROFESSIONAL SUMMARY</h2>
    <p style="font-size: 10.5pt; margin: 8px 0;">
      Harvard Computer Science graduate with 5+ years of experience in administration, curriculum development, and technical support. Skilled in office management, documentation, and client communication with proficiency in MS Office and Google Workspace. Seeking an Administrative Assistant position to leverage strong technical, organizational, and problem-solving abilities in a dynamic environment.
    </p>
  </div>

  <div class="section" style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: 600; color: #2c3e50; text-transform: uppercase; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 10px;">TECHNICAL SKILLS</h2>
    <div class="skills-container" style="display: flex; flex-direction: column; gap: 8px;">
      <div class="skill-category" style="font-size: 10.5pt;">
        <span class="skill-title" style="font-weight: 600; color: #2c3e50;">Software:</span>
        MS Office Suite (Word, Excel, PowerPoint, Outlook), Google Workspace (Docs, Sheets, Gmail, Calendar)
      </div>
      <div class="skill-category" style="font-size: 10.5pt;">
        <span class="skill-title" style="font-weight: 600; color: #2c3e50;">Administrative:</span>
        Documentation, Data Entry, Scheduling, Calendar Management, Records Management
      </div>
      <div class="skill-category" style="font-size: 10.5pt;">
        <span class="skill-title" style="font-weight: 600; color: #2c3e50;">Communication:</span>
        Client Interaction, Email & Phone Correspondence, Multilingual (English, Urdu, Hindi, Punjabi)
      </div>
    </div>
  </div>

  <div class="section" style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: 600; color: #2c3e50; text-transform: uppercase; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 10px;">PROFESSIONAL EXPERIENCE</h2>

    <div class="job" style="margin-bottom: 15px;">
      <div class="job-header" style="margin-bottom: 5px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline;">
        <div>
          <div class="job-title" style="font-weight: 600; font-size: 11pt; color: #2c3e50;">Program Facilitator & Curriculum Support Administrator</div>
          <div class="company-info" style="font-weight: 600; font-size: 10.5pt;">Milton Academy | Milton, MA</div>
        </div>
        <div class="job-duration" style="font-size: 10pt; color: #555;">August 2022 - May 2024</div>
      </div>
      <ul class="job-bullets" style="margin: 5px 0 0 20px; padding-left: 0;">
        <li style="font-size: 10.5pt; margin-bottom: 5px; position: relative; list-style-type: none; padding-left: 15px;">Developed and implemented Computer Science curriculum for 100+ high school students, resulting in 30% improvement in student technical proficiency</li>
        <li style="font-size: 10.5pt; margin-bottom: 5px; position: relative; list-style-type: none; padding-left: 15px;">Managed administrative operations including scheduling, material organization, and documentation for 5+ classes per semester</li>
        <li style="font-size: 10.5pt; margin-bottom: 5px; position: relative; list-style-type: none; padding-left: 15px;">Resolved 25+ student and faculty inquiries weekly, maintaining 98% satisfaction rate through clear communication and prompt response</li>
      </ul>
    </div>

    <div class="job" style="margin-bottom: 15px;">
      <div class="job-header" style="margin-bottom: 5px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline;">
        <div>
          <div class="job-title" style="font-weight: 600; font-size: 11pt; color: #2c3e50;">Administrative Support Specialist</div>
          <div class="company-info" style="font-weight: 600; font-size: 10.5pt;">Dignosco | Lahore, Pakistan</div>
        </div>
        <div class="job-duration" style="font-size: 10pt; color: #555;">August 2019 - January 2020</div>
      </div>
      <ul class="job-bullets" style="margin: 5px 0 0 20px; padding-left: 0;">
        <li style="font-size: 10.5pt; margin-bottom: 5px; position: relative; list-style-type: none; padding-left: 15px;">Processed and organized 50+ high-volume documents daily with 99% accuracy while meeting strict deadlines</li>
        <li style="font-size: 10.5pt; margin-bottom: 5px; position: relative; list-style-type: none; padding-left: 15px;">Coordinated and facilitated 10+ preparation sessions monthly, improving information delivery efficiency by 25%</li>
      </ul>
    </div>
  </div>

  <div class="section" style="margin-bottom: 20px;">
    <h2 style="font-size: 14pt; font-weight: 600; color: #2c3e50; text-transform: uppercase; border-bottom: 2px solid #3498db; padding-bottom: 5px; margin-bottom: 10px;">EDUCATION</h2>
    <div class="education-entry" style="display: flex; flex-direction: column; gap: 3px;">
      <div class="degree" style="font-weight: 600; font-size: 11pt; color: #2c3e50;">Bachelor of Arts in Computer Science</div>
      <div class="education-details" style="display: flex; justify-content: space-between; font-size: 10.5pt;">
        <span class="institution" style="font-weight: 600;">Harvard College</span>
        <span class="location">Cambridge, MA</span>
        <span class="graduation" style="color: #555;">Graduated: May 2022</span>
      </div>
    </div>
  </div>
</div>
`;

async function testExport(format) {
    console.log(`\n📄 Testing ${format.toUpperCase()} export with real resume...`);

    try {
        const response = await axios.post(API_URL, {
            htmlContent: realResumeHTML,
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

        const outputPath = path.join(__dirname, `bilal-resume.${format}`);
        fs.writeFileSync(outputPath, response.data);

        const fileSize = (response.data.length / 1024).toFixed(2);
        console.log(`✅ ${format.toUpperCase()} export successful!`);
        console.log(`   📁 File saved: ${outputPath}`);
        console.log(`   📊 File size: ${fileSize} KB`);

        // Try to open the file
        if (format === 'pdf') {
            console.log(`   💡 Try opening: ${outputPath}`);
        }

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
    console.log('🚀 Testing Real Resume Export (Bilal\'s Resume)');
    console.log('=' .repeat(60));

    const results = {
        pdf: false,
        docx: false,
        html: false
    };

    // Test PDF export
    results.pdf = await testExport('pdf');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test DOCX export
    results.docx = await testExport('docx');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test HTML export
    results.html = await testExport('html');

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Test Summary:');
    console.log('=' .repeat(60));
    console.log(`PDF Export:  ${results.pdf ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`DOCX Export: ${results.docx ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`HTML Export: ${results.html ? '✅ PASSED' : '❌ FAILED'}`);

    const totalPassed = Object.values(results).filter(r => r).length;
    console.log(`\n${totalPassed}/3 tests passed`);

    if (totalPassed === 3) {
        console.log('\n🎉 All formats exported successfully!');
        console.log('📂 Files saved in:', __dirname);
    }
}

runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
});
