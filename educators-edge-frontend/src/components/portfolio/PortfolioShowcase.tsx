import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import accomplishmentsService, { PortfolioShowcase as PortfolioData } from '../../services/accomplishmentsService';
import {
    Briefcase,
    Quote,
    Star,
    Award,
    Edit3,
    Plus,
    ExternalLink,
    Calendar,
    User,
    Save,
    X
} from 'lucide-react';

interface PortfolioShowcaseProps {
    teacherId?: string;
    isOwnProfile?: boolean;
}

const PortfolioShowcase: React.FC<PortfolioShowcaseProps> = ({
    teacherId,
    isOwnProfile = false
}) => {
    const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<PortfolioData>({
        featuredProjects: [],
        teachingPhilosophy: '',
        expertiseAreas: [],
        certifications: []
    });

    useEffect(() => {
        fetchPortfolio();
    }, [teacherId]);

    const fetchPortfolio = async () => {
        try {
            setIsLoading(true);

            // Mock data for development
            const mockPortfolio: PortfolioData = {
                teachingPhilosophy: "I believe in empowering students through hands-on learning and real-world projects. My approach combines technical expertise with mentorship, helping students not just learn to code, but think like developers. Every student has unique potential, and I tailor my teaching to unlock their individual strengths.",
                expertiseAreas: [
                    'Full-Stack Development',
                    'React & Modern JavaScript',
                    'Career Mentoring',
                    'Code Architecture',
                    'Technical Interview Prep',
                    'Open Source Contribution'
                ],
                featuredProjects: [
                    {
                        title: 'React Mastery Course',
                        description: 'Comprehensive course covering React fundamentals to advanced patterns. Includes hooks, context, performance optimization, and testing strategies. Over 150 students have successfully completed this course and landed React developer roles.',
                        tags: ['React', 'JavaScript', 'Hooks', 'Testing', 'Performance'],
                        studentTestimonials: [
                            {
                                studentName: 'Sarah Chen',
                                feedback: 'This course completely transformed my understanding of React. The hands-on projects and detailed explanations helped me land my first frontend developer job!',
                                rating: 5
                            },
                            {
                                studentName: 'Michael Rodriguez',
                                feedback: 'Best React course I\'ve taken. The teacher explains complex concepts in a way that just clicks. Highly recommend!',
                                rating: 5
                            }
                        ]
                    },
                    {
                        title: 'Full-Stack Portfolio Builder',
                        description: 'Step-by-step guide to building a professional developer portfolio. Covers frontend design, backend API development, deployment strategies, and SEO optimization. Students create a stunning portfolio that showcases their skills.',
                        tags: ['Full-Stack', 'Node.js', 'Portfolio', 'Deployment', 'SEO'],
                        studentTestimonials: [
                            {
                                studentName: 'Alex Thompson',
                                feedback: 'My portfolio built through this course helped me get interviews at 5 different companies. The teacher\'s attention to detail is incredible.',
                                rating: 5
                            }
                        ]
                    },
                    {
                        title: 'Technical Interview Bootcamp',
                        description: 'Intensive program focusing on coding interviews, system design, and behavioral questions. Includes mock interviews, whiteboard practice, and career coaching. 90% success rate for students landing developer roles.',
                        tags: ['Interview Prep', 'Algorithms', 'System Design', 'Career Coaching'],
                        studentTestimonials: [
                            {
                                studentName: 'Jennifer Wu',
                                feedback: 'Passed my Google interview thanks to this bootcamp! The mock sessions were incredibly valuable.',
                                rating: 5
                            },
                            {
                                studentName: 'David Park',
                                feedback: 'From zero coding interview experience to landing my dream job at a startup. This teacher knows exactly what companies are looking for.',
                                rating: 5
                            }
                        ]
                    }
                ],
                certifications: [
                    {
                        name: 'AWS Certified Solutions Architect',
                        issuer: 'Amazon Web Services',
                        date: '2024-03-15',
                        credentialUrl: 'https://aws.amazon.com/verification'
                    },
                    {
                        name: 'React Advanced Patterns Certification',
                        issuer: 'React Training',
                        date: '2024-01-20',
                    },
                    {
                        name: 'Google Analytics Certified',
                        issuer: 'Google',
                        date: '2023-11-10',
                        credentialUrl: 'https://skillshop.exceedlms.com/student/award'
                    }
                ]
            };

            setPortfolio(mockPortfolio);
            setEditForm(mockPortfolio);
        } catch (error) {
            console.error('Error fetching portfolio:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const success = await accomplishmentsService.updatePortfolioShowcase(editForm);
            if (success) {
                setPortfolio(editForm);
                setIsEditing(false);
            }
        } catch (error) {
            console.error('Error saving portfolio:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-slate-300">Loading portfolio...</span>
            </div>
        );
    }

    if (!portfolio) return null;

    return (
        <div className="space-y-6">
            {/* Teaching Philosophy */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                        <Quote className="h-5 w-5 text-blue-400" />
                        Teaching Philosophy
                    </CardTitle>
                    {isOwnProfile && !isEditing && (
                        <Button
                            onClick={() => setIsEditing(true)}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Edit3 className="h-4 w-4 mr-1" />
                            Edit
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="space-y-4">
                            <Textarea
                                value={editForm.teachingPhilosophy}
                                onChange={(e) => setEditForm({...editForm, teachingPhilosophy: e.target.value})}
                                placeholder="Describe your teaching philosophy and approach..."
                                className="bg-slate-800 border-slate-600 text-white min-h-[120px]"
                            />
                            <div className="flex gap-2">
                                <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
                                    <Save className="h-4 w-4 mr-1" />
                                    Save
                                </Button>
                                <Button
                                    onClick={() => setIsEditing(false)}
                                    variant="outline"
                                    className="border-slate-600 text-white hover:bg-slate-800"
                                >
                                    <X className="h-4 w-4 mr-1" />
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-300 leading-relaxed italic">
                            "{portfolio.teachingPhilosophy}"
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Expertise Areas */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                <CardHeader>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                        <Award className="h-5 w-5 text-purple-400" />
                        Areas of Expertise
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {portfolio.expertiseAreas.map((area, index) => (
                            <Badge
                                key={index}
                                className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-3 py-1 text-sm"
                            >
                                {area}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Featured Projects */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                <CardHeader>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-green-400" />
                        Featured Teaching Projects
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {portfolio.featuredProjects.map((project, index) => (
                            <div key={index} className="bg-slate-800/30 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-white mb-2">{project.title}</h3>
                                <p className="text-slate-300 mb-4">{project.description}</p>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {project.tags.map((tag, tagIndex) => (
                                        <Badge
                                            key={tagIndex}
                                            className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs"
                                        >
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>

                                {/* Student Testimonials */}
                                {project.studentTestimonials && project.studentTestimonials.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 mb-3">Student Feedback:</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {project.studentTestimonials.map((testimonial, testIndex) => (
                                                <div key={testIndex} className="bg-slate-900/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                        <span className="text-sm font-medium text-slate-300">
                                                            {testimonial.studentName}
                                                        </span>
                                                        <div className="flex items-center ml-auto">
                                                            {[...Array(testimonial.rating)].map((_, starIndex) => (
                                                                <Star key={starIndex} className="h-3 w-3 text-yellow-400 fill-current" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-xs text-slate-400 italic">
                                                        "{testimonial.feedback}"
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Certifications */}
            {portfolio.certifications && portfolio.certifications.length > 0 && (
                <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Award className="h-5 w-5 text-yellow-400" />
                            Certifications & Credentials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {portfolio.certifications.map((cert, index) => (
                                <div key={index} className="bg-slate-800/30 rounded-lg p-4">
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium text-white">{cert.name}</h4>
                                        {cert.credentialUrl && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-6 w-6 p-0 text-blue-400 hover:text-blue-300"
                                                onClick={() => window.open(cert.credentialUrl, '_blank')}
                                            >
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-400 mb-1">{cert.issuer}</p>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(cert.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default PortfolioShowcase;