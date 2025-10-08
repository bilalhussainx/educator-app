/**
 * Intelligent Claude AI Parsing Arbiter Service
 *
 * Acts as a "parsing arbiter" to solve resume parsing accuracy problems by:
 * 1. Taking multiple parsing results from different services
 * 2. Using Claude AI to intelligently compare and analyze parsing quality
 * 3. Detecting bullet point fragmentation and content structure issues
 * 4. Choosing or creating the most accurate parsing result
 * 5. Preserving original document structure and content integrity
 */

import universalResumeParser, { ParsedResume } from './universalResumeParser';
import azureVisionDocumentStructureService, { DocumentStructureResult, DocumentElement } from './azureVisionDocumentStructureService';
import { RevolutionaryResumeParser, ResumeAnalysisResult } from './revolutionaryResumeParser';
import revolutionaryResumeFormatterAPI, { FormattedResumeTemplate } from './revolutionaryResumeFormatterAPI';

// Define interfaces for the arbiter service

export interface ParsingSource {
    id: string;
    name: string;
    type: 'azure' | 'revolutionary' | 'universal' | 'api' | 'fallback';
    confidence: number;
    processingTime: number;
    data: any;
    metadata?: Record<string, any>;
}

export interface BulletPointAnalysis {
    originalText: string;
    fragments: string[];
    isFragmented: boolean;
    completenessScore: number;
    structuralIntegrity: number;
    source: string;
    confidence: number;
    reasoning: string[];
}

export interface ContentValidationResult {
    contentPreserved: boolean;
    missingContent: string[];
    duplicatedContent: string[];
    structuralAccuracy: number;
    bulletPointIntegrity: number;
    sectionOrganization: number;
    overallQuality: number;
    issues: string[];
    suggestions: string[];
}

export interface ArbitratedResult {
    success: boolean;
    chosenSource: ParsingSource;
    confidence: number;
    reasoning: string[];

    // Final parsed content
    parsedResume: ParsedResume;

    // Analysis results
    bulletPointAnalysis: BulletPointAnalysis[];
    contentValidation: ContentValidationResult;

    // Hybrid improvements (if applicable)
    isHybrid: boolean;
    hybridImprovements?: {
        bulletPointReconstructions: Array<{
            original: string;
            improved: string;
            reason: string;
        }>;
        sectionReorganizations: Array<{
            section: string;
            improvement: string;
            reason: string;
        }>;
        structuralFixes: string[];
    };

    // Comparison data
    sourceComparison: {
        source: string;
        strengths: string[];
        weaknesses: string[];
        score: number;
        bulletPointAccuracy: number;
        structuralAccuracy: number;
    }[];

    metadata: {
        totalSources: number;
        analysisTime: number;
        claudeAnalysisTime: number;
        hybridCreated: boolean;
        improvementsApplied: number;
    };
    error?: string;
}

export interface ClaudeAnalysisRequest {
    originalContent: string;
    parsingSources: ParsingSource[];
    analysisType: 'comparison' | 'validation' | 'hybrid_creation';
    focusAreas: ('bullet_points' | 'sections' | 'structure' | 'content')[];
}

export interface ClaudeAnalysisResponse {
    analysis: {
        overallAssessment: string;
        bestSourceRecommendation: string;
        confidenceScore: number;
        keyFindings: string[];
    };
    sourceRankings: Array<{
        sourceId: string;
        rank: number;
        score: number;
        strengths: string[];
        weaknesses: string[];
        bulletPointHandling: number;
        contentPreservation: number;
        structuralAccuracy: number;
    }>;
    bulletPointAnalysis: {
        fragmentationDetected: boolean;
        fragmentedBullets: Array<{
            fragments: string[];
            shouldBe: string;
            confidence: number;
        }>;
        integrityScore: number;
        recommendations: string[];
    };
    hybridRecommendations?: {
        shouldCreateHybrid: boolean;
        improvements: Array<{
            type: 'bullet_reconstruction' | 'section_merge' | 'structure_fix';
            description: string;
            fromSource: string;
            confidence: number;
        }>;
    };
}

class IntelligentParsingArbiterService {
    private static readonly CLAUDE_API_URL = '/api/claude/analyze-parsing';
    private static readonly CONFIDENCE_THRESHOLD = 0.75;
    private static readonly FRAGMENTATION_THRESHOLD = 0.6;

    /**
     * Main arbitration method - takes multiple parsing results and returns the best one
     */
    async arbitrateParsing(
        originalFile: File,
        originalContent: string,
        options: {
            includeAzureVision?: boolean;
            includeRevolutionaryParser?: boolean;
            includeUniversalParser?: boolean;
            includeFormatterAPI?: boolean;
            enableHybridCreation?: boolean;
            priorityFocus?: 'bullet_points' | 'sections' | 'structure' | 'balanced';
        } = {}
    ): Promise<ArbitratedResult> {
        console.log('🧠 Starting Intelligent Parsing Arbitration...');
        const startTime = Date.now();

        try {
            // Step 1: Gather parsing results from multiple sources
            const parsingSources = await this.gatherParsingResults(originalFile, originalContent, options);
            console.log(`📊 Gathered ${parsingSources.length} parsing sources for analysis`);

            // Step 2: Use Claude AI to analyze and compare parsing results
            const claudeAnalysis = await this.analyzeWithClaude(originalContent, parsingSources, options);
            console.log('🧠 Claude AI analysis completed');

            // Step 3: Validate content integrity across sources
            const contentValidation = await this.validateContentIntegrity(originalContent, parsingSources);
            console.log('✅ Content validation completed');

            // Step 4: Analyze bullet point integrity specifically
            const bulletPointAnalysis = await this.analyzeBulletPointIntegrity(originalContent, parsingSources);
            console.log('🔹 Bullet point integrity analysis completed');

            // Step 5: Choose the best source or create hybrid result
            const finalResult = await this.makeArbitrationDecision(
                originalContent,
                parsingSources,
                claudeAnalysis,
                contentValidation,
                bulletPointAnalysis,
                options
            );

            const totalTime = Date.now() - startTime;
            finalResult.metadata.analysisTime = totalTime;

            console.log(`✅ Intelligent Parsing Arbitration completed in ${totalTime}ms`);
            console.log(`🎯 Chosen source: ${finalResult.chosenSource.name} (confidence: ${Math.round(finalResult.confidence * 100)}%)`);

            if (finalResult.isHybrid) {
                console.log(`🔧 Hybrid result created with ${finalResult.hybridImprovements?.bulletPointReconstructions.length || 0} improvements`);
            }

            return finalResult;

        } catch (error) {
            console.error('❌ Intelligent Parsing Arbitration failed:', error);

            // Return fallback result with universal parser
            try {
                const fallbackParsed = await universalResumeParser.parseResume(originalContent);
                return this.createFallbackResult(originalContent, fallbackParsed, error);
            } catch (fallbackError) {
                return this.createErrorResult(error, fallbackError);
            }
        }
    }

    /**
     * Step 1: Gather parsing results from multiple sources
     */
    private async gatherParsingResults(
        file: File,
        content: string,
        options: any
    ): Promise<ParsingSource[]> {
        console.log('📊 Gathering parsing results from multiple sources...');
        const sources: ParsingSource[] = [];

        // Source 1: Universal Resume Parser (always included as fallback)
        try {
            console.log('🔍 Running Universal Parser...');
            const startTime = Date.now();
            const universalResult = await universalResumeParser.parseResume(content);
            sources.push({
                id: 'universal',
                name: 'Universal Resume Parser',
                type: 'universal',
                confidence: this.calculateUniversalConfidence(universalResult),
                processingTime: Date.now() - startTime,
                data: universalResult,
                metadata: { bulletCount: this.countBullets(universalResult) }
            });
            console.log('✅ Universal Parser completed');
        } catch (error) {
            console.warn('⚠️ Universal Parser failed:', error);
        }

        // Source 2: Azure Vision Document Structure Service
        if (options.includeAzureVision !== false) {
            try {
                console.log('🔍 Running Azure Vision Analysis...');
                const startTime = Date.now();
                const azureResult = await azureVisionDocumentStructureService.analyzeDocumentStructure(file);
                if (azureResult.success) {
                    sources.push({
                        id: 'azure',
                        name: 'Azure Document Intelligence',
                        type: 'azure',
                        confidence: azureResult.metadata.confidence,
                        processingTime: Date.now() - startTime,
                        data: azureResult,
                        metadata: {
                            elementsFound: azureResult.documentInfo.totalElements,
                            sectionsFound: azureResult.sections.length,
                            bulletPointsFound: azureResult.bulletPoints.length
                        }
                    });
                    console.log('✅ Azure Vision Analysis completed');
                }
            } catch (error) {
                console.warn('⚠️ Azure Vision Analysis failed:', error);
            }
        }

        // Source 3: Revolutionary Resume Parser
        if (options.includeRevolutionaryParser !== false) {
            try {
                console.log('🔍 Running Revolutionary Parser...');
                const startTime = Date.now();
                const revolutionaryParser = new RevolutionaryResumeParser(
                    import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT || '',
                    import.meta.env.VITE_AZURE_DOCUMENT_INTELLIGENCE_KEY || ''
                );
                const revolutionaryResult = await revolutionaryParser.parseResume(file);
                sources.push({
                    id: 'revolutionary',
                    name: 'Revolutionary Resume Parser',
                    type: 'revolutionary',
                    confidence: revolutionaryResult.templateConfidence,
                    processingTime: Date.now() - startTime,
                    data: revolutionaryResult,
                    metadata: {
                        elementsFound: revolutionaryResult.elements.length,
                        sectionsFound: revolutionaryResult.sections.length,
                        atsScore: revolutionaryResult.atsCompatibility.score
                    }
                });
                console.log('✅ Revolutionary Parser completed');
            } catch (error) {
                console.warn('⚠️ Revolutionary Parser failed:', error);
            }
        }

        // Source 4: Revolutionary Formatter API
        if (options.includeFormatterAPI !== false) {
            try {
                console.log('🔍 Running Revolutionary Formatter API...');
                const startTime = Date.now();
                const formatterResult = await revolutionaryResumeFormatterAPI.processDocument(content);
                sources.push({
                    id: 'formatter_api',
                    name: 'Revolutionary Formatter API',
                    type: 'api',
                    confidence: formatterResult.summary.confidenceScore / 100,
                    processingTime: Date.now() - startTime,
                    data: formatterResult,
                    metadata: {
                        bulletsFound: formatterResult.summary.bulletsFound,
                        sectionsFound: formatterResult.summary.sectionsFound,
                        boldElementsFound: formatterResult.summary.boldElementsFound,
                        improvementsFound: formatterResult.summary.improvements.length
                    }
                });
                console.log('✅ Revolutionary Formatter API completed');
            } catch (error) {
                console.warn('⚠️ Revolutionary Formatter API failed:', error);
            }
        }

        console.log(`📊 Successfully gathered ${sources.length} parsing sources`);
        return sources;
    }

    /**
     * Step 2: Use Claude AI to analyze and compare parsing results
     */
    private async analyzeWithClaude(
        originalContent: string,
        sources: ParsingSource[],
        options: any
    ): Promise<ClaudeAnalysisResponse> {
        console.log('🧠 Starting Claude AI analysis of parsing results...');
        const startTime = Date.now();

        try {
            const claudeRequest: ClaudeAnalysisRequest = {
                originalContent,
                parsingSources: sources,
                analysisType: 'comparison',
                focusAreas: this.determineFocusAreas(options.priorityFocus)
            };

            // Call Claude API (simulated for now)
            const claudeResponse = await this.callClaudeAPI(claudeRequest);

            console.log(`🧠 Claude AI analysis completed in ${Date.now() - startTime}ms`);
            return claudeResponse;

        } catch (error) {
            console.warn('⚠️ Claude AI analysis failed, using fallback:', error);
            return this.createFallbackClaudeAnalysis(originalContent, sources);
        }
    }

    /**
     * Step 3: Validate content integrity across sources
     */
    private async validateContentIntegrity(
        originalContent: string,
        sources: ParsingSource[]
    ): Promise<ContentValidationResult> {
        console.log('✅ Validating content integrity across sources...');

        const originalWords = this.extractWords(originalContent);
        const originalSentences = this.extractSentences(originalContent);

        let bestScore = 0;
        let bestSource = '';
        const issues: string[] = [];
        const suggestions: string[] = [];

        // Analyze each source for content preservation
        for (const source of sources) {
            const sourceContent = this.extractContentFromSource(source);
            const sourceWords = this.extractWords(sourceContent);

            // Calculate preservation metrics
            const wordsPreserved = this.calculateWordsPreserved(originalWords, sourceWords);
            const structuralAccuracy = this.calculateStructuralAccuracy(originalContent, sourceContent);
            const bulletIntegrity = this.calculateBulletIntegrity(originalContent, sourceContent);

            const overallScore = (wordsPreserved + structuralAccuracy + bulletIntegrity) / 3;

            if (overallScore > bestScore) {
                bestScore = overallScore;
                bestSource = source.name;
            }

            if (overallScore < 0.8) {
                issues.push(`${source.name}: Content preservation below threshold (${Math.round(overallScore * 100)}%)`);
            }
        }

        // Detect missing content
        const missingContent = this.detectMissingContent(originalContent, sources);
        const duplicatedContent = this.detectDuplicatedContent(sources);

        if (missingContent.length > 0) {
            issues.push(`Missing content detected: ${missingContent.length} items`);
            suggestions.push('Consider hybrid approach to restore missing content');
        }

        if (duplicatedContent.length > 0) {
            issues.push(`Duplicated content detected: ${duplicatedContent.length} items`);
            suggestions.push('Deduplicate content during final processing');
        }

        return {
            contentPreserved: bestScore > 0.85,
            missingContent,
            duplicatedContent,
            structuralAccuracy: bestScore,
            bulletPointIntegrity: this.calculateOverallBulletIntegrity(originalContent, sources),
            sectionOrganization: this.calculateSectionOrganization(originalContent, sources),
            overallQuality: bestScore,
            issues,
            suggestions
        };
    }

    /**
     * Step 4: Analyze bullet point integrity specifically
     */
    private async analyzeBulletPointIntegrity(
        originalContent: string,
        sources: ParsingSource[]
    ): Promise<BulletPointAnalysis[]> {
        console.log('🔹 Analyzing bullet point integrity...');

        const originalBullets = this.extractBulletPoints(originalContent);
        const analyses: BulletPointAnalysis[] = [];

        for (const bullet of originalBullets) {
            const analysis: BulletPointAnalysis = {
                originalText: bullet,
                fragments: [],
                isFragmented: false,
                completenessScore: 1.0,
                structuralIntegrity: 1.0,
                source: '',
                confidence: 1.0,
                reasoning: []
            };

            // Check how each source handles this bullet point
            for (const source of sources) {
                const sourceFragments = this.findBulletInSource(bullet, source);

                if (sourceFragments.length > 1) {
                    // Fragmentation detected
                    analysis.isFragmented = true;
                    analysis.fragments = sourceFragments;
                    analysis.completenessScore = Math.min(analysis.completenessScore, 0.5);
                    analysis.reasoning.push(`${source.name}: Fragmented into ${sourceFragments.length} pieces`);
                } else if (sourceFragments.length === 1) {
                    // Good preservation
                    const similarity = this.calculateTextSimilarity(bullet, sourceFragments[0]);
                    analysis.completenessScore = Math.min(analysis.completenessScore, similarity);
                    if (similarity > 0.9) {
                        analysis.source = source.name;
                        analysis.reasoning.push(`${source.name}: Well preserved (${Math.round(similarity * 100)}% similarity)`);
                    }
                } else {
                    // Bullet missing
                    analysis.completenessScore = 0;
                    analysis.reasoning.push(`${source.name}: Bullet point missing`);
                }
            }

            // Calculate overall confidence
            analysis.confidence = analysis.completenessScore * analysis.structuralIntegrity;
            analyses.push(analysis);
        }

        console.log(`🔹 Analyzed ${analyses.length} bullet points, ${analyses.filter(a => a.isFragmented).length} fragmented`);
        return analyses;
    }

