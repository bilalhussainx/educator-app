// Debug utility to test resume processing with detailed logging
import documentProcessor from './documentProcessor';
import universalResumeParser from './universalResumeParser';

export const debugResumeProcessing = async (content: string) => {
    console.log('🔬 DEBUG: Starting resume processing debug...');
    console.log('📄 Content preview:', content.substring(0, 300));

    // Step 1: Test universal parser directly
    console.log('\n1️⃣ Testing Universal Resume Parser...');
    const parsedResume = universalResumeParser.parseResume(content);
    console.log('Parsed resume result:', {
        name: parsedResume.name,
        contactFields: Object.values(parsedResume.contact).filter(v => v).length,
        sections: parsedResume.sections.map(s => ({
            title: s.title,
            contentLength: s.content.length,
            confidence: s.confidence
        })),
        totalWordCount: parsedResume.wordCount
    });

    // Step 2: Test structured template generation
    console.log('\n2️⃣ Testing Structured Template Generation...');
    const structuredTemplate = universalResumeParser.generateStructuredTemplate(parsedResume);
    console.log('Structured template length:', structuredTemplate.length);
    console.log('Structured template preview:', structuredTemplate.substring(0, 500));

    // Step 3: Test quality analysis
    console.log('\n3️⃣ Testing Quality Analysis...');
    const qualityAnalysis = universalResumeParser.analyzeParsingQuality(parsedResume);
    console.log('Quality analysis:', qualityAnalysis);

    // Step 4: Test template engine
    console.log('\n4️⃣ Testing Template Engine...');
    try {
        const { default: resumeTemplateEngine } = await import('./resumeTemplateEngine');
        const templateResult = resumeTemplateEngine.generateResume(parsedResume, {
            style: 'modern',
            colorScheme: 'blue',
            layout: 'single-column',
            fontSize: 'medium',
            includePhoto: false
        });

        console.log('Template generation result:', {
            htmlLength: templateResult.html.length,
            cssLength: templateResult.css.length,
            sectionsIncluded: templateResult.metadata.sectionsIncluded,
            wordCount: templateResult.metadata.wordCount
        });

        console.log('Template HTML preview:', templateResult.html.substring(0, 800));

        return {
            parsedResume,
            structuredTemplate,
            qualityAnalysis,
            templateResult
        };
    } catch (error) {
        console.error('❌ Template generation failed:', error);
        return {
            parsedResume,
            structuredTemplate,
            qualityAnalysis,
            templateResult: null
        };
    }
};

// Test with sample resume content
export const testWithSampleResume = () => {
    const sampleContent = `
Bilal Hussain
Assistant Dispatcher
bilalhussain.v1@gmail.com
437-907-1483
Python, AP

PROFESSIONAL SUMMARY
Experienced dispatcher with strong communication skills and technical expertise in Python programming.
Dedicated professional with attention to detail and ability to work under pressure.

WORK EXPERIENCE
Assistant Dispatcher
Transportation Company
2020 - Present
• Coordinated vehicle dispatching for efficient operations
• Managed communication between drivers and management
• Maintained accurate records and documentation
• Utilized computer systems for tracking and reporting

TECHNICAL SKILLS
• Python programming
• Database management
• Computer systems operation
• Communication protocols
• Documentation and reporting

EDUCATION
High School Diploma
Local High School
2018

CERTIFICATIONS
• Dispatcher Certification
• Safety Training Completion
    `;

    return debugResumeProcessing(sampleContent);
};

// Export for browser console use
if (typeof window !== 'undefined') {
    (window as any).debugResumeProcessing = debugResumeProcessing;
    (window as any).testWithSampleResume = testWithSampleResume;
    console.log('🔬 Debug functions loaded! Use:');
    console.log('• debugResumeProcessing(content) - Test with your content');
    console.log('• testWithSampleResume() - Test with sample resume');
}

export default debugResumeProcessing;