import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Settings,
    Target,
    Clock,
    Zap,
    BookOpen,
    GraduationCap,
    Briefcase,
    PenTool,
    FileText,
    Plus,
    X,
    CheckCircle,
    AlertCircle,
    Info
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { toast } from 'sonner';

interface DocumentType {
    id: string;
    name: string;
    requirements: string[];
    focusAreas: string[];
}

interface AnalysisDepthOption {
    id: string;
    name: string;
    description: string;
    estimatedTime: string;
    tokenUsage: string;
}

interface AnalysisConfig {
    documentType: string;
    customRequirements: string[];
    focusAreas: string[];
    analysisDepth: string;
}

interface EnhancedAnalysisConfigPanelProps {
    onConfigChange: (config: AnalysisConfig) => void;
    onStartAnalysis: () => void;
    isAnalyzing: boolean;
    documentLength: number;
}

const EnhancedAnalysisConfigPanel: React.FC<EnhancedAnalysisConfigPanelProps> = ({
    onConfigChange,
    onStartAnalysis,
    isAnalyzing,
    documentLength
}) => {
    const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
    const [analysisDepthOptions, setAnalysisDepthOptions] = useState<AnalysisDepthOption[]>([]);
    const [selectedConfig, setSelectedConfig] = useState<AnalysisConfig>({
        documentType: 'college_essay',
        customRequirements: [],
        focusAreas: [],
        analysisDepth: 'comprehensive'
    });
    const [customRequirement, setCustomRequirement] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDocumentTypes();
    }, []);

    useEffect(() => {
        onConfigChange(selectedConfig);
    }, [selectedConfig, onConfigChange]);

    const fetchDocumentTypes = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get('/api/ai/scribe/document-types');
            if (response.data.success) {
                setDocumentTypes(response.data.documentTypes);
                setAnalysisDepthOptions(response.data.analysisDepthOptions);
            }
        } catch (error) {
            console.error('Error fetching document types:', error);
            toast.error('Failed to load analysis options');
        } finally {
            setLoading(false);
        }
    };

    const handleDocumentTypeChange = (typeId: string) => {
        const selectedType = documentTypes.find(t => t.id === typeId);
        setSelectedConfig(prev => ({
            ...prev,
            documentType: typeId,
            customRequirements: [],
            focusAreas: selectedType?.focusAreas.slice(0, 3) || []
        }));
    };

    const addCustomRequirement = () => {
        if (customRequirement.trim() && !selectedConfig.customRequirements.includes(customRequirement.trim())) {
            setSelectedConfig(prev => ({
                ...prev,
                customRequirements: [...prev.customRequirements, customRequirement.trim()]
            }));
            setCustomRequirement('');
        }
    };

    const removeCustomRequirement = (requirement: string) => {
        setSelectedConfig(prev => ({
            ...prev,
            customRequirements: prev.customRequirements.filter(req => req !== requirement)
        }));
    };

    const toggleFocusArea = (area: string) => {
        setSelectedConfig(prev => ({
            ...prev,
            focusAreas: prev.focusAreas.includes(area)
                ? prev.focusAreas.filter(a => a !== area)
                : [...prev.focusAreas, area]
        }));
    };

    const getDocumentTypeIcon = (typeId: string) => {
        switch (typeId) {
            case 'college_essay': return <GraduationCap className="w-4 h-4" />;
            case 'academic_paper': return <BookOpen className="w-4 h-4" />;
            case 'creative_writing': return <PenTool className="w-4 h-4" />;
            case 'business_document': return <Briefcase className="w-4 h-4" />;
            case 'personal_statement': return <FileText className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const getAnalysisDepthIcon = (depthId: string) => {
        switch (depthId) {
            case 'comprehensive': return <Target className="w-4 h-4" />;
            case 'focused': return <Zap className="w-4 h-4" />;
            case 'quick': return <Clock className="w-4 h-4" />;
            default: return <Target className="w-4 h-4" />;
        }
    };

    const getAnalysisDepthColor = (depthId: string) => {
        switch (depthId) {
            case 'comprehensive': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'focused': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'quick': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const selectedDocumentType = documentTypes.find(t => t.id === selectedConfig.documentType);
    const selectedDepthOption = analysisDepthOptions.find(d => d.id === selectedConfig.analysisDepth);

    if (loading) {
        return (
            <Card className="w-full">
                <CardContent className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="ml-3 text-gray-600">Loading analysis options...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-800">
                    <Settings className="w-5 h-5" />
                    Enhanced MozartStroke Analysis
                </CardTitle>
                <p className="text-sm text-purple-600">
                    Configure your analysis for targeted, counselor-level feedback
                </p>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Document Type Selection */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">
                        Document Type
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {documentTypes.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => handleDocumentTypeChange(type.id)}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${
                                    selectedConfig.documentType === type.id
                                        ? 'border-purple-500 bg-purple-100'
                                        : 'border-gray-200 hover:border-purple-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    {getDocumentTypeIcon(type.id)}
                                    <span className="font-medium text-sm">{type.name}</span>
                                </div>
                                <p className="text-xs text-gray-600">
                                    {type.requirements.length} requirements • {type.focusAreas.length} focus areas
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Analysis Depth Selection */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">
                        Analysis Depth
                    </label>
                    <div className="space-y-3">
                        {analysisDepthOptions.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => setSelectedConfig(prev => ({ ...prev, analysisDepth: option.id }))}
                                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                                    selectedConfig.analysisDepth === option.id
                                        ? 'border-purple-500 bg-purple-50'
                                        : 'border-gray-200 hover:border-purple-300 bg-white'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {getAnalysisDepthIcon(option.id)}
                                        <span className="font-medium">{option.name}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className="text-xs">
                                            {option.estimatedTime}
                                        </Badge>
                                        <Badge className={`text-xs ${getAnalysisDepthColor(option.id)}`}>
                                            {option.tokenUsage} tokens
                                        </Badge>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-600">{option.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Requirements Preview */}
                {selectedDocumentType && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-3 block">
                            Analysis Requirements
                        </label>
                        <ScrollArea className="h-32 w-full border rounded-lg p-3 bg-white">
                            <div className="space-y-2">
                                {selectedDocumentType.requirements.map((req, index) => (
                                    <div key={index} className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-sm text-gray-700">{req}</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                {/* Custom Requirements */}
                <div>
                    <label className="text-sm font-medium text-gray-700 mb-3 block">
                        Custom Requirements (Optional)
                    </label>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Textarea
                                value={customRequirement}
                                onChange={(e) => setCustomRequirement(e.target.value)}
                                placeholder="Add a specific requirement for your document..."
                                className="flex-1"
                                rows={2}
                            />
                            <Button
                                onClick={addCustomRequirement}
                                disabled={!customRequirement.trim()}
                                size="sm"
                                variant="outline"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>

                        {selectedConfig.customRequirements.length > 0 && (
                            <div className="space-y-2">
                                {selectedConfig.customRequirements.map((req, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                                        <span className="text-sm text-gray-700 flex-1">{req}</span>
                                        <Button
                                            onClick={() => removeCustomRequirement(req)}
                                            size="sm"
                                            variant="ghost"
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Focus Areas */}
                {selectedDocumentType && (
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-3 block">
                            Focus Areas
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {selectedDocumentType.focusAreas.map((area) => (
                                <button
                                    key={area}
                                    onClick={() => toggleFocusArea(area)}
                                    className={`px-3 py-1 rounded-full text-sm border transition-all ${
                                        selectedConfig.focusAreas.includes(area)
                                            ? 'bg-blue-100 border-blue-500 text-blue-800'
                                            : 'bg-gray-100 border-gray-300 text-gray-700 hover:border-blue-300'
                                    }`}
                                >
                                    {area.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Analysis Summary */}
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-purple-800">Analysis Summary</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Document Type:</span>
                            <p className="font-medium">{selectedDocumentType?.name}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Analysis Depth:</span>
                            <p className="font-medium">{selectedDepthOption?.name}</p>
                        </div>
                        <div>
                            <span className="text-gray-600">Requirements:</span>
                            <p className="font-medium">
                                {(selectedDocumentType?.requirements.length || 0) + selectedConfig.customRequirements.length}
                            </p>
                        </div>
                        <div>
                            <span className="text-gray-600">Focus Areas:</span>
                            <p className="font-medium">{selectedConfig.focusAreas.length}</p>
                        </div>
                    </div>
                </div>

                {/* Start Analysis Button */}
                <Button
                    onClick={onStartAnalysis}
                    disabled={isAnalyzing || documentLength < 100}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    size="lg"
                >
                    {isAnalyzing ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Analyzing with {selectedDepthOption?.name}...
                        </>
                    ) : (
                        <>
                            <Target className="w-5 h-5 mr-2" />
                            Start Enhanced Analysis
                        </>
                    )}
                </Button>

                {documentLength < 100 && (
                    <p className="text-sm text-orange-600 text-center">
                        Document needs at least 100 characters for enhanced analysis
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default EnhancedAnalysisConfigPanel;