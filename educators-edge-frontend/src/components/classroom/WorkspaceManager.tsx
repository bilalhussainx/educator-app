import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Users,
    UserCheck,
    Eye,
    EyeOff,
    Monitor,
    UserX,
    Clock,
    MessageCircle,
    Video,
    VolumeX,
    Volume2,
    Settings,
    Plus
} from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    type: 'main' | 'breakout';
    ownerId: string;
    participants: Participant[];
    isActive: boolean;
    createdAt: number;
    lastActivity: number;
    isPrivate: boolean;
    hasWhiteboard: boolean;
    hasVideo: boolean;
    hasAudio: boolean;
}

interface Participant {
    id: string;
    name: string;
    role: 'teacher' | 'student';
    isOnline: boolean;
    lastSeen: number;
    isMonitoring: boolean;
    permissions: {
        canDraw: boolean;
        canVideo: boolean;
        canAudio: boolean;
        canInvite: boolean;
    };
}

interface WorkspaceManagerProps {
    sessionId: string;
    currentUserId: string;
    currentUserName: string;
    currentUserRole: 'teacher' | 'student';
    currentWorkspaceId: string;
    workspaces: Workspace[];
    isVisible: boolean;
    onClose: () => void;
    onWorkspaceSwitch: (workspaceId: string) => void;
    onCreateBreakoutRoom: () => void;
    onJoinWorkspace: (workspaceId: string) => void;
    onLeaveWorkspace: (workspaceId: string) => void;
    onMonitorWorkspace: (workspaceId: string, monitor: boolean) => void;
    onInviteToWorkspace: (workspaceId: string, userId: string) => void;
    onUpdatePermissions: (workspaceId: string, userId: string, permissions: Participant['permissions']) => void;
    onSendMessage: (workspaceId: string, message: string) => void;
    onToggleWhiteboard: (workspaceId: string) => void;
    onToggleVideo: (workspaceId: string) => void;
    onToggleAudio: (workspaceId: string) => void;
}