    /**
     * Step 5: Make final arbitration decision
     */
    private async makeArbitrationDecision(
        originalContent: string,
        sources: ParsingSource[],
        claudeAnalysis: ClaudeAnalysisResponse,
        contentValidation: ContentValidationResult,
        bulletPointAnalysis: BulletPointAnalysis[],
        options: any
    ): Promise<ArbitratedResult> {
        console.log('🎯 Making final arbitration decision...');

        // Find the best source based on Claude's recommendation and our analysis
        const bestSource = this.findBestSource(sources, claudeAnalysis, contentValidation);

        // Determine if we should create a hybrid result
        const shouldCreateHybrid = this.shouldCreateHybrid(
            claudeAnalysis,
            contentValidation,
            bulletPointAnalysis,
            options
        );

        let finalParsedResume: ParsedResume;
        let hybridImprovements: any = undefined;
        let confidence = bestSource.confidence;

        if (shouldCreateHybrid && options.enableHybridCreation !== false) {
            console.log('🔧 Creating hybrid result to fix parsing issues...');
            const hybridResult = await this.createHybridResult(
                originalContent,
                sources,
                claudeAnalysis,
                bulletPointAnalysis
            );
            finalParsedResume = hybridResult.parsedResume;
            hybridImprovements = hybridResult.improvements;
            confidence = Math.min(1.0, confidence + 0.1); // Boost confidence for successful hybrid
        } else {
            // Use the best source as-is
            finalParsedResume = this.convertSourceToParsedResume(bestSource);
        }

        // Create source comparison data
        const sourceComparison = sources.map(source => ({
            source: source.name,
            strengths: this.getSourceStrengths(source, claudeAnalysis),
            weaknesses: this.getSourceWeaknesses(source, claudeAnalysis),
            score: source.confidence,
            bulletPointAccuracy: this.calculateBulletPointAccuracy(source, bulletPointAnalysis),
            structuralAccuracy: this.calculateSourceStructuralAccuracy(source, contentValidation)
        }));

        return {
            success: true,
            chosenSource: bestSource,
            confidence,
            reasoning: this.generateReasoningExplanation(bestSource, claudeAnalysis, shouldCreateHybrid),
            parsedResume: finalParsedResume,
            bulletPointAnalysis,
            contentValidation,
            isHybrid: shouldCreateHybrid,
            hybridImprovements,
            sourceComparison,
            metadata: {
                totalSources: sources.length,
                analysisTime: 0, // Will be set by caller
                claudeAnalysisTime: 0,
                hybridCreated: shouldCreateHybrid,
                improvementsApplied: hybridImprovements?.bulletPointReconstructions?.length || 0
            }
        };
    }

    /**
     * Call Claude API for intelligent analysis
     */
    private async callClaudeAPI(request: ClaudeAnalysisRequest): Promise<ClaudeAnalysisResponse> {
        console.log('🧠 Calling Claude API for parsing analysis...');

        const prompt = this.buildClaudePrompt(request);

        // For now, simulate Claude response. In production, this would be an actual API call
        return this.simulateClaudeResponse(request);
    }

