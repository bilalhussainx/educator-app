/**
 * Azure Vision Test Page
 * Comprehensive testing environment for Azure Document Intelligence resume analysis
 * Includes document format testing, structure validation, and template generation
 */

import React, { useState, useEffect } from 'react';
import AzureVisionResumeAnalyzer from '../components/resume/AzureVisionResumeAnalyzer';

interface SystemStatus {
    azureConnected: boolean;
    apiKeyConfigured: boolean;
    endpointConfigured: boolean;
    backendConnected: boolean;
    lastChecked: string;
}

const AzureVisionTestPage: React.FC = () => {
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [isCheckingStatus, setIsCheckingStatus] = useState(true);

    useEffect(() => {
        checkSystemStatus();
    }, []);

    const checkSystemStatus = async () => {
        setIsCheckingStatus(true);
        try {
            const response = await fetch('/api/azure-vision/health');
            const data = await response.json();

            setSystemStatus({
                azureConnected: data.success,
                apiKeyConfigured: data.configuration?.azureKeyConfigured || false,
                endpointConfigured: data.configuration?.azureEndpointConfigured || false,
                backendConnected: response.ok,
                lastChecked: new Date().toISOString()
            });
        } catch (error) {
            console.error('Health check failed:', error);
            setSystemStatus({
                azureConnected: false,
                apiKeyConfigured: false,
                endpointConfigured: false,
                backendConnected: false,
                lastChecked: new Date().toISOString()
            });
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const testScenarios = [
        {
            title: '📄 PDF Resume Testing',
            description: 'Test various PDF resume formats and layouts',
            scenarios: [
                'Single-column traditional resume',
                'Two-column modern resume',
                'Academic CV with publications',
                'Creative portfolio resume',
                'Technical resume with code samples'
            ]
        },
        {
            title: '📝 Word Document Testing',
            description: 'Test different Word document structures',
            scenarios: [
                'Standard .docx format',
                'Legacy .doc format',
                'Complex formatting with tables',
                'Bullet point variations',
                'Mixed font hierarchies'
            ]
        },
        {
            title: '🖼️ Image Format Testing',
            description: 'Test scanned and image-based resumes',
            scenarios: [
                'High-quality scanned PDFs',
                'PNG screenshots of resumes',
                'JPEG photos of printed resumes',
                'TIFF professional scans',
                'Mixed image quality testing'
            ]
        },
        {
            title: '🎯 Structure Detection Testing',
            description: 'Validate specific structure detection capabilities',
            scenarios: [
                'Contact information extraction',
                'Section header identification',
                'Bullet point hierarchy detection',
                'Job title and company parsing',
                'Date range recognition'
            ]
        },
        {
            title: '🎨 Formatting Preservation Testing',
            description: 'Test template generation and formatting preservation',
            scenarios: [
                'Font size and weight preservation',
                'Margin and spacing detection',
                'Color scheme extraction',
                'Layout pattern recognition',
                'CSS generation accuracy'
            ]
        }
    ];

    const renderSystemStatus = () => (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
                <button
                    onClick={checkSystemStatus}
                    disabled={isCheckingStatus}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {isCheckingStatus ? (
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Checking...
                        </div>
                    ) : (
                        'Refresh Status'
                    )}
                </button>
            </div>

            {systemStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg border ${
                        systemStatus.backendConnected
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                    }`}>
                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                                systemStatus.backendConnected ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span className="font-medium">Backend API</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {systemStatus.backendConnected ? 'Connected' : 'Disconnected'}
                        </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                        systemStatus.azureConnected
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                    }`}>
                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                                systemStatus.azureConnected ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span className="font-medium">Azure Service</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {systemStatus.azureConnected ? 'Connected' : 'Unavailable'}
                        </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                        systemStatus.apiKeyConfigured
                            ? 'bg-green-50 border-green-200'
                            : 'bg-yellow-50 border-yellow-200'
                    }`}>
                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                                systemStatus.apiKeyConfigured ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                            <span className="font-medium">API Key</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {systemStatus.apiKeyConfigured ? 'Configured' : 'Missing'}
                        </p>
                    </div>

                    <div className={`p-4 rounded-lg border ${
                        systemStatus.endpointConfigured
                            ? 'bg-green-50 border-green-200'
                            : 'bg-yellow-50 border-yellow-200'
                    }`}>
                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                                systemStatus.endpointConfigured ? 'bg-green-500' : 'bg-yellow-500'
                            }`}></div>
                            <span className="font-medium">Endpoint</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            {systemStatus.endpointConfigured ? 'Configured' : 'Missing'}
                        </p>
                    </div>
                </div>
            )}

            {systemStatus && systemStatus.lastChecked && (
                <p className="text-xs text-gray-500 mt-4">
                    Last checked: {new Date(systemStatus.lastChecked).toLocaleString()}
                </p>
            )}
        </div>
    );

    const renderTestScenarios = () => (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Testing Scenarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {testScenarios.map((scenario, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{scenario.title}</h3>
                        <p className="text-sm text-gray-600 mb-3">{scenario.description}</p>
                        <ul className="space-y-1">
                            {scenario.scenarios.map((item, itemIndex) => (
                                <li key={itemIndex} className="text-xs text-gray-500 flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderFeatureOverview = () => (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Azure Vision Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="font-semibold text-blue-900 mb-3">🔍 Document Intelligence</h3>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li>• Multi-model Azure analysis (Layout, Read, Document)</li>
                        <li>• Intelligent element classification</li>
                        <li>• Spatial relationship detection</li>
                        <li>• Confidence scoring for all elements</li>
                        <li>• Hierarchical structure mapping</li>
                    </ul>
                </div>
                <div>
                    <h3 className="font-semibold text-purple-900 mb-3">🎨 Format Preservation</h3>
                    <ul className="space-y-2 text-sm text-purple-800">
                        <li>• Font size and weight detection</li>
                        <li>• Margin and spacing preservation</li>
                        <li>• Bullet point style recognition</li>
                        <li>• CSS stylesheet generation</li>
                        <li>• HTML template creation</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto p-6">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Azure Vision Testing Laboratory
                    </h1>
                    <p className="text-xl text-gray-600">
                        Advanced document structure detection and formatting preservation using Azure Document Intelligence
                    </p>
                </div>

                {/* System Status */}
                {renderSystemStatus()}

                {/* Feature Overview */}
                {renderFeatureOverview()}

                {/* Test Scenarios */}
                {renderTestScenarios()}

                {/* Main Analyzer Component */}
                <div className="bg-white border border-gray-200 rounded-lg p-1">
                    <AzureVisionResumeAnalyzer />
                </div>

                {/* Testing Instructions */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
                    <h2 className="text-xl font-semibold text-yellow-900 mb-4">
                        🧪 Testing Instructions
                    </h2>
                    <div className="space-y-3 text-yellow-800">
                        <p>
                            <strong>1. System Check:</strong> Verify all services are connected before testing.
                        </p>
                        <p>
                            <strong>2. Upload Testing:</strong> Try different file formats (PDF, DOCX, images) to test format support.
                        </p>
                        <p>
                            <strong>3. Structure Validation:</strong> Check if sections, bullet points, and contact info are detected correctly.
                        </p>
                        <p>
                            <strong>4. Template Quality:</strong> Review generated templates for formatting preservation accuracy.
                        </p>
                        <p>
                            <strong>5. Performance Monitoring:</strong> Note processing times and confidence scores for different document types.
                        </p>
                    </div>
                </div>

                {/* API Documentation */}
                <div className="bg-gray-900 text-gray-100 rounded-lg p-6 mt-8">
                    <h2 className="text-xl font-semibold mb-4">🔗 API Endpoints</h2>
                    <div className="space-y-3 font-mono text-sm">
                        <div>
                            <span className="text-green-400">POST</span> /api/azure-vision/analyze-resume
                            <p className="text-gray-400 ml-4">Upload and analyze resume structure</p>
                        </div>
                        <div>
                            <span className="text-blue-400">GET</span> /api/azure-vision/analysis/:id
                            <p className="text-gray-400 ml-4">Retrieve specific analysis results</p>
                        </div>
                        <div>
                            <span className="text-blue-400">GET</span> /api/azure-vision/analyses
                            <p className="text-gray-400 ml-4">List all user analyses</p>
                        </div>
                        <div>
                            <span className="text-blue-400">GET</span> /api/azure-vision/health
                            <p className="text-gray-400 ml-4">Check system status</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AzureVisionTestPage;