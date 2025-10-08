import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import universalResumeParser, { ParsedResume } from './universalResumeParser';
import enhancedPdfProcessor, { EnhancedPdfResult } from './enhancedPdfProcessor';
import enhancedWordProcessor, { EnhancedWordResult } from './enhancedWordProcessor';
import resumeTemplateEngine, { TemplateOptions, TemplateResult } from './resumeTemplateEngine';
import professionalResumeEngine, { ProfessionalResumeData, ProfessionalTemplate } from './professionalResumeEngine';
import intelligentResumeAnalyzer, { ResumeAnalysis } from './intelligentResumeAnalyzer';
import intelligentParsingArbiterService, { ArbitratedResult } from './intelligentParsingArbiterService';
import { RevolutionaryTemplateFactory, RevolutionaryResumeTemplate } from './revolutionaryResumeTemplates';
import visionDocumentAPI from './visionDocumentAPI';
import revolutionaryResumeFormatterAPI, { FormattedResumeTemplate } from './revolutionaryResumeFormatterAPI';
import revolutionaryResumeSystem, { RevolutionaryProcessingResult, RevolutionaryProcessingOptions } from './revolutionaryResumeSystem';

// Configure PDF.js worker with fallback
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
} catch (error) {
    console.warn('Failed to load PDF.js worker from CDN, using fallback');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
}

interface DocumentProcessingResult {
    success: boolean;
    content: string;
    structuredContent?: string;
    parsedResume?: ParsedResume;
    enhancedResult?: EnhancedPdfResult | EnhancedWordResult;
    templates?: TemplateResult[];
    professionalTemplates?: ProfessionalTemplate[];

    // 🚀 REVOLUTIONARY VISION SYSTEM RESULTS
    revolutionaryTemplates?: RevolutionaryResumeTemplate[];
    formattedResumeTemplates?: FormattedResumeTemplate[]; // NEW: Actual formatted templates from API
    arbitrationResult?: ArbitratedResult; // 🧠 NEW: Intelligent parsing arbiter result
    visionAnalysis?: {
        multiModelAnalysis?: any;
        formattingHierarchy?: any;
        sectionDetection?: any;
        confidence?: {
            overall: number;
            formatting: number;
            sections: number;
            templates: number;
        };
    };

    aiAnalysis?: ResumeAnalysis;
    professionalData?: ProfessionalResumeData;
    metadata: {
        pages?: number;
        wordCount: number;
        charactersCount: number;
        processingTime: number;
        extractionMethod?: string;
        completeness?: number;
        formattingPreserved?: number;
        parsingQuality?: {
            score: number;
            issues: string[];
            suggestions: string[];
        };
        aiProcessingTime?: number;
        templateGenerationTime?: number;

        // 🔍 ENHANCED DEBUGGING INFO
        revolutionaryVisionEnabled?: boolean;
        formattingDetected?: {
            bulletPoints: number;
            boldElements: number;
            sections: number;
            patterns: string[];
        };
        processingSteps?: string[];
        confidenceBreakdown?: Record<string, number>;
    };
    error?: string;
}

class DocumentProcessor {

    private generateStructuredContent(parsedResume: ParsedResume): string {
        let structured = '';

        // Add name and contact information
        if (parsedResume.name) {
            structured += `${parsedResume.name}\n`;
            structured += '='.repeat(parsedResume.name.length) + '\n\n';
        }

        // Add contact information
        if (parsedResume.contact) {
            const contactParts = [];
            if (parsedResume.contact.email) contactParts.push(parsedResume.contact.email);
            if (parsedResume.contact.phone) contactParts.push(parsedResume.contact.phone);
            if (parsedResume.contact.address) contactParts.push(parsedResume.contact.address);
            if (parsedResume.contact.linkedin) contactParts.push(parsedResume.contact.linkedin);

            if (contactParts.length > 0) {
                structured += contactParts.join(' | ') + '\n\n';
            }
        }

        // Add all sections in order
        if (parsedResume.sections && parsedResume.sections.length > 0) {
            parsedResume.sections.forEach(section => {
                if (section.content && section.content.trim()) {
                    structured += `${section.title.toUpperCase()}\n`;
                    structured += '-'.repeat(section.title.length) + '\n';
                    structured += `${section.content.trim()}\n\n`;
                }
            });
        }

        return structured.trim();
    }

    private async generateBasicTemplate(content: string): Promise<TemplateResult[]> {
        console.log('📄 Generating basic template from raw content...');

        // Create a basic template that displays the raw content nicely
        const basicTemplate: TemplateResult = {
            id: 'basic-raw',
            name: 'Basic Format',
            style: 'professional',
            html: `
                <div class="resume-template basic-template">
                    <style>
                        .basic-template {
                            font-family: 'Times New Roman', serif;
                            line-height: 1.6;
                            max-width: 8.5in;
                            margin: 0 auto;
                            padding: 1in;
                            background: white;
                            color: #333;
                        }
                        .basic-template h1, .basic-template h2, .basic-template h3 {
                            color: #2c3e50;
                            margin-top: 1.5em;
                            margin-bottom: 0.5em;
                        }
                        .basic-template .section {
                            margin-bottom: 1.5em;
                        }
                        .basic-template ul {
                            margin: 0.5em 0;
                            padding-left: 1.5em;
                        }
                        .basic-template li {
                            margin-bottom: 0.3em;
                        }
                    </style>
                    <div class="content">
                        ${this.formatContentAsHTML(content)}
                    </div>
                </div>
            `,
            metadata: {
                pages: 1,
                isDownloadable: true,
                format: 'basic'
            }
        };

        return [basicTemplate];
    }

    private formatContentAsHTML(content: string): string {
        // Convert plain text to basic HTML while preserving structure
        return content
            .replace(/\n\n+/g, '</div><div class="section">')
            .replace(/^([A-Z\s&]+)$/gm, '<h2>$1</h2>')
            .replace(/^([A-Za-z\s&,-]+)\s*[-–—]\s*([A-Za-z\s&,.]+)$/gm, '<h3>$1 - $2</h3>')
            .replace(/^[\s]*[•▪▫◦‣⁃-]\s*/gm, '<li>')
            .replace(/\n/g, '<br>')
            .replace(/<br><li>/g, '</li><li>')
            .replace(/(<li>.*?)(<br>|$)/g, '$1</li>')
            .replace(/^/, '<div class="section">')
            .replace(/$/, '</div>')
            .replace(/<\/div><div class="section"><br>/g, '</div><div class="section">');
    }

