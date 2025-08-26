// src/components/classroom/VideoManager.tsx
import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IRemoteVideoTrack, IRemoteAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import apiClient from '../../services/apiClient';

interface VideoManagerProps {
    sessionId: string;
    localVideoRef: React.RefObject<HTMLVideoElement>;
    remoteVideoRef: React.RefObject<HTMLVideoElement>; // Simplified for 1-on-1, can be extended for grid view
}

const VideoManager: React.FC<VideoManagerProps> = ({ sessionId, localVideoRef, remoteVideoRef }) => {
    const agoraClient = useRef<IAgoraRTCClient | null>(null);
    const localTracks = useRef<{ videoTrack: ILocalVideoTrack, audioTrack: ILocalAudioTrack } | null>(null);

    useEffect(() => {
        // Initialize Agora Client
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClient.current = client;

        const joinChannel = async () => {
            try {
                // Fetch the token from your new secure backend endpoint
                const response = await apiClient.get(`/api/sessions/${sessionId}/generate-token`);
                const { token, uid, appId } = response.data;

                // Join the channel
                await client.join(appId, sessionId, token, uid);

                // Create and publish local video and audio tracks
                const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
                localTracks.current = { videoTrack, audioTrack };
                
                if (localVideoRef.current) {
                    videoTrack.play(localVideoRef.current);
                }
                
                await client.publish([audioTrack, videoTrack]);
                console.log("Local user published successfully.");

            } catch (error) {
                console.error("Failed to join Agora channel:", error);
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
            localTracks.current?.videoTrack.close();
            localTracks.current?.audioTrack.close();
            client.leave();
        };
    }, [sessionId]);

    return null; // This is a manager component, it has no UI of its own
};

export default VideoManager;