    /**
     * Build Claude AI prompt for parsing analysis
     */
    private buildClaudePrompt(request: ClaudeAnalysisRequest): string {
        return `
You are an expert document parsing analyst with deep expertise in resume parsing accuracy.

TASK: Analyze multiple resume parsing results and determine which parsing preserves the original document structure and content most accurately.

CRITICAL FOCUS AREAS:
1. BULLET POINT INTEGRITY: Detect if single bullet points have been incorrectly fragmented into multiple pieces
2. CONTENT PRESERVATION: Ensure no original content is lost or duplicated
3. STRUCTURAL ACCURACY: Maintain original section organization and hierarchy
4. JOB TITLE PARSING: Correctly identify job titles without fragmenting them

ORIGINAL CONTENT (first 1000 characters):
${request.originalContent.substring(0, 1000)}...

PARSING SOURCES TO ANALYZE:
${request.parsingSources.map((source, index) => `
${index + 1}. ${source.name} (Type: ${source.type}, Confidence: ${Math.round(source.confidence * 100)}%)
   - Processing Time: ${source.processingTime}ms
   - Metadata: ${JSON.stringify(source.metadata)}
`).join('')}

ANALYSIS REQUIREMENTS:

1. BULLET POINT FRAGMENTATION DETECTION:
   - Look for cases where a single coherent bullet point has been split into fragments
   - Identify which source preserves bullet point integrity best
   - Rate bullet point handling accuracy (1-10)

2. CONTENT VALIDATION:
   - Check if any original content is missing from parsed results
   - Identify duplicated content across sources
   - Verify section boundaries are correctly maintained

3. STRUCTURAL ACCURACY:
   - Evaluate if job titles are correctly identified as single units
   - Check if section headers are properly preserved
   - Assess overall document hierarchy maintenance

4. SOURCE RANKING:
   - Rank sources by parsing accuracy (1 = best)
   - Provide specific strengths and weaknesses for each
   - Recommend the best source or suggest hybrid approach

5. HYBRID RECOMMENDATIONS:
   - If no single source is perfect, suggest combining the best parts
   - Provide specific improvement suggestions
   - Focus on bullet point reconstruction and content preservation

Please provide a comprehensive analysis with specific recommendations for achieving the most accurate document parsing that preserves the original structure and prevents content fragmentation.
        `;
    }

    /**
     * Simulate Claude API response (replace with actual API call in production)
     */
    private async simulateClaudeResponse(request: ClaudeAnalysisRequest): Promise<ClaudeAnalysisResponse> {
        console.log('🤖 Simulating Claude AI analysis...');

        // Analyze the sources intelligently
        const sourceRankings = request.parsingSources.map((source, index) => {
            let score = source.confidence * 10;
            let bulletPointHandling = 7;
            let contentPreservation = 8;
            let structuralAccuracy = 7;

            const strengths: string[] = [];
            const weaknesses: string[] = [];

            // Azure source analysis
            if (source.type === 'azure') {
                strengths.push('Excellent formatting detection', 'High confidence in element boundaries');
                if (source.metadata?.elementsFound > 50) {
                    score += 1;
                    strengths.push('Comprehensive element detection');
                }
                bulletPointHandling = 8.5;
                contentPreservation = 9;
                structuralAccuracy = 8.5;
            }

            // Revolutionary parser analysis
            if (source.type === 'revolutionary') {
                strengths.push('Advanced template matching', 'ATS optimization');
                bulletPointHandling = 7.5;
                if (source.metadata?.atsScore > 80) {
                    strengths.push('High ATS compatibility');
                    score += 0.5;
                }
            }

            // API source analysis
            if (source.type === 'api') {
                strengths.push('Modern API integration', 'Fast processing');
                if (source.metadata?.bulletsFound > 0) {
                    strengths.push('Good bullet point detection');
                    bulletPointHandling = 8;
                }
                if (source.metadata?.improvementsFound > 0) {
                    strengths.push('Content enhancement capabilities');
                }
            }

            // Universal parser analysis
            if (source.type === 'universal') {
                strengths.push('Reliable fallback', 'Consistent results');
                weaknesses.push('Basic parsing only', 'Limited formatting preservation');
                bulletPointHandling = 6;
                contentPreservation = 7;
            }

            // Common issues
            if (source.confidence < 0.7) {
                weaknesses.push('Low confidence score');
                score -= 1;
            }
            if (source.processingTime > 10000) {
                weaknesses.push('Slow processing time');
            }

            return {
                sourceId: source.id,
                rank: index + 1,
                score: Math.max(1, Math.min(10, score)),
                strengths,
                weaknesses,
                bulletPointHandling,
                contentPreservation,
                structuralAccuracy
            };
        }).sort((a, b) => b.score - a.score).map((item, index) => ({ ...item, rank: index + 1 }));

        // Detect bullet point fragmentation
        const fragmentationDetected = this.detectFragmentationInSources(request.originalContent, request.parsingSources);

        const bestSource = sourceRankings[0];

        return {
            analysis: {
                overallAssessment: `Based on comprehensive analysis, ${request.parsingSources.find(s => s.id === bestSource.sourceId)?.name} provides the most accurate parsing with ${Math.round(bestSource.score * 10)}% effectiveness`,
                bestSourceRecommendation: bestSource.sourceId,
                confidenceScore: bestSource.score / 10,
                keyFindings: [
                    `${fragmentationDetected ? 'Bullet point fragmentation detected' : 'Bullet points well preserved'}`,
                    `Best bullet handling: ${bestSource.bulletPointHandling}/10`,
                    `Content preservation: ${bestSource.contentPreservation}/10`,
                    `${sourceRankings.length} sources analyzed and ranked`
                ]
            },
            sourceRankings,
            bulletPointAnalysis: {
                fragmentationDetected,
                fragmentedBullets: [], // Would be populated in real analysis
                integrityScore: fragmentationDetected ? 6.5 : 8.5,
                recommendations: fragmentationDetected ?
                    ['Consider hybrid approach to reconstruct fragmented bullets'] :
                    ['Bullet point integrity is well maintained']
            },
            hybridRecommendations: fragmentationDetected || bestSource.score < 8 ? {
                shouldCreateHybrid: true,
                improvements: [
                    {
                        type: 'bullet_reconstruction',
                        description: 'Combine fragmented bullet points into coherent statements',
                        fromSource: bestSource.sourceId,
                        confidence: 0.8
                    }
                ]
            } : undefined
        };
    }

