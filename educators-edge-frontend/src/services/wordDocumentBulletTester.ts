/**
 * 🧪 WORD DOCUMENT BULLET TESTER
 * Specifically tests bullet point detection in Word documents
 */

import documentProcessor from './documentProcessor';
import revolutionaryResumeFormatterAPI from './revolutionaryResumeFormatterAPI';

export class WordDocumentBulletTester {

    /**
     * 🧪 TEST SPECIFIC WORD DOCUMENT
     * Tests bullet detection with a specific file
     */
    async testWordDocument(file: File): Promise<{
        fileName: string;
        extractedContent: string;
        bulletTestResults: {
            oldSystemBullets: number;
            newAPIBullets: number;
            bulletDetails: any[];
        };
        boldTestResults: {
            oldSystemBold: number;
            newAPIBold: number;
            boldDetails: any[];
        };
        rawDebugInfo: {
            contentLength: number;
            lineCount: number;
            hasActualBulletChars: boolean;
            sampleLines: string[];
        };
        recommendations: string[];
    }> {
        console.log('🧪 TESTING SPECIFIC WORD DOCUMENT:', file.name);

        try {
            // Process the document
            const result = await documentProcessor.processFile(file, {
                useRevolutionaryVision: true,
                generateTemplates: true
            });

            const extractedContent = result.content;

            // Test with NEW API
            const apiResult = await revolutionaryResumeFormatterAPI.processDocument(extractedContent);

            // Analyze raw content
            const lines = extractedContent.split('\n').filter(line => line.trim().length > 0);
            const hasActualBulletChars = extractedContent.includes('•') ||
                                        extractedContent.includes('▪') ||
                                        /^[\s]*[-–—]\s/.test(extractedContent);

            // Get OLD system results
            const oldSystemBullets = result.metadata?.formattingDetected?.bulletPoints || 0;
            const oldSystemBold = result.metadata?.formattingDetected?.boldElements || 0;

            // Get NEW API results
            const newAPIBullets = apiResult.summary.bulletsFound;
            const newAPIBold = apiResult.summary.boldElementsFound;

            // Generate recommendations
            const recommendations = this.generateRecommendations({
                hasActualBulletChars,
                oldSystemBullets,
                newAPIBullets,
                newAPIBold,
                contentLength: extractedContent.length
            });

            const testResults = {
                fileName: file.name,
                extractedContent,
                bulletTestResults: {
                    oldSystemBullets,
                    newAPIBullets,
                    bulletDetails: apiResult.analysis.detectedElements.bullets.slice(0, 10)
                },
                boldTestResults: {
                    oldSystemBold,
                    newAPIBold,
                    boldDetails: apiResult.analysis.detectedElements.boldText.slice(0, 10)
                },
                rawDebugInfo: {
                    contentLength: extractedContent.length,
                    lineCount: lines.length,
                    hasActualBulletChars,
                    sampleLines: lines.slice(0, 20)
                },
                recommendations
            };

            console.log('✅ WORD DOCUMENT TEST COMPLETE:', {
                fileName: file.name,
                oldVsNewBullets: `${oldSystemBullets} → ${newAPIBullets}`,
                oldVsNewBold: `${oldSystemBold} → ${newAPIBold}`,
                improvement: newAPIBullets > oldSystemBullets ? 'IMPROVED' : 'NEEDS WORK'
            });

            return testResults;

        } catch (error) {
            console.error('❌ Word document test failed:', error);
            throw error;
        }
    }

    /**
     * 📋 GENERATE RECOMMENDATIONS
     */
    private generateRecommendations(data: {
        hasActualBulletChars: boolean;
        oldSystemBullets: number;
        newAPIBullets: number;
        newAPIBold: number;
        contentLength: number;
    }): string[] {
        const recommendations = [];

        if (!data.hasActualBulletChars && data.newAPIBullets === 0) {
            recommendations.push('❌ No bullet characters found in extracted text - Word document may have used indentation instead of actual bullets');
            recommendations.push('💡 Try using bullet points (•) or dashes (-) in your Word document');
        }

        if (data.newAPIBullets > data.oldSystemBullets) {
            recommendations.push(`✅ NEW API detected ${data.newAPIBullets} bullets vs old system's ${data.oldSystemBullets} - IMPROVEMENT!`);
        } else if (data.newAPIBullets === 0 && data.oldSystemBullets === 0) {
            recommendations.push('⚠️ Both systems detected 0 bullets - check if your resume actually contains bullet points');
        }

        if (data.newAPIBold > 5) {
            recommendations.push(`✅ Bold text detection working: ${data.newAPIBold} bold elements found`);
        } else {
            recommendations.push('⚠️ Low bold text detection - ensure important text (name, job titles, companies) are bold in Word');
        }

        if (data.contentLength < 500) {
            recommendations.push('⚠️ Extracted content seems short - document may not have processed correctly');
        }

        return recommendations;
    }