    async processFile(file: File, options?: {
        useEnhancedProcessing?: boolean;
        generateTemplates?: boolean;
        templateOptions?: TemplateOptions[];
        useRevolutionaryVision?: boolean; // 🚀 NEW: Enable revolutionary vision system
        useRevolutionarySystem?: boolean; // 🚀 REVOLUTIONARY: Enable complete revolutionary system
        revolutionaryOptions?: Partial<RevolutionaryProcessingOptions>; // 🚀 REVOLUTIONARY: Advanced options
    }): Promise<DocumentProcessingResult> {
        const startTime = Date.now();
        const useEnhanced = options?.useEnhancedProcessing !== false; // Default to true
        const generateTemplates = options?.generateTemplates !== false; // Default to true for templates
        const useRevolutionaryVision = options?.useRevolutionaryVision !== false; // 🚀 Default to true
        const useRevolutionarySystem = options?.useRevolutionarySystem === true; // 🚀 REVOLUTIONARY: Opt-in for now

        // 🔍 ENHANCED DEBUGGING - Track processing steps
        const processingSteps: string[] = [];
        const confidenceBreakdown: Record<string, number> = {};

        console.log('🚀 REVOLUTIONARY VISION RESUME SYSTEM - DOCUMENT PROCESSING INITIATED');
        console.log(`📄 File: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
        console.log(`🔧 Enhanced Processing: ${useEnhanced}`);
        console.log(`📋 Generate Templates: ${generateTemplates}`);
        console.log(`🎯 Revolutionary Vision: ${useRevolutionaryVision}`);
        console.log(`🚀 Revolutionary System: ${useRevolutionarySystem}`);

        processingSteps.push('Processing initiated');

        // 🚀 REVOLUTIONARY SYSTEM PROCESSING - Complete new pipeline
        if (useRevolutionarySystem) {
            console.log('\n🌟 ACTIVATING REVOLUTIONARY RESUME SYSTEM');
            console.log('═══════════════════════════════════════════════════════════════');

            try {
                const revolutionaryResult = await revolutionaryResumeSystem.processResume(file, {
                    ...options?.revolutionaryOptions,
                    generateTemplates: generateTemplates,
                    industry: options?.revolutionaryOptions?.industry || 'technology' // Default industry
                });

                console.log('✅ REVOLUTIONARY SYSTEM PROCESSING COMPLETE');
                console.log(`📊 Overall Score: ${revolutionaryResult.overallScore}/100`);
                console.log(`🎯 Confidence: ${revolutionaryResult.metadata.confidenceLevel}%`);
                console.log(`⚡ Processing Time: ${revolutionaryResult.metadata.processingTime}ms`);
                console.log(`🔧 Components Used: ${revolutionaryResult.metadata.componentsUsed.join(', ')}`);

                // Convert Revolutionary Result to DocumentProcessingResult for compatibility
                return this.convertRevolutionaryToDocumentResult(revolutionaryResult, startTime);

            } catch (revolutionaryError) {
                console.error('❌ Revolutionary System failed, falling back to legacy system:', revolutionaryError);
                console.log('🔄 Falling back to legacy processing pipeline...');
                // Continue with legacy processing below
            }
        }

        try {
            let content: string;
            let metadata: any = {};
            let enhancedResult: EnhancedPdfResult | EnhancedWordResult | undefined;

            // Enhanced processing based on file type
            if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                if (useEnhanced) {
                    console.log('🚀 Using enhanced PDF processing...');
                    enhancedResult = await enhancedPdfProcessor.processPdf(file);
                    content = enhancedResult.text;
                    metadata.pages = enhancedResult.pages;
                    metadata.extractionMethod = enhancedResult.quality.extractionMethod;
                    metadata.completeness = enhancedResult.quality.completeness;
                    metadata.formattingPreserved = enhancedResult.quality.readability;

                    // Add enhanced metadata
                    if (enhancedResult.metadata) {
                        metadata = { ...metadata, ...enhancedResult.metadata };
                    }
                } else {
                    // Fallback to legacy processing
                    const result = await this.extractPdfText(file);
                    content = result.content;
                    metadata.pages = result.pages;
                }
            } else if (file.type.includes('word') || file.name.toLowerCase().endsWith('.docx') || file.name.toLowerCase().endsWith('.doc')) {
                if (useEnhanced) {
                    console.log('🚀 Using enhanced Word processing...');
                    enhancedResult = await enhancedWordProcessor.processWord(file);
                    content = enhancedResult.text;
                    metadata.extractionMethod = enhancedResult.quality.extractionMethod;
                    metadata.completeness = enhancedResult.quality.completeness;
                    metadata.formattingPreserved = enhancedResult.quality.readability;

                    // Add enhanced metadata
                    if (enhancedResult.metadata) {
                        metadata = { ...metadata, ...enhancedResult.metadata };
                    }
                } else {
                    // Fallback to legacy processing
                    content = await this.extractWordText(file);
                }
            } else if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
                content = await file.text();
                metadata.extractionMethod = 'direct-text';
            } else {
                throw new Error(`Unsupported file type: ${file.type || 'unknown'}`);
            }

            const processingTime = Date.now() - startTime;
            const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
            const charactersCount = content.length;

            // TWO-TRACK APPROACH: Raw content for display, parsed for templates/editing
            console.log('🔄 Using dual approach: raw content for display, parsed for templates...');
            let parsedResume: ParsedResume | null = null;
            let structuredContent: string = content; // Use exact extracted content for display
            let parsingQuality = {
                score: 1.0,
                issues: [],
                suggestions: ['Raw content preserved for display, parsing available for templates']
            };

            // Parse ONLY for templates and editing functionality
            try {
                console.log('🔍 Parsing resume for templates and editing features...');
                parsedResume = await universalResumeParser.parseResume(content);
                if (parsedResume) {
                    console.log('✅ Resume parsing successful for templates');
                }
            } catch (parseError) {
                console.warn('⚠️ Resume parsing failed, templates will be limited:', parseError);
                parsedResume = null;
            }

            // 🚀 REVOLUTIONARY VISION SYSTEM INTEGRATION
            const aiStartTime = Date.now();
            let templates: TemplateResult[] | undefined;
            let professionalTemplates: ProfessionalTemplate[] | undefined;
            let revolutionaryTemplates: RevolutionaryResumeTemplate[] | undefined;
            let arbitrationResult: ArbitratedResult | null = null;
            let formattedResumeTemplates: FormattedResumeTemplate[] | undefined; // NEW: Formatted templates from API
            let formatterResult: any = {
                summary: {
                    bulletsFound: 0,
                    boldElementsFound: 0,
                    sectionsFound: 0,
                    confidenceScore: 0,
                    improvements: []
                }
            }; // Initialize formatterResult
            let visionAnalysis: any = undefined;
            let aiAnalysis: ResumeAnalysis | undefined;
            let professionalData: ProfessionalResumeData | undefined;

            if (generateTemplates) {
                try {
                    if (useRevolutionaryVision) {
                        console.log('🚀 STARTING REVOLUTIONARY VISION ANALYSIS...');
                        processingSteps.push('Revolutionary vision analysis started');

                        try {
                            // 🔬 STEP 1: Advanced Vision Analysis
                            visionAnalysis = await this.performRevolutionaryVisionAnalysis(file, content, enhancedResult);
                            processingSteps.push('Vision analysis completed');
                        } catch (visionError) {
                            console.warn('⚠️ Vision analysis failed:', visionError);
                            processingSteps.push('Vision analysis failed, continuing with standard processing');
                            visionAnalysis = null;
                        }

                        try {
                            // 🎨 STEP 2: Revolutionary Template Generation
                            revolutionaryTemplates = await this.generateRevolutionaryTemplates(parsedResume, content, visionAnalysis);
                            processingSteps.push('Revolutionary templates generated');
                        } catch (templateError) {
                            console.warn('⚠️ Revolutionary template generation failed:', templateError);
                            processingSteps.push('Revolutionary template generation failed');
                            revolutionaryTemplates = [];
                        }

                        try {
                            // 🚀 STEP 3: NEW REVOLUTIONARY RESUME FORMATTER API
                            console.log('🚀 APPLYING REVOLUTIONARY RESUME FORMATTER API...');
                            formatterResult = await revolutionaryResumeFormatterAPI.processDocument(content);
                            formattedResumeTemplates = formatterResult.templates;
                            processingSteps.push('Revolutionary formatter API applied');
                        } catch (formatterError) {
                            console.warn('⚠️ Revolutionary formatter API failed:', formatterError);
                            processingSteps.push('Revolutionary formatter API failed');
                            formattedResumeTemplates = [];
                        }

                        // 🧠 STEP 4: INTELLIGENT PARSING ARBITER - Claude AI Decision Making
                        console.log('🧠 ACTIVATING INTELLIGENT PARSING ARBITER...');
                        try {
                            arbitrationResult = await intelligentParsingArbiterService.arbitrateParsing(
                                file,
                                content,
                                {
                                    includeAzureVision: true,
                                    includeRevolutionaryParser: true,
                                    includeUniversalParser: true,
                                    includeFormatterAPI: true,
                                    enableHybridCreation: true,
                                    priorityFocus: 'bullet_points' // Focus on fixing bullet point fragmentation
                                }
                            );

                            if (arbitrationResult && arbitrationResult.success) {
                                console.log('✅ INTELLIGENT ARBITER ANALYSIS COMPLETE:');
                                console.log(`   🎯 Best Source: ${arbitrationResult.chosenSource.name}`);
                                console.log(`   📊 Confidence: ${Math.round(arbitrationResult.confidence * 100)}%`);
                                console.log(`   🔧 Bullet Point Integrity: ${Math.round(arbitrationResult.contentValidation.bulletPointIntegrity * 100)}%`);
                                console.log(`   📋 Content Preservation: ${Math.round(arbitrationResult.contentValidation.structuralAccuracy * 100)}%`);

                                const fragmentationDetected = arbitrationResult.bulletPointAnalysis.some(b => b.isFragmented);
                                if (fragmentationDetected) {
                                    const fragmentedCount = arbitrationResult.bulletPointAnalysis.filter(b => b.isFragmented).length;
                                    console.log(`   ⚠️ Bullet Fragmentation Detected: ${fragmentedCount} issues found`);
                                    console.log(`   🔧 Applying Intelligent Reconstruction...`);
                                }

                                // Use the arbitrated result as the final parsed resume
                                parsedResume = arbitrationResult.parsedResume;
                                processingSteps.push(`Intelligent arbiter selected: ${arbitrationResult.chosenSource.name}`);

                                // 🔧 ENHANCE: Add computed properties for frontend compatibility
                                (arbitrationResult as any).bestSource = arbitrationResult.chosenSource;
                                (arbitrationResult as any).bulletPointIntegrity = arbitrationResult.contentValidation.bulletPointIntegrity;
                                (arbitrationResult as any).contentPreservation = arbitrationResult.contentValidation.structuralAccuracy;
                                (arbitrationResult as any).sourcesAnalyzed = arbitrationResult.metadata.totalSources;
                                (arbitrationResult as any).fragmentationDetected = arbitrationResult.bulletPointAnalysis.some(b => b.isFragmented);
                                (arbitrationResult as any).fragmentedBullets = arbitrationResult.bulletPointAnalysis
                                    .filter(b => b.isFragmented)
                                    .map(b => ({
                                        fragments: b.fragments,
                                        reconstructed: b.originalText,
                                        confidence: b.confidence
                                    }));
                            } else {
                                console.warn('⚠️ Intelligent arbiter failed or returned null, using fallback parsing');
                                processingSteps.push('Arbiter failed, using fallback');
                                arbitrationResult = null; // Ensure it's null for later checks
                            }
                        } catch (arbiterError) {
                            console.warn('⚠️ Intelligent arbiter error:', arbiterError);
                            console.error('Arbiter error details:', arbiterError);
                            processingSteps.push('Arbiter error, using original parsing');
                            arbitrationResult = null; // Ensure it's null for later checks
                        }

                        console.log(`🎯 Revolutionary Vision Analysis Complete:`);
                        console.log(`   📊 Overall Confidence: ${Math.round((visionAnalysis?.confidence?.overall || 0) * 100)}%`);
                        console.log(`   🎨 Formatting Confidence: ${Math.round((visionAnalysis?.confidence?.formatting || 0) * 100)}%`);
                        console.log(`   📋 Sections Detected: ${visionAnalysis?.sectionDetection?.sections?.length || 0}`);
                        console.log(`   📄 Revolutionary Templates: ${revolutionaryTemplates?.length || 0}`);

                        // 🎯 ENHANCED: Show NEW API Results
                        console.log(`🚀 REVOLUTIONARY FORMATTER API RESULTS:`);
                        console.log(`   🔹 Bullets Detected: ${formatterResult.summary.bulletsFound}`);
                        console.log(`   📝 Bold Elements: ${formatterResult.summary.boldElementsFound}`);
                        console.log(`   📋 Sections Found: ${formatterResult.summary.sectionsFound}`);
                        console.log(`   🎯 API Confidence: ${formatterResult.summary.confidenceScore}%`);
                        console.log(`   🎨 Formatted Templates: ${formattedResumeTemplates.length}`);
                        console.log(`   ✨ Improvements: ${formatterResult.summary.improvements.length}`);

                        // Store confidence scores for debugging - Use NEW API confidence if available
                        if (formatterResult.summary.confidenceScore > 0) {
                            confidenceBreakdown.overall = formatterResult.summary.confidenceScore / 100;
                            confidenceBreakdown.formatting = formatterResult.summary.bulletsFound > 0 ? 0.9 : 0.3;
                            confidenceBreakdown.sections = formatterResult.summary.sectionsFound > 2 ? 0.9 : 0.5;
                            confidenceBreakdown.templates = formattedResumeTemplates?.length || 0;
                            console.log('📊 USING NEW API CONFIDENCE SCORES:', confidenceBreakdown);
                        } else {
                            // Fallback to old confidence
                            confidenceBreakdown.overall = visionAnalysis?.confidence?.overall || 0;
                            confidenceBreakdown.formatting = visionAnalysis?.confidence?.formatting || 0;
                            confidenceBreakdown.sections = visionAnalysis?.confidence?.sections || 0;
                            confidenceBreakdown.templates = revolutionaryTemplates?.length ? 1 : 0;
                        }
                    }

                    // 🧠 Standard AI Analysis (kept for compatibility)
                    try {
                        console.log('🧠 Starting standard AI analysis...');
                        aiAnalysis = intelligentResumeAnalyzer.analyzeResume(content, 'software');
                        processingSteps.push('AI analysis completed');
                    } catch (aiError) {
                        console.warn('⚠️ AI analysis failed:', aiError);
                        processingSteps.push('AI analysis failed');
                        aiAnalysis = { overall: { score: 50, grade: 'C' }, improvements: [], strengths: [] } as any;
                    }

                    // Convert to professional format
                    if (parsedResume) {
                        try {
                            professionalData = this.convertToProfessionalFormat(parsedResume);

                            // Generate professional templates (legacy)
                            professionalTemplates = professionalResumeEngine.getAvailableTemplates();

                            console.log(`✅ Generated ${professionalTemplates.length} professional templates with AI analysis`);
                            console.log(`📊 AI Analysis Score: ${aiAnalysis?.overall?.score || 50}/100 (${aiAnalysis?.overall?.grade || 'N/A'})`);

                            // Legacy templates for backward compatibility
                            templates = await this.generateResumeTemplates(parsedResume, options.templateOptions);
                        } catch (templateError) {
                            console.warn('⚠️ Template generation failed:', templateError);
                            templates = await this.generateBasicTemplate(content);
                            professionalTemplates = professionalResumeEngine.getAvailableTemplates();
                        }
                    } else {
                        console.log('⚠️ Using basic template due to parsing limitations');
                        templates = await this.generateBasicTemplate(content);
                        professionalTemplates = professionalResumeEngine.getAvailableTemplates();
                    }

                } catch (error) {
                    console.error('❌ Template generation failed:', error);
                    templates = await this.generateBasicTemplate(content);
                    processingSteps.push(`Template generation failed: ${error.message}`);
                }
            }

            const aiProcessingTime = Date.now() - aiStartTime;

            console.log('📊 Enhanced processing complete:', {
                method: metadata.extractionMethod,
                completeness: metadata.completeness,
                wordCount,
                templatesGenerated: templates?.length || 0
            });

            // DEBUG: Log content preservation
            console.log('🔍 CONTENT PRESERVATION CHECK:', {
                originalLength: content.length,
                firstLine: content.split('\n')[0],
                lastLine: content.split('\n').slice(-1)[0],
                hasMultipleSections: content.toLowerCase().includes('experience') && content.toLowerCase().includes('education'),
                sampleContent: content.substring(0, 300) + '...'
            });

            // 🔍 ENHANCED DEBUGGING - Use NEW API detection results if available
            let formattingDetected;
            if (formattedResumeTemplates && formattedResumeTemplates.length > 0) {
                // Use the NEW API's superior detection results
                const apiStats = formattedResumeTemplates[0].detectionStats;
                formattingDetected = {
                    bulletPoints: apiStats.bulletsDetected,
                    boldElements: apiStats.boldElementsDetected,
                    sections: apiStats.sectionsDetected,
                    patterns: ['bullets', 'sections', 'bold-text', 'contact-info']
                };
                console.log('🚀 USING NEW API DETECTION RESULTS:', formattingDetected);
            } else {
                // Fallback to old detection method
                formattingDetected = this.analyzeFormattingDetected(content, visionAnalysis);
                console.log('🔍 FALLBACK FORMATTING DETECTION RESULTS:', formattingDetected);
            }
            processingSteps.push('Formatting analysis completed');

            return {
                success: true,
                content: content.trim(), // Raw content for display
                structuredContent, // Structured content for editing
                parsedResume, // Parsed data for functionality
                professionalTemplates, // Professional-grade templates
                aiAnalysis, // Intelligent AI analysis
                professionalData, // Professional resume data format
                enhancedResult,
                templates, // Legacy templates for compatibility

                // 🚀 REVOLUTIONARY VISION SYSTEM RESULTS
                revolutionaryTemplates, // Revolutionary vision-enhanced templates
                formattedResumeTemplates, // NEW: Formatted templates from Revolutionary API
                arbitrationResult, // 🧠 NEW: Intelligent parsing arbiter result
                visionAnalysis, // Complete vision analysis results

                metadata: {
                    ...metadata,
                    wordCount,
                    charactersCount,
                    processingTime,
                    parsingQuality,
                    aiProcessingTime,
                    templateGenerationTime: aiProcessingTime,

                    // 🔍 ENHANCED DEBUGGING INFO
                    revolutionaryVisionEnabled: useRevolutionaryVision,
                    formattingDetected,
                    processingSteps,
                    confidenceBreakdown
                }
            };

        } catch (error: any) {
            console.error('Enhanced document processing error:', error);

            // Try fallback processing if enhanced fails
            if (useEnhanced) {
                console.log('🔄 Enhanced processing failed, trying legacy fallback...');
                try {
                    return await this.processFile(file, { ...options, useEnhancedProcessing: false });
                } catch (fallbackError) {
                    console.error('Fallback processing also failed:', fallbackError);
                }
            }

            return {
                success: false,
                content: '',
                metadata: {
                    wordCount: 0,
                    charactersCount: 0,
                    processingTime: Date.now() - startTime,
                    extractionMethod: 'failed'
                },
                error: error.message || 'Failed to process document'
            };
        }
    }

    /**
     * 🚀 REVOLUTIONARY VISION ANALYSIS
     * Perform comprehensive document analysis using the revolutionary vision system
     */
    private async performRevolutionaryVisionAnalysis(
        file: File,
        content: string,
        enhancedResult?: any
    ): Promise<any> {
        console.log('🔬 PERFORMING REVOLUTIONARY VISION ANALYSIS...');
        const startTime = Date.now();

        try {
            // 🎯 STEP 1: Multi-Model Analysis (simulate since we might not have Azure credentials)
            console.log('📊 Step 1: Multi-model document intelligence analysis...');
            const multiModelAnalysis = await this.simulateMultiModelAnalysis(file, content);

            // 🎨 STEP 2: Formatting Hierarchy Detection
            console.log('🎨 Step 2: Building formatting hierarchy...');
            const formattingHierarchy = this.buildMockFormattingHierarchy(content);

            // 🔍 STEP 3: Section Detection
            console.log('🔍 Step 3: Revolutionary section detection...');
            const sectionDetection = this.performAdvancedSectionDetection(content);

            // 📊 STEP 4: Calculate Overall Confidence
            const confidence = {
                overall: (multiModelAnalysis.confidence + formattingHierarchy.confidence + sectionDetection.confidence) / 3,
                formatting: formattingHierarchy.confidence,
                sections: sectionDetection.confidence,
                templates: 0.9
            };

            const analysisResult = {
                multiModelAnalysis,
                formattingHierarchy,
                sectionDetection,
                confidence,
                processingTime: Date.now() - startTime
            };

            console.log(`✅ Revolutionary vision analysis complete in ${analysisResult.processingTime}ms`);
            console.log(`📊 Overall confidence: ${Math.round(confidence.overall * 100)}%`);

            return analysisResult;

        } catch (error) {
            console.error('❌ Revolutionary vision analysis failed:', error);

            // Return fallback analysis
            return {
                multiModelAnalysis: { success: false, error: error.message },
                formattingHierarchy: { confidence: 0.3 },
                sectionDetection: { confidence: 0.3, sections: [] },
                confidence: { overall: 0.3, formatting: 0.3, sections: 0.3, templates: 0.3 },
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * 🎨 REVOLUTIONARY TEMPLATE GENERATION
     * Generate vision-enhanced templates using the revolutionary system
     */
    private async generateRevolutionaryTemplates(
        parsedResume: ParsedResume | null,
        content: string,
        visionAnalysis: any
    ): Promise<RevolutionaryResumeTemplate[]> {
        console.log('🎨 GENERATING REVOLUTIONARY TEMPLATES...');

        try {
            // Generate all revolutionary templates
            const templates = RevolutionaryTemplateFactory.getAllTemplates();

            // 🎯 FIXED: Enhanced template enhancement with proper null checks
            if (visionAnalysis && visionAnalysis.confidence && visionAnalysis.confidence.overall > 0.5) {
                console.log('🎯 Enhancing templates with vision analysis...');

                // Apply vision-enhanced formatting to each template
                templates.forEach(template => {
                    try {
                        // Mock text elements for formatting
                        const mockElements = this.createMockTextElements(content);

                        // Apply vision-enhanced formatting with null checks
                        const enhancedFormatting = template.applyFormatting(mockElements, visionAnalysis);

                        // Store enhanced formatting in template metadata with fallbacks
                        (template as any).visionEnhancedFormatting = enhancedFormatting;
                        (template as any).visionConfidence = visionAnalysis?.confidence?.overall || 0.8;

                        const confidencePercent = Math.round((visionAnalysis?.confidence?.overall || 0.8) * 100);
                        console.log(`✅ Enhanced ${template.name} template with vision data (confidence: ${confidencePercent}%)`);

                    } catch (error) {
                        console.warn(`⚠️ Failed to enhance ${template.name} template:`, error);
                        // Continue with basic template
                        (template as any).visionConfidence = 0.5;
                    }
                });
            } else {
                // 📝 FALLBACK: Basic enhancement for low confidence or missing vision data
                console.log('📝 Applying basic template enhancement (low confidence or missing vision data)...');
                templates.forEach(template => {
                    (template as any).visionConfidence = 0.5;
                    console.log(`📝 Basic enhancement applied to ${template.name} template`);
                });
            }

            console.log(`✅ Generated ${templates.length} revolutionary templates`);
            return templates;

        } catch (error) {
            console.error('❌ Revolutionary template generation failed:', error);

            // Return basic templates
            return [RevolutionaryTemplateFactory.createATSFriendlyTemplate()];
        }
    }

    /**
     * 🔍 ANALYZE FORMATTING DETECTED
     * Analyze what formatting elements were successfully detected
     */
    private analyzeFormattingDetected(content: string, visionAnalysis?: any): {
        bulletPoints: number;
        boldElements: number;
        sections: number;
        patterns: string[];
    } {
        console.log('🔍 ANALYZING FORMATTING DETECTION...');

        const analysis = {
            bulletPoints: 0,
            boldElements: 0,
            sections: 0,
            patterns: [] as string[]
        };

        try {
            // 🔹 ENHANCED BULLET POINT DETECTION
            console.log('🔍 Analyzing content for bullet patterns...');

            // 🔍 FIXED BULLET DETECTION - No duplicate counting
            console.log('🔍 Content sample for analysis:', content.substring(0, 500));

            // Enhanced bullet detection with deduplication
            const lines = content.split('\n');
            const bulletLines = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Check if line starts with bullet patterns
                if (/^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾]\s/.test(line) ||      // Unicode bullets
                    /^[\s]*[-–—]\s/.test(line) ||                   // Dash bullets (not asterisk to avoid conflicts)
                    /^[\s]*\d+\.\s/.test(line) ||                   // Numbered lists
                    /^\s*\*\s/.test(line)) {                        // Asterisk bullets

                    bulletLines.push({
                        lineNumber: i + 1,
                        content: line.trim(),
                        pattern: this.detectBulletPattern(line)
                    });
                }
            }

            const totalBullets = bulletLines.length;
            const bulletDetails = [{
                pattern: 'All bullet patterns combined',
                count: totalBullets,
                examples: bulletLines.slice(0, 3).map(b => b.content)
            }];

            // 📝 BOLD TEXT DETECTION IN CONTENT
            const boldMatches = content.match(/<strong[^>]*>.*?<\/strong>/gi) || [];
            const wordBoldMatches = content.match(/\*\*.*?\*\*/g) || [];

            analysis.bulletPoints = totalBullets;
            analysis.boldElements = boldMatches.length + wordBoldMatches.length;

            console.log('🔹 Bullet detection details:', bulletDetails);
            console.log(`🔹 Total bullets found: ${totalBullets}`);
            console.log(`📝 Bold elements found: ${analysis.boldElements}`);

            // Detect section headers (uppercase lines)
            const sectionMatches = content.match(/^[A-Z\s&-]{3,30}$/gm);
            analysis.sections = sectionMatches ? sectionMatches.length : 0;

            // Detect patterns
            if (content.includes('@')) analysis.patterns.push('email');
            if (/\d{3}[-.]?\d{3}[-.]?\d{4}/.test(content)) analysis.patterns.push('phone');
            if (/\d{4}\s*[-–—]\s*(\d{4}|present|current)/i.test(content)) analysis.patterns.push('dates');
            if (analysis.bulletPoints > 0) analysis.patterns.push('bullets');
            if (analysis.sections > 0) analysis.patterns.push('sections');

            // Use vision analysis data if available
            if (visionAnalysis?.formattingHierarchy) {
                const hierarchy = visionAnalysis.formattingHierarchy;

                if (hierarchy.level2_fontAnalysis?.boldElements) {
                    analysis.boldElements = hierarchy.level2_fontAnalysis.boldElements.length;
                }

                if (hierarchy.level3_patternDetection?.patterns) {
                    const visionPatterns = hierarchy.level3_patternDetection.patterns.map((p: any) => p.type || p);
                    analysis.patterns = [...new Set([...analysis.patterns, ...visionPatterns])];
                }
            }

            console.log(`🔍 Formatting analysis: ${analysis.bulletPoints} bullets, ${analysis.boldElements} bold, ${analysis.sections} sections`);

        } catch (error) {
            console.error('❌ Formatting analysis failed:', error);
        }

        return analysis;
    }

    /**
     * 🔍 DETECT BULLET PATTERN TYPE
     * Helper method to identify what type of bullet is used
     */
    private detectBulletPattern(line: string): string {
        if (/^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾]\s/.test(line)) return 'unicode-bullet';
        if (/^[\s]*[-–—]\s/.test(line)) return 'dash-bullet';
        if (/^[\s]*\d+\.\s/.test(line)) return 'numbered-list';
        if (/^\s*\*\s/.test(line)) return 'asterisk-bullet';
        return 'unknown';
    }

    /**
     * 🔬 SIMULATE MULTI-MODEL ANALYSIS
     * Mock multi-model analysis for testing when Azure isn't available
     */
    private async simulateMultiModelAnalysis(file: File, content: string): Promise<any> {
        console.log('🔬 Simulating multi-model analysis...');

        // Calculate confidence based on content quality
        const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content);
        const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(content);
        const hasSections = content.toLowerCase().includes('experience') && content.toLowerCase().includes('education');
        const hasStructure = /^[A-Z\s&-]{3,30}$/gm.test(content);

        const qualityScore = (
            (hasEmail ? 0.25 : 0) +
            (hasPhone ? 0.25 : 0) +
            (hasSections ? 0.25 : 0) +
            (hasStructure ? 0.25 : 0)
        );

        return {
            success: true,
            layoutModel: { success: true, confidence: 0.8 + qualityScore * 0.1 },
            resumeModel: { success: true, confidence: 0.75 + qualityScore * 0.15 },
            confidence: 0.8 + qualityScore * 0.1,
            modelsUsed: ['layout-simulation', 'resume-simulation']
        };
    }

    /**
     * 🏗️ BUILD MOCK FORMATTING HIERARCHY
     * Create formatting hierarchy for testing
     */
    private buildMockFormattingHierarchy(content: string): any {
        const bulletPoints = (content.match(/^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾*\-–—]\s/gm) || []).length;
        const sections = (content.match(/^[A-Z\s&-]{3,30}$/gm) || []).length;
        const hasEmail = /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(content);
        const hasPhone = /\d{3}[-.]?\d{3}[-.]?\d{4}/.test(content);

        const confidence = Math.min(0.9, 0.4 + (bulletPoints * 0.1) + (sections * 0.1) + (hasEmail ? 0.1 : 0) + (hasPhone ? 0.1 : 0));

        return {
            level1_azureStyles: { stylesFound: sections, confidence: 0.8 },
            level2_fontAnalysis: {
                boldElements: new Array(sections).fill(null).map((_, i) => ({ text: `Section ${i + 1}`, fontWeight: 'bold' })),
                confidence: 0.7
            },
            level3_patternDetection: {
                patterns: [
                    ...(bulletPoints > 0 ? ['bullet'] : []),
                    ...(sections > 0 ? ['header'] : []),
                    ...(hasEmail ? ['email'] : []),
                    ...(hasPhone ? ['phone'] : [])
                ],
                confidence: 0.6
            },
            confidence
        };
    }

    /**
     * 🔍 PERFORM ADVANCED SECTION DETECTION
     * Advanced section detection for testing
     */
    private performAdvancedSectionDetection(content: string): any {
        const lines = content.split('\n');
        const sections = [];

        // Common resume sections
        const sectionKeywords = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'];

        for (const line of lines) {
            const trimmedLine = line.trim().toLowerCase();

            if (sectionKeywords.some(keyword => trimmedLine.includes(keyword)) ||
                (line.trim() === line.trim().toUpperCase() && line.trim().length > 3 && line.trim().length < 30)) {

                sections.push({
                    title: line.trim(),
                    type: this.determineSectionType(line.trim()),
                    confidence: 0.8
                });
            }
        }

        const confidence = sections.length > 0 ? Math.min(0.9, 0.3 + (sections.length * 0.15)) : 0.2;

        return {
            sections,
            confidence,
            algorithmsUsed: ['pattern', 'keyword', 'structure'],
            totalSections: sections.length
        };
    }

    /**
     * 📝 CREATE MOCK TEXT ELEMENTS
     * Create mock text elements for template testing
     */
    private createMockTextElements(content: string): any[] {
        const lines = content.split('\n').filter(line => line.trim());

        return lines.slice(0, 20).map((line, index) => ({
            text: line.trim(),
            boundingBox: { x: 50, y: 50 + (index * 20), width: 400, height: 12 },
            fontSize: line.trim() === line.trim().toUpperCase() && line.trim().length < 50 ? 14 : 12,
            fontWeight: line.trim() === line.trim().toUpperCase() || line.includes('•') ? 'bold' : 'normal',
            role: line.includes('•') ? 'bulletPoint' : (line.trim() === line.trim().toUpperCase() ? 'heading' : 'content')
        }));
    }

    /**
     * 🔍 DETERMINE SECTION TYPE
     * Determine the type of a resume section
     */
    private determineSectionType(title: string): string {
        const titleLower = title.toLowerCase();

        if (titleLower.includes('experience') || titleLower.includes('work') || titleLower.includes('employment')) return 'experience';
        if (titleLower.includes('education') || titleLower.includes('academic') || titleLower.includes('school')) return 'education';
        if (titleLower.includes('skills') || titleLower.includes('technical') || titleLower.includes('competenc')) return 'skills';
        if (titleLower.includes('summary') || titleLower.includes('objective') || titleLower.includes('profile')) return 'summary';
        if (titleLower.includes('project') || titleLower.includes('portfolio')) return 'projects';
        if (titleLower.includes('certif') || titleLower.includes('license')) return 'certifications';
        if (titleLower.includes('contact') || titleLower.includes('information')) return 'contact';

        return 'other';
    }

    private convertToProfessionalFormat(parsedResume: ParsedResume): ProfessionalResumeData {
        // Convert universal parser format to professional template format
        const professionalData: ProfessionalResumeData = {
            personal: {
                name: parsedResume.name || '',
                title: '', // Extract from content analysis
                email: parsedResume.contact?.email || '',
                phone: parsedResume.contact?.phone || '',
                location: parsedResume.contact?.address || '',
                linkedin: parsedResume.contact?.linkedin || '',
                website: parsedResume.contact?.website || '',
                summary: ''
            },
            experience: [],
            education: [],
            skills: {
                technical: [],
                languages: [],
                frameworks: [],
                tools: []
            },
            projects: [],
            certifications: []
        };

        // Process sections to extract structured data
        if (parsedResume.sections) {
            parsedResume.sections.forEach(section => {
                const title = section.title.toLowerCase();
                const content = section.content;

                if (title.includes('summary') || title.includes('objective') || title.includes('profile')) {
                    professionalData.personal.summary = content;
                } else if (title.includes('experience') || title.includes('work') || title.includes('employment')) {
                    const experiences = this.parseAdvancedWorkExperience(content);
                    professionalData.experience.push(...experiences);
                } else if (title.includes('education') || title.includes('academic')) {
                    const educationEntries = this.parseAdvancedEducation(content);
                    professionalData.education.push(...educationEntries);
                } else if (title.includes('skill') || title.includes('technical') || title.includes('competenc')) {
                    const skills = this.parseAdvancedSkills(content);
                    professionalData.skills = { ...professionalData.skills, ...skills };
                }
            });
        }

        // Auto-generate title if not found
        if (!professionalData.personal.title && professionalData.experience.length > 0) {
            professionalData.personal.title = professionalData.experience[0].position;
        }

        return professionalData;
    }

    private parseAdvancedWorkExperience(content: string): Array<{
        position: string;
        company: string;
        location?: string;
        startDate: string;
        endDate: string;
        current?: boolean;
        achievements: string[];
        technologies?: string[];
    }> {
        const experiences = [];
        const lines = content.split('\n').filter(line => line.trim());

        let currentExp: any = null;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (this.isJobHeader(trimmedLine)) {
                if (currentExp) {
                    experiences.push(currentExp);
                }

                const parsed = this.parseJobHeader(trimmedLine);
                currentExp = {
                    position: parsed.position,
                    company: parsed.company,
                    location: '',
                    startDate: '',
                    endDate: '',
                    current: false,
                    achievements: [],
                    technologies: []
                };
            } else if (this.isDateLine(trimmedLine) && currentExp) {
                const dates = this.extractDates(trimmedLine);
                currentExp.startDate = dates.startDate;
                currentExp.endDate = dates.endDate;
                currentExp.current = dates.endDate.toLowerCase().includes('present') ||
                                   dates.endDate.toLowerCase().includes('current');
            } else if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
                if (currentExp) {
                    const achievement = trimmedLine.replace(/^[•\-*]\s*/, '').trim();
                    currentExp.achievements.push(achievement);
                }
            } else if (currentExp && trimmedLine) {
                // Location or other info
                if (currentExp.achievements.length === 0 && !this.isDateLine(trimmedLine)) {
                    currentExp.location = trimmedLine;
                }
            }
        }

        if (currentExp) {
            experiences.push(currentExp);
        }

        return experiences;
    }

    private parseAdvancedEducation(content: string): Array<{
        degree: string;
        institution: string;
        location?: string;
        year: string;
        gpa?: string;
        honors?: string[];
    }> {
        const lines = content.split('\n').filter(line => line.trim());
        const education = [];

        let currentEdu: any = null;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.includes('Bachelor') || trimmedLine.includes('Master') ||
                trimmedLine.includes('PhD') || trimmedLine.includes('Associate')) {
                if (currentEdu) {
                    education.push(currentEdu);
                }

                currentEdu = {
                    degree: trimmedLine,
                    institution: '',
                    location: '',
                    year: this.extractYear(trimmedLine),
                    honors: []
                };
            } else if (currentEdu && (trimmedLine.includes('University') ||
                     trimmedLine.includes('College') || trimmedLine.includes('Institute'))) {
                currentEdu.institution = trimmedLine;
            } else if (currentEdu && /gpa.*\d+\.\d+/i.test(trimmedLine)) {
                const gpaMatch = trimmedLine.match(/gpa.*?(\d+\.\d+)/i);
                if (gpaMatch) {
                    currentEdu.gpa = gpaMatch[1];
                }
            } else if (currentEdu && /(magna cum laude|summa cum laude|cum laude|dean.*list|honor)/i.test(trimmedLine)) {
                currentEdu.honors.push(trimmedLine);
            }
        }

        if (currentEdu) {
            education.push(currentEdu);
        }

        return education;
    }

    private parseAdvancedSkills(content: string): {
        technical?: string[];
        languages?: string[];
        frameworks?: string[];
        tools?: string[];
    } {
        const skills: any = {};
        const lines = content.split('\n');

        let currentCategory = 'technical';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (/programming|technical|languages/i.test(trimmedLine) && trimmedLine.length < 50) {
                currentCategory = 'technical';
            } else if (/framework|libraries/i.test(trimmedLine) && trimmedLine.length < 50) {
                currentCategory = 'frameworks';
            } else if (/tools|software/i.test(trimmedLine) && trimmedLine.length < 50) {
                currentCategory = 'tools';
            } else if (/language/i.test(trimmedLine) && trimmedLine.length < 50) {
                currentCategory = 'languages';
            } else if (trimmedLine) {
                const skillItems = trimmedLine.split(/[,•\n]/)
                    .map(skill => skill.trim())
                    .filter(skill => skill.length > 0 && skill.length < 30);

                if (!skills[currentCategory]) {
                    skills[currentCategory] = [];
                }
                skills[currentCategory].push(...skillItems);
            }
        }

        return skills;
    }

    private convertToTemplateFormat(parsedResume: ParsedResume): any {
        // Convert universal parser format to template engine format
        const templateData = {
            contactInfo: {
                name: parsedResume.name || '',
                email: parsedResume.contact?.email || '',
                phone: parsedResume.contact?.phone || '',
                address: parsedResume.contact?.address || '',
                linkedin: parsedResume.contact?.linkedin || '',
                website: parsedResume.contact?.website || ''
            },
            summary: '',
            experience: [],
            education: [],
            skills: [],
            sections: parsedResume.sections || [],  // Preserve original sections
            name: parsedResume.name || '',
            contact: parsedResume.contact,
            wordCount: parsedResume.wordCount || 0
        };

        // Process sections to extract structured data
        if (parsedResume.sections) {
            parsedResume.sections.forEach(section => {
                const title = section.title.toLowerCase();
                const content = section.content;

                if (title.includes('summary') || title.includes('objective') || title.includes('profile')) {
                    templateData.summary = content;
                } else if (title.includes('experience') || title.includes('work') || title.includes('employment')) {
                    // Split work experience into separate entries
                    const experiences = this.parseWorkExperience(content);
                    templateData.experience.push(...experiences);
                } else if (title.includes('education') || title.includes('academic')) {
                    const educationEntries = this.parseEducation(content);
                    templateData.education.push(...educationEntries);
                } else if (title.includes('skill') || title.includes('technical') || title.includes('competenc')) {
                    const skills = this.parseSkills(content);
                    templateData.skills.push(...skills);
                }
            });
        }

        return templateData;
    }

    private parseWorkExperience(content: string): any[] {
        const experiences = [];
        const lines = content.split('\n').filter(line => line.trim());

        let currentExp: any = null;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Check if line looks like a job title/company header
            if (this.isJobHeader(trimmedLine)) {
                // Save previous experience
                if (currentExp) {
                    experiences.push(currentExp);
                }

                // Start new experience
                const parsed = this.parseJobHeader(trimmedLine);
                currentExp = {
                    position: parsed.position,
                    company: parsed.company,
                    startDate: parsed.startDate || '',
                    endDate: parsed.endDate || '',
                    description: ''
                };
            } else if (this.isDateLine(trimmedLine) && currentExp) {
                // Extract dates
                const dates = this.extractDates(trimmedLine);
                currentExp.startDate = dates.startDate;
                currentExp.endDate = dates.endDate;
            } else if (currentExp && trimmedLine) {
                // Add to description
                if (currentExp.description) {
                    currentExp.description += '\n' + trimmedLine;
                } else {
                    currentExp.description = trimmedLine;
                }
            }
        }

        // Add final experience
        if (currentExp) {
            experiences.push(currentExp);
        }

        return experiences;
    }

    private isJobHeader(line: string): boolean {
        // Look for patterns like "Position - Company" or "Position | Company"
        return /.*\s*[-–—|]\s*.*/.test(line) &&
               !line.toLowerCase().includes('graduated') &&
               !this.isDateLine(line);
    }

    private parseJobHeader(line: string): any {
        const parts = line.split(/\s*[-–—|]\s*/);
        return {
            position: parts[0]?.trim() || '',
            company: parts[1]?.trim() || '',
            startDate: '',
            endDate: ''
        };
    }

    private isDateLine(line: string): boolean {
        return /\b\d{4}\b/.test(line) ||
               /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(line);
    }

    private extractDates(line: string): any {
        const matches = line.match(/(\w+\s+\d{4}|\d{4})\s*[-–—]\s*(\w+\s+\d{4}|\d{4}|present|current)/i);
        if (matches) {
            return {
                startDate: matches[1],
                endDate: matches[2]
            };
        }
        return { startDate: '', endDate: '' };
    }

    private parseEducation(content: string): any[] {
        const lines = content.split('\n').filter(line => line.trim());
        const education = [];

        for (const line of lines) {
            if (line.includes('College') || line.includes('University') || line.includes('Bachelor') || line.includes('Master')) {
                education.push({
                    degree: line.trim(),
                    institution: '',
                    year: this.extractYear(line)
                });
            }
        }

        return education;
    }

    private parseSkills(content: string): string[] {
        return content.split(/[,•\n]/)
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);
    }

    private extractYear(text: string): string {
        const match = text.match(/\b(19|20)\d{2}\b/);
        return match ? match[0] : '';
    }

    private async generateResumeTemplates(
        parsedResume: ParsedResume,
        templateOptions?: TemplateOptions[]
    ): Promise<TemplateResult[]> {
        const industryStandardOptions: TemplateOptions[] = [
            {
                style: 'professional',
                colorScheme: 'monochrome',
                layout: 'single-column',
                fontSize: 'medium',
                includePhoto: false
            },
            {
                style: 'modern',
                colorScheme: 'blue',
                layout: 'single-column',
                fontSize: 'medium',
                includePhoto: false
            },
            {
                style: 'executive',
                colorScheme: 'navy',
                layout: 'single-column',
                fontSize: 'medium',
                includePhoto: false
            },
            {
                style: 'creative',
                colorScheme: 'teal',
                layout: 'two-column',
                fontSize: 'medium',
                includePhoto: false
            },
            {
                style: 'minimal',
                colorScheme: 'gray',
                layout: 'single-column',
                fontSize: 'medium',
                includePhoto: false
            }
        ];

        const optionsToUse = templateOptions || industryStandardOptions;
        const templates: TemplateResult[] = [];

        // Convert parsed resume to template format
        const templateData = this.convertToTemplateFormat(parsedResume);
        console.log('📊 Converted resume data:', {
            hasName: !!templateData.contactInfo.name,
            experienceCount: templateData.experience.length,
            educationCount: templateData.education.length,
            skillsCount: templateData.skills.length,
            hasSummary: !!templateData.summary
        });

        for (const option of optionsToUse) {
            try {
                console.log(`🎨 Generating ${option.style} template...`);
                const template = resumeTemplateEngine.generateResume(templateData, option);
                template.metadata = {
                    ...template.metadata,
                    isDownloadable: true,
                    industryStandard: true,
                    experienceEntries: templateData.experience.length
                };
                templates.push(template);
                console.log(`✅ ${option.style} template generated with ${templateData.experience.length} work experiences`);
            } catch (error) {
                console.warn('Failed to generate template:', option.style, error);
                console.error('Template error details:', error);
            }
        }

        console.log(`📋 Generated ${templates.length} industry-standard templates`);
        return templates;
    }

    private async extractPdfText(file: File): Promise<{content: string, pages: number}> {
        try {
            console.log('🔍 Extracting text from PDF with formatting preservation:', file.name);

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const numPages = pdf.numPages;

            let fullText = '';

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const viewport = page.getViewport({ scale: 1.0 });

                // Group text items by their vertical position to preserve line structure
                const lines: Array<{y: number, items: any[]}> = [];

                textContent.items.forEach((item: any) => {
                    const y = Math.round(viewport.height - item.transform[5]); // Convert to top-down coordinates
                    let line = lines.find(l => Math.abs(l.y - y) < 5); // Group items within 5 units vertically

                    if (!line) {
                        line = { y, items: [] };
                        lines.push(line);
                    }
                    line.items.push(item);
                });

                // Sort lines by vertical position (top to bottom)
                lines.sort((a, b) => a.y - b.y);

                // Process each line
                let pageText = '';
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Sort items in line by horizontal position (left to right)
                    line.items.sort((a, b) => a.transform[4] - b.transform[4]);

                    // Build line text with proper spacing
                    let lineText = '';
                    let lastX = 0;

                    line.items.forEach((item: any, index: number) => {
                        const x = item.transform[4];
                        const text = item.str.trim();

                        if (text) {
                            // Add spacing based on horizontal distance
                            if (index > 0 && x - lastX > 20) {
                                lineText += '   '; // Add extra spaces for significant gaps
                            } else if (index > 0 && x - lastX > 5) {
                                lineText += ' '; // Normal spacing
                            }

                            lineText += text;
                            lastX = x + (text.length * 6); // Estimate text width
                        }
                    });

                    if (lineText.trim()) {
                        pageText += lineText + '\n';

                        // Detect section headers (typically larger font or bold)
                        const avgFontSize = line.items.reduce((sum, item) => sum + (item.height || 12), 0) / line.items.length;
                        if (avgFontSize > 14 && lineText.trim().length < 50) {
                            // Likely a section header - add extra spacing
                            pageText += '\n';
                        }
                    }
                }

                // Add page break for multi-page documents
                if (pageNum < numPages) {
                    pageText += '\n--- Page Break ---\n\n';
                }

                fullText += pageText;

                // Progress logging for large PDFs
                if (pageNum % 5 === 0 || pageNum === numPages) {
                    console.log(`📄 Processed PDF page ${pageNum}/${numPages} with layout preservation`);
                }
            }

            const formattedText = this.preserveResumeFormatting(fullText);

            console.log(`✅ PDF extraction complete: ${numPages} pages, ${formattedText.length} characters with preserved formatting`);

            return {
                content: formattedText,
                pages: numPages
            };

        } catch (error: any) {
            console.error('❌ PDF extraction failed:', error);

            // Provide detailed error information for debugging
            let errorMessage = 'PDF processing failed';
            if (error.message?.includes('worker')) {
                errorMessage = 'PDF.js worker failed to load. Please check your internet connection.';
            } else if (error.message?.includes('password')) {
                errorMessage = 'This PDF is password-protected. Please use an unprotected version.';
            } else if (error.message?.includes('corrupted')) {
                errorMessage = 'This PDF appears to be corrupted. Please try a different file.';
            } else if (error.message) {
                errorMessage = `PDF processing error: ${error.message}`;
            }

            throw new Error(errorMessage);
        }
    }

    private async extractWordText(file: File): Promise<string> {
        try {
            console.log('📝 🔧 FIXED: Extracting Word document with BULLET PRESERVATION:', file.name);

            const arrayBuffer = await file.arrayBuffer();

            // 🔧 FIX: Use convertToHtml to preserve formatting, then convert to text
            console.log('🔍 Using mammoth.convertToHtml() to preserve bullets and formatting...');
            const htmlResult = await mammoth.convertToHtml({ arrayBuffer });

            if (htmlResult.messages && htmlResult.messages.length > 0) {
                console.log('⚠️ Mammoth conversion warnings:', htmlResult.messages.length);
            }

            // 🔧 Convert HTML to text while preserving bullets
            const htmlContent = htmlResult.value;
            const textWithBullets = this.convertHtmlToTextWithBullets(htmlContent);

            console.log('✅ 🔧 FIXED: Text extracted with bullet preservation:', {
                length: textWithBullets.length,
                firstLine: textWithBullets.split('\n')[0] || 'No content',
                lineCount: textWithBullets.split('\n').length,
                bulletCount: (textWithBullets.match(/^[\s]*[•▪▫◦‣⁃▸▹▪▫⦿⦾\-–—*]\s/gm) || []).length,
                preview: textWithBullets.substring(0, 300) + '...'
            });

            if (!textWithBullets || textWithBullets.trim().length === 0) {
                throw new Error('Extracted text is empty');
            }

            return textWithBullets;

        } catch (error: any) {
            console.error('❌ Word extraction failed:', error);
            throw new Error(`Failed to extract text from Word document: ${error.message}`);
        }
    }

    /**
     * 🔧 CONVERT HTML TO TEXT WITH BULLETS - ENHANCED FOR WORD DOCS
     * Converts mammoth HTML output to text while preserving bullets and formatting
     */
    private convertHtmlToTextWithBullets(html: string): string {
        console.log('🔧 🚀 ENHANCED: Converting HTML to text with bullet preservation...');

        // 🔍 DEBUG: Log the actual HTML we're working with
        console.log('📋 RAW HTML PREVIEW (first 1000 chars):', html.substring(0, 1000));

        // Create a temporary DOM element to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        let result = '';
        let bulletCount = 0;

        // 🔧 ENHANCED: More comprehensive element processing
        const processElement = (element: Element | Document, depth = 0): string => {
            let text = '';

            const children = element.children || element.childNodes;

            for (let i = 0; i < children.length; i++) {
                const child = children[i] as Element;
                if (!child || !child.tagName) continue;

                const tagName = child.tagName.toLowerCase();
                const childText = child.textContent?.trim() || '';

                console.log(`🔍 Processing element: ${tagName} - "${childText.substring(0, 50)}..."`);

                if (tagName === 'li') {
                    // 🔧 ENHANCED: Convert list items to bullet points
                    if (childText) {
                        text += `• ${childText}\n`;
                        bulletCount++;
                        console.log(`🔹 BULLET ADDED: "${childText.substring(0, 50)}..."`);
                    }
                } else if (tagName === 'p') {
                    // 🔧 ENHANCED: Check if paragraph should be a bullet
                    const style = child.getAttribute('style') || '';
                    const className = child.getAttribute('class') || '';

                    // Check if this paragraph is actually a bullet point based on styling
                    if (style.includes('text-indent') || style.includes('margin-left') || className.includes('bullet') || className.includes('list')) {
                        if (childText) {
                            text += `• ${childText}\n`;
                            bulletCount++;
                            console.log(`🔹 STYLED BULLET ADDED: "${childText.substring(0, 50)}..."`);
                        }
                    } else {
                        // Regular paragraph
                        if (childText) {
                            text += `${childText}\n`;
                        }
                    }
                } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    // Convert headers
                    if (childText) {
                        text += `\n${childText.toUpperCase()}\n`;
                        console.log(`📋 HEADER ADDED: "${childText}"`);
                    }
                } else if (tagName === 'strong' || tagName === 'b') {
                    // Preserve bold text
                    if (childText) {
                        text += childText;
                    }
                } else if (tagName === 'ul' || tagName === 'ol') {
                    // Process lists recursively
                    text += processElement(child, depth + 1);
                } else if (tagName === 'br') {
                    // Handle line breaks
                    text += '\n';
                } else {
                    // 🔧 ENHANCED: For other elements, check if they contain list-like content
                    if (childText) {
                        // Check if the text looks like it should be bulletized
                        const lines = childText.split('\n').filter(line => line.trim());
                        let addedAsBullets = false;

                        // If we're in a section that typically has bullets and this looks like bullet content
                        if (lines.length > 1 && text.toUpperCase().includes('EXPERIENCE')) {
                            lines.forEach(line => {
                                const trimmedLine = line.trim();
                                if (trimmedLine.length > 10 && !trimmedLine.includes('@') && !trimmedLine.toUpperCase().includes('SUMMARY')) {
                                    text += `• ${trimmedLine}\n`;
                                    bulletCount++;
                                    addedAsBullets = true;
                                    console.log(`🔹 INFERRED BULLET: "${trimmedLine.substring(0, 50)}..."`);
                                }
                            });
                        }

                        if (!addedAsBullets) {
                            text += `${childText}\n`;
                        }
                    }
                }
            }

            return text;
        };

        result = processElement(tempDiv);

        // 🔧 ENHANCED: Additional bullet detection for missed content
        const lines = result.split('\n');
        let enhancedResult = '';
        let inExperienceSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Track if we're in experience/work section
            if (line.toUpperCase().includes('EXPERIENCE') || line.toUpperCase().includes('WORK')) {
                inExperienceSection = true;
                enhancedResult += line + '\n';
                continue;
            } else if (line.toUpperCase().includes('EDUCATION') || line.toUpperCase().includes('SKILLS')) {
                inExperienceSection = false;
            }

            // 🔧 ENHANCED: Convert likely bullet content in experience sections
            if (inExperienceSection && line.length > 15 && !line.includes('•') && !line.includes('@') &&
                !line.match(/^\d{4}/) && !line.includes('|') && !line.includes('–')) {
                // This looks like bullet content that wasn't bulletized
                enhancedResult += `• ${line}\n`;
                bulletCount++;
                console.log(`🔹 POST-PROCESS BULLET: "${line.substring(0, 50)}..."`);
            } else {
                enhancedResult += line + '\n';
            }
        }

        // Clean up the result
        result = enhancedResult
            .replace(/\n\n+/g, '\n\n') // Remove excessive line breaks
            .replace(/^\n+/, '') // Remove leading newlines
            .replace(/\n+$/, '') // Remove trailing newlines
            .trim();

        console.log('✅ 🚀 ENHANCED HTML to text conversion complete:', {
            originalHtmlLength: html.length,
            convertedTextLength: result.length,
            bulletsFoundInText: (result.match(/^[\s]*•\s/gm) || []).length,
            bulletsAddedDuringProcessing: bulletCount,
            linesCount: result.split('\n').length,
            sampleResult: result.substring(0, 500)
        });

        return result;
    }

    private convertHtmlToFormattedText(html: string): string {
        console.log('🔄 Converting HTML to formatted text. HTML length:', html.length);
        console.log('📋 HTML preview:', html.substring(0, 500));

        // Convert HTML elements to formatted plain text with better preservation
        let text = html
            // Preserve document structure first
            .replace(/<body[^>]*>/gi, '')
            .replace(/<\/body>/gi, '')
            .replace(/<html[^>]*>/gi, '')
            .replace(/<\/html>/gi, '')
            .replace(/<head[^>]*>.*?<\/head>/gis, '')

            // Headers with better spacing
            .replace(/<h1[^>]*>(.*?)<\/h1>/gis, '\n\n📋 $1\n' + '━'.repeat(25) + '\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gis, '\n\n📋 $1\n' + '─'.repeat(20) + '\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gis, '\n\n▶ $1\n')

            // Lists with proper formatting
            .replace(/<ul[^>]*>/gi, '\n')
            .replace(/<\/ul>/gi, '\n')
            .replace(/<ol[^>]*>/gi, '\n')
            .replace(/<\/ol>/gi, '\n')
            .replace(/<li[^>]*>(.*?)<\/li>/gis, '  • $1\n')

            // Paragraphs with proper spacing
            .replace(/<p[^>]*>(.*?)<\/p>/gis, '\n$1\n')

            // Line breaks
            .replace(/<br[^>]*\/?>/gi, '\n')

            // Text formatting with visual indicators
            .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*')
            .replace(/<u[^>]*>(.*?)<\/u>/gis, '_$1_')

            // Tables with better structure
            .replace(/<table[^>]*>/gi, '\n┌─ TABLE ─┐\n')
            .replace(/<\/table>/gi, '\n└─────────┘\n')
            .replace(/<tr[^>]*>/gi, '')
            .replace(/<\/tr>/gi, '\n')
            .replace(/<td[^>]*>(.*?)<\/td>/gis, '│ $1 ')
            .replace(/<th[^>]*>(.*?)<\/th>/gis, '│ **$1** ')

            // Divs and spans (preserve content)
            .replace(/<div[^>]*>/gi, '\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<span[^>]*>(.*?)<\/span>/gis, '$1')

            // Remove any remaining HTML tags
            .replace(/<[^>]*>/g, '')

            // Decode HTML entities
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&ldquo;/g, '"')
            .replace(/&rdquo;/g, '"')
            .replace(/&lsquo;/g, "'")
            .replace(/&rsquo;/g, "'")
            .replace(/&mdash;/g, '—')
            .replace(/&ndash;/g, '–')
            .replace(/&hellip;/g, '...')

            // Clean up excessive whitespace but preserve structure
            .replace(/[ \t]+/g, ' ')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n');

        console.log('✅ HTML conversion complete. Text length:', text.length);
        console.log('📋 Text preview:', text.substring(0, 300));

        return text.trim();
    }


    private preserveResumeFormatting(text: string): string {
        // Enhanced formatting preservation for resumes with better visual structure
        return text
            // Clean up basic formatting issues
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')

            // Handle name at the beginning (usually first line, often larger or bold)
            .replace(/^(.{2,50})\n/m, (match, name) => {
                if (name.trim().length > 2 && name.trim().length < 50 && !name.includes('@') && !name.includes('|')) {
                    return `${name.trim()}\n${'='.repeat(name.trim().length)}\n\n`;
                }
                return match;
            })

            // Preserve section headers (detect common resume sections)
            .replace(/^\s*(SUMMARY|OBJECTIVE|EXPERIENCE|EDUCATION|SKILLS|WORK EXPERIENCE|EMPLOYMENT|CERTIFICATIONS|ACHIEVEMENTS|PROJECTS|CONTACT|QUALIFICATIONS|HIGHLIGHTS)\s*$/gim,
                    '\n\n📋 $1\n' + '━'.repeat(25) + '\n')

            // Preserve job titles and companies with better formatting
            .replace(/^([A-Z][A-Za-z\s&-]+)\s*[-|]\s*([A-Z][A-Za-z\s&.-]+)\s*$/gm, '\n💼 $1 | $2')
            .replace(/^([A-Za-z\s&-]+)\s*,\s*([A-Z][A-Za-z\s&.-]+)\s*$/gm, '\n🏢 $1, $2')

            // Preserve dates with better formatting
            .replace(/(\d{4})\s*[-–—]\s*(\d{4}|present|current)/gi, '📅 $1 - $2')
            .replace(/(\w{3,9}\s+\d{4})\s*[-–—]\s*(\w{3,9}\s+\d{4}|present|current)/gi, '📅 $1 - $2')

            // Preserve bullet points and list formatting with consistent spacing
            .replace(/^[\s]*[•▪▫◦‣⁃]\s*/gm, '  • ')
            .replace(/^[\s]*[-*]\s+/gm, '  • ')
            .replace(/^[\s]*\d+\.\s+/gm, (match, offset, string) => {
                const lineStart = string.lastIndexOf('\n', offset) + 1;
                const linePrefix = string.substring(lineStart, offset);
                if (linePrefix.trim() === '') {
                    return '  ' + match.trim() + ' ';
                }
                return match;
            })

            // Preserve contact information with icons
            .replace(/([\w._%+-]+@[\w.-]+\.[A-Z]{2,})/gi, '📧 $1')
            .replace(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g, '📞 $1')
            .replace(/(\d+\s+[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5})/g, '📍 $1')

            // Preserve education with degree formatting
            .replace(/(Bachelor|Master|PhD|B\.A\.|B\.S\.|M\.A\.|M\.S\.|MBA)([^,\n]+)/gi, '🎓 $1$2')

            // Preserve skills sections with better formatting
            .replace(/^(Skills?|Technical Skills?|Programming|Languages?|Technologies?):\s*/gim, '\n🛠️ $1:\n')

            // Preserve achievements and accomplishments
            .replace(/^(Achievements?|Accomplishments?|Awards?):\s*/gim, '\n🏆 $1:\n')

            // Clean up excessive whitespace while preserving intentional spacing
            .replace(/[ \t]+/g, ' ')
            .replace(/\n[ \t]+/g, '\n')
            .replace(/[ \t]+\n/g, '\n')

            // Preserve proper paragraph spacing
            .replace(/\n{4,}/g, '\n\n\n')
            .replace(/^\n+/, '')
            .replace(/\n+$/, '\n')

            // Ensure proper spacing around sections
            .replace(/([a-z.])\n(📋[^\n]+\n━+)/g, '$1\n\n$2')
            .replace(/(━+\n)([A-Za-z])/g, '$1\n$2')

            // Add spacing around job entries
            .replace(/(💼[^\n]+)\n([^💼📅📋\n])/g, '$1\n\n$2')

            .trim();
    }

    // Enhanced validation with processor-specific checks
    validateFile(file: File): { valid: boolean; error?: string; processor?: string } {
        // Check file size (100MB limit for enhanced processing)
        const maxSize = 100 * 1024 * 1024; // 100MB
        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`
            };
        }

        // Determine appropriate processor and validate
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const pdfValidation = enhancedPdfProcessor.validatePdf(file);
            return {
                ...pdfValidation,
                processor: 'enhanced-pdf'
            };
        }

        if (file.type.includes('word') || file.name.toLowerCase().match(/\.(doc|docx)$/)) {
            const wordValidation = enhancedWordProcessor.validateWord(file);
            return {
                ...wordValidation,
                processor: 'enhanced-word'
            };
        }

        if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
            return {
                valid: true,
                processor: 'text'
            };
        }

        return {
            valid: false,
            error: 'Unsupported file type. Please use PDF, Word (.doc/.docx), or text (.txt) files.'
        };
    }

    // Get available template styles
    getAvailableTemplates() {
        return resumeTemplateEngine.getTemplateOptions();
    }

    // Preview a specific template style
    previewTemplate(style: any) {
        return resumeTemplateEngine.previewTemplate(style);
    }

    // Get processing capabilities for a file
    getProcessingInfo(file: File): {
        canProcess: boolean;
        method: 'direct' | 'extraction' | 'unsupported';
        estimatedTime: string;
        features: string[];
    } {
        const validation = this.validateFile(file);

        if (!validation.valid) {
            return {
                canProcess: false,
                method: 'unsupported',
                estimatedTime: 'N/A',
                features: []
            };
        }

        if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
            return {
                canProcess: true,
                method: 'direct',
                estimatedTime: 'Instant',
                features: ['Immediate loading', 'Perfect formatting preservation']
            };
        }

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            const estimatedPages = Math.ceil(file.size / 100000); // Rough estimate
            return {
                canProcess: true,
                method: 'extraction',
                estimatedTime: estimatedPages > 10 ? '15-45 seconds' : '5-15 seconds',
                features: [
                    'Smart text extraction with layout preservation',
                    'Multi-page support with page breaks',
                    'Section header detection',
                    'Spacing and indentation preservation',
                    'Resume-specific formatting enhancement',
                    `~${estimatedPages} pages estimated`
                ]
            };
        }

        if (file.type.includes('word') || file.name.toLowerCase().match(/\.(doc|docx)$/)) {
            return {
                canProcess: true,
                method: 'extraction',
                estimatedTime: '5-20 seconds',
                features: [
                    'Native Word processing with style preservation',
                    'Header and bullet point formatting',
                    'Table and list structure preservation',
                    'Bold/italic text indication',
                    'Resume section auto-detection',
                    'Professional formatting enhancement'
                ]
            };
        }

        return {
            canProcess: false,
            method: 'unsupported',
            estimatedTime: 'N/A',
            features: []
        };
    }

    /**
     * 🚀 REVOLUTIONARY: Convert Revolutionary System result to legacy DocumentProcessingResult
     * Ensures backward compatibility with existing frontend
     */
    private convertRevolutionaryToDocumentResult(
        revolutionaryResult: RevolutionaryProcessingResult,
        startTime: number
    ): DocumentProcessingResult {
        console.log('🔄 Converting Revolutionary System result to legacy format...');

        // Extract basic content from revolutionary result
        const content = revolutionaryResult.organizedSections
            .map(section => section.elements.map(e => e.text).join('\n'))
            .join('\n\n');

        // Convert to parsed resume format
        const parsedResume = {
            name: this.extractNameFromSections(revolutionaryResult.organizedSections),
            contact: this.extractContactFromSections(revolutionaryResult.organizedSections),
            sections: revolutionaryResult.organizedSections.map(section => ({
                title: section.definition.name,
                content: section.elements.map(e => e.text).join('\n'),
                type: section.definition.type
            })),
            wordCount: content.split(/\s+/).length
        };

        // Create legacy templates from revolutionary analysis
        const templates = this.createLegacyTemplatesFromRevolutionary(revolutionaryResult);

        // Enhanced metadata with revolutionary insights
        const metadata = {
            wordCount: parsedResume.wordCount,
            charactersCount: content.length,
            processingTime: revolutionaryResult.metadata.processingTime,
            extractionMethod: 'revolutionary-system',
            completeness: revolutionaryResult.metadata.confidenceLevel,
            formattingPreserved: revolutionaryResult.categoryScores.formattingQuality,
            parsingQuality: {
                score: revolutionaryResult.overallScore,
                issues: revolutionaryResult.errors,
                suggestions: revolutionaryResult.criticalImprovements.map(imp => imp.title)
            },
            aiProcessingTime: revolutionaryResult.metadata.processingTime,
            templateGenerationTime: revolutionaryResult.metadata.processingTime / 4,

            // Revolutionary system specific metadata
            revolutionaryVisionEnabled: true,
            revolutionarySystemEnabled: true,
            formattingDetected: {
                bulletPoints: revolutionaryResult.smartFormatting.bulletIntelligence.styles.length,
                boldElements: revolutionaryResult.processedElements.filter(e => e.formatting.fontWeight === 'bold').length,
                sections: revolutionaryResult.organizedSections.length,
                patterns: revolutionaryResult.metadata.componentsUsed
            },
            processingSteps: [
                'Revolutionary System activated',
                `Vision Analysis: ${revolutionaryResult.visionAnalysis.success ? 'Success' : 'Failed'}`,
                `Format Authentication: ${revolutionaryResult.formatValidation.isValid ? 'Valid' : 'Issues found'}`,
                `Smart Formatting: ${revolutionaryResult.smartFormatting.success ? 'Success' : 'Failed'}`,
                `AI Analysis: Overall score ${revolutionaryResult.aiAnalysis.overallOptimization.score}/100`
            ],
            confidenceBreakdown: {
                overall: revolutionaryResult.overallScore,
                atsCompatibility: revolutionaryResult.categoryScores.atsCompatibility,
                industryAlignment: revolutionaryResult.categoryScores.industryAlignment,
                formattingQuality: revolutionaryResult.categoryScores.formattingQuality,
                contentQuality: revolutionaryResult.categoryScores.contentQuality,
                skillsMatch: revolutionaryResult.categoryScores.skillsMatch,
                achievementImpact: revolutionaryResult.categoryScores.achievementImpact
            },

            // Revolutionary insights for frontend
            revolutionaryInsights: {
                overallScore: revolutionaryResult.overallScore,
                categoryScores: revolutionaryResult.categoryScores,
                topPriorities: revolutionaryResult.criticalImprovements.slice(0, 3),
                quickWins: revolutionaryResult.quickWins,
                atsScore: revolutionaryResult.formatValidation.atsScore,
                industryAlignment: revolutionaryResult.formatValidation.industryAlignment,
                templateDetected: revolutionaryResult.authenticatedTemplate.name,
                confidenceLevel: revolutionaryResult.metadata.confidenceLevel,
                componentsUsed: revolutionaryResult.metadata.componentsUsed,
                processingTime: revolutionaryResult.metadata.processingTime
            }
        };

        console.log('✅ Revolutionary result converted to legacy format');
        console.log(`📊 Legacy compatibility score: ${revolutionaryResult.overallScore}/100`);

        return {
            success: revolutionaryResult.success,
            content,
            parsedResume,
            templates: templates,
            professionalTemplates: [], // Could be enhanced later
            revolutionaryTemplates: [], // Already processed by revolutionary system
            formattedResumeTemplates: [], // Integrated into revolutionary analysis
            arbitrationResult: undefined, // Revolutionary system replaces this
            visionAnalysis: revolutionaryResult.visionAnalysis, // Direct compatibility
            metadata
        };
    }

    private extractNameFromSections(sections: FormattedSection[]): string {
        // Look for name in contact section or first element
        const contactSection = sections.find(s => s.definition.type === 'contact');
        if (contactSection && contactSection.elements.length > 0) {
            const nameElement = contactSection.elements.find(e => e.type === 'name');
            if (nameElement) return nameElement.text;
        }

        // Fallback: look for first large, bold text
        for (const section of sections) {
            for (const element of section.elements) {
                if (element.formatting.fontWeight === 'bold' && element.formatting.fontSize > 14) {
                    return element.text;
                }
            }
        }

        return 'Name Not Found';
    }

    private extractContactFromSections(sections: FormattedSection[]): any {
        const contactSection = sections.find(s => s.definition.type === 'contact');
        if (!contactSection) return {};

        const contact: any = {};

        contactSection.elements.forEach(element => {
            const text = element.text;

            // Email detection
            if (text.includes('@') && text.includes('.')) {
                contact.email = text.trim();
            }
            // Phone detection
            else if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(text)) {
                contact.phone = text.trim();
            }
            // LinkedIn detection
            else if (text.toLowerCase().includes('linkedin')) {
                contact.linkedin = text.trim();
            }
            // Address detection (simple heuristic)
            else if (text.includes(',') && (text.toLowerCase().includes('street') || text.toLowerCase().includes('ave') || text.toLowerCase().includes('blvd'))) {
                contact.address = text.trim();
            }
        });

        return contact;
    }

    private createLegacyTemplatesFromRevolutionary(revolutionaryResult: RevolutionaryProcessingResult): TemplateResult[] {
        // Create simplified legacy templates based on revolutionary analysis
        const template: TemplateResult = {
            html: `<div class="revolutionary-resume">${revolutionaryResult.organizedSections.map(section =>
                `<section class="resume-section">
                    <h2>${section.definition.name}</h2>
                    ${section.elements.map(e => `<p>${e.text}</p>`).join('')}
                </section>`
            ).join('')}</div>`,
            css: `
                .revolutionary-resume { font-family: Arial, sans-serif; }
                .resume-section { margin-bottom: 20px; }
                .resume-section h2 { font-weight: bold; font-size: 14px; margin-bottom: 10px; }
                .resume-section p { margin-bottom: 5px; }
            `,
            plainText: revolutionaryResult.organizedSections
                .map(section => `${section.definition.name}\n${section.elements.map(e => e.text).join('\n')}`)
                .join('\n\n'),
            preview: `Revolutionary Resume (Score: ${revolutionaryResult.overallScore}/100)`,
            metadata: {
                templateUsed: 'revolutionary-system',
                sectionsIncluded: revolutionaryResult.organizedSections.map(s => s.definition.name),
                wordCount: revolutionaryResult.organizedSections.reduce((count, section) =>
                    count + section.elements.reduce((sectionCount, element) =>
                        sectionCount + element.text.split(/\s+/).length, 0), 0),
                estimatedPages: 1,
                revolutionaryScore: revolutionaryResult.overallScore,
                isDownloadable: true,
                industryStandard: true
            }
        };

        return [template];
    }
}

export default new DocumentProcessor();
export type { DocumentProcessingResult };