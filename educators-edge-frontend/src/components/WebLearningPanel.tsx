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
    Star,
    Github,
    Download,
    CheckCircle
} from 'lucide-react';

interface WebLearningPanelProps {
    resumeContent: string;
    isVisible: boolean;
    onToggle: () => void;
}

const WebLearningPanel: React.FC<WebLearningPanelProps> = ({
    resumeContent,
    isVisible,
    onToggle
}) => {
    const [learningStats, setLearningStats] = useState<any>(null);
    const [isLearning, setIsLearning] = useState(false);
    const [lastLearningUpdate, setLastLearningUpdate] = useState<Date | null>(null);
    const [webRepositories] = useState([
        { name: 'Awesome-CV', stars: '15.2k', type: 'GitHub', industry: 'Technology', status: 'ready' },
        { name: 'FAANG Resumes', stars: '8.7k', type: 'GitHub', industry: 'Technology', status: 'ready' },
        { name: 'Data Science Resumes', stars: '5.3k', type: 'GitHub', industry: 'Data Science', status: 'ready' },
        { name: 'Resume Examples', stars: '12.1k', type: 'GitHub', industry: 'General', status: 'ready' }
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
                {/* Web Learning Status */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            Automated Learning Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                    {learningStats ? learningStats.totalResumes : '0'}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Learned Resumes</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-600">
                                    {learningStats ? (learningStats.averageSuccessRate * 100).toFixed(0) : '0'}%
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Success Rate</div>
                            </div>
                        </div>

                        <Button
                            onClick={handleStartWebLearning}
                            disabled={isLearning}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {isLearning ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Learning from Web...
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4 mr-2" />
                                    Enhance AI Suggestions
                                </>
                            )}
                        </Button>

                        <div className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                            ⚠️ This will only improve AI suggestions - your resume content stays unchanged
                        </div>

                        {lastLearningUpdate && (
                            <div className="text-xs text-gray-500 text-center">
                                Last updated: {lastLearningUpdate.toLocaleTimeString()}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Web Repositories */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Github className="w-5 h-5 text-gray-800" />
                            Learning Sources
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {webRepositories.map((repo, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex-1">
                                    <div className="font-medium text-sm">{repo.name}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                        <Star className="w-3 h-3" />
                                        {repo.stars} stars
                                        <Badge variant="outline" className="text-xs">{repo.industry}</Badge>
                                    </div>
                                </div>
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Learning Features */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-600" />
                            Web Learning Features
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                                <Search className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <span>Automatically searches GitHub for successful resume repositories</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Download className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Analyzes FAANG and top-tier company resume examples</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Brain className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                <span>Extracts patterns from high-performing resumes</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <Target className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                <span>Provides industry-specific AI suggestions</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>Continuously updates from latest successful examples</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Industries Learned */}
                {learningStats && learningStats.industries.length > 0 && (
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Database className="w-5 h-5 text-blue-600" />
                                Learned Industries
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {learningStats.industries.map((industry: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                        {industry}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* How It Works */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Users className="w-5 h-5 text-green-600" />
                            How Web Learning Works
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">1</div>
                                <span>Searches GitHub for top-rated resume repositories</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-xs font-bold text-green-600">2</div>
                                <span>Analyzes successful resumes from FAANG companies</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-xs font-bold text-purple-600">3</div>
                                <span>Extracts winning patterns and proven strategies</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center text-xs font-bold text-yellow-600">4</div>
                                <span>Provides personalized suggestions for your resume</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center py-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        🌐 Learning from the collective wisdom of successful professionals
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        No manual input required - fully automated
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebLearningPanel;