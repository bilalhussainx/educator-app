// src/components/classroom/VideoManager.tsx
import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import apiClient from '../../services/apiClient';
import { toast } from 'sonner';

interface VideoManagerProps {
    sessionId: string;
    localVideoRef: React.RefObject<HTMLVideoElement>;
    remoteVideoRef: React.RefObject<HTMLVideoElement>; // Simplified for 1-on-1, can be extended for grid view
    onRecordingStatusChange?: (status: 'idle' | 'recording' | 'processing' | 'completed' | 'failed') => void;
    onVideoProcessingUpdate?: (message: string) => void;
}

const VideoManager: React.FC<VideoManagerProps> = ({ 
    sessionId, 
    localVideoRef, 
    remoteVideoRef, 
    onRecordingStatusChange,
    onVideoProcessingUpdate 
}) => {
    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localTracks = useRef<{ videoTrack: ILocalVideoTrack, audioTrack: ILocalAudioTrack } | null>(null);
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'processing' | 'completed' | 'failed'>('idle');
    const [recordingData, setRecordingData] = useState<{ sid?: string; resourceId?: string; uid?: string } | null>(null);

    useEffect(() => {
        // Initialize Agora Client
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClient.current = client;

        const joinChannel = async () => {
            try {
                onVideoProcessingUpdate?.('Connecting to video session...');
                
                // Fetch the token from your new secure backend endpoint
                const response = await apiClient.get(`/api/sessions/${sessionId}/generate-token`);
                const { token, uid, appId } = response.data;

                onVideoProcessingUpdate?.('Joining video channel...');
                // Join the channel
                await client.join(appId, sessionId, token, uid);

                onVideoProcessingUpdate?.('Setting up camera and microphone...');
                // Create and publish local video and audio tracks
                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracks.current = { videoTrack, audioTrack };
                
                if (localVideoRef.current) {
                    videoTrack.play(localVideoRef.current);
                }
                
                await client.publish([audioTrack, videoTrack]);
                console.log("Local user published successfully.");
                onVideoProcessingUpdate?.('Connected successfully!');
                
                setTimeout(() => onVideoProcessingUpdate?.(''), 2000);

            } catch (error) {
                console.error("Failed to join Agora channel:", error);
                toast.error('Failed to join video session. Please check your camera and microphone permissions.');
                onVideoProcessingUpdate?.('Failed to connect to video session');
            }
        };

        joinChannel();

        // --- Event Listeners for Remote Users ---
        client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
            await client.subscribe(user, mediaType);
            console.log(`Subscribed to ${user.uid}'s ${mediaType} track.`);

            if (mediaType === 'video' && user.videoTrack && remoteVideoRef.current) {
                user.videoTrack.play(remoteVideoRef.current);
            }
            if (mediaType === 'audio' && user.audioTrack) {
                user.audioTrack.play();
            }
        });

        client.on('user-unpublished', (user: IAgoraRTCRemoteUser) => {
            console.log(`${user.uid} has unpublished their media.`);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null; // Clear the remote video
            }
        });

        // Cleanup on unmount
        return () => {
            if (recordingStatus === 'recording') {
                stopRecording().catch(console.error);
            }
            localTracks.current?.videoTrack.close();
            localTracks.current?.audioTrack.close();
            client.leave();
        };
    }, [sessionId]);

    const startRecording = async (courseId?: string) => {
        try {
            setRecordingStatus('recording');
            onRecordingStatusChange?.('recording');
            onVideoProcessingUpdate?.('Starting video recording...');
            
            const response = await apiClient.post(`/api/recordings/start`, {
                sessionId,
                courseId
            });
            
            const { sid, resourceId, uid } = response.data;
            setRecordingData({ sid, resourceId, uid });
            
            toast.success('Recording started successfully');
            onVideoProcessingUpdate?.('Recording in progress...');
            
        } catch (error: any) {
            console.error('Failed to start recording:', error);
            setRecordingStatus('failed');
            onRecordingStatusChange?.('failed');
            
            const errorMessage = error.response?.data?.error || 'Failed to start recording';
            toast.error(errorMessage);
            onVideoProcessingUpdate?.('Recording failed to start');
        }
    };

    const stopRecording = async () => {
        try {
            if (!recordingData) {
                throw new Error('No recording data found');
            }
            
            setRecordingStatus('processing');
            onRecordingStatusChange?.('processing');
            onVideoProcessingUpdate?.('Stopping recording and processing video...');
            
            const response = await apiClient.post(`/api/recordings/stop`, {
                sessionId,
                ...recordingData
            });
            
            toast.success('Recording stopped. Processing video...');
            onVideoProcessingUpdate?.('Video is being processed and saved to storage...');
            
            // Poll for processing completion
            pollRecordingStatus(response.data.recordingId);
            
        } catch (error: any) {
            console.error('Failed to stop recording:', error);
            setRecordingStatus('failed');
            onRecordingStatusChange?.('failed');
            
            const errorMessage = error.response?.data?.error || 'Failed to stop recording';
            toast.error(errorMessage);
            onVideoProcessingUpdate?.('Failed to stop recording');
        }
    };

    const pollRecordingStatus = async (recordingId: string) => {
        const maxAttempts = 30; // 5 minutes with 10-second intervals
        let attempts = 0;
        
        const poll = async () => {
            try {
                attempts++;
                const response = await apiClient.get(`/api/recordings/${recordingId}/status`);
                const { status, videoUrl } = response.data;
                
                onVideoProcessingUpdate?.(`Processing... (${Math.round((attempts / maxAttempts) * 100)}%)`);
                
                if (status === 'completed') {
                    setRecordingStatus('completed');
                    onRecordingStatusChange?.('completed');
                    toast.success('Video recording processed and saved successfully!');
                    onVideoProcessingUpdate?.('Video saved successfully!');
                    
                    setTimeout(() => onVideoProcessingUpdate?.(''), 3000);
                    return;
                }
                
                if (status === 'failed') {
                    setRecordingStatus('failed');
                    onRecordingStatusChange?.('failed');
                    toast.error('Video processing failed. Please try again.');
                    onVideoProcessingUpdate?.('Video processing failed');
                    return;
                }
                
                if (attempts < maxAttempts) {
                    setTimeout(poll, 10000); // Poll every 10 seconds
                } else {
                    setRecordingStatus('failed');
                    onRecordingStatusChange?.('failed');
                    toast.error('Video processing is taking longer than expected. Please check back later.');
                    onVideoProcessingUpdate?.('Processing timeout - please check back later');
                }
                
            } catch (error) {
                console.error('Error polling recording status:', error);
                if (attempts < maxAttempts) {
                    setTimeout(poll, 10000);
                } else {
                    setRecordingStatus('failed');
                    onRecordingStatusChange?.('failed');
                    toast.error('Unable to check video processing status');
                    onVideoProcessingUpdate?.('Unable to check processing status');
                }
            }
        };
        
        poll();
    };

    // Expose recording methods
    React.useImperativeHandle(ref => ({
        startRecording,
        stopRecording,
        recordingStatus
    }), [recordingStatus, recordingData]);

    return null; // This is a manager component, it has no UI of its own
};

export default VideoManager;