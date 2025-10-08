import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ResumeLearningService from '../services/resumeLearningService';
import WebResumeLearningService from '../services/webResumelearningService';
import {
    Brain,
    TrendingUp,
    Database,
    Globe,
    Target,
    Search,
    Users,
    Zap,
    RefreshCw,
    Star
} from 'lucide-react';

interface ResumeLearnPanelProps {
    resumeContent: string;
    isVisible: boolean;
    onToggle: () => void;
}

const ResumeLearningPanel: React.FC<ResumeLearnPanelProps> = ({
    resumeContent,
    isVisible,
    onToggle
}) => {
    const [learningStats, setLearningStats] = useState<any>(null);
    const [isLearning, setIsLearning] = useState(false);
    const [lastLearningUpdate, setLastLearningUpdate] = useState<Date | null>(null);
    const [webRepositories] = useState([
        { name: 'Awesome-CV', stars: '15.2k', type: 'GitHub', industry: 'Technology' },
        { name: 'FAANG Resumes', stars: '8.7k', type: 'GitHub', industry: 'Technology' },
        { name: 'Data Science Resumes', stars: '5.3k', type: 'GitHub', industry: 'Data Science' },
        { name: 'Resume Examples', stars: '12.1k', type: 'GitHub', industry: 'General' }
    ]);

    useEffect(() => {
        if (isVisible) {
            loadLearningStats();
        }
    }, [isVisible]);

    const loadLearningStats = () => {
        const stats = ResumeLearningService.getLearningStats();
        setLearningStats(stats);
        console.log('📊 Loaded learning stats:', stats);
    };

    const handleStartWebLearning = async () => {
        setIsLearning(true);
        try {
            console.log('🌐 Starting automated web learning...');
            await WebResumeLearningService.startAutomatedLearning();
            setLastLearningUpdate(new Date());
            loadLearningStats(); // Refresh stats
            alert('✅ Successfully learned from web repositories! AI suggestions are now enhanced.');
        } catch (error) {
            console.error('Error in web learning:', error);
            alert('❌ Error during web learning. Check console for details.');
        } finally {
            setIsLearning(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed right-4 top-20 w-96 h-[calc(100vh-6rem)] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-50 overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">Web AI Learning</h2>
                </div>
                <Button variant="ghost" size="sm" onClick={onToggle}>×</Button>
            </div>

            <div className="p-4 space-y-4">
                {/* Learning Statistics */}
                {learningStats && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-600" />
                                Learning Database
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600">{learningStats.totalResumes}</div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Successful Resumes</div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {(learningStats.averageSuccessRate * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Avg Success Rate</div>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Top Industries:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {learningStats.industries.slice(0, 4).map((industry: string) => (
                                        <Badge key={industry} variant="secondary" className="text-xs">
                                            {industry}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Popular Job Titles:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {learningStats.topJobTitles.slice(0, 3).map((title: string) => (
                                        <Badge key={title} variant="outline" className="text-xs">
                                            {title}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* AI Learning Benefits */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-600" />
                            AI Learning Benefits
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                                <Star className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>Learns from real successful resumes with proven results</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Target className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>Provides industry-specific suggestions based on data</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Continuously improves as more data is collected</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Users className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                <span>Leverages collective wisdom of successful job seekers</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contribute Section */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Award className="w-5 h-5 text-green-600" />
                            Help Others Learn
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!showContributeForm ? (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Did this resume help you land interviews or job offers?
                                    Contribute it to help our AI learn and assist others!
                                </p>
                                <Button
                                    onClick={() => setShowContributeForm(true)}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                    disabled={!resumeContent}
                                >
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Contribute This Resume
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-3">
                                    <div>
                                        <Label htmlFor="jobTitle" className="text-sm">Job Title *</Label>
                                        <Input
                                            id="jobTitle"
                                            value={formData.jobTitle}
                                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                            placeholder="e.g., Software Engineer"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="industry" className="text-sm">Industry *</Label>
                                        <Input
                                            id="industry"
                                            value={formData.industry}
                                            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                                            placeholder="e.g., Technology"
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="interviewRate" className="text-sm">Interview Rate (%)</Label>
                                        <Input
                                            id="interviewRate"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.interviewRate}
                                            onChange={(e) => setFormData({ ...formData, interviewRate: parseInt(e.target.value) || 0 })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="offerRate" className="text-sm">Offer Rate (%)</Label>
                                        <Input
                                            id="offerRate"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.offerRate}
                                            onChange={(e) => setFormData({ ...formData, offerRate: parseInt(e.target.value) || 0 })}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="responseRate" className="text-sm">Response Rate (%)</Label>
                                        <Input
                                            id="responseRate"
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={formData.responseRate}
                                            onChange={(e) => setFormData({ ...formData, responseRate: parseInt(e.target.value) || 0 })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleContributeResume}
                                        disabled={isSubmitting || !formData.jobTitle || !formData.industry}
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                    >
                                        {isSubmitting ? (
                                            <>Processing...</>
                                        ) : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Submit
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowContributeForm(false)}
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Learning Progress */}
                <div className="text-center py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        🧠 AI continuously learns from each successful resume
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        More data = Better suggestions for everyone
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResumeLearningPanel;