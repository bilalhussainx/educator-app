import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    FileText,
    Briefcase,
    PenTool,
    Target,
    Brain,
    Zap,
    Users,
    GraduationCap,
    Building,
    ArrowRight,
    Sparkles
} from 'lucide-react';

interface SessionOption {
    id: 'essay' | 'resume';
    title: string;
    subtitle: string;
    description: string;
    icon: React.ComponentType<any>;
    features: string[];
    bestFor: string[];
    gradient: string;
    borderColor: string;
    route: string;
}

const SessionTypeSelector: React.FC = () => {
    const navigate = useNavigate();

    const sessionOptions: SessionOption[] = [
        {
            id: 'essay',
            title: 'Essay Editor & Analysis',
            subtitle: 'AI-Powered Writing Assistant',
            description: 'Get intelligent feedback on essays, creative writing, and academic papers with inline comments and smart suggestions.',
            icon: PenTool,
            features: [
                'Smart writing prompts',
                'Inline comments with AI analysis',
                'Genre-specific feedback',
                'Structure and flow optimization',
                'Real-time Claude AI responses'
            ],
            bestFor: [
                'College essays',
                'Creative writing',
                'Academic papers',
                'Personal narratives',
                'Application essays'
            ],
            gradient: 'from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20',
            borderColor: 'border-purple-200 dark:border-purple-800',
            route: '/urgent-session'
        },
        {
            id: 'resume',
            title: 'Resume Optimizer',
            subtitle: 'Job-Focused AI Assistant',
            description: 'Optimize your resume for specific job descriptions with role-aligned suggestions and keyword analysis.',
            icon: Briefcase,
            features: [
                'Job description analysis',
                'Role-specific phrasing suggestions',
                'Keyword optimization',
                'ATS compatibility checking',
                'Industry-specific recommendations'
            ],
            bestFor: [
                'Job applications',
                'Career transitions',
                'Industry pivots',
                'Skills alignment',
                'Professional branding'
            ],
            gradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
            borderColor: 'border-blue-200 dark:border-blue-800',
            route: '/resume-optimization'
        }
    ];

    const handleSessionSelect = (option: SessionOption) => {
        console.log(`🚀 Starting ${option.title} session`);
        navigate(option.route);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-6xl w-full">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Brain className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Claude AI Writing Assistant
                        </h1>
                        <Sparkles className="w-6 h-6 text-yellow-500" />
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                        Choose your AI-powered writing session. Get personalized feedback, smart suggestions, and professional optimization tailored to your specific needs.
                    </p>
                </div>

                {/* Session Options */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {sessionOptions.map((option) => {
                        const IconComponent = option.icon;

                        return (
                            <Card
                                key={option.id}
                                className={`${option.gradient} ${option.borderColor} border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group`}
                                onClick={() => handleSessionSelect(option)}
                            >
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 rounded-lg ${
                                                    option.id === 'essay'
                                                        ? 'bg-purple-100 dark:bg-purple-900/30'
                                                        : 'bg-blue-100 dark:bg-blue-900/30'
                                                }`}>
                                                    <IconComponent className={`w-6 h-6 ${
                                                        option.id === 'essay'
                                                            ? 'text-purple-600 dark:text-purple-400'
                                                            : 'text-blue-600 dark:text-blue-400'
                                                    }`} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                                        {option.title}
                                                    </h3>
                                                    <p className={`text-sm font-medium ${
                                                        option.id === 'essay'
                                                            ? 'text-purple-600 dark:text-purple-400'
                                                            : 'text-blue-600 dark:text-blue-400'
                                                    }`}>
                                                        {option.subtitle}
                                                    </p>
                                                </div>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                                        </div>

                                        {/* Description */}
                                        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                            {option.description}
                                        </p>

                                        {/* Features */}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                Key Features
                                            </h4>
                                            <div className="space-y-1">
                                                {option.features.map((feature, index) => (
                                                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${
                                                            option.id === 'essay'
                                                                ? 'bg-purple-500'
                                                                : 'bg-blue-500'
                                                        }`} />
                                                        {feature}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Best For */}
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                <Target className="w-4 h-4" />
                                                Perfect For
                                            </h4>
                                            <div className="flex flex-wrap gap-1">
                                                {option.bestFor.map((use, index) => (
                                                    <Badge
                                                        key={index}
                                                        variant="outline"
                                                        className={`text-xs ${
                                                            option.id === 'essay'
                                                                ? 'border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300'
                                                                : 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                                                        }`}
                                                    >
                                                        {use}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Action Button */}
                                        <Button
                                            className={`w-full mt-4 ${
                                                option.id === 'essay'
                                                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleSessionSelect(option);
                                            }}
                                        >
                                            <IconComponent className="w-4 h-4 mr-2" />
                                            Start {option.title}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Additional Features Section */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4 text-center">
                            <Brain className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                Claude AI Powered
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Advanced AI analysis with contextual understanding and personalized feedback
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                Real-Time Collaboration
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Work with teachers and peers with live feedback and shared sessions
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4 text-center">
                            <GraduationCap className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                                Educational Focus
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                Designed for students, educators, and professionals seeking growth
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                    <p>
                        Powered by Claude AI • Secure • Privacy-Focused • Educational Use
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SessionTypeSelector;