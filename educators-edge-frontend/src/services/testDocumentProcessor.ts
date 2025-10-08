// Test script for the enhanced document processor
import documentProcessor from './documentProcessor';

class DocumentProcessorTester {

    async runTests() {
        console.log('🧪 Starting Enhanced Document Processor Tests');
        console.log('=' .repeat(50));

        await this.testValidation();
        await this.testTemplateGeneration();
        await this.testProcessingCapabilities();

        console.log('✅ All tests completed!');
    }

    private async testValidation() {
        console.log('\n📋 Testing File Validation');
        console.log('-'.repeat(30));

        // Test different file types
        const testFiles = [
            { name: 'resume.pdf', type: 'application/pdf', size: 1024 * 1024 },
            { name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2 * 1024 * 1024 },
            { name: 'resume.doc', type: 'application/msword', size: 1.5 * 1024 * 1024 },
            { name: 'resume.txt', type: 'text/plain', size: 50 * 1024 },
            { name: 'resume.jpg', type: 'image/jpeg', size: 500 * 1024 }, // Should fail
            { name: 'huge-file.pdf', type: 'application/pdf', size: 150 * 1024 * 1024 } // Should fail - too large
        ];

        for (const fileInfo of testFiles) {
            const mockFile = this.createMockFile(fileInfo.name, fileInfo.type, fileInfo.size);
            const validation = documentProcessor.validateFile(mockFile);

            console.log(`${fileInfo.name}: ${validation.valid ? '✅ Valid' : '❌ Invalid'} ${validation.processor ? `(${validation.processor})` : ''}`);
            if (!validation.valid) {
                console.log(`   Error: ${validation.error}`);
            }
        }
    }

    private async testTemplateGeneration() {
        console.log('\n🎨 Testing Template Generation');
        console.log('-'.repeat(30));

        // Get available templates
        const templateOptions = documentProcessor.getAvailableTemplates();
        console.log('Available template styles:', templateOptions.styles);
        console.log('Available color schemes:', templateOptions.colorSchemes);
        console.log('Available layouts:', templateOptions.layouts);

        // Preview each template style
        for (const style of templateOptions.styles) {
            const preview = documentProcessor.previewTemplate(style);
            console.log(`\n${preview.name}: ${preview.description}`);
            console.log(`Preview: ${preview.preview}`);
        }
    }

    private async testProcessingCapabilities() {
        console.log('\n⚙️ Testing Processing Capabilities');
        console.log('-'.repeat(30));

        // Test with mock text file
        const mockResume = this.createMockResumeFile();

        try {
            console.log('Testing basic processing...');
            const basicResult = await documentProcessor.processFile(mockResume, {
                useEnhancedProcessing: false,
                generateTemplates: false
            });

            console.log('Basic processing result:', {
                success: basicResult.success,
                contentLength: basicResult.content.length,
                wordCount: basicResult.metadata.wordCount,
                extractionMethod: basicResult.metadata.extractionMethod
            });

            console.log('\nTesting enhanced processing...');
            const enhancedResult = await documentProcessor.processFile(mockResume, {
                useEnhancedProcessing: true,
                generateTemplates: false
            });

            console.log('Enhanced processing result:', {
                success: enhancedResult.success,
                contentLength: enhancedResult.content.length,
                wordCount: enhancedResult.metadata.wordCount,
                extractionMethod: enhancedResult.metadata.extractionMethod,
                hasEnhancedResult: !!enhancedResult.enhancedResult
            });

            console.log('\nTesting with template generation...');
            const templateResult = await documentProcessor.processFile(mockResume, {
                useEnhancedProcessing: true,
                generateTemplates: true,
                templateOptions: [
                    {
                        style: 'modern',
                        colorScheme: 'blue',
                        layout: 'single-column',
                        fontSize: 'medium',
                        includePhoto: false
                    },
                    {
                        style: 'professional',
                        colorScheme: 'monochrome',
                        layout: 'two-column',
                        fontSize: 'medium',
                        includePhoto: false
                    }
                ]
            });

            console.log('Template generation result:', {
                success: templateResult.success,
                templatesGenerated: templateResult.templates?.length || 0,
                templateStyles: templateResult.templates?.map(t => t.metadata.templateUsed) || []
            });

            if (templateResult.templates && templateResult.templates.length > 0) {
                const template = templateResult.templates[0];
                console.log('\nFirst template details:', {
                    style: template.metadata.templateUsed,
                    sections: template.metadata.sectionsIncluded.length,
                    wordCount: template.metadata.wordCount,
                    estimatedPages: template.metadata.estimatedPages,
                    htmlLength: template.html.length,
                    cssLength: template.css.length
                });
            }

        } catch (error) {
            console.error('❌ Processing test failed:', error);
        }
    }

    private createMockFile(name: string, type: string, size: number): File {
        const content = 'Mock file content for testing purposes';
        const blob = new Blob([content], { type });

        // Create a mock File object
        const file = new File([blob], name, { type });

        // Override size property for testing
        Object.defineProperty(file, 'size', {
            value: size,
            writable: false
        });

        return file;
    }

    private createMockResumeFile(): File {
        const resumeContent = `
John Doe
========

📧 john.doe@email.com | 📞 (555) 123-4567 | 📍 New York, NY | 🔗 linkedin.com/in/johndoe

PROFESSIONAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━

Experienced software engineer with 5+ years of expertise in full-stack development.
Passionate about creating scalable web applications and leading technical teams.

WORK EXPERIENCE
━━━━━━━━━━━━━━━━━━━━━━━━━

💼 Senior Software Engineer | 🏢 Tech Corp
📅 2020 - Present
  • Led development of microservices architecture serving 1M+ users
  • Implemented CI/CD pipelines reducing deployment time by 60%
  • Mentored 3 junior developers and conducted code reviews

💼 Software Engineer | 🏢 StartupXYZ
📅 2018 - 2020
  • Developed React-based frontend applications
  • Built RESTful APIs using Node.js and Express
  • Collaborated with design team to implement responsive UI/UX

EDUCATION
━━━━━━━━━━━━━━━━━━━━━━━━━

🎓 Bachelor of Science in Computer Science
🏢 University of Technology
📅 2014 - 2018

TECHNICAL SKILLS
━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️ Programming Languages: JavaScript, TypeScript, Python, Java
🛠️ Frameworks: React, Node.js, Express, Django
🛠️ Databases: MongoDB, PostgreSQL, Redis
🛠️ Cloud: AWS, Docker, Kubernetes

PROJECTS
━━━━━━━━━━━━━━━━━━━━━━━━━

📋 E-commerce Platform
• Built full-stack e-commerce solution with React and Node.js
• Integrated payment processing and inventory management
• Achieved 99.9% uptime with automated monitoring

📋 Task Management App
• Developed collaborative task management application
• Implemented real-time updates using WebSockets
• Deployed on AWS with auto-scaling capabilities
        `.trim();

        return new File([resumeContent], 'test-resume.txt', { type: 'text/plain' });
    }

    // Method to test with real files if available
    async testWithRealFile(file: File) {
        console.log('\n🔍 Testing with real file:', file.name);
        console.log('-'.repeat(30));

        try {
            const validation = documentProcessor.validateFile(file);
            console.log('Validation:', validation);

            if (!validation.valid) {
                console.log('❌ File validation failed, skipping processing');
                return;
            }

            const result = await documentProcessor.processFile(file, {
                useEnhancedProcessing: true,
                generateTemplates: true
            });

            console.log('Processing result:', {
                success: result.success,
                contentLength: result.content.length,
                wordCount: result.metadata.wordCount,
                extractionMethod: result.metadata.extractionMethod,
                completeness: result.metadata.completeness,
                templatesGenerated: result.templates?.length || 0
            });

            if (result.parsedResume) {
                console.log('Parsed resume:', {
                    name: result.parsedResume.name,
                    contactFields: Object.values(result.parsedResume.contact).filter(v => v).length,
                    sections: result.parsedResume.sections.length
                });
            }

        } catch (error) {
            console.error('❌ Real file test failed:', error);
        }
    }

    // Helper method to display processing statistics
    displayProcessingStats(result: any) {
        console.log('\n📊 Processing Statistics');
        console.log('-'.repeat(30));

        if (result.enhancedResult) {
            const enhanced = result.enhancedResult;
            console.log(`Extraction Method: ${enhanced.quality.extractionMethod}`);
            console.log(`Completeness: ${(enhanced.quality.completeness * 100).toFixed(1)}%`);

            if ('readability' in enhanced.quality) {
                console.log(`Readability: ${(enhanced.quality.readability * 100).toFixed(1)}%`);
            }
            if ('formattingPreserved' in enhanced.quality) {
                console.log(`Formatting Preserved: ${(enhanced.quality.formattingPreserved * 100).toFixed(1)}%`);
            }

            if (enhanced.quality.issues.length > 0) {
                console.log('Issues:', enhanced.quality.issues);
            }
        }

        console.log(`Processing Time: ${result.metadata.processingTime}ms`);
        console.log(`Word Count: ${result.metadata.wordCount}`);
        console.log(`Character Count: ${result.metadata.charactersCount}`);
    }
}

// Export tester for use in other files
export default new DocumentProcessorTester();

// Auto-run tests if this file is executed directly
if (typeof window !== 'undefined') {
    // Browser environment - you can call tester.runTests() manually
    console.log('📚 Document Processor Tester loaded. Call documentProcessorTester.runTests() to start testing.');
    (window as any).documentProcessorTester = new DocumentProcessorTester();
} else {
    // Node environment - run tests automatically
    const tester = new DocumentProcessorTester();
    tester.runTests().catch(console.error);
}