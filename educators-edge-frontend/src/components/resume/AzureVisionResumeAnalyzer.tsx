/**
 * Azure Vision Resume Analyzer Component
 * Tests and demonstrates Azure Vision document structure detection
 * Supports various document formats and provides detailed analysis results
 */

import React, { useState, useRef, useCallback } from 'react';
import azureVisionDocumentStructureService from '../../services/azureVisionDocumentStructureService';
import enhancedResumeTemplateEngine from '../../services/enhancedResumeTemplateEngine';
import type { DocumentStructureResult, DocumentElement, DocumentSection } from '../../services/azureVisionDocumentStructureService';
import type { ResumeTemplate } from '../../services/enhancedResumeTemplateEngine';

interface AnalysisState {
    isUploading: boolean;
    isAnalyzing: boolean;
    analysisResult: DocumentStructureResult | null;
    generatedTemplate: ResumeTemplate | null;
    error: string | null;
    uploadProgress: number;
}

interface TestResult {
    id: string;
    filename: string;
    fileSize: string;
    processingTime: number;
    confidence: number;
    qualityScore: number;
    elementsFound: number;
    sectionsFound: number;
    bulletPointsFound: number;
    timestamp: string;
    analysisResult: DocumentStructureResult;
    template: ResumeTemplate | null;
}

const AzureVisionResumeAnalyzer: React.FC = () => {
    const [analysisState, setAnalysisState] = useState<AnalysisState>({
        isUploading: false,
        isAnalyzing: false,
        analysisResult: null,
        generatedTemplate: null,
        error: null,
        uploadProgress: 0
    });

    const [testResults, setTestResults] = useState<TestResult[]>([]);
    const [selectedTab, setSelectedTab] = useState<'upload' | 'results' | 'template' | 'testing'>('upload');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const supportedFormats = [
        { ext: '.pdf', type: 'application/pdf', desc: 'PDF documents' },
        { ext: '.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', desc: 'Word documents' },
        { ext: '.doc', type: 'application/msword', desc: 'Legacy Word documents' },
        { ext: '.jpg/.jpeg', type: 'image/jpeg', desc: 'JPEG images' },
        { ext: '.png', type: 'image/png', desc: 'PNG images' },
        { ext: '.tiff', type: 'image/tiff', desc: 'TIFF images' }
    ];

    const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        console.log('📄 Starting file analysis:', file.name);

        setAnalysisState(prev => ({
            ...prev,
            isUploading: true,
            isAnalyzing: true,
            error: null,
            uploadProgress: 0
        }));

        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setAnalysisState(prev => ({
                    ...prev,
                    uploadProgress: Math.min(prev.uploadProgress + 10, 90)
                }));
            }, 200);

            // Analyze document structure
            const startTime = Date.now();
            const analysisResult = await azureVisionDocumentStructureService.analyzeDocumentStructure(file);
            const processingTime = Date.now() - startTime;

            clearInterval(progressInterval);

            setAnalysisState(prev => ({ ...prev, uploadProgress: 100 }));

            if (!analysisResult.success) {
                throw new Error(analysisResult.error || 'Analysis failed');
            }

            console.log('✅ Analysis completed:', analysisResult);

            // Generate template from analysis
            let generatedTemplate: ResumeTemplate | null = null;
            try {
                generatedTemplate = await enhancedResumeTemplateEngine.generateTemplate(
                    analysisResult,
                    `analysis_${Date.now()}`,
                    file.name
                );
                console.log('✅ Template generated:', generatedTemplate);
            } catch (templateError) {
                console.warn('⚠️ Template generation failed:', templateError);
            }

            // Create test result
            const testResult: TestResult = {
                id: `test_${Date.now()}`,
                filename: file.name,
                fileSize: formatFileSize(file.size),
                processingTime,
                confidence: Math.round(analysisResult.metadata.confidence * 100),
                qualityScore: analysisResult.metadata.qualityScore,
                elementsFound: analysisResult.sections.reduce((total, section) => total + section.elements.length, 0),
                sectionsFound: analysisResult.sections.length,
                bulletPointsFound: analysisResult.bulletPoints.length,
                timestamp: new Date().toISOString(),
                analysisResult,
                template: generatedTemplate
            };

            setTestResults(prev => [testResult, ...prev]);

            setAnalysisState({
                isUploading: false,
                isAnalyzing: false,
                analysisResult,
                generatedTemplate,
                error: null,
                uploadProgress: 0
            });

            setSelectedTab('results');

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            setAnalysisState(prev => ({
                ...prev,
                isUploading: false,
                isAnalyzing: false,
                error: error.message || 'Analysis failed',
                uploadProgress: 0
            }));
        }
    }, []);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const renderUploadTab = () => (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                    🔍 Azure Vision Document Structure Analysis
                </h3>
                <p className="text-blue-700 mb-4">
                    Upload a resume to analyze its structure, detect formatting, and preserve original layout using Azure Document Intelligence.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    {supportedFormats.map((format, index) => (
                        <div key={index} className="bg-white border border-blue-200 rounded p-3">
                            <div className="font-medium text-blue-900">{format.ext}</div>
                            <div className="text-sm text-blue-600">{format.desc}</div>
                        </div>
                    ))}
                </div>

                <div
                    className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <div className="text-blue-600 mb-2">
                        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <p className="text-blue-700 font-medium">Click to upload resume</p>
                    <p className="text-blue-500 text-sm">Maximum file size: 20MB</p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.tiff"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>

            {analysisState.isAnalyzing && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-3"></div>
                        <h4 className="font-semibold text-yellow-800">Analyzing Document Structure...</h4>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-yellow-700">
                            <span>Processing Progress</span>
                            <span>{analysisState.uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-yellow-200 rounded-full h-2">
                            <div
                                className="bg-yellow-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${analysisState.uploadProgress}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="mt-4 text-sm text-yellow-600">
                        <p>🔍 Running Azure Document Intelligence models...</p>
                        <p>📊 Detecting document structure and formatting...</p>
                        <p>🎨 Generating preservation template...</p>
                    </div>
                </div>
            )}

            {analysisState.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <h4 className="font-semibold text-red-800 mb-2">Analysis Failed</h4>
                    <p className="text-red-700">{analysisState.error}</p>
                </div>
            )}
        </div>
    );

    const renderResultsTab = () => (
        <div className="space-y-6">
            {analysisState.analysisResult && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-900 mb-4">
                        ✅ Analysis Complete
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white border border-green-200 rounded p-4">
                            <div className="text-2xl font-bold text-green-900">
                                {analysisState.analysisResult.sections.length}
                            </div>
                            <div className="text-sm text-green-600">Sections Detected</div>
                        </div>
                        <div className="bg-white border border-green-200 rounded p-4">
                            <div className="text-2xl font-bold text-green-900">
                                {analysisState.analysisResult.bulletPoints.length}
                            </div>
                            <div className="text-sm text-green-600">Bullet Points</div>
                        </div>
                        <div className="bg-white border border-green-200 rounded p-4">
                            <div className="text-2xl font-bold text-green-900">
                                {Math.round(analysisState.analysisResult.metadata.confidence * 100)}%
                            </div>
                            <div className="text-sm text-green-600">Confidence</div>
                        </div>
                        <div className="bg-white border border-green-200 rounded p-4">
                            <div className="text-2xl font-bold text-green-900">
                                {analysisState.analysisResult.metadata.qualityScore}
                            </div>
                            <div className="text-sm text-green-600">Quality Score</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-green-900">Document Information</h4>
                        <div className="bg-white border border-green-200 rounded p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Layout Type:</span> {analysisState.analysisResult.documentInfo.layoutType}
                                </div>
                                <div>
                                    <span className="font-medium">Overall Style:</span> {analysisState.analysisResult.documentInfo.overallStyle}
                                </div>
                                <div>
                                    <span className="font-medium">Page Count:</span> {analysisState.analysisResult.documentInfo.pageCount}
                                </div>
                                <div>
                                    <span className="font-medium">Processing Time:</span> {analysisState.analysisResult.metadata.processingTime}ms
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold text-green-900">Personal Information Detected</h4>
                        <div className="bg-white border border-green-200 rounded p-4">
                            <div className="space-y-2 text-sm">
                                {analysisState.analysisResult.personalInfo.name && (
                                    <div><span className="font-medium">Name:</span> {analysisState.analysisResult.personalInfo.name.text}</div>
                                )}
                                {analysisState.analysisResult.personalInfo.email && (
                                    <div><span className="font-medium">Email:</span> {analysisState.analysisResult.personalInfo.email.text}</div>
                                )}
                                {analysisState.analysisResult.personalInfo.phone && (
                                    <div><span className="font-medium">Phone:</span> {analysisState.analysisResult.personalInfo.phone.text}</div>
                                )}
                                {analysisState.analysisResult.personalInfo.linkedin && (
                                    <div><span className="font-medium">LinkedIn:</span> {analysisState.analysisResult.personalInfo.linkedin.text}</div>
                                )}
                            </div>
                        </div>

                        <h4 className="font-semibold text-green-900">Sections Identified</h4>
                        <div className="space-y-2">
                            {analysisState.analysisResult.sections.map((section, index) => (
                                <div key={index} className="bg-white border border-green-200 rounded p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h5 className="font-medium text-green-900">{section.title}</h5>
                                            <p className="text-sm text-green-600">Type: {section.type}</p>
                                            <p className="text-sm text-green-600">Elements: {section.elements.length}</p>
                                        </div>
                                        <div className="text-xs text-green-500">
                                            Font: {section.titleElement.formatting.fontSize}pt,
                                            Weight: {section.titleElement.formatting.fontWeight}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderTemplateTab = () => (
        <div className="space-y-6">
            {analysisState.generatedTemplate && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">
                        🎨 Generated Template
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white border border-purple-200 rounded p-4">
                            <div className="text-2xl font-bold text-purple-900">
                                {analysisState.generatedTemplate.sections.length}
                            </div>
                            <div className="text-sm text-purple-600">Template Sections</div>
                        </div>
                        <div className="bg-white border border-purple-200 rounded p-4">
                            <div className="text-2xl font-bold text-purple-900">
                                {analysisState.generatedTemplate.fontHierarchy.length}
                            </div>
                            <div className="text-sm text-purple-600">Font Levels</div>
                        </div>
                        <div className="bg-white border border-purple-200 rounded p-4">
                            <div className="text-2xl font-bold text-purple-900">
                                {analysisState.generatedTemplate.cssStylesheet.split('\n').length}
                            </div>
                            <div className="text-sm text-purple-600">CSS Lines</div>
                        </div>
                        <div className="bg-white border border-purple-200 rounded p-4">
                            <div className="text-2xl font-bold text-purple-900">
                                {Math.round(analysisState.generatedTemplate.preservationMetadata.confidence * 100)}%
                            </div>
                            <div className="text-sm text-purple-600">Preservation Quality</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-purple-900">Font Hierarchy</h4>
                        <div className="bg-white border border-purple-200 rounded p-4 space-y-2">
                            {analysisState.generatedTemplate.fontHierarchy.map((font, index) => (
                                <div key={index} className="flex justify-between items-center p-2 border border-purple-100 rounded">
                                    <div>
                                        <span className="font-medium">Level {font.level}:</span> {font.usage}
                                    </div>
                                    <div className="text-sm text-purple-600">
                                        {font.fontSize}pt, {font.fontWeight}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <h4 className="font-semibold text-purple-900">Page Layout</h4>
                        <div className="bg-white border border-purple-200 rounded p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium">Layout Type:</span> {analysisState.generatedTemplate.pageLayout.columnLayout}
                                </div>
                                <div>
                                    <span className="font-medium">Line Spacing:</span> {analysisState.generatedTemplate.pageLayout.lineSpacing}pt
                                </div>
                                <div>
                                    <span className="font-medium">Margins:</span> T:{analysisState.generatedTemplate.pageLayout.margins.top} R:{analysisState.generatedTemplate.pageLayout.margins.right} B:{analysisState.generatedTemplate.pageLayout.margins.bottom} L:{analysisState.generatedTemplate.pageLayout.margins.left}
                                </div>
                                <div>
                                    <span className="font-medium">Page Size:</span> {analysisState.generatedTemplate.pageLayout.pageSize.width} × {analysisState.generatedTemplate.pageLayout.pageSize.height}pt
                                </div>
                            </div>
                        </div>

                        <h4 className="font-semibold text-purple-900">CSS Stylesheet Preview</h4>
                        <div className="bg-gray-900 text-green-400 font-mono text-xs p-4 rounded max-h-64 overflow-y-auto">
                            <pre>{analysisState.generatedTemplate.cssStylesheet.slice(0, 1000)}...</pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderTestingTab = () => (
        <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    🧪 Test Results History
                </h3>

                {testResults.length === 0 ? (
                    <p className="text-gray-600">No test results yet. Upload a resume to start testing.</p>
                ) : (
                    <div className="space-y-4">
                        {testResults.map((result) => (
                            <div key={result.id} className="bg-white border border-gray-200 rounded p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="font-medium text-gray-900">{result.filename}</h4>
                                        <p className="text-sm text-gray-600">{result.fileSize} • {new Date(result.timestamp).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900">{result.confidence}%</div>
                                        <div className="text-xs text-gray-600">Confidence</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium">Processing:</span> {result.processingTime}ms
                                    </div>
                                    <div>
                                        <span className="font-medium">Quality:</span> {result.qualityScore}/100
                                    </div>
                                    <div>
                                        <span className="font-medium">Elements:</span> {result.elementsFound}
                                    </div>
                                    <div>
                                        <span className="font-medium">Sections:</span> {result.sectionsFound}
                                    </div>
                                    <div>
                                        <span className="font-medium">Bullets:</span> {result.bulletPointsFound}
                                    </div>
                                </div>

                                <div className="mt-3 flex gap-2">
                                    <button
                                        onClick={() => {
                                            setAnalysisState(prev => ({
                                                ...prev,
                                                analysisResult: result.analysisResult,
                                                generatedTemplate: result.template
                                            }));
                                            setSelectedTab('results');
                                        }}
                                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                    >
                                        View Details
                                    </button>
                                    {result.template && (
                                        <button
                                            onClick={() => {
                                                setAnalysisState(prev => ({
                                                    ...prev,
                                                    analysisResult: result.analysisResult,
                                                    generatedTemplate: result.template
                                                }));
                                                setSelectedTab('template');
                                            }}
                                            className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                                        >
                                            View Template
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Azure Vision Resume Analyzer
                </h1>
                <p className="text-gray-600">
                    Test Azure Document Intelligence for advanced resume structure detection and formatting preservation
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { key: 'upload', label: 'Upload & Analyze', icon: '📤' },
                        { key: 'results', label: 'Analysis Results', icon: '📊' },
                        { key: 'template', label: 'Generated Template', icon: '🎨' },
                        { key: 'testing', label: 'Test Results', icon: '🧪' }
                    ].map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setSelectedTab(tab.key as any)}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${
                                selectedTab === tab.key
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {selectedTab === 'upload' && renderUploadTab()}
            {selectedTab === 'results' && renderResultsTab()}
            {selectedTab === 'template' && renderTemplateTab()}
            {selectedTab === 'testing' && renderTestingTab()}
        </div>
    );
};

export default AzureVisionResumeAnalyzer;