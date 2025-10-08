/**
 * 🧪 MANUAL BULLET TESTER
 * Tests bullet detection with the user's exact resume content
 */

import revolutionaryResumeFormatterAPI from './revolutionaryResumeFormatterAPI';
import testRegexSyntax from './quickRegexTest';

export class ManualBulletTester {

    /**
     * 🧪 TEST WITH USER'S EXACT CONTENT
     * Tests with the content from Bilal's resume
     */
    async testUserContent(): Promise<void> {
        console.log('🧪 TESTING WITH USER\'S EXACT RESUME CONTENT...');

        // 🔧 FIRST: Test if regex syntax is fixed
        const regexWorking = testRegexSyntax();
        if (!regexWorking) {
            console.error('❌ Regex syntax error detected! Cannot proceed with bullet testing.');
            alert('❌ Regex syntax error! Please check console for details.');
            return;
        }

        // This is the exact content from the user's resume as shown in the images
        const userContent = `BILAL HUSSAIN
bilalhussain.v1@gmail.com | 437-907-1483

PROFESSIONAL SUMMARY

HIGHLIGHTS OF QUALIFICATIONS
Office Administration & Coordination
Reception & Client Interaction
Scheduling & Calendar Management

WORK EXPERIENCE
Program facilitator & Curriculum Support Administrator – Milton AcademyMilton, MA, USA | Aug 2022 – May 2024

Managed inquiries and provided detailed information to diverse groups, ensuring clarity and addressing all concerns promptly.

Proactively resolved issues and addressed concerns from students and colleagues, maintaining a positive and productive environment.

Administrative Support Specialist – DignoscoLahore, Pakistan | Aug 2019 – Jan 2020

Organized and conducted preparation sessions, utilizing communication strategies to ensure efficient delivery of information and support.

Provided detailed support and guidance to students, utilizing communication and analytical skills to manage complex processes and optimize outcomes.`;

        try {
            // Test with NEW Revolutionary API
            console.log('🚀 TESTING WITH REVOLUTIONARY FORMATTER API...');
            const apiResult = await revolutionaryResumeFormatterAPI.processDocument(userContent);

            console.log('📊 USER CONTENT TEST RESULTS:');
            console.log(`   🔹 Bullets Detected: ${apiResult.summary.bulletsFound}`);
            console.log(`   📝 Bold Elements: ${apiResult.summary.boldElementsFound}`);
            console.log(`   📋 Sections Found: ${apiResult.summary.sectionsFound}`);
            console.log(`   🎯 Confidence: ${apiResult.summary.confidenceScore}%`);
            console.log(`   🎨 Templates Generated: ${apiResult.templates.length}`);

            // Show detailed bullet breakdown
            if (apiResult.analysis.detectedElements.bullets.length > 0) {
                console.log('\n🔹 DETECTED BULLETS:');
                apiResult.analysis.detectedElements.bullets.forEach((bullet, index) => {
                    console.log(`   ${index + 1}. "${bullet.cleanedText.substring(0, 60)}..." (${bullet.bulletType})`);
                });
            } else {
                console.log('\n❌ NO BULLETS DETECTED - This indicates a problem!');
                console.log('🔍 Let\'s analyze why...');

                // Debug the content
                const lines = userContent.split('\n').filter(line => line.trim().length > 0);
                console.log('📋 Content Lines:');
                lines.forEach((line, index) => {
                    console.log(`   ${index + 1}. "${line}"`);
                });
            }

            // Display results in browser
            this.showResultsInBrowser(apiResult, userContent);

        } catch (error) {
            console.error('❌ Manual test failed:', error);
        }
    }