    /**
     * 🧪 SHOW WORD TEST IN BROWSER
     */
    async showWordTestInBrowser(file: File): Promise<void> {
        console.log('🧪 Running Word document test in browser...');

        try {
            const results = await this.testWordDocument(file);

            // Remove existing test if present
            const existing = document.getElementById('word-document-bullet-test');
            if (existing) {
                existing.remove();
            }

            // Create test display
            const testDiv = document.createElement('div');
            testDiv.id = 'word-document-bullet-test';
            testDiv.style.cssText = `
                position: fixed;
                top: 20px;
                left: 20px;
                width: 90vw;
                max-height: 90vh;
                overflow-y: auto;
                z-index: 10002;
                background: white;
                border: 3px solid #2196F3;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            `;

            const improvement = results.bulletTestResults.newAPIBullets > results.bulletTestResults.oldSystemBullets;

            testDiv.innerHTML = `
                <div style="padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="margin: 0; color: #1976D2;">🧪 Word Document Bullet Test: ${results.fileName}</h2>
                        <button onclick="document.getElementById('word-document-bullet-test').remove()"
                                style="background: #f44336; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">
                            ✕ Close
                        </button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div style="padding: 15px; background: ${improvement ? '#e8f5e8' : '#fff3e0'}; border-radius: 8px; border-left: 4px solid ${improvement ? '#4CAF50' : '#FF9800'};">
                            <h3 style="margin-top: 0; color: ${improvement ? '#2E7D32' : '#F57C00'};">🔹 Bullet Detection Results</h3>
                            <p><strong>Old System:</strong> ${results.bulletTestResults.oldSystemBullets} bullets</p>
                            <p><strong>🚀 NEW API:</strong> ${results.bulletTestResults.newAPIBullets} bullets</p>
                            <p><strong>Status:</strong> ${improvement ? '✅ IMPROVED' : '⚠️ NEEDS WORK'}</p>
                        </div>

                        <div style="padding: 15px; background: #f3e5f5; border-radius: 8px; border-left: 4px solid #9C27B0;">
                            <h3 style="margin-top: 0; color: #7B1FA2;">📝 Bold Text Detection</h3>
                            <p><strong>Old System:</strong> ${results.boldTestResults.oldSystemBold} bold elements</p>
                            <p><strong>🚀 NEW API:</strong> ${results.boldTestResults.newAPIBold} bold elements</p>
                            <p><strong>Has Bullet Chars:</strong> ${results.rawDebugInfo.hasActualBulletChars ? '✅ YES' : '❌ NO'}</p>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px;">
                        <h3 style="margin-top: 0; color: #1565C0;">📋 Recommendations</h3>
                        <ul style="margin: 0; padding-left: 20px;">
                            ${results.recommendations.map(rec => `<li style="margin: 8px 0; color: #1565C0;">${rec}</li>`).join('')}
                        </ul>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #424242;">🔍 Detected Bullets (First 5)</h3>
                        <div style="background: #f5f5f5; padding: 10px; border-radius: 4px; max-height: 200px; overflow-y: auto;">
                            ${results.bulletTestResults.bulletDetails.length > 0 ?
                                results.bulletTestResults.bulletDetails.slice(0, 5).map(bullet =>
                                    `<div style="margin: 5px 0; padding: 5px; background: white; border-radius: 3px;">
                                        <strong>Line ${bullet.line}:</strong> ${bullet.cleanedText.substring(0, 100)}...
                                        <span style="color: #666; font-size: 11px;">(${bullet.bulletType})</span>
                                    </div>`
                                ).join('') :
                                '<p style="color: #666;">No bullets detected</p>'
                            }
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #424242;">📄 Raw Content Sample (First 1000 chars)</h3>
                        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px; max-height: 300px; overflow-y: auto; white-space: pre-wrap;">${results.extractedContent.substring(0, 1000)}...</pre>
                    </div>
                </div>
            `;

            document.body.appendChild(testDiv);

            console.log('✅ Word document test results displayed in browser!');

        } catch (error) {
            console.error('❌ Failed to show Word test:', error);
            alert(`Test failed: ${error.message}`);
        }
    }
}

// Make available globally for easy testing
(window as any).testWordDocument = async (file: File) => {
    const tester = new WordDocumentBulletTester();
    await tester.showWordTestInBrowser(file);
};

console.log('🧪 Word Document Bullet Tester loaded!');
console.log('📋 Drag and drop your resume.docx file, then run: testWordDocument(file)');

export default WordDocumentBulletTester;