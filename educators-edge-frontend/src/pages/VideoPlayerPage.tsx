// src/pages/VideoPlayerPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

interface VideoData {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    recorded_at: string;
    processing_status?: string;
    ai_summary?: string;
    ai_topics?: string[];
    transcript?: string;
}

const VideoPlayerPage: React.FC = () => {
    const { recordingId } = useParams<{ recordingId: string }>();
    const [searchParams] = useSearchParams();
    const courseId = searchParams.get('courseId');
    const navigate = useNavigate();
    const [videoData, setVideoData] = useState<VideoData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showTranscript, setShowTranscript] = useState(false);

    useEffect(() => {
        const fetchVideo = async () => {
            if (!recordingId) return;
            setIsLoading(true);
            try {
                const res = await apiClient.get(`/api/recordings/${recordingId}`);
                setVideoData(res.data);
                setError(null);
            } catch (error) {
                console.error("Failed to fetch recording", error);
                setError('Failed to load recording. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchVideo();
    }, [recordingId]);

    const handleBack = () => {
        if (courseId) {
            navigate(`/courses/${courseId}/learn`);
        } else {
            navigate('/dashboard');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-96">
                <Card className="p-6 max-w-md">
                    <CardContent className="text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={handleBack} variant="outline">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!videoData) return null;

    return (
        <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <Button onClick={handleBack} variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            {courseId ? 'Back to Course' : 'Back'}
                        </Button>
                        {videoData.processing_status && (
                            <Badge variant={videoData.processing_status === 'completed' ? 'default' : 'secondary'}>
                                {videoData.processing_status}
                            </Badge>
                        )}
                    </div>

                    {/* Video Player */}
                    <Card className="mb-6">
                        <CardContent className="p-0">
                            <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                                <video src={videoData.video_url} controls autoPlay className="w-full h-full">
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recording Information */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <Card>
                                <CardContent className="p-6">
                                    <h1 className="text-2xl font-bold mb-2">{videoData.title}</h1>
                                    <p className="text-gray-600 mb-4">
                                        Recorded on {new Date(videoData.recorded_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                    
                                    {videoData.description && (
                                        <div className="mb-6">
                                            <h3 className="font-semibold mb-2">Description</h3>
                                            <p className="text-gray-700">{videoData.description}</p>
                                        </div>
                                    )}

                                    {videoData.ai_topics && videoData.ai_topics.length > 0 && (
                                        <div className="mb-6">
                                            <h3 className="font-semibold mb-2">Topics Covered</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {videoData.ai_topics.map((topic, index) => (
                                                    <Badge key={index} variant="secondary">
                                                        {topic}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <Card>
                                <CardContent className="p-6">
                                    {videoData.ai_summary && (
                                        <div className="mb-6">
                                            <h3 className="font-semibold mb-2">AI Summary</h3>
                                            <p className="text-gray-700 text-sm leading-relaxed">
                                                {videoData.ai_summary}
                                            </p>
                                        </div>
                                    )}

                                    {videoData.transcript && (
                                        <div>
                                            <Button
                                                onClick={() => setShowTranscript(!showTranscript)}
                                                variant="outline"
                                                size="sm"
                                                className="w-full mb-3"
                                            >
                                                {showTranscript ? 'Hide' : 'Show'} Transcript
                                            </Button>
                                            
                                            {showTranscript && (
                                                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                                                    <p className="text-sm text-gray-700 leading-relaxed">
                                                        {videoData.transcript}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
    );
};

export default VideoPlayerPage;