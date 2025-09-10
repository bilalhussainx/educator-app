import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
    Search, Filter, Star, MapPin, Clock, DollarSign, Users, Award, Sparkles,
    Brain, Target, TrendingUp, Zap, Heart, GraduationCap, BarChart3,
    BookOpen, MessageCircle, Calendar, Eye, ChevronRight, Compass, User, Crown
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Teacher {
  user_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  bio: string;
  teacher_bio: string;
  location: string;
  specializations: string[];
  years_experience: number;
  average_rating: number;
  total_reviews: number;
  hourly_rate_sparks: number;
  hourly_rate_usd: number;
  user_tier: 'pathfinder' | 'explorer' | 'navigator';
  ascendia_score: number;
  // TALENT CRUCIBLE: Four Pillars support
  pillar_academic: number;
  pillar_community: number;
  pillar_mentorship: number;
  pillar_analytical: number;
  is_mentor: boolean;
  is_counselor: boolean;
  is_essay_editor: boolean;
  verified_mentor: boolean;
  availability_status: 'available' | 'busy' | 'offline';
  can_host_group_sessions: boolean;
  max_students_per_session: number;
  timezone?: string;
  languages?: string[];
}

interface SearchResult {
  teacherId: string;
  matchScore: number;
  compatibilityScore?: number;
  learningPathwayMatch?: string;
  compatibilityReasons: string[];
  learningOutcomes: string[];
  sessionStructure: string;
  considerations: string;
  whyPerfectMatch: string;
  teacher: Teacher;
}

interface AISearchResults {
  query: string;
  studentProfile: string;
  analysis: string;
  recommendations: SearchResult[];
  alternativeOptions: string;
  learningPathSuggestions: string;
  totalTeachersAnalyzed: number;
  aiProcessedAt: string;
}

// TALENT CRUCIBLE: Enhanced styling configurations
const TIER_STYLES = {
    pathfinder: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
    explorer: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
    navigator: { color: 'text-cyan-400', bgColor: 'bg-cyan-500/10', borderColor: 'border-cyan-500/30' }
};

