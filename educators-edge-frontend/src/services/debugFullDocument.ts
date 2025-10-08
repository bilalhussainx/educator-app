// Debug tool to verify full document processing
export const debugFullDocument = () => {
    console.log('🔍 FULL DOCUMENT DEBUG');
    console.log('=' .repeat(60));

    // Get the current resume content from the page
    const resumeTextArea = document.querySelector('textarea') as HTMLTextAreaElement;
    const content = resumeTextArea?.value || '';

    if (!content) {
        console.log('❌ No resume content found in textarea');
        return;
    }

    console.log('📄 DOCUMENT ANALYSIS:');
    console.log(`Total length: ${content.length} characters`);
    console.log(`Total lines: ${content.split('\n').length}`);
    console.log(`Word count: ${content.trim().split(/\s+/).length}`);

    // Count sections
    const lines = content.split('\n');
    let sectionCount = 0;
    let workExperienceLines = [];
    let inWorkSection = false;

    lines.forEach((line, index) => {
        const trimmed = line.trim().toLowerCase();

        // Check for section headers
        if (trimmed.length > 0 && trimmed.length < 50) {
            const isSection = /experience|education|skill|summary|work|employment|project|certification|achievement|qualification/i.test(trimmed);
            if (isSection) {
                sectionCount++;
                console.log(`📋 Section ${sectionCount} at line ${index + 1}: "${line.trim()}"`);

                if (trimmed.includes('work') || trimmed.includes('experience')) {
                    inWorkSection = true;
                    workExperienceLines = [];
                } else {
                    inWorkSection = false;
                }
            }
        }

        if (inWorkSection && line.trim()) {
            workExperienceLines.push(`Line ${index + 1}: ${line}`);
        }
    });

    console.log(`\n📊 SUMMARY:`);
    console.log(`Sections found: ${sectionCount}`);
    console.log(`Work experience lines: ${workExperienceLines.length}`);

    // Show first and last 200 characters
    console.log(`\n📄 DOCUMENT START (200 chars):`);
    console.log(content.substring(0, 200));
    console.log(`\n📄 DOCUMENT END (200 chars):`);
    console.log(content.substring(content.length - 200));

    // Check for potential truncation indicators
    const potentialTruncation = [
        content.endsWith('...'),
        content.includes('[TRUNCATED]'),
        content.includes('...more'),
        content.length < 500 && content.includes('experience') // Suspiciously short for a full resume
    ];

    if (potentialTruncation.some(Boolean)) {
        console.log('\n⚠️  POTENTIAL TRUNCATION DETECTED!');
    }

    // Test template rendering
    console.log('\n🎨 TEMPLATE RENDERING TEST:');
    const templatePreview = document.querySelector('.resume-template-preview');
    if (templatePreview) {
        const renderedHTML = templatePreview.innerHTML;
        console.log(`Rendered HTML length: ${renderedHTML.length}`);
        console.log(`Template container height: ${templatePreview.clientHeight}px`);
        console.log(`Template scroll height: ${templatePreview.scrollHeight}px`);

        if (templatePreview.scrollHeight > templatePreview.clientHeight) {
            console.log('⚠️  CONTENT IS BEING CLIPPED! Scroll height > client height');
        }
    } else {
        console.log('❌ No template preview found');
    }

    return {
        contentLength: content.length,
        lineCount: lines.length,
        sectionCount,
        workExperienceLines: workExperienceLines.length,
        content: content
    };
};

// Add to window for browser console access
if (typeof window !== 'undefined') {
    (window as any).debugFullDocument = debugFullDocument;
    console.log('🔍 Full Document Debug loaded! Run: debugFullDocument()');
}

export default debugFullDocument;