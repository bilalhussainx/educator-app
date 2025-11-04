import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Gift, DollarSign, Users, BookOpen, Calendar, MessageSquare,
    TrendingUp, Award, Search, Sparkles, Clock, Target,
    Video, Code, FileText, BarChart3, Settings, ChevronRight
} from 'lucide-react';

interface QuickAccessCard {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    route: string;
    gradient: string;
    badge?: string;
    roles: ('student' | 'teacher')[];
}

const quickAccessCards: QuickAccessCard[] = [
    // For All Users
    {
        id: 'referrals',
        title: 'Referral Program',
        description: 'Earn 100 Z-Credits for every friend you refer!',
        icon: Gift,
        route: '/referrals',
        gradient: 'from-cyan-500 to-blue-500',
        badge: 'Earn Rewards',
        roles: ['student', 'teacher']
    },
    {
        id: 'messages',
        title: 'Messages',
        description: 'Chat with teachers and students',
        icon: MessageSquare,
        route: '/messages',
        gradient: 'from-purple-500 to-pink-500',
        roles: ['student', 'teacher']
    },

    // Student Specific
    {
        id: 'marketplace',
        title: 'Find Teachers',
        description: 'Browse and book amazing teachers',
        icon: Search,
        route: '/teachers/marketplace',
        gradient: 'from-green-500 to-emerald-500',
        badge: 'New',
        roles: ['student']
    },
    {
        id: 'leetcode',
        title: 'LeetCode Practice',
        description: '390+ problems with AI assistance',
        icon: Code,
        route: '/leetcode',
        gradient: 'from-orange-500 to-red-500',
        roles: ['student']
    },
    {
        id: 'courses',
        title: 'My Courses',
        description: 'Continue your learning journey',
        icon: BookOpen,
        route: '/courses/discover',
        gradient: 'from-indigo-500 to-purple-500',
        roles: ['student']
    },
    {
        id: 'sessions',
        title: 'My Sessions',
        description: 'View and manage your sessions',
        icon: Calendar,
        route: '/student-sessions',
        gradient: 'from-blue-500 to-cyan-500',
        roles: ['student']
    },
    {
        id: 'ai-chat',
        title: 'AI Mentor',
        description: 'Get instant help from AI',
        icon: Sparkles,
        route: '/ai-chat',
        gradient: 'from-yellow-500 to-orange-500',
        badge: '3 Free',
        roles: ['student']
    },

    // Teacher Specific
    {
        id: 'earnings',
        title: 'Earnings Dashboard',
        description: 'Track your income and projections',
        icon: DollarSign,
        route: '/teacher/earnings',
        gradient: 'from-green-500 to-teal-500',
        badge: 'New',
        roles: ['teacher']
    },
    {
        id: 'teacher-sessions',
        title: 'Session Hub',
        description: 'Manage your teaching sessions',
        icon: Users,
        route: '/teacher/sessions',
        gradient: 'from-blue-500 to-indigo-500',
        roles: ['teacher']
    },
    {
        id: 'create-course',
        title: 'Create Course',
        description: 'Build and publish new courses',
        icon: PlusCircle,
        route: '/courses/new',
        gradient: 'from-purple-500 to-pink-500',
        roles: ['teacher']
    },
    {
        id: 'my-courses',
        title: 'My Courses',
        description: 'Manage your published courses',
        icon: BookOpen,
        route: '/courses/discover',
        gradient: 'from-indigo-500 to-purple-500',
        roles: ['teacher']
    },
    {
        id: 'teacher-profile',
        title: 'My Profile',
        description: 'Update your teacher profile',
        icon: Settings,
        route: '/teacher-profile',
        gradient: 'from-gray-500 to-slate-500',
        roles: ['teacher']
    }
];

import { PlusCircle } from 'lucide-react';

interface QuickAccessCardsProps {
    userRole: 'student' | 'teacher';
}

export const QuickAccessCards: React.FC<QuickAccessCardsProps> = ({ userRole }) => {
    const navigate = useNavigate();

    const filteredCards = quickAccessCards.filter(card =>
        card.roles.includes(userRole)
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCards.map((card, index) => (
                <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(card.route)}
                    className="group relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:border-white/30 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden"
                >
                    {/* Gradient Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

                    {/* Badge */}
                    {card.badge && (
                        <div className="absolute top-4 right-4">
                            <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full border border-cyan-400/30">
                                {card.badge}
                            </span>
                        </div>
                    )}

                    {/* Content */}
                    <div className="relative z-10">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} p-2.5 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                            <card.icon className="w-full h-full text-white" />
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                            {card.title}
                        </h3>

                        {/* Description */}
                        <p className="text-sm text-gray-400 mb-4">
                            {card.description}
                        </p>

                        {/* Arrow */}
                        <div className="flex items-center text-cyan-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Access</span>
                            <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>

                    {/* Hover Glow Effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} blur-xl opacity-20`} />
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
