/**
 * Visual Context Resume Editor
 * Split-screen component with preserved view (left) and editable content (right)
 * Implements the core UX for the Visual Context Resume System
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, Upload, Download, Sparkles, CheckCircle, AlertCircle, Grid3x3, FileText } from 'lucide-react';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import TemplateManager from './TemplateManager';
import resumeDataAdapter from '../../services/resumeDataAdapter';

interface VisualContextResumeEditorProps {
  userId: string;
  onAnalysisComplete?: (analysis: any) => void;
}

interface AnalysisData {
  analysisId: string;
  preservedHTML: string;
  editableContent: string;
  formattingContext: any;
  claudeAnalysis: any;
  sections: any[];
  metadata: any;
}

export const VisualContextResumeEditor: React.FC<VisualContextResumeEditorProps> = ({
  userId,
  onAnalysisComplete
}) => {
  const navigate = useNavigate();

  // State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [editableContent, setEditableContent] = useState('');
  const [editableHTML, setEditableHTML] = useState('');
  const [error, setError] = useState<string | null>(null);

  // AI Feedback
  const [aiFeedback, setAiFeedback] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(true);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);

  // PDF Export
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Template management
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Ref for contentEditable div
  const contentEditableRef = React.useRef<HTMLDivElement>(null);

  /**
   * Initialize editable HTML when analysis completes
   */
  useEffect(() => {
    if (analysisData?.preservedHTML) {
      setEditableHTML(analysisData.preservedHTML);
    }
  }, [analysisData]);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  /**
   * Upload and analyze resume
   */
  const handleUploadAndAnalyze = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setIsUploading(true);
    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

      // Upload and analyze with Azure Vision
      const response = await axios.post(
        `${API_URL}/api/resume-coach/analyze`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = response.data;

      setAnalysisData({
        analysisId: data.analysisId,
        preservedHTML: data.preservedHTML,
        editableContent: data.editableContent,
        formattingContext: data.formattingContext,
        claudeAnalysis: data.claudeAnalysis,
        sections: data.sections,
        metadata: data.metadata
      });

      setEditableContent(data.editableContent);
      setAiFeedback(data.claudeAnalysis?.analysis);

      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }

    } catch (err: any) {
      console.error('Upload failed:', err);
      setError(err.response?.data?.error || 'Failed to upload and analyze resume');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  /**
   * Handle content edits on the preserved HTML
   */
  const handleHTMLEdit = (event: React.FormEvent<HTMLDivElement>) => {
    const newHTML = event.currentTarget.innerHTML;
    setEditableHTML(newHTML);

    // Extract text from HTML for export purposes
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newHTML;
    setEditableContent(tempDiv.innerText || tempDiv.textContent || '');
  };

  /**
   * Handle template application
   */
  const handleApplyTemplate = (transformedHTML: string, template: any) => {
    setEditableHTML(transformedHTML);

    // Extract text from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = transformedHTML;
    setEditableContent(tempDiv.innerText || tempDiv.textContent || '');

    console.log('Template applied:', template.name);
  };

  /**
   * Apply AI Coach recommendations automatically
   */
  const handleApplyRecommendations = async () => {
    if (!analysisData || !aiFeedback) {
      setError('No AI feedback available to apply');
      return;
    }

    setIsApplyingChanges(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

      // Get current HTML from the editable div
      let currentHTML = editableHTML || analysisData.preservedHTML;
      if (contentEditableRef.current) {
        currentHTML = contentEditableRef.current.innerHTML;
      }

      console.log('🤖 Applying AI Coach recommendations...');

      const response = await axios.post(
        `${API_URL}/api/resume-coach/apply-recommendations`,
        {
          currentHTML,
          plainText: editableContent || analysisData.editableContent,
          coachingFeedback: aiFeedback,
          formattingContext: analysisData.formattingContext
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        console.log('✅ AI Coach recommendations applied successfully');

        // Update the editable HTML with the improved version
        setEditableHTML(response.data.improvedHTML);

        // Extract text from improved HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = response.data.improvedHTML;
        setEditableContent(tempDiv.innerText || tempDiv.textContent || '');

        // Show success message
        alert('✅ AI Coach recommendations applied successfully! Review the changes and edit as needed.');
      } else {
        throw new Error(response.data.error || 'Failed to apply recommendations');
      }

    } catch (err: any) {
      console.error('Failed to apply recommendations:', err);
      setError(err.response?.data?.error || 'Failed to apply AI recommendations');
    } finally {
      setIsApplyingChanges(false);
    }
  };

  /**
   * Simple browser print-to-PDF export
   */
  const handleCreatePDFResume = () => {
    if (!editableHTML) {
      setError('No resume content to export');
      return;
    }

    console.log('📄 Opening print window for PDF export...');

    // Create a new window with print-ready styling
    const printWindow = window.open('', '', 'width=900,height=650');

    if (!printWindow) {
      alert('Please allow pop-ups to export PDF. Check your browser settings.');
      return;
    }

    // Generate clean HTML with embedded styles
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Resume</title>
  <style>
    @page {
      size: letter;
      margin: 0.5in;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      margin: 0;
      padding: 20px;
      background: white;
    }

    h1, h2, h3, h4, h5, h6 {
      margin: 0.5em 0 0.3em 0;
      font-weight: 600;
    }

    p {
      margin: 0.5em 0;
    }

    ul, ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    li {
      margin: 0.3em 0;
    }

    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }

    .print-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 1000;
    }

    .print-btn:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
  ${editableHTML}
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Auto-trigger print dialog after a brief delay
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  /**
   * Export improved resume
   */
  const handleExport = async (format: 'pdf' | 'docx' | 'html' = 'docx') => {
    if (!analysisData) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

      // Get the actual rendered HTML from the contentEditable div
      let htmlContent = editableHTML || analysisData.preservedHTML;

      // If we have a ref to the editable content, get its innerHTML
      if (contentEditableRef.current) {
        htmlContent = contentEditableRef.current.innerHTML;
      }

      // Check if HTML has inline styles, if not, warn user
      if (!htmlContent.includes('style=')) {
        console.warn('⚠️  HTML content has no inline styles! Export may lose formatting.');
        console.log('💡 Wrapping content in basic styled container...');

        // Wrap in a styled container to preserve basic formatting
        htmlContent = `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; max-width: 8.5in; margin: 0 auto; padding: 0.75in; line-height: 1.6;">
            ${htmlContent}
          </div>
        `;
      }

      console.log('📄 Exporting HTML content (first 300 chars):', htmlContent.substring(0, 300));
      console.log(`📤 Exporting as ${format.toUpperCase()}...`);

      // Use the new export endpoint
      const response = await axios.post(
        `${API_URL}/api/resume-templates/export`,
        {
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
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          responseType: 'arraybuffer' // Use arraybuffer for binary data
        }
      );

      console.log(`✅ Received ${format.toUpperCase()} file:`, response.data.byteLength, 'bytes');
      console.log('Content-Type:', response.headers['content-type']);

      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Received empty file from server');
      }

      // Create blob from arraybuffer
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || (
          format === 'pdf' ? 'application/pdf' :
          format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
          'text/html'
        )
      });

      console.log('Created blob, size:', blob.size, 'bytes');

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `resume-${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ ${format.toUpperCase()} export completed`);

    } catch (err: any) {
      console.error('Export failed:', err);
      setError('Failed to export resume');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Visual Context Resume Coach</h1>
            <p className="text-sm text-gray-600 mt-1">
              Upload your resume to see preserved formatting and get AI-powered coaching
            </p>
          </div>

          {analysisData && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreatePDFResume}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
              <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
                <Grid3x3 className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Section */}
      {!analysisData && (
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-lg p-8">
            <div className="text-center">
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Upload Your Resume</h2>
              <p className="text-gray-600 mb-6">
                Supported formats: PDF, DOCX
              </p>

              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="resume-upload"
                  />
                  <label
                    htmlFor="resume-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {file ? (
                      <div className="text-center">
                        <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="font-medium">Click to browse</p>
                        <p className="text-sm text-gray-500">or drag and drop</p>
                      </div>
                    )}
                  </label>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleUploadAndAnalyze}
                  disabled={!file || isUploading}
                  className="w-full flex items-center justify-center gap-2"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analyzing Resume...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Upload & Analyze
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Split-Screen Editor */}
      {analysisData && (
        <div className="flex-1 flex overflow-hidden">
          {/* Main Pane: Editable Resume with Preserved Formatting */}
          <div className="flex-1 bg-white overflow-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 z-10">
              <h2 className="font-semibold text-gray-900">Your Resume - Click to Edit</h2>
              <p className="text-xs text-gray-600">Edit directly with preserved formatting</p>
            </div>
            <div
              ref={contentEditableRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              onInput={handleHTMLEdit}
              className="p-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dangerouslySetInnerHTML={{ __html: editableHTML }}
            />
          </div>

          {/* Right Pane: AI Feedback */}
          <div className="w-96 flex flex-col bg-gray-50 border-l">
            {/* AI Feedback Panel */}
            {showFeedback && aiFeedback && (
              <div className="bg-blue-50 border-b p-4 max-h-80 overflow-auto">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">AI Coach Feedback</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFeedback(false)}
                  >
                    Hide
                  </Button>
                </div>

                {/* Apply Changes Button */}
                <Button
                  onClick={handleApplyRecommendations}
                  disabled={isApplyingChanges}
                  className="w-full mb-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  size="sm"
                >
                  {isApplyingChanges ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying Changes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Apply AI Recommendations
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-600 mb-4 italic">
                  Click to automatically apply all AI Coach recommendations to your resume. You can still edit after.
                </p>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Assessment */}
                {aiFeedback.assessment && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700">{aiFeedback.assessment}</p>
                  </div>
                )}

                {/* Scores */}
                {aiFeedback.overallScore && (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <ScoreCard label="Content" score={aiFeedback.overallScore.content} />
                    <ScoreCard label="Format" score={aiFeedback.overallScore.formatting} />
                    <ScoreCard label="ATS" score={aiFeedback.overallScore.ats} />
                    <ScoreCard label="Overall" score={aiFeedback.overallScore.overall} />
                  </div>
                )}

                {/* Quick Wins */}
                {aiFeedback.quickWins && aiFeedback.quickWins.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-2">⚡ Quick Wins</h4>
                    <ul className="space-y-1">
                      {aiFeedback.quickWins.map((win: string, index: number) => (
                        <li key={index} className="text-xs text-gray-700 flex items-start gap-2">
                          <span className="text-green-600">✓</span>
                          <span>{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top Improvements */}
                {aiFeedback.priorityImprovements && aiFeedback.priorityImprovements.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-2">🎯 Priority Improvements</h4>
                    <div className="space-y-2">
                      {aiFeedback.priorityImprovements.slice(0, 3).map((imp: any, index: number) => (
                        <div key={index} className="bg-white rounded-lg p-3 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              imp.priority === 'high' ? 'bg-red-100 text-red-700' :
                              imp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {imp.priority}
                            </span>
                            <span className="text-gray-500">{imp.category}</span>
                          </div>
                          <p className="font-medium text-gray-900 mb-1">{imp.issue}</p>
                          {imp.contextual_hint && (
                            <p className="text-gray-600 mb-1">💡 {imp.contextual_hint}</p>
                          )}
                          {imp.how_to_fix && (
                            <p className="text-gray-700">🔧 {imp.how_to_fix}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}

            {!showFeedback && (
              <div className="bg-gray-100 border-b px-4 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFeedback(true)}
                  className="text-blue-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Show AI Feedback
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Template Manager Modal */}
      {analysisData && (
        <TemplateManager
          open={showTemplateDialog}
          onClose={() => setShowTemplateDialog(false)}
          userId={userId}
          currentContent={editableHTML}
          onApplyTemplate={handleApplyTemplate}
        />
      )}
    </div>
  );
};

/**
 * Score card component
 */
const ScoreCard: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className={`rounded-lg p-2 ${getColor(score)}`}>
      <div className="text-xs font-medium">{label}</div>
      <div className="text-lg font-bold">{score}</div>
    </div>
  );
};

export default VisualContextResumeEditor;
