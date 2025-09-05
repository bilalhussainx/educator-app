// src/components/classroom/VideoManager.tsx
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import apiClient from '../../services/apiClient';
import { toast } from 'sonner';

export interface VideoManagerHandle {
    startRecording: (courseId?: string) => Promise<void>;
    stopRecording: () => Promise<void>;
    recordingStatus: 'idle' | 'recording' | 'processing' | 'completed' | 'failed';
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    isScreenSharing: boolean;
}

interface VideoManagerProps {
    sessionId: string;
    localVideoRef: React.RefObject<HTMLVideoElement>;
    remoteVideoRef: React.RefObject<HTMLVideoElement>; // Simplified for 1-on-1, can be extended for grid view
    onRecordingStatusChange?: (status: 'idle' | 'recording' | 'processing' | 'completed' | 'failed') => void;
    onVideoProcessingUpdate?: (message: string) => void;
}

const VideoManager = forwardRef<VideoManagerHandle, VideoManagerProps>(({ 
    sessionId, 
    localVideoRef, 
    remoteVideoRef, 
    onRecordingStatusChange,
    onVideoProcessingUpdate 
}, ref) => {
    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localTracks = useRef<{ videoTrack: ILocalVideoTrack, audioTrack: ILocalAudioTrack } | null>(null);
    const screenShareTrack = useRef<ILocalVideoTrack | null>(null);
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'processing' | 'completed' | 'failed'>('idle');
    const [recordingData, setRecordingData] = useState<{ sid?: string; resourceId?: string; uid?: string } | null>(null);
    const [isScreenSharing, setIsScreenSharing] = useState(false);

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
            if (isScreenSharing) {
                stopScreenShare().catch(console.error);
            }
            localTracks.current?.videoTrack.close();
            localTracks.current?.audioTrack.close();
            screenShareTrack.current?.close();
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
                const { status } = response.data;
                // videoUrl available but not used in this polling context
                
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

    const startScreenShare = async () => {
        try {
            if (!agoraClient.current || isScreenSharing) {
                console.warn('[SCREEN SHARE] Cannot start - client not ready or already sharing');
                return;
            }

            console.log('[SCREEN SHARE] Starting screen capture with diagnostics...');
            console.log('[SCREEN SHARE] Browser info:', {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height,
                devicePixelRatio: window.devicePixelRatio
            });

            // Create screen share track with detailed logging - trying different configurations
            console.log('[SCREEN SHARE] Attempting to create screen track with custom config...');
            let screenTrackResult;
            
            // Try different encoder configurations in sequence
            const encoderConfigs = [
                {
                    name: "custom_1920x1080_max",
                    config: {
                        encoderConfig: {
                            width: 1920,
                            height: 1080,
                            frameRate: 30,
                            bitrateMax: 10000,
                            bitrateMin: 2000
                        }
                    }
                },
                {
                    name: "1080p_2",
                    config: { encoderConfig: "1080p_2" }
                },
                {
                    name: "1080p_1",
                    config: { encoderConfig: "1080p_1" }
                },
                {
                    name: "720p_1",
                    config: { encoderConfig: "720p_1" }
                },
                {
                    name: "480p_1",
                    config: { encoderConfig: "480p_1" }
                },
                {
                    name: "custom_1920x1080",
                    config: {
                        encoderConfig: {
                            width: 1920,
                            height: 1080,
                            frameRate: 30,
                            bitrateMax: 8000,
                            bitrateMin: 1000
                        }
                    }
                },
                {
                    name: "default",
                    config: {}
                }
            ];
            
            let configUsed = null;
            for (const configOption of encoderConfigs) {
                try {
                    console.log(`[SCREEN SHARE] Trying ${configOption.name}...`);
                    screenTrackResult = await AgoraRTC.createScreenVideoTrack(configOption.config);
                    configUsed = configOption.name;
                    console.log(`[SCREEN SHARE] Successfully created with ${configOption.name}`);
                    break;
                } catch (error) {
                    console.warn(`[SCREEN SHARE] ${configOption.name} failed:`, error);
                    continue;
                }
            }
            
            if (!screenTrackResult) {
                throw new Error('All encoder configurations failed');
            }
            
            console.log(`[SCREEN SHARE] Final config used: ${configUsed}`);
            
            console.log('[SCREEN SHARE] Screen track created:', {
                isArray: Array.isArray(screenTrackResult),
                type: typeof screenTrackResult,
                trackResult: screenTrackResult
            });
            
            // Handle both single track and array of tracks
            const screenTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
            screenShareTrack.current = screenTrack;
            
            // Log track properties for diagnostics
            console.log('[SCREEN SHARE] Track properties:', {
                trackType: screenTrack.trackMediaType,
                enabled: screenTrack.enabled,
                muted: screenTrack.muted,
                // @ts-ignore - accessing video track specific properties
                videoWidth: screenTrack.getVideoTrack?.()?.getSettings?.()?.width,
                // @ts-ignore
                videoHeight: screenTrack.getVideoTrack?.()?.getSettings?.()?.height,
                // @ts-ignore
                displaySurface: screenTrack.getVideoTrack?.()?.getSettings?.()?.displaySurface,
                // @ts-ignore
                cursor: screenTrack.getVideoTrack?.()?.getSettings?.()?.cursor
            });
            
            // CRITICAL FIX: Unpublish ALL video tracks before publishing screen share
            try {
                // Get currently published tracks
                const publishedTracks = agoraClient.current.localTracks;
                const videoTracks = publishedTracks.filter(track => track.trackMediaType === 'video');
                
                if (videoTracks.length > 0) {
                    console.log(`[SCREEN SHARE] Unpublishing ${videoTracks.length} existing video tracks before screen share`);
                    await agoraClient.current.unpublish(videoTracks);
                    console.log('[SCREEN SHARE] Successfully unpublished existing video tracks');
                }
            } catch (unpublishError) {
                console.warn('[SCREEN SHARE] Error unpublishing existing tracks:', unpublishError);
                // Continue anyway - the screen share publish might still work
            }
            
            // Wait a moment for the unpublish to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            console.log('[SCREEN SHARE] Publishing screen share track');
            console.log('[SCREEN SHARE] Publishing track with config:', {
                trackMediaType: screenTrack.trackMediaType,
                enabled: screenTrack.enabled,
                // Log the actual video element dimensions if available
                localVideoElement: localVideoRef.current ? {
                    videoWidth: localVideoRef.current.videoWidth,
                    videoHeight: localVideoRef.current.videoHeight,
                    clientWidth: localVideoRef.current.clientWidth,
                    clientHeight: localVideoRef.current.clientHeight
                } : 'not available'
            });
            
            await agoraClient.current.publish(screenTrack);
            
            console.log('[SCREEN SHARE] Track published successfully');
            
            // Play screen share in local video element
            if (localVideoRef.current) {
                await screenTrack.play(localVideoRef.current);
                
                // Add a delay to allow video to start playing, then log dimensions
                setTimeout(() => {
                    console.log('[SCREEN SHARE] Video element after play:', {
                        videoWidth: localVideoRef.current?.videoWidth,
                        videoHeight: localVideoRef.current?.videoHeight,
                        clientWidth: localVideoRef.current?.clientWidth,
                        clientHeight: localVideoRef.current?.clientHeight,
                        offsetWidth: localVideoRef.current?.offsetWidth,
                        offsetHeight: localVideoRef.current?.offsetHeight,
                        style: {
                            width: localVideoRef.current?.style.width,
                            height: localVideoRef.current?.style.height,
                            objectFit: localVideoRef.current?.style.objectFit
                        }
                    });
                    
                    // Also log the actual MediaStreamTrack settings
                    const videoTrack = screenTrack.getMediaStreamTrack();
                    if (videoTrack) {
                        const settings = videoTrack.getSettings();
                        console.log('[SCREEN SHARE] MediaStreamTrack settings:', settings);
                    }
                }, 1000);
            }
            
            setIsScreenSharing(true);
            toast.success('Screen sharing started');
            
            // Handle screen share ending (user clicks browser stop sharing)
            screenTrack.on('track-ended', async () => {
                await stopScreenShare();
            });
            
        } catch (error) {
            console.error('Failed to start screen sharing:', error);
            toast.error('Failed to start screen sharing. Please check permissions.');
        }
    };

    const stopScreenShare = async () => {
        try {
            if (!agoraClient.current || !isScreenSharing || !screenShareTrack.current) {
                return;
            }

            // Unpublish screen track
            await agoraClient.current.unpublish(screenShareTrack.current);
            screenShareTrack.current.close();
            screenShareTrack.current = null;
            
            // Republish camera track
            if (localTracks.current?.videoTrack) {
                await agoraClient.current.publish(localTracks.current.videoTrack);
                if (localVideoRef.current) {
                    localTracks.current.videoTrack.play(localVideoRef.current);
                }
            }
            
            setIsScreenSharing(false);
            toast.success('Screen sharing stopped');
            
        } catch (error) {
            console.error('Failed to stop screen sharing:', error);
            toast.error('Failed to stop screen sharing');
        }
    };

    // Expose recording methods through ref
    useImperativeHandle(ref, () => ({
        startRecording,
        stopRecording,
        recordingStatus,
        startScreenShare,
        stopScreenShare,
        isScreenSharing
    }), [recordingStatus, isScreenSharing]);

    return null; // This is a manager component, it has no UI of its own
});

VideoManager.displayName = 'VideoManager';
export default VideoManager;