    /**
     * 🧪 SHOW RESULTS IN BROWSER
     */
    private showResultsInBrowser(apiResult: any, content: string): void {
        // Remove existing test if present
        const existing = document.getElementById('manual-bullet-test');
        if (existing) {
            existing.remove();
        }

        // Create test display
        const testDiv = document.createElement('div');
        testDiv.id = 'manual-bullet-test';
        testDiv.style.cssText = `
            position: fixed;
            top: 50px;
            left: 50px;
            width: 90vw;
            max-height: 90vh;
            overflow-y: auto;
            z-index: 10003;
            background: white;
            border: 3px solid #FF5722;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        `;

        const success = apiResult.summary.bulletsFound > 0;

        testDiv.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: #D32F2F;">🧪 Manual Test: Bilal's Resume Content</h2>
                    <button onclick="document.getElementById('manual-bullet-test').remove()"
                            style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                        ✕ Close
                    </button>
                </div>

                <div style="margin-bottom: 20px; padding: 15px; background: ${success ? '#e8f5e8' : '#ffebee'}; border-radius: 8px; border-left: 4px solid ${success ? '#4CAF50' : '#f44336'};">
                    <h3 style="margin-top: 0; color: ${success ? '#2E7D32' : '#D32F2F'};">
                        ${success ? '✅ SUCCESS' : '❌ PROBLEM DETECTED'}
                    </h3>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0;">
                        <div style="background: white; padding: 10px; border-radius: 4px; text-align: center;">
                            <strong style="color: #1976D2;">🔹 Bullets</strong><br>
                            <span style="font-size: 24px; font-weight: bold; color: ${success ? '#4CAF50' : '#f44336'};">${apiResult.summary.bulletsFound}</span>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 4px; text-align: center;">
                            <strong style="color: #7B1FA2;">📝 Bold</strong><br>
                            <span style="font-size: 24px; font-weight: bold;">${apiResult.summary.boldElementsFound}</span>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 4px; text-align: center;">
                            <strong style="color: #F57C00;">📋 Sections</strong><br>
                            <span style="font-size: 24px; font-weight: bold;">${apiResult.summary.sectionsFound}</span>
                        </div>
                        <div style="background: white; padding: 10px; border-radius: 4px; text-align: center;">
                            <strong style="color: #388E3C;">🎯 Confidence</strong><br>
                            <span style="font-size: 24px; font-weight: bold;">${apiResult.summary.confidenceScore}%</span>
                        </div>
                    </div>
                </div>

                ${apiResult.analysis.detectedElements.bullets.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #1976D2;">🔹 Detected Bullets</h3>
                        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; max-height: 200px; overflow-y: auto;">
                            ${apiResult.analysis.detectedElements.bullets.map((bullet: any, index: number) => `
                                <div style="margin: 8px 0; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #4CAF50;">
                                    <strong>Line ${bullet.line}:</strong> ${bullet.cleanedText}
                                    <span style="color: #666; font-size: 12px; margin-left: 10px;">(${bullet.bulletType})</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div style="margin-bottom: 20px; padding: 15px; background: #ffebee; border-radius: 8px; border-left: 4px solid #f44336;">
                        <h3 style="margin-top: 0; color: #D32F2F;">❌ No Bullets Detected</h3>
                        <p>The system should have detected at least 4 bullet points from your experience section:</p>
                        <ul style="margin: 10px 0; padding-left: 20px;">
                            <li>"Managed inquiries and provided detailed information..."</li>
                            <li>"Proactively resolved issues and addressed concerns..."</li>
                            <li>"Organized and conducted preparation sessions..."</li>
                            <li>"Provided detailed support and guidance to students..."</li>
                        </ul>
                        <p><strong>🔧 This indicates the bullet detection algorithm needs further enhancement.</strong></p>
                    </div>
                `}

                <div style="margin-bottom: 20px;">
                    <h3 style="color: #424242;">📄 Test Content</h3>
                    <pre style="background: #f5f5f5; padding: 15px; border-radius: 8px; font-size: 12px; max-height: 300px; overflow-y: auto; white-space: pre-wrap;">${content}</pre>
                </div>

                ${apiResult.templates.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #424242;">🎨 Generated Template Preview</h3>
                        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: #fafafa; max-height: 400px; overflow-y: auto;">
                            <style>${apiResult.templates[0].css}</style>
                            ${apiResult.templates[0].html}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        document.body.appendChild(testDiv);

        console.log('✅ Manual test results displayed in browser!');
    }
}

// Make available globally
(window as any).testUserContent = async () => {
    const tester = new ManualBulletTester();
    await tester.testUserContent();
};

console.log('🧪 Manual Bullet Tester loaded!');
console.log('📋 Run: testUserContent() to test with your exact resume content');

export default ManualBulletTester;