const PILLAR_ICONS = {
    academic: { icon: GraduationCap, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    community: { icon: Users, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    mentorship: { icon: Heart, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
    analytical: { icon: BarChart3, color: 'text-purple-400', bgColor: 'bg-purple-500/10' }
};

const TeacherSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSearchMode, setActiveSearchMode] = useState<'browse' | 'ai' | 'talent-crucible'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AISearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [browseResults, setBrowseResults] = useState<Teacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [personalizedRecommendations, setPersonalizedRecommendations] = useState<any>(null);

  // TALENT CRUCIBLE: Enhanced filter states with Four Pillars
  const [filters, setFilters] = useState({
    tier: '',
    specializations: '',
    minRating: '',
    maxRate: '',
    availability: 'available',
    sortBy: 'ascendia_score',
    // Four Pillars filters
    minAcademic: '',
    minCommunity: '',
    minMentorship: '',
    minAnalytical: '',
    minAscendiaScore: '',
    location: '',
    languages: '',
    serviceType: '',
    pillars: {
        Academic: 0,
        Community: 0,
        Mentorship: 0,
        Analytical: 0
    },
    verified: false
  });

  // Student preferences for AI search
  const [preferences, setPreferences] = useState({
    budget: '',
    schedule: '',
    learningStyle: '',
    experienceLevel: 'beginner',
    language: 'English',
    sessionType: '',
    subjects: '',
    timezone: ''
  });

  useEffect(() => {
    loadPersonalizedRecommendations();
    browseTeachers();
  }, []);

  const loadPersonalizedRecommendations = async () => {
    try {
      const response = await fetch('/api/ai/recommend/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ preferences: {} })
      });

      if (response.ok) {
        const data = await response.json();
        setPersonalizedRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Failed to load personalized recommendations:', error);
    }
  };

  // TALENT CRUCIBLE: Enhanced teacher browsing with Four Pillars
  const browseTeachers = async () => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '' && value !== false) {
          queryParams.append(key, value.toString());
        }
      });
      // Add Four Pillars to query
      queryParams.append('include_pillars', 'true');

      const response = await apiClient.get(`/api/profiles/search/profiles?${queryParams}`);
      
      if (response.data.success) {
        setBrowseResults(response.data.profiles || []);
      } else {
        throw new Error(response.data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Failed to browse teachers:', error);
    }
  };

  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/ai/search/teachers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          searchQuery,
          studentPreferences: preferences
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      } else {
        console.error('Search failed:', response.statusText);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'navigator': return 'text-yellow-600 bg-yellow-100';
      case 'explorer': return 'text-gray-600 bg-gray-100';
      case 'pathfinder': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'navigator': return '🥇';
      case 'explorer': return '🥈';
      case 'pathfinder': return '🥉';
      default: return '⭐';
    }
  };

  const TeacherCard: React.FC<{ teacher: Teacher; searchResult?: SearchResult }> = ({ 
    teacher, 
    searchResult 
  }) => (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold">
            {teacher.display_name?.charAt(0) || teacher.username?.charAt(0) || 'T'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{teacher.display_name || teacher.username}</h3>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(teacher.user_tier)}`}>
                {getTierIcon(teacher.user_tier)} {teacher.user_tier.toUpperCase()} ({teacher.ascendia_score})
              </span>
              {teacher.verified_mentor && (
                <span className="text-green-600 text-xs">✓ Verified</span>
              )}
            </div>
          </div>
        </div>
        
        {searchResult && (
          <div className="text-right">
            <div className="text-lg font-bold text-green-600">{searchResult.matchScore}% Match</div>
            <div className="flex items-center text-yellow-500">
              <Sparkles className="w-4 h-4 mr-1" />
              <span className="text-xs">AI Recommended</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>{teacher.average_rating.toFixed(1)}</span>
            <span>({teacher.total_reviews} reviews)</span>
          </div>
          <div className="flex items-center space-x-1">
            <MapPin className="w-4 h-4" />
            <span>{teacher.location || 'Remote'}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{teacher.years_experience}+ years</span>
          </div>
        </div>

        <p className="text-gray-700 text-sm line-clamp-2">
          {teacher.teacher_bio || teacher.bio || 'Experienced educator ready to help you learn.'}
        </p>

        {/* Four Pillars Visualization */}
        {(teacher.pillar_academic || teacher.pillar_community || teacher.pillar_mentorship || teacher.pillar_analytical) && (
          <div className="grid grid-cols-2 gap-2 my-3">
            {[
              { key: 'academic', score: teacher.pillar_academic, label: 'Academic', icon: 'academic' },
              { key: 'community', score: teacher.pillar_community, label: 'Community', icon: 'community' },
              { key: 'mentorship', score: teacher.pillar_mentorship, label: 'Mentorship', icon: 'mentorship' },
              { key: 'analytical', score: teacher.pillar_analytical, label: 'Analytical', icon: 'analytical' }
            ].filter(pillar => pillar.score > 0).map((pillar) => {
              const PillarIcon = PILLAR_ICONS[pillar.icon as keyof typeof PILLAR_ICONS].icon;
              const colorClass = PILLAR_ICONS[pillar.icon as keyof typeof PILLAR_ICONS].color;
              return (
                <div key={pillar.key} className="flex items-center space-x-1">
                  <PillarIcon className={`w-3 h-3 ${colorClass}`} />
                  <span className="text-xs text-slate-600">{pillar.label}</span>
                  <span className="text-xs font-semibold text-slate-800">{pillar.score}</span>
                </div>
              );
            })}
          </div>
        )}

        {teacher.specializations.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {teacher.specializations.slice(0, 3).map((spec, index) => (
              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                {spec}
              </span>
            ))}
            {teacher.specializations.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                +{teacher.specializations.length - 3} more
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-600 font-semibold">
              {teacher.hourly_rate_sparks} Sparks/hr
            </span>
            {teacher.hourly_rate_usd > 0 && (
              <span className="text-gray-500">or ${teacher.hourly_rate_usd}/hr</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {teacher.can_host_group_sessions && (
              <span className="flex items-center text-xs text-blue-600">
                <Users className="w-3 h-3 mr-1" />
                Group Sessions
              </span>
            )}
            <TierBadge 
              tier={teacher.user_tier || 'pathfinder'} 
              size="sm" 
              className="text-xs"
            />
          </div>
        </div>

        {/* AI Compatibility Analysis */}
        {searchResult && (
          <div className="mt-4 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-cyan-600" />
              <h4 className="text-sm font-semibold text-cyan-900">AI Compatibility Analysis</h4>
              {searchResult.compatibilityScore && (
                <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 text-xs">
                  {Math.round(searchResult.compatibilityScore * 100)}% Match
                </Badge>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="text-xs text-cyan-800">
                <strong>Perfect Match Reasons:</strong>
                <ul className="mt-1 space-y-1 ml-3">
                  {searchResult.compatibilityReasons.slice(0, 3).map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {searchResult.learningPathwayMatch && (
                <div className="text-xs text-cyan-700 bg-cyan-100/50 p-2 rounded border border-cyan-200">
                  <strong>Learning Pathway:</strong> {searchResult.learningPathwayMatch}
                </div>
              )}
              
              <p className="text-xs text-cyan-900 font-medium mt-2">
                {searchResult.whyPerfectMatch}
              </p>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <button 
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            onClick={() => setSelectedTeacher(teacher)}
          >
            <User className="w-4 h-4" />
            View Profile
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm font-medium transition-colors flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Book Session
          </button>
          {searchResult && (
            <button className="bg-cyan-600 text-white px-3 py-2 rounded-lg hover:bg-cyan-700 text-sm font-medium transition-colors flex items-center gap-1">
              <Target className="w-4 h-4" />
              Optimize
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Find Your Perfect Teacher</h1>
              <p className="text-gray-600 mt-1">AI-powered teacher matching for personalized learning</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* AI Search Bar */}
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Describe what you want to learn or what kind of teacher you're looking for..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAISearch()}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleAISearch}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Searching...' : 'AI Search'}</span>
            </button>
          </div>

          {/* Quick Filters */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
              <select 
                value={filters.tier} 
                onChange={(e) => setFilters({...filters, tier: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Tiers</option>
                <option value="navigator">Navigator Tier</option>
                <option value="explorer">Explorer Tier</option>
                <option value="pathfinder">Pathfinder Tier</option>
              </select>
              
              <select 
                value={filters.sortBy} 
                onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="ascendia_score">Top Ranked</option>
                <option value="rating">Highest Rated</option>
                <option value="experience">Most Experience</option>
                <option value="price_low">Lowest Price</option>
              </select>

              <input
                type="number"
                placeholder="Min Rating (1-5)"
                value={filters.minRating}
                onChange={(e) => setFilters({...filters, minRating: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min="1"
                max="5"
                step="0.1"
              />
            </div>
          )}

          {/* Four Pillars Advanced Filtering */}
          {showFilters && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-cyan-500" />
                Four Pillars Filtering
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(PILLAR_ICONS).map(([pillar, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={pillar} className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-medium text-slate-700">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className="capitalize">{pillar}</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1000"
                        step="50"
                        value={filters.pillars[pillar as keyof typeof filters.pillars] || 0}
                        onChange={(e) => setFilters({
                          ...filters,
                          pillars: {
                            ...filters.pillars,
                            [pillar]: parseInt(e.target.value)
                          }
                        })}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-slate-500">
                        Min: {filters.pillars[pillar as keyof typeof filters.pillars] || 0}
                      </span>
                    </div>
                  );
                })}
              </div>

              <input
                type="number"
                placeholder="Max Sparks/hr"
                value={filters.maxRate}
                onChange={(e) => setFilters({...filters, maxRate: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                min="0"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* AI Search Results */}
        {searchResults && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">AI Analysis & Recommendations</h2>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-blue-900 mb-2">Your Learning Profile</h3>
                <p className="text-blue-800 text-sm">{searchResults.studentProfile}</p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-900 mb-2">Analysis</h3>
                <p className="text-green-800 text-sm">{searchResults.analysis}</p>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>Analyzed {searchResults.totalTeachersAnalyzed} teachers • {searchResults.aiProcessedAt}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.recommendations.map((result) => (
                <TeacherCard key={result.teacherId} teacher={result.teacher} searchResult={result} />
              ))}
            </div>

            {searchResults.alternativeOptions && (
              <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">Alternative Suggestions</h3>
                <p className="text-yellow-800 text-sm">{searchResults.alternativeOptions}</p>
              </div>
            )}

            {/* Predictive Matching Interface */}
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Predictive Learning Outcomes</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-purple-800">Success Probability</h4>
                  {searchResults.recommendations.slice(0, 3).map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/50 rounded border border-purple-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">{result.teacher.first_name?.[0]}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-800">
                          {result.teacher.first_name} {result.teacher.last_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all"
                            style={{ width: `${(result.compatibilityScore || 0.8) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-green-600">
                          {Math.round((result.compatibilityScore || 0.8) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-purple-800">Learning Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700">Beginner → Intermediate</span>
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-800">4-6 weeks</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700">Intermediate → Advanced</span>
                      <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">8-12 weeks</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-purple-700">Mastery Achievement</span>
                      <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">16-24 weeks</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Pathway Optimization */}
            <div className="mt-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-6 border border-emerald-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-emerald-900">Optimized Learning Path</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/50 rounded border border-emerald-200">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-emerald-600 font-bold">1</span>
                    </div>
                    <h4 className="font-medium text-emerald-800 text-sm">Foundation Building</h4>
                    <p className="text-xs text-emerald-700 mt-1">Core concepts & fundamentals</p>
                    <Badge variant="outline" className="text-xs mt-2 bg-emerald-100 text-emerald-800">Weeks 1-4</Badge>
                  </div>
                  
                  <div className="text-center p-4 bg-white/50 rounded border border-emerald-200">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-teal-600 font-bold">2</span>
                    </div>
                    <h4 className="font-medium text-teal-800 text-sm">Skill Development</h4>
                    <p className="text-xs text-teal-700 mt-1">Practical application & practice</p>
                    <Badge variant="outline" className="text-xs mt-2 bg-teal-100 text-teal-800">Weeks 5-12</Badge>
                  </div>
                  
                  <div className="text-center p-4 bg-white/50 rounded border border-emerald-200">
                    <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-cyan-600 font-bold">3</span>
                    </div>
                    <h4 className="font-medium text-cyan-800 text-sm">Mastery & Projects</h4>
                    <p className="text-xs text-cyan-700 mt-1">Real-world application</p>
                    <Badge variant="outline" className="text-xs mt-2 bg-cyan-100 text-cyan-800">Weeks 13+</Badge>
                  </div>
                </div>
                
                <div className="bg-white/50 rounded p-4 border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Recommended Study Plan
                  </h4>
                  <div className="text-sm text-emerald-700 space-y-1">
                    <p>• Start with 2-3 sessions per week for optimal retention</p>
                    <p>• Focus on {searchQuery.toLowerCase() || 'your chosen subject'} fundamentals first</p>
                    <p>• Gradual increase to 4-5 sessions as complexity builds</p>
                    <p>• Regular practice sessions and milestone assessments</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Personalized Recommendations */}
        {personalizedRecommendations && !searchResults && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recommended for You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personalizedRecommendations.recommendations?.slice(0, 6).map((rec: any) => (
                <TeacherCard key={rec.teacherId} teacher={rec.teacher} />
              ))}
            </div>
          </div>
        )}

        {/* Browse All Teachers */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {searchResults ? 'More Teachers' : 'Browse All Teachers'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {browseResults.map((teacher) => (
              <TeacherCard key={teacher.user_id} teacher={teacher} />
            ))}
          </div>
        </div>
      </div>

      {/* Teacher Profile Modal would go here */}
    </div>
  );
};

export default TeacherSearchPage;