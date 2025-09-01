// src/pages/VideoPlayerPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface VideoData {
    id: string;
    title: string;
    description: string | null;
    video_url: string;
    recorded_at: string;
}

const VideoPlayerPage: React.FC = () => {
    const { videoId } = useParams<{ videoId: string }>();
    const navigate = useNavigate();
    const [videoData, setVideoData] = useState<VideoData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchVideo = async () => {
            if (!videoId) return;
            setIsLoading(true);
            try {
                const res = await apiClient.get(`/api/videos/${videoId}`);
                setVideoData(res.data);
            } catch (error) {
                console.error("Failed to fetch video", error);
                navigate(-1); // Go back if video not found
            } finally {
                setIsLoading(false);
            }
        };
        fetchVideo();
    }, [videoId, navigate]);

    if (isLoading) {
        return (
            <div className="p-8">
                <Skeleton className="h-12 w-1/4 mb-4" />
                <Skeleton className="aspect-video w-full mb-4" />
                <Skeleton className="h-6 w-3/4" />
            </div>
        );
    }

    if (!videoData) return null;

    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <div className="aspect-video w-full mb-4 bg-black rounded-lg overflow-hidden">
                <video src={videoData.video_url} controls autoPlay className="w-full h-full">
                    Your browser does not support the video tag.
                </video>
            </div>
            <h1 className="text-3xl font-bold tracking-tighter">{videoData.title}</h1>
            <p className="text-sm text-slate-400 mt-1">
                Recorded on {new Date(videoData.recorded_at).toLocaleDateString()}
            </p>
            {videoData.description && <p className="mt-4 text-slate-300">{videoData.description}</p>}
        </div>
    );
};

export default VideoPlayerPage;