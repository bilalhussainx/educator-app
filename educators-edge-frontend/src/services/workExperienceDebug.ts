// Debug work experience parsing
export const debugWorkExperience = () => {
    console.log('🔬 WORK EXPERIENCE DEBUG');
    console.log('=' .repeat(50));

    // Get current resume content
    const resumeTextArea = document.querySelector('textarea') as HTMLTextAreaElement;
    const content = resumeTextArea?.value || '';

    if (!content) {
        console.log('❌ No resume content found');
        return;
    }

    // Find work experience section
    const lines = content.split('\n');
    let workSectionStart = -1;
    let workSectionEnd = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toLowerCase();
        if (line.includes('work') || line.includes('experience') || line.includes('employment')) {
            workSectionStart = i;
            console.log(`📋 Work section detected at line ${i + 1}: "${lines[i]}"`);
            break;
        }
    }

    if (workSectionStart === -1) {
        console.log('❌ No work experience section found');
        return;
    }

    // Find next section or end
    for (let i = workSectionStart + 1; i < lines.length; i++) {
        const line = lines[i].trim().toLowerCase();
        if (line.includes('education') || line.includes('skills') || line.includes('project') ||
            (line.length > 0 && line.length < 30 && /^[A-Z]/.test(lines[i]) &&
             !lines[i].includes('•') && !lines[i].includes('-'))) {
            workSectionEnd = i;
            console.log(`📋 Work section ends at line ${i + 1}: "${lines[i]}"`);
            break;
        }
    }

    if (workSectionEnd === -1) {
        workSectionEnd = lines.length;
    }

    const workContent = lines.slice(workSectionStart + 1, workSectionEnd).join('\n');
    console.log('\n📄 Work Experience Content:');
    console.log(workContent);

    // Test job position detection
    console.log('\n🎯 JOB POSITION ANALYSIS:');
    const workLines = workContent.split('\n').filter(line => line.trim());

    workLines.forEach((line, index) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return;

        console.log(`Line ${index + 1}: "${trimmed}"`);

        // Check for job title patterns
        const isJobTitle = /\b(engineer|developer|manager|analyst|coordinator|specialist|assistant|administrator|faculty|member|lead|director)\b/i.test(trimmed) &&
                          trimmed.length < 100 && !trimmed.includes('•') && !trimmed.includes('-');

        // Check for company patterns
        const hasCompany = /\b(academy|healthynox|corporation|company|corp|inc|llc|ltd|university|school)\b/i.test(trimmed);

        // Check for date patterns
        const hasDate = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}/i.test(trimmed);

        // Check for responsibilities
        const isResponsibility = trimmed.length > 20 && (trimmed.startsWith('•') || trimmed.startsWith('-') || /^[A-Z]/.test(trimmed));

        if (isJobTitle) console.log('  ✅ POTENTIAL JOB TITLE');
        if (hasCompany) console.log('  🏢 HAS COMPANY');
        if (hasDate) console.log('  📅 HAS DATE');
        if (isResponsibility) console.log('  📝 RESPONSIBILITY/DESCRIPTION');

        console.log('');
    });

    return workContent;
};

// Add to window for browser console access
if (typeof window !== 'undefined') {
    (window as any).debugWorkExperience = debugWorkExperience;
    console.log('🔬 Work Experience Debug loaded! Run: debugWorkExperience()');
}

export default debugWorkExperience;