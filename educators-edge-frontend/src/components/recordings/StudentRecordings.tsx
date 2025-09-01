// components/recordings/StudentRecordings.tsx
// Student interface for viewing completed recorded sessions

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Play, Clock, Brain, Search, Filter, Sparkles, MessageCircle, Languages, Globe } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../services/apiClient';

interface IntelligentSearchResult {
    matches: Recording[];
    aiResponse: string;
    suggestions: string[];
    totalRecordings: number;
}

interface Translation {
    id: string;
    recording_id: string;
    language_code: string;
    language_name: string;
    translated_title: string;
    translated_description?: string;
    translated_transcript: string;
    translated_summary?: string;
    translated_topics?: string[];
    created_at: string;
}

interface Recording {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    ai_summary: string | null;
    ai_topics: string[] | null;
    recorded_at: string;
}

interface StudentRecordingsProps {
    courseId: string;
}

export const StudentRecordings: React.FC<StudentRecordingsProps> = ({ courseId }) => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [isIntelligentMode, setIsIntelligentMode] = useState(false);
    const [intelligentQuery, setIntelligentQuery] = useState('');
    const [searchResult, setSearchResult] = useState<IntelligentSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [supportedLanguages, setSupportedLanguages] = useState<Record<string, string>>({});
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    const [translatingRecording, setTranslatingRecording] = useState<string | null>(null);
    const [translations, setTranslations] = useState<Record<string, Translation>>({});

    const fetchRecordings = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(`/api/recordings/course/${courseId}/student`);
            setRecordings(response.data.recordings);
            setFilteredRecordings(response.data.recordings);
        } catch (error: any) {
            console.error('Error fetching recordings:', error);
            
            // Enhanced error handling for UUID validation errors
            if (error.response?.status === 400 && error.response?.data?.error?.includes('UUID')) {
                console.error('[RECORDINGS] UUID Format Error:', {
                    courseId,
                    error: error.response.data.error,
                    details: error.response.data.details,
                    suggestion: error.response.data.suggestion
                });
                toast.error(`Invalid Course ID: ${error.response.data.details || 'Course ID must be a valid UUID format'}`);
            } else {
                toast.error('Failed to load recordings');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchSupportedLanguages = async () => {
        try {
            const response = await apiClient.get('/api/recordings/translations/languages');
            setSupportedLanguages(response.data.languages);
        } catch (error) {
            console.error('Error fetching languages:', error);
        }
    };

    useEffect(() => {
        if (courseId) {
            fetchRecordings();
            fetchSupportedLanguages();
        }
    }, [courseId]);

    // Intelligent search function
    const handleIntelligentSearch = async () => {
        if (!intelligentQuery.trim()) {
            toast.error('Please enter a question');
            return;
        }

        try {
            setIsSearching(true);
            const response = await apiClient.post(`/api/recordings/course/${courseId}/search`, {
                query: intelligentQuery
            });
            
            setSearchResult(response.data);
            
            if (response.data.matches.length > 0) {
                setFilteredRecordings(response.data.matches);
            }
            
        } catch (error) {
            console.error('Error in intelligent search:', error);
            toast.error('Failed to search recordings');
        } finally {
            setIsSearching(false);
        }
    };

    const clearIntelligentSearch = () => {
        setSearchResult(null);
        setIntelligentQuery('');
        setFilteredRecordings(recordings);
    };

    // Translation functions
    const handleTranslateRecording = async (recordingId: string, languageCode: string) => {
        if (languageCode === 'en') {
            return; // No need to translate to English (original)
        }

        try {
            setTranslatingRecording(recordingId);
            
            // First check if translation exists
            const existingResponse = await apiClient.get(`/api/recordings/${recordingId}/translate/${languageCode}`);
            
            if (existingResponse.data.translation) {
                setTranslations(prev => ({
                    ...prev,
                    [`${recordingId}-${languageCode}`]: existingResponse.data.translation
                }));
                toast.success(`Translation loaded in ${supportedLanguages[languageCode]}`);
                return;
            }
        } catch (error) {
            // Translation doesn't exist, create it
            try {
                const response = await apiClient.post(`/api/recordings/${recordingId}/translate/${languageCode}`);
                setTranslations(prev => ({
                    ...prev,
                    [`${recordingId}-${languageCode}`]: response.data.translation
                }));
                toast.success(`Recording translated to ${supportedLanguages[languageCode]}`);
            } catch (createError) {
                console.error('Error creating translation:', createError);
                toast.error('Failed to translate recording');
            }
        } finally {
            setTranslatingRecording(null);
        }
    };

    const getDisplayContent = (recording: Recording, languageCode: string) => {
        if (languageCode === 'en') {
            return {
                title: recording.title,
                description: recording.description,
                summary: recording.ai_summary,
                topics: recording.ai_topics
            };
        }

        const translationKey = `${recording.id}-${languageCode}`;
        const translation = translations[translationKey];
        
        if (translation) {
            return {
                title: translation.translated_title,
                description: translation.translated_description,
                summary: translation.translated_summary,
                topics: translation.translated_topics
            };
        }

        return {
            title: recording.title,
            description: recording.description,
            summary: recording.ai_summary,
            topics: recording.ai_topics
        };
    };

    // Filter recordings based on search and topic
    useEffect(() => {
        let filtered = recordings;

        // Text search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(recording => 
                recording.title.toLowerCase().includes(query) ||
                (recording.description && recording.description.toLowerCase().includes(query)) ||
                (recording.ai_summary && recording.ai_summary.toLowerCase().includes(query)) ||
                (recording.ai_topics && recording.ai_topics.some(topic => 
                    topic.toLowerCase().includes(query)
                ))
            );
        }

        // Topic filter
        if (selectedTopic) {
            filtered = filtered.filter(recording =>
                recording.ai_topics && recording.ai_topics.includes(selectedTopic)
            );
        }

        setFilteredRecordings(filtered);
    }, [recordings, searchQuery, selectedTopic]);

    // Get all unique topics for filtering
    const allTopics = Array.from(new Set(
        recordings.flatMap(r => r.ai_topics || [])
    )).sort();

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDuration = (recordedAt: string) => {
        const date = new Date(recordedAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return '1 day ago';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
        return `${Math.ceil(diffDays / 30)} months ago`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                <span className="ml-2 text-slate-400">Loading recordings...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search Mode Toggle */}
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant={!isIntelligentMode ? "default" : "outline"}
                    onClick={() => {
                        setIsIntelligentMode(false);
                        clearIntelligentSearch();
                    }}
                >
                    <Search className="h-4 w-4 mr-1" />
                    Simple Search
                </Button>
                <Button
                    size="sm"
                    variant={isIntelligentMode ? "default" : "outline"}
                    onClick={() => setIsIntelligentMode(true)}
                    className="bg-purple-600 hover:bg-purple-500"
                >
                    <Sparkles className="h-4 w-4 mr-1" />
                    Ask AI
                </Button>
            </div>

            {!isIntelligentMode ? (
                // Simple Search
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search recordings, topics, or content..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-slate-800/50 border-slate-600 text-slate-100 placeholder-slate-400"
                            />
                        </div>
                    </div>
                    
                    {allTopics.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-400" />
                            <select
                                value={selectedTopic}
                                onChange={(e) => setSelectedTopic(e.target.value)}
                                className="bg-slate-800 border border-slate-600 text-slate-100 rounded-md px-3 py-2 text-sm"
                            >
                                <option value="">All Topics</option>
                                {allTopics.map(topic => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            ) : (
                // Intelligent Search
                <div className="space-y-4">
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-600">
                        <div className="flex items-center gap-2 mb-3">
                            <Brain className="h-5 w-5 text-purple-400" />
                            <h3 className="font-medium text-slate-200">Ask About Your Recordings</h3>
                        </div>
                        <div className="space-y-3">
                            <Textarea
                                placeholder="Ask me anything about your recorded sessions... e.g., 'How do I handle async errors in JavaScript?' or 'Show me sessions about React components'"
                                value={intelligentQuery}
                                onChange={(e) => setIntelligentQuery(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-400"
                                rows={3}
                            />
                            <div className="flex gap-2">
                                <Button 
                                    onClick={handleIntelligentSearch}
                                    disabled={isSearching || !intelligentQuery.trim()}
                                    className="bg-purple-600 hover:bg-purple-500"
                                >
                                    {isSearching ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Searching...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Search with AI
                                        </>
                                    )}
                                </Button>
                                {searchResult && (
                                    <Button 
                                        variant="outline" 
                                        onClick={clearIntelligentSearch}
                                    >
                                        Clear Search
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Response */}
                    {searchResult && (
                        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-purple-500/30">
                            <div className="flex items-start gap-3">
                                <MessageCircle className="h-5 w-5 text-purple-400 mt-0.5" />
                                <div className="flex-1">
                                    <h4 className="font-medium text-slate-200 mb-2">AI Response</h4>
                                    <p className="text-slate-300 leading-relaxed mb-3">{searchResult.aiResponse}</p>
                                    {searchResult.suggestions.length > 0 && (
                                        <div>
                                            <h5 className="font-medium text-slate-200 mb-2">Suggestions:</h5>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                                                {searchResult.suggestions.map((suggestion, index) => (
                                                    <li key={index}>{suggestion}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-100">Session Library</h2>
                <div className="flex items-center gap-3">
                    {/* Language Selector */}
                    {Object.keys(supportedLanguages).length > 0 && (
                        <div className="flex items-center gap-2">
                            <Languages className="h-4 w-4 text-slate-400" />
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                className="bg-slate-800 border border-slate-600 text-slate-100 rounded-md px-3 py-1 text-sm"
                            >
                                <option value="en">English (Original)</option>
                                {Object.entries(supportedLanguages)
                                    .filter(([code]) => code !== 'en')
                                    .map(([code, name]) => (
                                        <option key={code} value={code}>{name}</option>
                                    ))
                                }
                            </select>
                        </div>
                    )}
                    <Badge variant="outline" className="text-slate-300">
                        {filteredRecordings.length} of {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </div>

            {filteredRecordings.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="text-center p-8">
                        <Play className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                        {recordings.length === 0 ? (
                            <>
                                <p className="text-slate-400 mb-2">No recordings available</p>
                                <p className="text-sm text-slate-500">
                                    Your instructor hasn't created any recordings yet
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-slate-400 mb-2">No recordings match your search</p>
                                <p className="text-sm text-slate-500">
                                    Try adjusting your search terms or filters
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredRecordings.map((recording) => {
                        const content = getDisplayContent(recording, selectedLanguage);
                        const needsTranslation = selectedLanguage !== 'en' && !translations[`${recording.id}-${selectedLanguage}`];
                        const isCurrentlyTranslating = translatingRecording === recording.id;
                        
                        return (
                            <Card key={recording.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-all duration-200 group">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CardTitle className="text-slate-100 group-hover:text-cyan-300 transition-colors">
                                                    {content.title}
                                                </CardTitle>
                                                {selectedLanguage !== 'en' && (
                                                    <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-300 border-blue-500/20">
                                                        <Globe className="h-3 w-3 mr-1" />
                                                        {supportedLanguages[selectedLanguage]}
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <Clock className="h-4 w-4" />
                                                {formatDate(recording.recorded_at)} • {formatDuration(recording.recorded_at)}
                                            </CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {needsTranslation && (
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    onClick={() => handleTranslateRecording(recording.id, selectedLanguage)}
                                                    disabled={isCurrentlyTranslating}
                                                    className="border-purple-500/50 text-purple-300 hover:bg-purple-500/10"
                                                >
                                                    {isCurrentlyTranslating ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400 mr-1"></div>
                                                            Translating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Languages className="h-3 w-3 mr-1" />
                                                            Translate
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                            <Button 
                                                size="sm" 
                                                className="bg-cyan-600 hover:bg-cyan-500 text-white"
                                                asChild
                                            >
                                                <a href={recording.video_url} target="_blank" rel="noopener noreferrer">
                                                    <Play className="h-4 w-4 mr-2" />
                                                    Watch
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                            
                                <CardContent className="space-y-4">
                                    {content.description && (
                                        <div>
                                            <p className="text-sm text-slate-300 leading-relaxed">
                                                {content.description}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {content.summary && (
                                        <div className="bg-slate-700/50 rounded-lg p-3">
                                            <h4 className="text-sm font-medium text-slate-200 mb-2 flex items-center gap-2">
                                                <Brain className="h-4 w-4 text-purple-400" />
                                                Key Concepts
                                            </h4>
                                            <p className="text-sm text-slate-300 leading-relaxed">
                                                {content.summary}
                                            </p>
                                        </div>
                                    )}
                                    
                                    {content.topics && content.topics.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-200 mb-2">
                                                Topics Covered
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {content.topics.map((topic, index) => (
                                                    <Badge 
                                                        key={index} 
                                                        variant="secondary" 
                                                        className="text-xs bg-cyan-500/10 text-cyan-300 border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer transition-colors"
                                                        onClick={() => setSearchQuery(topic)}
                                                    >
                                                        {topic}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {needsTranslation && !isCurrentlyTranslating && (
                                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                            <p className="text-xs text-amber-300 flex items-center gap-2">
                                                <Languages className="h-3 w-3" />
                                                This content is in English. Click "Translate" to view it in {supportedLanguages[selectedLanguage]}.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};