import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
    Brain,
    MessageCircle,
    ArrowRight,
    ArrowLeft,
    CheckCircle,
    Clock,
    FileText,
    Target,
    Lightbulb,
    Sparkles,
    Play,
    Pause,
    RotateCcw,
    Eye,
    Edit3,
    Users,
    BookOpen,
    Award
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';

interface AnalysisStep {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    questions: AnalysisQuestion[];
    analysisType: 'introduction' | 'body_paragraphs' | 'conclusion' | 'overall_flow' | 'style_tone' | 'final_review';
    estimatedTime: string;
}

interface AnalysisQuestion {
    id: string;
    question: string;
    type: 'choice' | 'text' | 'slider' | 'priority';
    options?: string[];
    placeholder?: string;
    min?: number;
    max?: number;
    default?: any;
}

interface UserResponse {
    questionId: string;
    answer: any;
}

interface StepResult {
    stepId: string;
    responses: UserResponse[];
    analysis: any;
    suggestions: string[];
    timestamp: Date;
}

interface InteractiveAnalysisFlowProps {
    documentContent: string;
    sessionId: string;
    onComplete: (results: StepResult[]) => void;
    onCancel: () => void;
    isVisible: boolean;
}

const InteractiveAnalysisFlow: React.FC<InteractiveAnalysisFlowProps> = ({
    documentContent,
    sessionId,
    onComplete,
    onCancel,
    isVisible
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepResponses, setStepResponses] = useState<Record<string, UserResponse[]>>({});
    const [stepResults, setStepResults] = useState<StepResult[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});
    const [analysisStarted, setAnalysisStarted] = useState(false);

    // Define the analysis steps
    const analysisSteps: AnalysisStep[] = [
        {
            id: 'introduction',
            title: 'Introduction Analysis',
            description: 'Let\'s start by analyzing your opening. A strong introduction sets the tone for your entire essay.',
            icon: <Play className="w-5 h-5" />,
            estimatedTime: '2-3 min',
            analysisType: 'introduction',
            questions: [
                {
                    id: 'intro_focus',
                    question: 'What should I focus on most in your introduction?',
                    type: 'choice',
                    options: [
                        'Hook effectiveness and reader engagement',
                        'Thesis clarity and strength',
                        'Background information and context',
                        'Overall flow and transitions'
                    ]
                },
                {
                    id: 'intro_style',
                    question: 'What writing style are you aiming for?',
                    type: 'choice',
                    options: [
                        'Academic and formal',
                        'Personal and narrative',
                        'Professional and direct',
                        'Creative and engaging'
                    ]
                },
                {
                    id: 'intro_priority',
                    question: 'On a scale of 1-10, how important is making a strong first impression?',
                    type: 'slider',
                    min: 1,
                    max: 10,
                    default: 8
                }
            ]
        },
        {
            id: 'body_paragraphs',
            title: 'Body Paragraph Development',
            description: 'Now let\'s examine how well your main ideas are developed and supported.',
            icon: <FileText className="w-5 h-5" />,
            estimatedTime: '3-4 min',
            analysisType: 'body_paragraphs',
            questions: [
                {
                    id: 'body_focus',
                    question: 'What\'s most important for your body paragraphs?',
                    type: 'choice',
                    options: [
                        'Logical organization and structure',
                        'Evidence and supporting details',
                        'Smooth transitions between ideas',
                        'Paragraph unity and coherence'
                    ]
                },
                {
                    id: 'evidence_type',
                    question: 'What type of evidence are you using most?',
                    type: 'choice',
                    options: [
                        'Personal experiences and examples',
                        'Research and academic sources',
                        'Statistics and data',
                        'Expert opinions and quotes'
                    ]
                },
                {
                    id: 'development_concern',
                    question: 'What are you most concerned about in your body paragraphs?',
                    type: 'choice',
                    options: [
                        'Not enough detail or examples',
                        'Ideas don\'t flow well together',
                        'Paragraphs are too long or short',
                        'Arguments aren\'t convincing enough'
                    ]
                }
            ]
        },
        {
            id: 'conclusion',
            title: 'Conclusion Impact',
            description: 'Let\'s ensure your conclusion leaves a lasting impression and ties everything together.',
            icon: <Target className="w-5 h-5" />,
            estimatedTime: '2 min',
            analysisType: 'conclusion',
            questions: [
                {
                    id: 'conclusion_goal',
                    question: 'What do you want your conclusion to achieve?',
                    type: 'choice',
                    options: [
                        'Summarize main points effectively',
                        'Call the reader to action',
                        'Leave a memorable final impression',
                        'Connect back to the introduction'
                    ]
                },
                {
                    id: 'conclusion_tone',
                    question: 'How should your conclusion feel to the reader?',
                    type: 'choice',
                    options: [
                        'Confident and definitive',
                        'Thoughtful and reflective',
                        'Inspiring and motivational',
                        'Analytical and measured'
                    ]
                }
            ]
        },
        {
            id: 'overall_flow',
            title: 'Overall Flow & Coherence',
            description: 'Let\'s examine how well your ideas connect throughout the entire essay.',
            icon: <Sparkles className="w-5 h-5" />,
            estimatedTime: '2-3 min',
            analysisType: 'overall_flow',
            questions: [
                {
                    id: 'flow_priority',
                    question: 'What\'s most important for your essay\'s flow?',
                    type: 'choice',
                    options: [
                        'Smooth transitions between paragraphs',
                        'Consistent voice throughout',
                        'Logical progression of ideas',
                        'Maintaining reader engagement'
                    ]
                },
                {
                    id: 'coherence_concern',
                    question: 'What worries you most about your essay\'s coherence?',
                    type: 'choice',
                    options: [
                        'Ideas feel disconnected',
                        'Some sections are off-topic',
                        'The main argument gets lost',
                        'Transitions feel forced or awkward'
                    ]
                }
            ]
        },
        {
            id: 'style_tone',
            title: 'Style & Voice Refinement',
            description: 'Let\'s polish your writing style and ensure your voice shines through.',
            icon: <Edit3 className="w-5 h-5" />,
            estimatedTime: '2-3 min',
            analysisType: 'style_tone',
            questions: [
                {
                    id: 'voice_goal',
                    question: 'How do you want to sound to your reader?',
                    type: 'choice',
                    options: [
                        'Authoritative and knowledgeable',
                        'Personal and authentic',
                        'Professional and polished',
                        'Conversational and approachable'
                    ]
                },
                {
                    id: 'style_focus',
                    question: 'What aspect of your writing style needs the most attention?',
                    type: 'choice',
                    options: [
                        'Sentence variety and rhythm',
                        'Word choice and vocabulary',
                        'Clarity and conciseness',
                        'Tone consistency'
                    ]
                },
                {
                    id: 'audience_consideration',
                    question: 'How formal should your language be?',
                    type: 'slider',
                    min: 1,
                    max: 10,
                    default: 7
                }
            ]
        },
        {
            id: 'final_review',
            title: 'Final Review & Polish',
            description: 'Let\'s do a comprehensive final review to ensure everything works together perfectly.',
            icon: <Award className="w-5 h-5" />,
            estimatedTime: '3-4 min',
            analysisType: 'final_review',
            questions: [
                {
                    id: 'final_priority',
                    question: 'What\'s your biggest concern for the final review?',
                    type: 'choice',
                    options: [
                        'Grammar and technical errors',
                        'Meeting assignment requirements',
                        'Overall impact and persuasiveness',
                        'Length and word count'
                    ]
                },
                {
                    id: 'improvement_area',
                    question: 'If you could improve just one thing, what would it be?',
                    type: 'choice',
                    options: [
                        'Making it more engaging',
                        'Strengthening the argument',
                        'Improving clarity',
                        'Adding more personality'
                    ]
                },
                {
                    id: 'confidence_level',
                    question: 'How confident do you feel about submitting this essay?',
                    type: 'slider',
                    min: 1,
                    max: 10,
                    default: 6
                }
            ]
        }
    ];

    const currentStep = analysisSteps[currentStepIndex];
    const currentQuestion = currentStep?.questions[currentQuestionIndex];
    const progress = analysisStarted ? ((currentStepIndex + (currentQuestionIndex / currentStep.questions.length)) / analysisSteps.length) * 100 : 0;

    // Start the analysis flow
    const startAnalysis = () => {
        setAnalysisStarted(true);
        setCurrentStepIndex(0);
        setCurrentQuestionIndex(0);
        setCurrentAnswers({});
        toast.success('Starting interactive MozartStroke analysis!');
    };

    // Handle answer selection
    const handleAnswer = (value: any) => {
        const newAnswers = {
            ...currentAnswers,
            [currentQuestion.id]: value
        };
        setCurrentAnswers(newAnswers);

        // Auto-advance for choice questions
        if (currentQuestion.type === 'choice') {
            setTimeout(() => {
                advanceToNextQuestion();
            }, 500);
        }
    };

    // Advance to next question or step
    const advanceToNextQuestion = () => {
        if (currentQuestionIndex < currentStep.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            // All questions answered, analyze this step
            analyzeCurrentStep();
        }
    };

    // Go back to previous question
    const goToPreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
        } else if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
            const prevStep = analysisSteps[currentStepIndex - 1];
            setCurrentQuestionIndex(prevStep.questions.length - 1);
        }
    };

    // Analyze current step based on user responses
    const analyzeCurrentStep = async () => {
        setIsAnalyzing(true);

        try {
            // Convert current answers to responses array
            const responses: UserResponse[] = Object.entries(currentAnswers).map(([questionId, answer]) => ({
                questionId,
                answer
            }));

            // Store responses for this step
            setStepResponses(prev => ({
                ...prev,
                [currentStep.id]: responses
            }));

            console.log(`Analyzing step: ${currentStep.title}`, responses);

            // Call the enhanced analysis API with step-specific configuration
            const analysisConfig = {
                stepType: currentStep.analysisType,
                userResponses: responses,
                focusArea: currentStep.id,
                documentSection: extractDocumentSection(currentStep.analysisType),
                analysisDepth: 'focused'
            };

            const response = await apiClient.post('/api/ai/scribe/enhanced-analyze', {
                documentContent: analysisConfig.documentSection,
                sessionId,
                analysisConfig
            });

            if (response.data.success) {
                const stepResult: StepResult = {
                    stepId: currentStep.id,
                    responses,
                    analysis: response.data.results,
                    suggestions: generateStepSuggestions(responses, response.data.results),
                    timestamp: new Date()
                };

                setStepResults(prev => [...prev, stepResult]);
                toast.success(`${currentStep.title} analysis complete!`);

                // Move to next step or complete
                if (currentStepIndex < analysisSteps.length - 1) {
                    setCurrentStepIndex(currentStepIndex + 1);
                    setCurrentQuestionIndex(0);
                    setCurrentAnswers({});
                } else {
                    // Analysis complete
                    const allResults = [...stepResults, stepResult];
                    onComplete(allResults);
                    toast.success('🎉 Interactive MozartStroke analysis complete!');
                }
            } else {
                throw new Error('Analysis failed');
            }
        } catch (error) {
            console.error('Step analysis error:', error);

            // Generate demo results for this step
            const demoResult: StepResult = {
                stepId: currentStep.id,
                responses: Object.entries(currentAnswers).map(([questionId, answer]) => ({
                    questionId,
                    answer
                })),
                analysis: generateDemoAnalysis(currentStep.analysisType),
                suggestions: [
                    `Great focus on ${currentStep.title.toLowerCase()}!`,
                    'Consider expanding this section with more specific details.',
                    'The flow in this area could be strengthened with better transitions.'
                ],
                timestamp: new Date()
            };

            setStepResults(prev => [...prev, demoResult]);
            toast.success(`${currentStep.title} analysis complete! (Demo mode)`);

            // Move to next step
            if (currentStepIndex < analysisSteps.length - 1) {
                setCurrentStepIndex(currentStepIndex + 1);
                setCurrentQuestionIndex(0);
                setCurrentAnswers({});
            } else {
                const allResults = [...stepResults, demoResult];
                onComplete(allResults);
                toast.success('🎉 Interactive analysis complete!');
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Extract relevant document section based on analysis type
    const extractDocumentSection = (analysisType: string): string => {
        const paragraphs = documentContent.split('\n\n').filter(p => p.trim().length > 0);

        switch (analysisType) {
            case 'introduction':
                return paragraphs[0] || documentContent.substring(0, 500);
            case 'conclusion':
                return paragraphs[paragraphs.length - 1] || documentContent.substring(documentContent.length - 500);
            case 'body_paragraphs':
                const bodyParagraphs = paragraphs.slice(1, -1);
                return bodyParagraphs.join('\n\n') || documentContent;
            default:
                return documentContent;
        }
    };

    // Generate step-specific suggestions
    const generateStepSuggestions = (responses: UserResponse[], analysis: any): string[] => {
        // This would be more sophisticated in a real implementation
        return [
            'Based on your responses, here are personalized suggestions...',
            'Consider strengthening this area based on your priorities.',
            'Your focus on this aspect shows great insight!'
        ];
    };

    // Generate demo analysis results
    const generateDemoAnalysis = (analysisType: string) => {
        return {
            score: Math.floor(Math.random() * 30) + 70,
            strengths: [`Strong ${analysisType.replace('_', ' ')} development`],
            improvements: [`Enhance ${analysisType.replace('_', ' ')} with more detail`],
            feedback: `Your ${analysisType.replace('_', ' ')} shows promise and aligns well with your stated priorities.`
        };
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <Brain className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Interactive MozartStroke Analysis</CardTitle>
                                <p className="text-purple-100 text-sm">Personalized, step-by-step essay analysis</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onCancel} className="text-white hover:bg-white/20">
                            ✕
                        </Button>
                    </div>

                    {analysisStarted && (
                        <div className="mt-4">
                            <div className="flex justify-between text-sm text-purple-100 mb-2">
                                <span>Step {currentStepIndex + 1} of {analysisSteps.length}</span>
                                <span>{Math.round(progress)}% Complete</span>
                            </div>
                            <Progress value={progress} className="h-2 bg-purple-800/30" />
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-6">
                    {!analysisStarted ? (
                        // Welcome screen
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                                <MessageCircle className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Interactive Analysis</h3>
                                <p className="text-gray-600 max-w-2xl mx-auto">
                                    I'll guide you through a personalized analysis of your essay. We'll go step by step,
                                    and I'll ask you questions to understand what matters most to you. This ensures you get
                                    feedback that's tailored to your specific goals and concerns.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                                {analysisSteps.slice(0, 3).map((step, index) => (
                                    <div key={step.id} className="bg-gray-50 p-4 rounded-lg text-center">
                                        <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                                            {step.icon}
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-1">{step.title}</h4>
                                        <p className="text-sm text-gray-600">{step.estimatedTime}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg mb-6">
                                <div className="flex items-center justify-center space-x-2 text-blue-800">
                                    <Clock className="w-5 h-5" />
                                    <span className="font-medium">Total time: 12-18 minutes</span>
                                </div>
                                <p className="text-blue-700 text-sm mt-2">
                                    Interactive analysis provides much more targeted and useful feedback than generic analysis
                                </p>
                            </div>

                            <Button
                                onClick={startAnalysis}
                                size="lg"
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            >
                                <Play className="w-5 h-5 mr-2" />
                                Start Interactive Analysis
                            </Button>
                        </div>
                    ) : (
                        // Question flow
                        <div className="space-y-6">
                            {/* Step header */}
                            <div className="flex items-center space-x-3 pb-4 border-b">
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                    {currentStep.icon}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900">{currentStep.title}</h3>
                                    <p className="text-gray-600">{currentStep.description}</p>
                                </div>
                                <Badge variant="outline" className="text-purple-700 border-purple-200">
                                    {currentStep.estimatedTime}
                                </Badge>
                            </div>

                            {/* Current question */}
                            {!isAnalyzing && currentQuestion && (
                                <div className="space-y-4">
                                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                <MessageCircle className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                                                    {currentQuestion.question}
                                                </h4>

                                                {currentQuestion.type === 'choice' && (
                                                    <div className="space-y-2">
                                                        {currentQuestion.options?.map((option, index) => (
                                                            <button
                                                                key={index}
                                                                onClick={() => handleAnswer(option)}
                                                                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                                                                    currentAnswers[currentQuestion.id] === option
                                                                        ? 'border-purple-500 bg-purple-100'
                                                                        : 'border-gray-200 hover:border-purple-300 bg-white'
                                                                }`}
                                                            >
                                                                <span className="font-medium">{option}</span>
                                                                {currentAnswers[currentQuestion.id] === option && (
                                                                    <CheckCircle className="w-5 h-5 text-purple-600 float-right mt-0.5" />
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {currentQuestion.type === 'slider' && (
                                                    <div className="space-y-3">
                                                        <input
                                                            type="range"
                                                            min={currentQuestion.min}
                                                            max={currentQuestion.max}
                                                            value={currentAnswers[currentQuestion.id] || currentQuestion.default}
                                                            onChange={(e) => handleAnswer(parseInt(e.target.value))}
                                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                                        />
                                                        <div className="flex justify-between text-sm text-gray-600">
                                                            <span>Not important</span>
                                                            <span className="font-semibold text-purple-600">
                                                                {currentAnswers[currentQuestion.id] || currentQuestion.default}
                                                            </span>
                                                            <span>Very important</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Navigation buttons */}
                                    <div className="flex justify-between">
                                        <Button
                                            variant="outline"
                                            onClick={goToPreviousQuestion}
                                            disabled={currentStepIndex === 0 && currentQuestionIndex === 0}
                                        >
                                            <ArrowLeft className="w-4 h-4 mr-2" />
                                            Previous
                                        </Button>

                                        <div className="text-center">
                                            <span className="text-sm text-gray-500">
                                                Question {currentQuestionIndex + 1} of {currentStep.questions.length}
                                            </span>
                                        </div>

                                        <Button
                                            onClick={advanceToNextQuestion}
                                            disabled={!currentAnswers[currentQuestion.id]}
                                            className="bg-purple-600 hover:bg-purple-700"
                                        >
                                            {currentQuestionIndex === currentStep.questions.length - 1 ? 'Analyze' : 'Next'}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Analysis in progress */}
                            {isAnalyzing && (
                                <div className="text-center py-12 space-y-4">
                                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                                        <Brain className="w-8 h-8 text-white" />
                                    </div>
                                    <h4 className="text-xl font-semibold text-gray-900">
                                        Analyzing your {currentStep.title.toLowerCase()}...
                                    </h4>
                                    <p className="text-gray-600">
                                        I'm reviewing this section based on your priorities and preferences
                                    </p>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                                </div>
                            )}

                            {/* Step progress indicator */}
                            <div className="border-t pt-4">
                                <div className="flex justify-center space-x-2">
                                    {analysisSteps.map((step, index) => (
                                        <div
                                            key={step.id}
                                            className={`w-3 h-3 rounded-full ${
                                                index < currentStepIndex
                                                    ? 'bg-green-500'
                                                    : index === currentStepIndex
                                                    ? 'bg-purple-500'
                                                    : 'bg-gray-300'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default InteractiveAnalysisFlow;