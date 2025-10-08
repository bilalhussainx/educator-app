/**
 * Clean Resume Assistant
 * Simple, user-empowering resume improvement tool aligned with Educators Edge philosophy
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import {
    Upload,
    Sparkles,
    AlertCircle,
    CheckCircle,
    Lightbulb,
    Download,
    RefreshCw,
    FileText,
    Loader2,
    Info
} from 'lucide-react';
import simpleResumeExtractor from '../services/simpleResumeExtractor';
import claudeResumeCoach, { ResumeAnalysis, Improvement } from '../services/claudeResumeCoach';

export default function CleanResumeAssistant() {
    // State
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [resumeText, setResumeText] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
    const [selectedImprovement, setSelectedImprovement] = useState<Improvement | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Handle file upload
     */
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setAnalysis(null);

        // Validate file
        const validation = simpleResumeExtractor.validateFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid file');
            return;
        }

        setUploadedFile(file);
        setIsExtracting(true);

        try {
            console.log('📄 Extracting text from:', file.name);
            const result = await simpleResumeExtractor.extractText(file);

            if (result.success) {
                setResumeText(result.text);
                console.log('✅ Text extracted successfully');
                console.log('📊 Metadata:', result.metadata);
            } else {
                setError(result.error || 'Failed to extract text');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to process file');
            console.error('Extraction error:', err);
        } finally {
            setIsExtracting(false);
        }
    };

    /**
     * Analyze resume with Claude AI
     */
    const handleAnalyze = async () => {
        if (!resumeText.trim()) {
            setError('No resume text to analyze');
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            console.log('🤖 Analyzing resume with Claude AI...');
            const result = await claudeResumeCoach.analyzeResume(resumeText);

            if (result.success) {
                setAnalysis(result);
                console.log('✅ Analysis complete');
            } else {
                setError(result.error || 'Analysis failed');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to analyze resume');
            console.error('Analysis error:', err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    /**
     * Export improved resume
     */
    const handleExport = async (format: 'pdf' | 'docx' | 'txt' = 'txt') => {
        if (format === 'txt') {
            // Simple text export
            const blob = new Blob([resumeText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `improved-resume-${Date.now()}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return;
        }

        // Export as PDF or DOCX with formatting
        try {
            // Convert text to basic HTML with formatting
            const htmlContent = `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; line-height: 1.6;">
                    <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${resumeText}</pre>
                </div>
            `;

            const response = await fetch('http://localhost:10000/api/resume-templates/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    htmlContent,
                    format,
                    options: {
                        margin: {
                            top: '0.5in',
                            right: '0.5in',
                            bottom: '0.5in',
                            left: '0.5in'
                        }
                    }
                })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `improved-resume-${Date.now()}.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            alert(`Failed to export as ${format.toUpperCase()}. Falling back to text export.`);
            handleExport('txt');
        }
    };

    /**
     * Start over
     */
    const handleReset = () => {
        setUploadedFile(null);
        setResumeText('');
        setAnalysis(null);
        setError(null);
        setSelectedImprovement(null);
    };

    /**
     * Get severity color
     */
    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'text-red-600 bg-red-50';
            case 'medium': return 'text-orange-600 bg-orange-50';
            case 'low': return 'text-yellow-600 bg-yellow-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    /**
     * Get score color
     */
    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-600';
        if (score >= 6) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header */}
            <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                                    Resume Assistant
                                </h1>
                                <p className="text-sm text-slate-600 dark:text-slate-300">
                                    AI-powered guidance to improve your resume
                                </p>
                            </div>
                        </div>
                        {resumeText && (
                            <Button onClick={handleReset} variant="outline" size="sm">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Start Over
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        <div>
                            <h3 className="font-medium text-red-900">Error</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {!resumeText ? (
                    /* Upload Section */
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                                <Upload className="w-8 h-8 text-white" />
                            </div>
                            <CardTitle>Upload Your Resume</CardTitle>
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                Get AI-powered feedback to improve your resume
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                                    <input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.txt"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="resume-upload"
                                        disabled={isExtracting}
                                    />
                                    <label
                                        htmlFor="resume-upload"
                                        className="cursor-pointer flex flex-col items-center gap-3"
                                    >
                                        {isExtracting ? (
                                            <>
                                                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                                <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                                                    Extracting text...
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-12 h-12 text-slate-400" />
                                                <div>
                                                    <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
                                                        Click to upload your resume
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        PDF, DOCX, or TXT • Max 10MB
                                                    </p>
                                                </div>
                                            </>
                                        )}
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                        <Sparkles className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                        <h3 className="font-medium text-slate-900 dark:text-white">AI Analysis</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            Comprehensive feedback from Claude
                                        </p>
                                    </div>
                                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                        <Lightbulb className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                        <h3 className="font-medium text-slate-900 dark:text-white">Learn & Improve</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            Understand why changes matter
                                        </p>
                                    </div>
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                        <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                        <h3 className="font-medium text-slate-900 dark:text-white">You Control</h3>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">
                                            Make changes at your own pace
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    /* Main Workspace */
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Resume Editor */}
                        <Card className="h-fit">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Your Resume
                                    </CardTitle>
                                    {uploadedFile && (
                                        <span className="text-xs text-slate-500">
                                            {uploadedFile.name}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Textarea
                                    value={resumeText}
                                    onChange={(e) => setResumeText(e.target.value)}
                                    className="min-h-[500px] font-mono text-sm"
                                    placeholder="Your resume text will appear here. You can edit it directly."
                                />
                                <div className="flex gap-3">
                                    <Button
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing || !resumeText.trim()}
                                        className="flex-1"
                                    >
                                        {isAnalyzing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Analyzing...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Analyze with AI
                                            </>
                                        )}
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleExport('pdf')} variant="outline" size="sm">
                                            <Download className="w-4 h-4 mr-1" />
                                            PDF
                                        </Button>
                                        <Button onClick={() => handleExport('docx')} variant="outline" size="sm">
                                            <Download className="w-4 h-4 mr-1" />
                                            Word
                                        </Button>
                                        <Button onClick={() => handleExport('txt')} variant="outline" size="sm">
                                            <Download className="w-4 h-4 mr-1" />
                                            Text
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Right: AI Analysis */}
                        <div className="space-y-6">
                            {analysis ? (
                                <>
                                    {/* Overall Assessment */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Info className="w-5 h-5 text-blue-600" />
                                                Overall Assessment
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-slate-700 dark:text-slate-300">
                                                {analysis.overallAssessment}
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* Scores */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Scores</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600">Structure & Organization</span>
                                                <span className={`text-lg font-bold ${getScoreColor(analysis.structure.score)}`}>
                                                    {analysis.structure.score}/10
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600">Content Quality</span>
                                                <span className={`text-lg font-bold ${getScoreColor(analysis.content.score)}`}>
                                                    {analysis.content.score}/10
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-600">ATS Compatibility</span>
                                                <span className={`text-lg font-bold ${getScoreColor(analysis.atsCompatibility.score)}`}>
                                                    {analysis.atsCompatibility.score}/10
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Top Improvements */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Lightbulb className="w-5 h-5 text-yellow-600" />
                                                Priority Improvements
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {analysis.topImprovements.map((improvement, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => setSelectedImprovement(
                                                        selectedImprovement === improvement ? null : improvement
                                                    )}
                                                    className="w-full text-left p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                                                            {improvement.priority}
                                                        </span>
                                                        <div className="flex-1">
                                                            <h4 className="font-medium text-slate-900 dark:text-white">
                                                                {improvement.title}
                                                            </h4>
                                                            {selectedImprovement === improvement && (
                                                                <div className="mt-3 space-y-2 text-sm">
                                                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                                                        <p className="font-medium text-blue-900 dark:text-blue-300 mb-1">
                                                                            💡 Why this matters:
                                                                        </p>
                                                                        <p className="text-blue-800 dark:text-blue-200">
                                                                            {improvement.why}
                                                                        </p>
                                                                    </div>
                                                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                                                                        <p className="font-medium text-green-900 dark:text-green-300 mb-1">
                                                                            🔧 How to fix:
                                                                        </p>
                                                                        <p className="text-green-800 dark:text-green-200">
                                                                            {improvement.how}
                                                                        </p>
                                                                    </div>
                                                                    {improvement.example && (
                                                                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                                                                            <p className="font-medium text-purple-900 dark:text-purple-300 mb-1">
                                                                                ✨ Example:
                                                                            </p>
                                                                            <p className="text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                                                                                {improvement.example}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </CardContent>
                                    </Card>

                                    {/* Strengths */}
                                    {analysis.strengths.length > 0 && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                    Your Strengths
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <ul className="space-y-2">
                                                    {analysis.strengths.map((strength, index) => (
                                                        <li key={index} className="flex items-start gap-2">
                                                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                                {strength}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                        </Card>
                                    )}
                                </>
                            ) : (
                                /* Placeholder when no analysis */
                                <Card className="h-full flex items-center justify-center">
                                    <CardContent className="text-center py-12">
                                        <Sparkles className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Click "Analyze with AI" to get comprehensive feedback on your resume
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