const WorkspaceManager: React.FC<WorkspaceManagerProps> = ({
    sessionId,
    currentUserId,
    currentUserName,
    currentUserRole,
    currentWorkspaceId,
    workspaces,
    isVisible,
    onClose,
    onWorkspaceSwitch,
    onCreateBreakoutRoom,
    onJoinWorkspace,
    onLeaveWorkspace,
    onMonitorWorkspace,
    onInviteToWorkspace,
    onUpdatePermissions,
    onSendMessage,
    onToggleWhiteboard,
    onToggleVideo,
    onToggleAudio
}) => {
    const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
    const [monitoringWorkspaces, setMonitoringWorkspaces] = useState<Set<string>>(new Set());
    const [newMessage, setNewMessage] = useState('');
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);

    const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);
    const mainWorkspace = workspaces.find(w => w.type === 'main');
    const breakoutRooms = workspaces.filter(w => w.type === 'breakout');

    // Handle monitoring toggle
    const handleMonitorToggle = useCallback((workspaceId: string) => {
        const isCurrentlyMonitoring = monitoringWorkspaces.has(workspaceId);
        setMonitoringWorkspaces(prev => {
            const updated = new Set(prev);
            if (isCurrentlyMonitoring) {
                updated.delete(workspaceId);
            } else {
                updated.add(workspaceId);
            }
            return updated;
        });
        onMonitorWorkspace(workspaceId, !isCurrentlyMonitoring);
    }, [monitoringWorkspaces, onMonitorWorkspace]);

    // Get workspace status badge
    const getWorkspaceStatusBadge = (workspace: Workspace) => {
        const activeParticipants = workspace.participants.filter(p => p.isOnline).length;
        const isCurrentWorkspace = workspace.id === currentWorkspaceId;
        const isMonitoring = monitoringWorkspaces.has(workspace.id);

        return (
            <div className="flex items-center space-x-1">
                {isCurrentWorkspace && (
                    <Badge variant="default" className="bg-green-500">
                        Current
                    </Badge>
                )}
                {isMonitoring && !isCurrentWorkspace && (
                    <Badge variant="outline" className="border-blue-500 text-blue-700">
                        Monitoring
                    </Badge>
                )}
                <Badge variant="outline">
                    {activeParticipants} online
                </Badge>
            </div>
        );
    };

    // Render workspace card
    const renderWorkspaceCard = (workspace: Workspace) => {
        const isCurrentWorkspace = workspace.id === currentWorkspaceId;
        const isMonitoring = monitoringWorkspaces.has(workspace.id);
        const canJoin = !isCurrentWorkspace;
        const canMonitor = currentUserRole === 'teacher' && !isCurrentWorkspace;

        return (
            <Card key={workspace.id} className={`${isCurrentWorkspace ? 'border-green-500 bg-green-50' : ''}`}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div>
                                <CardTitle className="text-lg flex items-center space-x-2">
                                    <span>{workspace.name}</span>
                                    {workspace.type === 'breakout' && (
                                        <Badge variant="outline" className="text-xs">
                                            Breakout
                                        </Badge>
                                    )}
                                </CardTitle>
                                <p className="text-sm text-gray-600">
                                    Created by {workspace.participants.find(p => p.id === workspace.ownerId)?.name || 'Unknown'}
                                </p>
                            </div>
                        </div>
                        {getWorkspaceStatusBadge(workspace)}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Participants */}
                    <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            Participants ({workspace.participants.length})
                        </h4>
                        <div className="space-y-2">
                            {workspace.participants.map(participant => (
                                <div key={participant.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-xs">
                                                {participant.name.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{participant.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {participant.role}
                                        </Badge>
                                        {participant.isOnline ? (
                                            <UserCheck className="h-3 w-3 text-green-500" />
                                        ) : (
                                            <UserX className="h-3 w-3 text-gray-400" />
                                        )}
                                    </div>
                                    {currentUserRole === 'teacher' && participant.id !== currentUserId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedWorkspace(workspace.id);
                                                setShowPermissionsModal(true);
                                            }}
                                        >
                                            <Settings className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Workspace Features */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                            <Monitor className={workspace.hasWhiteboard ? "text-green-500" : "text-gray-400"} />
                            <span>Whiteboard</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            <Video className={workspace.hasVideo ? "text-green-500" : "text-gray-400"} />
                            <span>Video</span>
                        </div>
                        <div className="flex items-center space-x-1">
                            {workspace.hasAudio ? (
                                <Volume2 className="text-green-500" />
                            ) : (
                                <VolumeX className="text-gray-400" />
                            )}
                            <span>Audio</span>
                        </div>
                    </div>

                    {/* Last Activity */}
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                            Last activity: {new Date(workspace.lastActivity).toLocaleTimeString()}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 pt-2">
                        {canJoin && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onJoinWorkspace(workspace.id)}
                            >
                                Join
                            </Button>
                        )}

                        {canMonitor && (
                            <Button
                                variant={isMonitoring ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleMonitorToggle(workspace.id)}
                            >
                                {isMonitoring ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                                {isMonitoring ? 'Stop Monitor' : 'Monitor'}
                            </Button>
                        )}

                        {isCurrentWorkspace && workspace.type === 'breakout' && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onLeaveWorkspace(workspace.id)}
                            >
                                Leave
                            </Button>
                        )}

                        {currentUserRole === 'teacher' && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onToggleWhiteboard(workspace.id)}
                            >
                                <Monitor className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    if (!isVisible) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center space-x-2">
                                <Users className="h-5 w-5" />
                                <span>Workspace Manager</span>
                            </CardTitle>

                            <div className="flex items-center space-x-2">
                                {currentUserRole === 'teacher' && (
                                    <Button
                                        variant="default"
                                        onClick={onCreateBreakoutRoom}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Breakout Room
                                    </Button>
                                )}
                                <Button variant="outline" onClick={onClose}>
                                    ×
                                </Button>
                            </div>
                        </div>

                        <div className="text-sm text-gray-600">
                            Session: {sessionId} | Current: {currentWorkspace?.name || 'Unknown'}
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-auto space-y-6">
                        {/* Main Workspace */}
                        {mainWorkspace && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <Monitor className="h-5 w-5 mr-2" />
                                    Main Session
                                </h3>
                                {renderWorkspaceCard(mainWorkspace)}
                            </div>
                        )}

                        {/* Breakout Rooms */}
                        {breakoutRooms.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <Users className="h-5 w-5 mr-2" />
                                    Breakout Rooms ({breakoutRooms.length})
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    {breakoutRooms.map(renderWorkspaceCard)}
                                </div>
                            </div>
                        )}

                        {breakoutRooms.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No breakout rooms created yet</p>
                                {currentUserRole === 'teacher' && (
                                    <>
                                        <p className="text-sm mb-4">Create a breakout room to allow students to work independently</p>
                                        <Button
                                            onClick={onCreateBreakoutRoom}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create First Breakout Room
                                        </Button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Monitoring Summary */}
                        {monitoringWorkspaces.size > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3 flex items-center">
                                    <Eye className="h-5 w-5 mr-2" />
                                    Currently Monitoring ({monitoringWorkspaces.size})
                                </h3>
                                <div className="grid gap-2">
                                    {Array.from(monitoringWorkspaces).map(workspaceId => {
                                        const workspace = workspaces.find(w => w.id === workspaceId);
                                        if (!workspace) return null;

                                        return (
                                            <div key={workspaceId} className="flex items-center justify-between p-3 bg-blue-50 rounded">
                                                <div className="flex items-center space-x-2">
                                                    <Monitor className="h-4 w-4 text-blue-600" />
                                                    <span className="font-medium">{workspace.name}</span>
                                                    <Badge variant="outline">
                                                        {workspace.participants.filter(p => p.isOnline).length} active
                                                    </Badge>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleMonitorToggle(workspaceId)}
                                                >
                                                    <EyeOff className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Permissions Modal */}
            <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage Permissions</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Manage participant permissions for workspace access and features.
                        </p>
                        {/* Add permission management UI here */}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default WorkspaceManager;
export type { Workspace, Participant };