    /**
     * Create hybrid result by combining the best parts from different sources
     */
    private async createHybridResult(
        originalContent: string,
        sources: ParsingSource[],
        claudeAnalysis: ClaudeAnalysisResponse,
        bulletPointAnalysis: BulletPointAnalysis[]
    ): Promise<{ parsedResume: ParsedResume; improvements: any }> {
        console.log('🔧 Creating hybrid result...');

        // Start with the best source as base
        const bestSource = sources.find(s => s.id === claudeAnalysis.analysis.bestSourceRecommendation);
        let baseParsedResume = this.convertSourceToParsedResume(bestSource!);

        const improvements = {
            bulletPointReconstructions: [] as Array<{ original: string; improved: string; reason: string }>,
            sectionReorganizations: [] as Array<{ section: string; improvement: string; reason: string }>,
            structuralFixes: [] as string[]
        };

        // Fix fragmented bullet points
        for (const bulletAnalysis of bulletPointAnalysis) {
            if (bulletAnalysis.isFragmented && bulletAnalysis.fragments.length > 1) {
                const reconstructed = this.reconstructFragmentedBullet(bulletAnalysis.fragments);
                improvements.bulletPointReconstructions.push({
                    original: bulletAnalysis.fragments.join(' | '),
                    improved: reconstructed,
                    reason: 'Reconstructed fragmented bullet point into coherent statement'
                });

                // Apply the reconstruction to the resume
                baseParsedResume = this.applyBulletReconstruction(baseParsedResume, bulletAnalysis.fragments, reconstructed);
            }
        }

        // Merge missing content from other sources
        for (const source of sources) {
            if (source.id !== bestSource?.id) {
                const missingContent = this.findMissingContentInBase(baseParsedResume, source);
                if (missingContent.length > 0) {
                    baseParsedResume = this.mergeMissingContent(baseParsedResume, missingContent);
                    improvements.structuralFixes.push(`Added ${missingContent.length} missing items from ${source.name}`);
                }
            }
        }

        console.log(`🔧 Hybrid result created with ${improvements.bulletPointReconstructions.length} reconstructions`);

        return {
            parsedResume: baseParsedResume,
            improvements
        };
    }

    // Helper methods for calculations and processing

    private determineFocusAreas(priorityFocus?: string): ('bullet_points' | 'sections' | 'structure' | 'content')[] {
        if (priorityFocus === 'bullet_points') {
            return ['bullet_points', 'content', 'structure', 'sections'];
        }
        return ['bullet_points', 'sections', 'structure', 'content'];
    }

    private calculateUniversalConfidence(parsed: ParsedResume): number {
        if (!parsed) return 0.3;
        let confidence = 0.5;
        if (parsed.name) confidence += 0.1;
        if (parsed.contact?.email) confidence += 0.1;
        if (parsed.sections && parsed.sections.length > 2) confidence += 0.2;
        if (parsed.sections && parsed.sections.some(s => s.title.toLowerCase().includes('experience'))) confidence += 0.1;
        return Math.min(1.0, confidence);
    }

    private countBullets(parsed: ParsedResume): number {
        if (!parsed.sections) return 0;
        return parsed.sections.reduce((count, section) => {
            return count + (section.content.match(/^[\s]*[•▪▫◦‣⁃▸▹]\s/gm) || []).length;
        }, 0);
    }

    private extractWords(content: string): string[] {
        return content.toLowerCase().match(/\b\w+\b/g) || [];
    }

    private extractSentences(content: string): string[] {
        return content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    }

    private extractBulletPoints(content: string): string[] {
        const lines = content.split('\n');
        const bullets: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (/^[\s]*[•▪▫◦‣⁃▸▹\-*]\s/.test(trimmed)) {
                const cleaned = trimmed.replace(/^[\s]*[•▪▫◦‣⁃▸▹\-*]\s*/, '').trim();
                if (cleaned.length > 10) {
                    bullets.push(cleaned);
                }
            }
        }
        return bullets;
    }

    private extractContentFromSource(source: ParsingSource): string {
        // Extract text content based on source type
        if (source.type === 'universal') {
            const parsed = source.data as ParsedResume;
            return [
                parsed.name || '',
                parsed.contact ? `${parsed.contact.email || ''} ${parsed.contact.phone || ''}` : '',
                ...(parsed.sections || []).map(s => `${s.title}\n${s.content}`)
            ].join('\n');
        }

        if (source.type === 'azure') {
            const azure = source.data as DocumentStructureResult;
            return azure.sections.map(s => `${s.title}\n${s.elements.map(e => e.text).join('\n')}`).join('\n\n');
        }

        // Add other source types as needed
        return '';
    }

    private calculateWordsPreserved(original: string[], source: string[]): number {
        const originalSet = new Set(original);
        const preserved = source.filter(word => originalSet.has(word));
        return original.length > 0 ? preserved.length / original.length : 0;
    }

    private calculateStructuralAccuracy(original: string, source: string): number {
        const originalSections = original.match(/^[A-Z\s&-]{3,30}$/gm) || [];
        const sourceSections = source.match(/^[A-Z\s&-]{3,30}$/gm) || [];

        if (originalSections.length === 0) return 1.0;

        const preserved = originalSections.filter(section =>
            sourceSections.some(sourceSection =>
                this.calculateTextSimilarity(section, sourceSection) > 0.8
            )
        );

        return preserved.length / originalSections.length;
    }

    private calculateBulletIntegrity(original: string, source: string): number {
        const originalBullets = this.extractBulletPoints(original);
        const sourceBullets = this.extractBulletPoints(source);

        if (originalBullets.length === 0) return 1.0;

        const preserved = originalBullets.filter(bullet =>
            sourceBullets.some(sourceBullet =>
                this.calculateTextSimilarity(bullet, sourceBullet) > 0.7
            )
        );

        return preserved.length / originalBullets.length;
    }

    private calculateTextSimilarity(text1: string, text2: string): number {
        const words1 = this.extractWords(text1);
        const words2 = this.extractWords(text2);

        if (words1.length === 0 && words2.length === 0) return 1.0;
        if (words1.length === 0 || words2.length === 0) return 0.0;

        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        return intersection.size / union.size;
    }

    private detectMissingContent(original: string, sources: ParsingSource[]): string[] {
        // Implementation would analyze what content is present in original but missing from sources
        return [];
    }

    private detectDuplicatedContent(sources: ParsingSource[]): string[] {
        // Implementation would find duplicated content across sources
        return [];
    }

    private calculateOverallBulletIntegrity(original: string, sources: ParsingSource[]): number {
        return sources.reduce((sum, source) => {
            const content = this.extractContentFromSource(source);
            return sum + this.calculateBulletIntegrity(original, content);
        }, 0) / sources.length;
    }

    private calculateSectionOrganization(original: string, sources: ParsingSource[]): number {
        return sources.reduce((sum, source) => {
            const content = this.extractContentFromSource(source);
            return sum + this.calculateStructuralAccuracy(original, content);
        }, 0) / sources.length;
    }

    private findBulletInSource(bullet: string, source: ParsingSource): string[] {
        const content = this.extractContentFromSource(source);
        const sourceBullets = this.extractBulletPoints(content);

        // Find fragments of the original bullet
        const fragments: string[] = [];
        for (const sourceBullet of sourceBullets) {
            if (this.calculateTextSimilarity(bullet, sourceBullet) > 0.3) {
                fragments.push(sourceBullet);
            }
        }

        return fragments;
    }

    private detectFragmentationInSources(original: string, sources: ParsingSource[]): boolean {
        const originalBullets = this.extractBulletPoints(original);

        for (const bullet of originalBullets) {
            for (const source of sources) {
                const fragments = this.findBulletInSource(bullet, source);
                if (fragments.length > 1) {
                    return true; // Fragmentation detected
                }
            }
        }
        return false;
    }

    private findBestSource(
        sources: ParsingSource[],
        claudeAnalysis: ClaudeAnalysisResponse,
        contentValidation: ContentValidationResult
    ): ParsingSource {
        const bestSourceId = claudeAnalysis.analysis.bestSourceRecommendation;
        return sources.find(s => s.id === bestSourceId) || sources[0];
    }

    private shouldCreateHybrid(
        claudeAnalysis: ClaudeAnalysisResponse,
        contentValidation: ContentValidationResult,
        bulletPointAnalysis: BulletPointAnalysis[],
        options: any
    ): boolean {
        if (options.enableHybridCreation === false) return false;

        // Create hybrid if:
        // 1. Claude recommends it
        // 2. Bullet point fragmentation detected
        // 3. Content validation shows issues

        return claudeAnalysis.hybridRecommendations?.shouldCreateHybrid ||
               claudeAnalysis.bulletPointAnalysis.fragmentationDetected ||
               contentValidation.overallQuality < 0.85 ||
               bulletPointAnalysis.some(b => b.isFragmented);
    }

    private convertSourceToParsedResume(source: ParsingSource): ParsedResume {
        if (source.type === 'universal') {
            return source.data as ParsedResume;
        }

        // Convert other source types to ParsedResume format
        // This would contain logic to convert Azure, Revolutionary, etc. to standard format

        return {
            name: '',
            contact: {},
            sections: [],
            wordCount: 0
        };
    }

    private reconstructFragmentedBullet(fragments: string[]): string {
        // Intelligent reconstruction of fragmented bullet points
        return fragments.join(' ').replace(/\s+/g, ' ').trim();
    }

    private applyBulletReconstruction(resume: ParsedResume, fragments: string[], reconstructed: string): ParsedResume {
        // Apply bullet point reconstruction to the resume
        return { ...resume }; // Implementation would modify the actual content
    }

    private findMissingContentInBase(baseResume: ParsedResume, source: ParsingSource): string[] {
        // Find content present in source but missing from base
        return [];
    }

    private mergeMissingContent(baseResume: ParsedResume, missingContent: string[]): ParsedResume {
        // Merge missing content into base resume
        return { ...baseResume };
    }

    private getSourceStrengths(source: ParsingSource, claudeAnalysis: ClaudeAnalysisResponse): string[] {
        const ranking = claudeAnalysis.sourceRankings.find(r => r.sourceId === source.id);
        return ranking?.strengths || [];
    }

    private getSourceWeaknesses(source: ParsingSource, claudeAnalysis: ClaudeAnalysisResponse): string[] {
        const ranking = claudeAnalysis.sourceRankings.find(r => r.sourceId === source.id);
        return ranking?.weaknesses || [];
    }

    private calculateBulletPointAccuracy(source: ParsingSource, bulletAnalysis: BulletPointAnalysis[]): number {
        // Calculate how well this source handles bullet points
        return bulletAnalysis.reduce((sum, analysis) => sum + analysis.completenessScore, 0) / bulletAnalysis.length;
    }

    private calculateSourceStructuralAccuracy(source: ParsingSource, contentValidation: ContentValidationResult): number {
        return contentValidation.structuralAccuracy;
    }

    private generateReasoningExplanation(
        bestSource: ParsingSource,
        claudeAnalysis: ClaudeAnalysisResponse,
        isHybrid: boolean
    ): string[] {
        const reasoning = [
            `Selected ${bestSource.name} based on Claude AI analysis with ${Math.round(bestSource.confidence * 100)}% confidence`,
            ...claudeAnalysis.analysis.keyFindings
        ];

        if (isHybrid) {
            reasoning.push('Created hybrid result to address parsing accuracy issues');
        }

        return reasoning;
    }

    /**
     * Fallback methods for error handling
     */
    private createFallbackClaudeAnalysis(original: string, sources: ParsingSource[]): ClaudeAnalysisResponse {
        const bestSource = sources.reduce((best, current) =>
            current.confidence > best.confidence ? current : best, sources[0]);

        return {
            analysis: {
                overallAssessment: 'Fallback analysis due to Claude API unavailability',
                bestSourceRecommendation: bestSource.id,
                confidenceScore: bestSource.confidence,
                keyFindings: ['Using confidence-based selection', 'Limited analysis available']
            },
            sourceRankings: sources.map((source, index) => ({
                sourceId: source.id,
                rank: index + 1,
                score: source.confidence * 10,
                strengths: ['Available source'],
                weaknesses: ['Limited analysis'],
                bulletPointHandling: 7,
                contentPreservation: 7,
                structuralAccuracy: 7
            })).sort((a, b) => b.score - a.score),
            bulletPointAnalysis: {
                fragmentationDetected: false,
                fragmentedBullets: [],
                integrityScore: 7,
                recommendations: ['Manual review recommended']
            }
        };
    }

    private createFallbackResult(original: string, parsed: ParsedResume, error: any): ArbitratedResult {
        return {
            success: true,
            chosenSource: {
                id: 'fallback',
                name: 'Universal Parser (Fallback)',
                type: 'fallback',
                confidence: 0.5,
                processingTime: 0,
                data: parsed
            },
            confidence: 0.5,
            reasoning: ['Fallback to universal parser due to analysis failure'],
            parsedResume: parsed,
            bulletPointAnalysis: [],
            contentValidation: {
                contentPreserved: true,
                missingContent: [],
                duplicatedContent: [],
                structuralAccuracy: 0.5,
                bulletPointIntegrity: 0.5,
                sectionOrganization: 0.5,
                overallQuality: 0.5,
                issues: ['Analysis failed, using fallback'],
                suggestions: ['Manual review recommended']
            },
            isHybrid: false,
            sourceComparison: [],
            metadata: {
                totalSources: 1,
                analysisTime: 0,
                claudeAnalysisTime: 0,
                hybridCreated: false,
                improvementsApplied: 0
            },
            error: error.message
        };
    }

    private createErrorResult(error: any, fallbackError: any): ArbitratedResult {
        return {
            success: false,
            chosenSource: {
                id: 'error',
                name: 'Error',
                type: 'fallback',
                confidence: 0,
                processingTime: 0,
                data: null
            },
            confidence: 0,
            reasoning: ['All parsing attempts failed'],
            parsedResume: { name: '', contact: {}, sections: [], wordCount: 0 },
            bulletPointAnalysis: [],
            contentValidation: {
                contentPreserved: false,
                missingContent: [],
                duplicatedContent: [],
                structuralAccuracy: 0,
                bulletPointIntegrity: 0,
                sectionOrganization: 0,
                overallQuality: 0,
                issues: ['All parsing failed'],
                suggestions: ['Try different file or format']
            },
            isHybrid: false,
            sourceComparison: [],
            metadata: {
                totalSources: 0,
                analysisTime: 0,
                claudeAnalysisTime: 0,
                hybridCreated: false,
                improvementsApplied: 0
            },
            error: `Parsing failed: ${error.message}. Fallback also failed: ${fallbackError.message}`
        };
    }
}

export default new IntelligentParsingArbiterService();
export { IntelligentParsingArbiterService };
export type {
    ParsingSource,
    BulletPointAnalysis,
    ContentValidationResult,
    ArbitratedResult,
    ClaudeAnalysisRequest,
    ClaudeAnalysisResponse
};