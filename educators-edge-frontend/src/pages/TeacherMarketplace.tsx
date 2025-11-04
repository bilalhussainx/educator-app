import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Search, Filter, Star, DollarSign, Clock, BookOpen,
    Award, TrendingUp, Sparkles, MapPin, Calendar, ChevronRight
} from 'lucide-react';

interface Teacher {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    profile_image_url: string | null;
    hourly_rate_usd: number;
    hourly_rate_z_credits: number;
    years_experience: number;
    total_sessions: number;
    average_rating: number;
    total_reviews: number;
    user_tier: string;
    location: string;
    specializations: string[];
}

const TeacherMarketplace: React.FC = () => {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'rating' | 'price' | 'sessions'>('rating');
    const [maxPrice, setMaxPrice] = useState<number>(200);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTeachers();
    }, [sortBy, maxPrice]);

    const fetchTeachers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const params = new URLSearchParams({
                service_type: 'teacher',
                max_rate_usd: maxPrice.toString(),
                limit: '50'
            });

            const response = await fetch(
                `http://localhost:10000/api/profiles/search?${params}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.ok) {
                const data = await response.json();
                let teachersList = data.profiles || [];

                // Sort
                teachersList.sort((a: Teacher, b: Teacher) => {
                    switch (sortBy) {
                        case 'rating':
                            return (b.average_rating || 0) - (a.average_rating || 0);
                        case 'price':
                            return (a.hourly_rate_usd || 0) - (b.hourly_rate_usd || 0);
                        case 'sessions':
                            return (b.total_sessions || 0) - (a.total_sessions || 0);
                        default:
                            return 0;
                    }
                });

                setTeachers(teachersList);
            }
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTeachers = teachers.filter(teacher =>
        teacher.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTierColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum': return 'text-cyan-400';
            case 'gold': return 'text-yellow-400';
            case 'silver': return 'text-gray-300';
            default: return 'text-orange-400';
        }
    };

    const getTierBadgeColor = (tier: string) => {
        switch (tier?.toLowerCase()) {
            case 'platinum': return 'bg-cyan-500/20 border-cyan-400/30';
            case 'gold': return 'bg-yellow-500/20 border-yellow-400/30';
            case 'silver': return 'bg-gray-500/20 border-gray-400/30';
            default: return 'bg-orange-500/20 border-orange-400/30';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading teachers...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-8"
                >
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <BookOpen className="w-10 h-10 text-cyan-400" />
                        <h1 className="text-4xl font-bold text-white">Teacher Marketplace</h1>
                    </div>
                    <p className="text-gray-300 text-lg">
                        Discover amazing teachers and start learning today
                    </p>
                </motion.div>

                {/* Filters & Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 mb-8"
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search teachers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                            />
                        </div>

                        {/* Sort */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="w-full pl-10 pr-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer"
                            >
                                <option value="rating">Sort by Rating</option>
                                <option value="price">Sort by Price (Low to High)</option>
                                <option value="sessions">Sort by Experience</option>
                            </select>
                        </div>

                        {/* Max Price */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-2">
                                Max Price: ${maxPrice}/hr
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="200"
                                step="10"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Results Count */}
                <div className="mb-6 text-gray-300">
                    Found {filteredTeachers.length} teachers
                </div>

                {/* Teacher Grid */}
                {filteredTeachers.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-white mb-2">No Teachers Found</h3>
                        <p className="text-gray-400">Try adjusting your filters</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTeachers.map((teacher, index) => (
                            <motion.div
                                key={teacher.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => navigate(`/profile/${teacher.id}`)}
                                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 hover:border-cyan-400/50 cursor-pointer transition-all hover:scale-105"
                            >
                                {/* Profile Image & Tier */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        {teacher.profile_image_url ? (
                                            <img
                                                src={teacher.profile_image_url}
                                                alt={teacher.display_name}
                                                className="w-16 h-16 rounded-full object-cover border-2 border-cyan-400"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                                                {teacher.display_name?.charAt(0) || teacher.username?.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-bold text-white">{teacher.display_name}</h3>
                                            <p className="text-sm text-gray-400">@{teacher.username}</p>
                                        </div>
                                    </div>
                                    {teacher.user_tier && (
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getTierBadgeColor(teacher.user_tier)} ${getTierColor(teacher.user_tier)}`}>
                                            {teacher.user_tier}
                                        </span>
                                    )}
                                </div>

                                {/* Bio */}
                                <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                                    {teacher.bio || 'Experienced teacher ready to help you learn!'}
                                </p>

                                {/* Stats */}
                                <div className="space-y-2 mb-4">
                                    {teacher.average_rating > 0 && (
                                        <div className="flex items-center gap-2">
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="text-white font-semibold">{teacher.average_rating.toFixed(1)}</span>
                                            <span className="text-gray-400 text-sm">({teacher.total_reviews} reviews)</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-gray-300 text-sm">
                                        <BookOpen className="w-4 h-4 text-cyan-400" />
                                        <span>{teacher.total_sessions || 0} sessions taught</span>
                                    </div>
                                    {teacher.years_experience > 0 && (
                                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                                            <Award className="w-4 h-4 text-purple-400" />
                                            <span>{teacher.years_experience} years experience</span>
                                        </div>
                                    )}
                                    {teacher.location && (
                                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                                            <MapPin className="w-4 h-4 text-green-400" />
                                            <span>{teacher.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Pricing */}
                                <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                                    <div>
                                        <div className="text-2xl font-bold text-cyan-400">
                                            ${teacher.hourly_rate_usd || 0}/hr
                                        </div>
                                        {teacher.hourly_rate_z_credits > 0 && (
                                            <div className="text-sm text-gray-400">
                                                or {teacher.hourly_rate_z_credits} Z-Credits
                                            </div>
                                        )}
                                    </div>
                                    <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-white font-medium transition-colors flex items-center gap-2">
                                        View Profile
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherMarketplace;
