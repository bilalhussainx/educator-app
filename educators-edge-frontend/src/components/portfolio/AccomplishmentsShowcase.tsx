import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import accomplishmentsService, { Accomplishment, TeacherStats } from '../../services/accomplishmentsService';
import {
    Trophy,
    Star,
    Users,
    BookOpen,
    Calendar,
    Award,
    Zap,
    TrendingUp,
    Target,
    Flame,
    GraduationCap,
    Heart,
    BarChart3
} from 'lucide-react';

interface AccomplishmentsShowcaseProps {
    teacherId?: string; // If provided, shows public view of another teacher
    isOwnProfile?: boolean; // If true, shows private accomplishments too
}

const AccomplishmentsShowcase: React.FC<AccomplishmentsShowcaseProps> = ({
    teacherId,
    isOwnProfile = false
}) => {
    const [accomplishments, setAccomplishments] = useState<Accomplishment[]>([]);
    const [stats, setStats] = useState<TeacherStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [teacherId]);

    const fetchData = async () => {
        try {
            setIsLoading(true);

            // For development, use mock data
            const mockAccomplishments = accomplishmentsService.getMockAccomplishments();
            const mockStats: TeacherStats = {
                totalStudentsHelped: 847,
                totalCoursesCreated: 12,
                totalSessionsCompleted: 156,
                averageRating: 4.8,
                specializations: ['React', 'JavaScript', 'Node.js', 'Web Development', 'Mentoring'],
                teachingStreak: 45,
                topSkills: [
                    { skill: 'React Development', endorsements: 89, sessions: 67 },
                    { skill: 'JavaScript Fundamentals', endorsements: 76, sessions: 89 },
                    { skill: 'Career Mentoring', endorsements: 54, sessions: 45 },
                    { skill: 'Code Review', endorsements: 43, sessions: 78 }
                ],
                achievements: [
                    {
                        name: 'Master Educator',
                        description: 'Taught over 500 students with 4.8+ average rating',
                        earnedDate: '2024-08-15',
                        rarity: 'legendary'
                    },
                    {
                        name: 'Course Creator Pro',
                        description: 'Published 10+ comprehensive courses',
                        earnedDate: '2024-07-20',
                        rarity: 'epic'
                    },
                    {
                        name: 'Student Champion',
                        description: 'Helped 100+ students land their dream jobs',
                        earnedDate: '2024-06-10',
                        rarity: 'rare'
                    }
                ]
            };

            setAccomplishments(mockAccomplishments);
            setStats(mockStats);
        } catch (error) {
            console.error('Error fetching accomplishments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getAccomplishmentIcon = (type: string) => {
        switch (type) {
            case 'course_created': return BookOpen;
            case 'student_helped': return Users;
            case 'session_completed': return Calendar;
            case 'high_rating': return Star;
            case 'milestone': return Target;
            case 'skill_badge': return Award;
            default: return Trophy;
        }
    };

    const getAccomplishmentColor = (type: string) => {
        switch (type) {
            case 'course_created': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'student_helped': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'session_completed': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            case 'high_rating': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'milestone': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
            case 'skill_badge': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'legendary': return 'from-orange-400 to-red-500';
            case 'epic': return 'from-purple-400 to-blue-500';
            case 'rare': return 'from-blue-400 to-green-500';
            default: return 'from-gray-400 to-gray-600';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="ml-3 text-slate-300">Loading achievements...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Teacher Stats Overview */}
            {stats && (
                <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-400" />
                            Teaching Impact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <Users className="h-6 w-6 text-green-400" />
                                </div>
                                <div className="text-2xl font-bold text-green-300">{stats.totalStudentsHelped}</div>
                                <div className="text-sm text-slate-400">Students Helped</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <BookOpen className="h-6 w-6 text-blue-400" />
                                </div>
                                <div className="text-2xl font-bold text-blue-300">{stats.totalCoursesCreated}</div>
                                <div className="text-sm text-slate-400">Courses Created</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <Star className="h-6 w-6 text-yellow-400" />
                                </div>
                                <div className="text-2xl font-bold text-yellow-300">{stats.averageRating}</div>
                                <div className="text-sm text-slate-400">Avg Rating</div>
                            </div>
                            <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                    <Flame className="h-6 w-6 text-orange-400" />
                                </div>
                                <div className="text-2xl font-bold text-orange-300">{stats.teachingStreak}</div>
                                <div className="text-sm text-slate-400">Day Streak</div>
                            </div>
                        </div>

                        {/* Top Skills */}
                        <div>
                            <h4 className="text-lg font-semibold mb-3 text-white">Top Teaching Skills</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {stats.topSkills.map((skill, index) => (
                                    <div key={index} className="bg-slate-800/50 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-medium text-slate-200">{skill.skill}</span>
                                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                                                {skill.endorsements} endorsements
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-slate-400">{skill.sessions} sessions taught</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Achievements */}
            {stats?.achievements && stats.achievements.length > 0 && (
                <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-400" />
                            Achievements Unlocked
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {stats.achievements.map((achievement, index) => (
                                <div
                                    key={index}
                                    className={`bg-gradient-to-r ${getRarityColor(achievement.rarity)} p-0.5 rounded-lg`}
                                >
                                    <div className="bg-slate-900 rounded-lg p-4 h-full">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Trophy className="h-6 w-6 text-yellow-400" />
                                            <div>
                                                <h4 className="font-semibold text-white">{achievement.name}</h4>
                                                <Badge className={`text-xs ${getRarityColor(achievement.rarity).replace('from-', 'bg-').replace('to-', '').split(' ')[0]}/20`}>
                                                    {achievement.rarity}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-300 mb-2">{achievement.description}</p>
                                        <div className="text-xs text-slate-400">
                                            Earned: {new Date(achievement.earnedDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Accomplishments */}
            <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                <CardHeader>
                    <CardTitle className="text-xl text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                        Recent Accomplishments
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-80">
                        <div className="space-y-4">
                            {accomplishments.map((accomplishment) => {
                                const IconComponent = getAccomplishmentIcon(accomplishment.type);
                                return (
                                    <div key={accomplishment.id} className="flex gap-4 p-4 bg-slate-800/30 rounded-lg">
                                        <div className={`p-2 rounded-lg ${getAccomplishmentColor(accomplishment.type)}`}>
                                            <IconComponent className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <h4 className="font-semibold text-white">{accomplishment.title}</h4>
                                                <div className="flex items-center gap-1 text-yellow-400">
                                                    <Zap className="h-4 w-4" />
                                                    <span className="text-sm">+{accomplishment.xpEarned} XP</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-slate-300 mb-2">{accomplishment.description}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-400">
                                                    {new Date(accomplishment.date).toLocaleDateString()}
                                                </div>
                                                {accomplishment.metadata.studentCount && (
                                                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">
                                                        {accomplishment.metadata.studentCount} students
                                                    </Badge>
                                                )}
                                                {accomplishment.metadata.rating && (
                                                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
                                                        ⭐ {accomplishment.metadata.rating}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Specializations */}
            {stats?.specializations && stats.specializations.length > 0 && (
                <Card className="bg-slate-900/40 backdrop-blur-lg border-slate-700 text-white">
                    <CardHeader>
                        <CardTitle className="text-xl text-white flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-purple-400" />
                            Areas of Expertise
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {stats.specializations.map((spec, index) => (
                                <Badge
                                    key={index}
                                    className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-3 py-1"
                                >
                                    {spec}
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AccomplishmentsShowcase;