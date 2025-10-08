import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import cssPdfResumeTemplate, {
  ResumeData,
  TemplateStyle,
  TemplateOptions
} from '../services/cssPdfResumeTemplate';
import resumeDataAdapter from '../services/resumeDataAdapter';
import {
  Download,
  Printer,
  Eye,
  FileText,
  Palette,
  Settings,
  ArrowLeft,
  Upload
} from 'lucide-react';

const CssPdfResumePage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedStyle, setSelectedStyle] = useState<TemplateStyle>('modern');
  const [accentColor, setAccentColor] = useState('#2563eb');
  const [fontSize, setFontSize] = useState(11);
  const [previewHtml, setPreviewHtml] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Get resume data from location state (passed from ModernResumeOptimizationPage)
  const getInitialResumeData = (): ResumeData => {
    console.log('📥 CssPdfResumePage - Checking location state:', {
      hasState: !!location.state,
      stateKeys: location.state ? Object.keys(location.state) : [],
      hasResumeData: !!location.state?.resumeData,
      hasProcessedResult: !!location.state?.processedResult,
      hasAnalysisResult: !!location.state?.analysisResult,
      hasAnalysisData: !!location.state?.analysisData,
      hasCurrentHTML: !!location.state?.currentHTML
    });

    // Check if data was passed from resume optimization page
    if (location.state?.resumeData) {
      console.log('📥 Loading resume data from state.resumeData');
      return location.state.resumeData;
    }

    // Check if processed result was passed (from Visual Context Resume Editor)
    if (location.state?.processedResult) {
      console.log('📥 Converting processed result to resume data');
      console.log('📄 Processed result keys:', Object.keys(location.state.processedResult));
      return resumeDataAdapter.convertFromProcessedResult(location.state.processedResult);
    }

    // Check if analysisData was passed (from Visual Context Resume Editor)
    if (location.state?.analysisData) {
      console.log('📥 Converting analysisData to resume data');
      const processedResult = {
        ...location.state.analysisData,
        editableHTML: location.state.currentHTML,
        extractedText: location.state.analysisData.editableContent
      };
      return resumeDataAdapter.convertFromProcessedResult(processedResult);
    }

    // Check if Azure analysis result was passed
    if (location.state?.analysisResult) {
      console.log('📥 Converting Azure analysis to resume data');
      return resumeDataAdapter.convertFromAzureAnalysis(location.state.analysisResult);
    }

    // Check if template was passed
    if (location.state?.template) {
      console.log('📥 Converting template to resume data');
      return resumeDataAdapter.convertFromTemplate(location.state.template);
    }

    // Default sample data
    console.log('⚠️ No resume data found in state, using sample data');
    console.log('Location state:', location.state);
    return getSampleResumeData();
  };

  const getSampleResumeData = (): ResumeData => ({
    personalInfo: {
      name: 'John Doe',
      title: 'Senior Software Engineer',
      email: 'john.doe@email.com',
      phone: '(555) 123-4567',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/johndoe',
      website: 'https://johndoe.dev'
    },
    summary: 'Experienced software engineer with 8+ years of expertise in full-stack development, cloud architecture, and team leadership. Proven track record of delivering scalable solutions and mentoring junior developers.',
    experience: [
      {
        company: 'Tech Corp',
        position: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: 'Jan 2020',
        endDate: 'Present',
        achievements: [
          'Led development of microservices architecture serving 10M+ users',
          'Reduced deployment time by 60% through CI/CD pipeline optimization',
          'Mentored team of 5 junior engineers in best practices and code review',
          'Architected cloud-native solutions using AWS, Docker, and Kubernetes'
        ]
      },
      {
        company: 'StartUp Inc',
        position: 'Software Engineer',
        location: 'San Francisco, CA',
        startDate: 'Jun 2017',
        endDate: 'Dec 2019',
        achievements: [
          'Built real-time analytics dashboard processing 1M events per day',
          'Implemented automated testing framework increasing code coverage to 85%',
          'Collaborated with product team to define technical requirements'
        ]
      },
      {
        company: 'Digital Agency',
        position: 'Junior Developer',
        location: 'Los Angeles, CA',
        startDate: 'Aug 2015',
        endDate: 'May 2017',
        achievements: [
          'Developed responsive web applications using React and Node.js',
          'Improved website performance by 40% through optimization techniques'
        ]
      }
    ],
    education: [
      {
        institution: 'University of California',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        location: 'Berkeley, CA',
        graduationDate: 'May 2015',
        gpa: '3.8/4.0',
        honors: ['Dean\'s List (4 semesters)', 'Computer Science Department Award']
      }
    ],
    skills: [
      { category: 'Languages', skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go'] },
      { category: 'Frontend', skills: ['React', 'Vue.js', 'Angular', 'HTML/CSS', 'Tailwind'] },
      { category: 'Backend', skills: ['Node.js', 'Express', 'Django', 'PostgreSQL', 'MongoDB'] },
      { category: 'DevOps', skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform'] },
      { category: 'Tools', skills: ['Git', 'Jest', 'Webpack', 'Nginx', 'Redis'] }
    ],
    projects: [
      {
        name: 'Open Source Contribution - React Component Library',
        description: 'Contributed to popular UI library with 50K+ GitHub stars',
        technologies: ['React', 'TypeScript', 'Storybook'],
        date: '2023'
      }
    ],
    certifications: [
      'AWS Certified Solutions Architect - Professional',
      'Certified Kubernetes Administrator (CKA)',
      'Google Cloud Professional Developer'
    ]
  });

  // Sample resume data
  const [resumeData, setResumeData] = useState<ResumeData>(getInitialResumeData());
  const [hasUploadedData, setHasUploadedData] = useState<boolean>(
    !!(location.state?.resumeData || location.state?.processedResult || location.state?.analysisResult || location.state?.template)
  );

  // Generate preview automatically when settings change
  React.useEffect(() => {
    const options: TemplateOptions = {
      style: selectedStyle,
      accentColor,
      fontSize
    };

    const html = cssPdfResumeTemplate.generateResume(resumeData, options);
    setPreviewHtml(html);
  }, [selectedStyle, accentColor, fontSize, resumeData]);

  const handleGeneratePreview = () => {
    const options: TemplateOptions = {
      style: selectedStyle,
      accentColor,
      fontSize
    };

    const html = cssPdfResumeTemplate.generateResume(resumeData, options);
    setPreviewHtml(html);
  };

  const handlePrint = () => {
    const options: TemplateOptions = {
      style: selectedStyle,
      accentColor,
      fontSize
    };

    const html = cssPdfResumeTemplate.generateResume(resumeData, options);
    cssPdfResumeTemplate.printToPDF(html);
  };

  const handleDownloadHTML = () => {
    const options: TemplateOptions = {
      style: selectedStyle,
      accentColor,
      fontSize
    };

    const html = cssPdfResumeTemplate.generateResume(resumeData, options);
    cssPdfResumeTemplate.downloadHTML(html, `resume-${selectedStyle}.html`);
  };

  const templateDescriptions: Record<TemplateStyle, string> = {
    modern: 'Clean, professional design with accent colors and modern typography',
    classic: 'Traditional, conservative styling perfect for formal industries',
    minimal: 'Ultra-clean, content-focused design with maximum readability',
    executive: 'Bold, impactful layout ideal for senior leadership positions'
  };

  const colorPresets = [
    { name: 'Blue', value: '#2563eb' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Purple', value: '#7c3aed' },
    { name: 'Green', value: '#059669' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Gray', value: '#475569' },
    { name: 'Black', value: '#000000' }
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header with navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/resume-optimization')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Upload
            </Button>
            {!hasUploadedData && (
              <Alert className="mb-0 py-2 px-4">
                <Upload className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  Using sample data. Upload your resume from the Resume Optimization page.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-2">CSS PDF Resume Builder</h1>
        <p className="text-gray-600">
          {hasUploadedData
            ? 'Your resume has been analyzed and formatted. Customize the template and export as PDF.'
            : 'Create professional, print-ready resumes with customizable templates. Preview updates automatically - use "Print to PDF" for perfect results.'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Template Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Template Style */}
              <div>
                <label className="block text-sm font-medium mb-2">Template Style</label>
                <Tabs value={selectedStyle} onValueChange={(v) => setSelectedStyle(v as TemplateStyle)}>
                  <TabsList className="grid grid-cols-2 gap-2">
                    <TabsTrigger value="modern">Modern</TabsTrigger>
                    <TabsTrigger value="classic">Classic</TabsTrigger>
                    <TabsTrigger value="minimal">Minimal</TabsTrigger>
                    <TabsTrigger value="executive">Executive</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-xs text-gray-500 mt-2">
                  {templateDescriptions[selectedStyle]}
                </p>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Accent Color
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {colorPresets.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`w-full h-10 rounded border-2 ${
                        accentColor === color.value ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>

              {/* Font Size */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Font Size: {fontSize}pt
                </label>
                <input
                  type="range"
                  min="9"
                  max="13"
                  step="0.5"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>9pt</span>
                  <span>13pt</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t">
                <Button
                  onClick={handlePrint}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print to PDF
                </Button>

                <Button
                  onClick={handleDownloadHTML}
                  className="w-full"
                  variant="outline"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download HTML
                </Button>
              </div>

              {/* Info Alert */}
              <Alert>
                <FileText className="w-4 h-4" />
                <AlertDescription className="text-xs">
                  <strong>Tip:</strong> Use "Print to PDF" in your browser for best results.
                  Press Ctrl+P (Windows) or Cmd+P (Mac) and select "Save as PDF" as the destination.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Resume Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-100 shadow-inner">
                {/* Preview container with proper scaling */}
                <div
                  ref={previewRef}
                  className="overflow-auto p-8"
                  style={{ maxHeight: '900px' }}
                >
                  <div className="bg-white shadow-lg" style={{
                    width: '8.5in',
                    minHeight: '11in',
                    margin: '0 auto',
                    transform: 'scale(0.75)',
                    transformOrigin: 'top center'
                  }}>
                    <iframe
                      srcDoc={previewHtml}
                      title="Resume Preview"
                      className="w-full border-0"
                      style={{
                        width: '8.5in',
                        height: '11in',
                        display: 'block'
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Export as PDF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="font-semibold">Click "Print to PDF"</h3>
              </div>
              <p className="text-sm text-gray-600">
                Click the "Print to PDF" button above to open your resume in a print-optimized window
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="font-semibold">Open Print Dialog</h3>
              </div>
              <p className="text-sm text-gray-600">
                In the new window, press Ctrl+P (Windows/Linux) or Cmd+P (Mac) to open the print dialog
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <h3 className="font-semibold">Save as PDF</h3>
              </div>
              <p className="text-sm text-gray-600">
                Select "Save as PDF" or "Microsoft Print to PDF" as your printer, then click Save
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Pro Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Ensure "Background graphics" is enabled in print settings for colors</li>
              <li>Set margins to "None" or "Minimum" for best layout</li>
              <li>Choose portrait orientation</li>
              <li>Scale should be 100% (default)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CssPdfResumePage;
