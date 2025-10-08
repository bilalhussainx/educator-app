import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Users,
  Maximize2,
  Minimize2,
  PhoneOff,
  Settings,
  Hand,
  MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Import Agora SDK
import AgoraRTC, {
  IAgoraRTCClient,
  ILocalVideoTrack,
  ILocalAudioTrack,
  IAgoraRTCRemoteUser
} from 'agora-rtc-sdk-ng';

interface Student {
  id: string;
  username: string;
}

interface EssayVideoPanelProps {
  sessionId: string;
  userId: string;
  username: string;
  userRole: 'teacher' | 'student';
  students: Student[];
  handsRaised?: Set<string>;
  onHandRaise?: () => void;
  sendWsMessage?: (type: string, payload: any) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const EssayVideoPanel: React.FC<EssayVideoPanelProps> = ({
  sessionId,
  userId,
  username,
  userRole,
  students,
  handsRaised = new Set(),
  onHandRaise,
  sendWsMessage,
  isVisible,
  onToggleVisibility
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localVideoTrackRef = useRef<ILocalVideoTrack | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize Agora client
  useEffect(() => {
    clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    clientRef.current.on('user-published', async (user, mediaType) => {
      await clientRef.current!.subscribe(user, mediaType);
      console.log('User published:', user, mediaType);

      if (mediaType === 'video') {
        setRemoteUsers(prev => {
          const exists = prev.find(u => u.uid === user.uid);
          if (exists) {
            return prev.map(u => u.uid === user.uid ? user : u);
          }
          return [...prev, user];
        });
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    clientRef.current.on('user-unpublished', (user) => {
      console.log('User unpublished:', user);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    clientRef.current.on('user-left', (user) => {
      console.log('User left:', user);
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    return () => {
      handleLeaveSession();
    };
  }, []);

  const handleJoinSession = async () => {
    if (!clientRef.current) return;

    setIsJoining(true);
    try {
      // Generate a simple token for development (in production, get from backend)
      const appId = import.meta.env.VITE_AGORA_APP_ID || '';
      const token = null; // Use null for testing, get from backend in production

      await clientRef.current.join(appId, `essay-session-${sessionId}`, token, userId);
      setIsConnected(true);

      // Notify other participants
      sendWsMessage?.('VIDEO_SESSION_JOINED', {
        userId,
        username,
        userRole,
        sessionId
      });

      toast.success('Joined video session');
    } catch (error) {
      console.error('Failed to join video session:', error);
      toast.error('Failed to join video session');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!clientRef.current) return;

    try {
      // Clean up tracks
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }

      await clientRef.current.leave();
      setIsConnected(false);
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      setRemoteUsers([]);

      sendWsMessage?.('VIDEO_SESSION_LEFT', {
        userId,
        sessionId
      });

      toast.success('Left video session');
    } catch (error) {
      console.error('Failed to leave video session:', error);
    }
  };

  const toggleVideo = async () => {
    if (!clientRef.current || !isConnected) return;

    try {
      if (!isVideoEnabled) {
        localVideoTrackRef.current = await AgoraRTC.createCameraVideoTrack();
        await clientRef.current.publish(localVideoTrackRef.current);

        if (localVideoRef.current) {
          localVideoTrackRef.current.play(localVideoRef.current);
        }

        setIsVideoEnabled(true);
        toast.success('Camera enabled');
      } else {
        if (localVideoTrackRef.current) {
          await clientRef.current.unpublish(localVideoTrackRef.current);
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        setIsVideoEnabled(false);
        toast.success('Camera disabled');
      }
    } catch (error) {
      console.error('Failed to toggle video:', error);
      toast.error('Failed to toggle camera');
    }
  };

  const toggleAudio = async () => {
    if (!clientRef.current || !isConnected) return;

    try {
      if (!isAudioEnabled) {
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        await clientRef.current.publish(localAudioTrackRef.current);
        setIsAudioEnabled(true);
        toast.success('Microphone enabled');
      } else {
        if (localAudioTrackRef.current) {
          await clientRef.current.unpublish(localAudioTrackRef.current);
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }
        setIsAudioEnabled(false);
        toast.success('Microphone disabled');
      }
    } catch (error) {
      console.error('Failed to toggle audio:', error);
      toast.error('Failed to toggle microphone');
    }
  };

  const VideoParticipant = ({
    user,
    isLocal = false,
    size = "sm"
  }: {
    user?: IAgoraRTCRemoteUser;
    isLocal?: boolean;
    size?: "xs" | "sm" | "md" | "lg";
  }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
      if (isLocal || !videoRef.current || !user?.videoTrack) return;

      user.videoTrack.play(videoRef.current);

      return () => {
        user?.videoTrack?.stop();
      };
    }, [user, isLocal]);

    const participantName = isLocal ? 'You' :
      (students.find(s => String(s.id) === String(user?.uid))?.username || `User ${user?.uid.toString().substring(0, 4)}`);

    const hasVideo = isLocal ? isVideoEnabled : user?.videoTrack;

    const sizeClasses = {
      xs: "h-16 w-20",
      sm: "h-20 w-28",
      md: "h-32 w-40",
      lg: "h-48 w-64"
    };

    return (
      <div className={cn(
        "relative bg-slate-800/50 rounded-md overflow-hidden border border-slate-600/30",
        sizeClasses[size]
      )}>
        {hasVideo ? (
          isLocal ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-700">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-slate-600 text-slate-300 text-sm">
                {participantName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Participant info overlay */}
        <div className="absolute bottom-1 left-1 right-1">
          <div className="bg-black/60 rounded px-2 py-1 flex items-center justify-between">
            <span className="text-xs text-white truncate">{participantName}</span>
            <div className="flex items-center gap-1">
              {handsRaised.has(String(user?.uid || userId)) && (
                <Hand className="h-3 w-3 text-yellow-400" />
              )}
              {!isAudioEnabled && isLocal && (
                <MicOff className="h-3 w-3 text-red-400" />
              )}
              {userRole === 'teacher' && !isLocal && (
                <Badge className="bg-blue-600/20 text-blue-300 text-xs px-1">
                  Student
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isVisible) {
    return (
      <Button
        onClick={onToggleVisibility}
        className="fixed top-4 right-4 bg-blue-600 hover:bg-blue-700 text-white z-50"
        size="sm"
      >
        <Video className="h-4 w-4 mr-2" />
        Video ({isConnected ? remoteUsers.length + 1 : 0})
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed top-4 right-4 bg-slate-900/95 backdrop-blur border-slate-700 z-40 transition-all duration-300",
      isExpanded ? "w-96 h-80" : "w-80 h-48"
    )}>
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-200">Essay Session Video</span>
            <Badge className={cn(
              "text-xs",
              isConnected ? "bg-green-600/20 text-green-300" : "bg-red-600/20 text-red-300"
            )}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
            >
              {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisibility}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-200"
            >
              ×
            </Button>
          </div>
        </div>

        {/* Video grid */}
        <div className={cn(
          "grid gap-2 mb-3",
          isExpanded ? "grid-cols-2" : "grid-cols-1"
        )}>
          {/* Local video */}
          <VideoParticipant
            isLocal={true}
            size={isExpanded ? "md" : "sm"}
          />

          {/* Remote videos */}
          {remoteUsers.slice(0, isExpanded ? 3 : 1).map((user) => (
            <VideoParticipant
              key={user.uid}
              user={user}
              size={isExpanded ? "md" : "sm"}
            />
          ))}

          {/* Show participant count if more users */}
          {remoteUsers.length > (isExpanded ? 3 : 1) && (
            <div className={cn(
              "bg-slate-700/50 rounded-md border border-slate-600/30 flex items-center justify-center",
              isExpanded ? "h-32" : "h-20"
            )}>
              <div className="text-center text-slate-300">
                <Users className="h-6 w-6 mx-auto mb-1" />
                <div className="text-xs">+{remoteUsers.length - (isExpanded ? 3 : 1)} more</div>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {isConnected ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleVideo}
                  className={cn(
                    "h-8 w-8 p-0",
                    isVideoEnabled
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      : "bg-slate-700 hover:bg-slate-600 border-slate-600"
                  )}
                >
                  {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAudio}
                  className={cn(
                    "h-8 w-8 p-0",
                    isAudioEnabled
                      ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                      : "bg-slate-700 hover:bg-slate-600 border-slate-600"
                  )}
                >
                  {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>

                {userRole === 'student' && onHandRaise && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onHandRaise}
                    className={cn(
                      "h-8 w-8 p-0",
                      handsRaised.has(userId)
                        ? "bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-600"
                        : "bg-slate-700 hover:bg-slate-600 border-slate-600"
                    )}
                  >
                    <Hand className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLeaveSession}
                  className="h-8 w-8 p-0 bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button
                onClick={handleJoinSession}
                disabled={isJoining}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {isJoining ? 'Joining...' : 'Join Video'}
              </Button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            {isConnected ? `${remoteUsers.length + 1} participants` : 'Not connected'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};