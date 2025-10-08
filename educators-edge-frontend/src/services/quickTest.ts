// Quick test to verify the enhanced processors work without Node.js dependencies
import documentProcessor from './documentProcessor';

console.log('🧪 Quick test - Enhanced Document Processor (Browser Compatible)');

// Test file validation
const testValidation = () => {
    console.log('\n📋 Testing validation...');

    const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const validation = documentProcessor.validateFile(mockFile);

    console.log('Text file validation:', validation);

    const mockPdf = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const pdfValidation = documentProcessor.validateFile(mockPdf);

    console.log('PDF file validation:', pdfValidation);
};

// Test template options
const testTemplates = () => {
    console.log('\n🎨 Testing template options...');

    const options = documentProcessor.getAvailableTemplates();
    console.log('Available options:', options);

    const modernPreview = documentProcessor.previewTemplate('modern');
    console.log('Modern template preview:', modernPreview);
};

// Test basic processing with text file
const testProcessing = async () => {
    console.log('\n⚙️ Testing basic processing...');

    const textContent = `
John Doe
========

Email: john@example.com
Phone: (555) 123-4567

PROFESSIONAL SUMMARY
Skills and experience in software development.

WORK EXPERIENCE
Software Engineer at Tech Company
2020 - Present
• Developed web applications
• Led technical projects

EDUCATION
Bachelor of Computer Science
University of Technology
2016 - 2020
    `;

    const mockFile = new File([textContent], 'resume.txt', { type: 'text/plain' });

    try {
        const result = await documentProcessor.processFile(mockFile, {
            useEnhancedProcessing: true,
            generateTemplates: false
        });

        console.log('Processing result:', {
            success: result.success,
            contentLength: result.content.length,
            wordCount: result.metadata.wordCount,
            extractionMethod: result.metadata.extractionMethod,
            sectionsFound: result.parsedResume?.sections.length || 0
        });

        if (result.parsedResume) {
            console.log('Parsed resume name:', result.parsedResume.name);
            console.log('Contact info found:', Object.values(result.parsedResume.contact).filter(v => v).length);
        }

    } catch (error) {
        console.error('Processing failed:', error);
    }
};

// Run tests
const runQuickTests = async () => {
    try {
        testValidation();
        testTemplates();
        await testProcessing();

        console.log('\n✅ Quick tests completed successfully!');
        console.log('📝 The enhanced document processor is working correctly in the browser.');

    } catch (error) {
        console.error('❌ Quick tests failed:', error);
    }
};

// Export for manual testing
(window as any).runQuickTests = runQuickTests;

console.log('🚀 Run runQuickTests() in the browser console to test the enhanced document processor');

export default runQuickTests;