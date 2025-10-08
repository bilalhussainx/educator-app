// Instant debug tool to diagnose section detection issues
export const debugCurrentResume = () => {
    console.log('🔬 INSTANT RESUME DEBUG');
    console.log('=' .repeat(50));

    // Get the current resume content from the page
    const resumeTextArea = document.querySelector('textarea') as HTMLTextAreaElement;
    const content = resumeTextArea?.value || '';

    if (!content) {
        console.log('❌ No resume content found in textarea');
        return;
    }

    console.log('📄 Raw content length:', content.length);
    console.log('📄 Raw content preview:');
    console.log(content.substring(0, 500));
    console.log('\n' + '─'.repeat(50));

    // Test line by line section detection
    const lines = content.split('\n');
    console.log('\n🔍 LINE BY LINE ANALYSIS:');
    lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
            console.log(`Line ${index + 1}: "${trimmed}"`);

            // Test if it looks like a section header
            const isShort = trimmed.length < 50;
            const hasKeywords = /experience|education|skill|summary|work|employment|project|certification|achievement|qualification/i.test(trimmed);
            const hasFormatting = /[━─=*_\-]{3,}|📋|▶/.test(line);
            const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 2;

            if (isShort && (hasKeywords || hasFormatting || isAllCaps)) {
                console.log(`  🎯 POTENTIAL SECTION HEADER: ${trimmed}`);
            }
        }
    });

    return content;
};

// Add to window for browser console access
if (typeof window !== 'undefined') {
    (window as any).debugCurrentResume = debugCurrentResume;
    console.log('🔬 Debug function loaded! Run: debugCurrentResume()');
}

export default debugCurrentResume;