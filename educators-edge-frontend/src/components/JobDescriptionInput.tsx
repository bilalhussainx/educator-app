import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { JobDescriptionContext } from '../services/aiInlineCommentsService';

interface JobDescriptionInputProps {
    onJobDescriptionSet: (jobDescription: JobDescriptionContext) => void;
    currentJobDescription?: JobDescriptionContext;
}

const JobDescriptionInput: React.FC<JobDescriptionInputProps> = ({
    onJobDescriptionSet,
    currentJobDescription
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [formData, setFormData] = useState({
        title: currentJobDescription?.title || '',
        company: currentJobDescription?.company || '',
        description: '',
        industry: currentJobDescription?.industry || ''
    });
    const [isParsing, setIsParsing] = useState(false);

    const parseJobDescription = async () => {
        if (!formData.description.trim()) return;

        setIsParsing(true);
        try {
            // Parse job description text to extract requirements and keywords
            const lines = formData.description.split('\n').map(line => line.trim()).filter(line => line);

            const requirements: string[] = [];
            const responsibilities: string[] = [];
            const keywords: string[] = [];

            let currentSection = '';

            for (const line of lines) {
                const lowerLine = line.toLowerCase();

                // Detect sections
                if (lowerLine.includes('requirement') || lowerLine.includes('qualification') || lowerLine.includes('must have')) {
                    currentSection = 'requirements';
                    continue;
                } else if (lowerLine.includes('responsibilit') || lowerLine.includes('duties') || lowerLine.includes('you will')) {
                    currentSection = 'responsibilities';
                    continue;
                }

                // Extract bullet points or requirements
                if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                    const cleanLine = line.replace(/^[\s\-\•\*]+/, '').trim();
                    if (currentSection === 'requirements') {
                        requirements.push(cleanLine);
                    } else if (currentSection === 'responsibilities') {
                        responsibilities.push(cleanLine);
                    }

                    // Extract technical keywords
                    const techKeywords = extractTechnicalKeywords(cleanLine);
                    keywords.push(...techKeywords);
                }
            }

            // Extract additional keywords from the full text
            const additionalKeywords = extractTechnicalKeywords(formData.description);
            keywords.push(...additionalKeywords);

            // Remove duplicates and filter
            const uniqueKeywords = [...new Set(keywords)].filter(k => k.length > 2);

            const jobDescription: JobDescriptionContext = {
                title: formData.title,
                company: formData.company,
                requirements,
                responsibilities,
                keywords: uniqueKeywords.slice(0, 15), // Limit to top 15 keywords
                industry: formData.industry
            };

            onJobDescriptionSet(jobDescription);
            setIsExpanded(false);

            console.log('📋 Job Description Parsed:', jobDescription);
        } catch (error) {
            console.error('Error parsing job description:', error);
        } finally {
            setIsParsing(false);
        }
    };

    const extractTechnicalKeywords = (text: string): string[] => {
        const techPatterns = [
            // Programming languages
            /\b(javascript|typescript|python|java|c#|react|angular|vue|node\.?js|express|django|flask|spring|\.net)\b/gi,
            // Databases
            /\b(mysql|postgresql|mongodb|redis|elasticsearch|sql|nosql)\b/gi,
            // Cloud & DevOps
            /\b(aws|azure|gcp|docker|kubernetes|jenkins|gitlab|github|terraform|ansible)\b/gi,
            // Tools & Frameworks
            /\b(git|jira|confluence|agile|scrum|restful|api|microservices|graphql)\b/gi,
            // Skills
            /\b(machine learning|ai|data analysis|full.?stack|front.?end|back.?end|devops|ci\/cd)\b/gi
        ];

        const keywords: string[] = [];
        for (const pattern of techPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                keywords.push(...matches.map(m => m.toLowerCase()));
            }
        }

        return keywords;
    };

    const clearJobDescription = () => {
        setFormData({ title: '', company: '', description: '', industry: '' });
        onJobDescriptionSet({
            title: '',
            company: '',
            requirements: [],
            responsibilities: [],
            keywords: [],
            industry: ''
        });
    };

    if (!isExpanded && !currentJobDescription?.title) {
        return (
            <Card className="mb-4 border-dashed border-2 border-blue-300">
                <CardContent className="p-4">
                    <div className="text-center">
                        <div className="text-2xl mb-2">🎯</div>
                        <h3 className="font-medium mb-2">Target a Specific Job</h3>
                        <p className="text-sm text-gray-600 mb-3">
                            Add a job description to get personalized AI suggestions
                        </p>
                        <Button
                            onClick={() => setIsExpanded(true)}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            📋 Add Job Description
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!isExpanded && currentJobDescription?.title) {
        return (
            <Card className="mb-4 border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-blue-900">
                                🎯 {currentJobDescription.title}
                            </h3>
                            <p className="text-sm text-blue-700">
                                {currentJobDescription.company} • {currentJobDescription.industry}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                                {currentJobDescription.keywords.slice(0, 5).map((keyword, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs text-blue-600">
                                        {keyword}
                                    </Badge>
                                ))}
                                {currentJobDescription.keywords.length > 5 && (
                                    <Badge variant="outline" className="text-xs text-blue-600">
                                        +{currentJobDescription.keywords.length - 5} more
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsExpanded(true)}
                            >
                                ✏️ Edit
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearJobDescription}
                            >
                                ✕
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="mb-4 border-blue-200">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>🎯 Job Description</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(false)}
                    >
                        ✕
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Job Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g. Senior Software Engineer"
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Company</label>
                        <input
                            type="text"
                            value={formData.company}
                            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                            placeholder="e.g. Google, Microsoft"
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Industry</label>
                    <input
                        type="text"
                        value={formData.industry}
                        onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                        placeholder="e.g. Technology, Finance, Healthcare"
                        className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Job Description *</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Paste the job description here... Include requirements, responsibilities, and skills."
                        rows={8}
                        className="w-full p-3 border border-gray-300 rounded text-sm"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                        💡 Include requirements, responsibilities, and technical skills for better AI suggestions
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button
                        onClick={parseJobDescription}
                        disabled={isParsing || !formData.title || !formData.description}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isParsing ? '🔄 Parsing...' : '✅ Parse & Set Target'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsExpanded(false)}
                    >
                        Cancel
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default JobDescriptionInput;