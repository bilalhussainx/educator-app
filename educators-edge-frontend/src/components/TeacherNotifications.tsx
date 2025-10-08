// Simple notification component for teachers to see and respond to session requests
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
    Bell,
    Check,
    X
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

interface SessionRequest {
    id: string;
    student_id: string;
    session_type: string;
    description: string;
    status: string;
    created_at: string;
    student_username: string;
    student_display_name: string;
}

interface TeacherNotificationsProps {
    className?: string;
}

const TeacherNotifications: React.FC<TeacherNotificationsProps> = ({ className }) => {
    console.log('TeacherNotifications: Component rendered');
    const [requests, setRequests] = useState<SessionRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAll, setShowAll] = useState(false);

    useEffect(() => {
        console.log('TeacherNotifications: useEffect running, calling fetchRequests...');
        fetchRequests();
        // Poll for new requests every 30 seconds
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchRequests = async () => {
        try {
            console.log('TeacherNotifications: Fetching session requests...');
            const response = await apiClient.get('/api/sessions/requests?type=incoming');
            console.log('TeacherNotifications: Full API response:', response);
            console.log('TeacherNotifications: API response status:', response.status);
            console.log('TeacherNotifications: API response data:', response.data);
            if (response.data.success) {
                setRequests(response.data.requests || []);
                console.log('TeacherNotifications: Set requests:', response.data.requests || []);
            } else {
                console.warn('TeacherNotifications: API returned success=false:', response.data);
            }
        } catch (error) {
            console.error('TeacherNotifications: Failed to fetch session requests:', error);
            console.error('TeacherNotifications: Error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
        } finally {
            setLoading(false);
        }
    };

    const respondToRequest = async (requestId: string, action: 'accept' | 'decline') => {
        try {
            const response = await apiClient.post(`/api/sessions/requests/${requestId}/respond`, {
                action
            });

            if (response.data.success) {
                toast.success(`Session request ${action}ed successfully!`);
                fetchRequests(); // Refresh the list
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || `Failed to ${action} session request`);
        }
    };

    const pendingRequests = requests.filter(req => req.status === 'pending');
    const displayRequests = showAll ? requests : pendingRequests.slice(0, 3);

    if (loading) {
        return (
            <Card className={cn("bg-slate-900/40 border-slate-700", className)}>
                <CardContent className="p-6">
                    <div className="text-center text-slate-400">Loading...</div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn("bg-slate-900/40 border-slate-700", className)}>
            <CardHeader className="pb-3">
                <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Session Requests
                    {pendingRequests.length > 0 && (
                        <Badge className="bg-red-500/20 text-red-300 ml-auto">
                            {pendingRequests.length} pending
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-3">
                {displayRequests.length === 0 ? (
                    <div className="text-center text-slate-400 py-6">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No session requests</p>
                    </div>
                ) : (
                    <>
                        {displayRequests.map(request => (
                            <div 
                                key={request.id} 
                                className={cn(
                                    "p-3 rounded-lg border transition-all",
                                    request.status === 'pending' 
                                        ? "bg-blue-900/20 border-blue-500/30" 
                                        : "bg-slate-800/50 border-slate-600"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-slate-700 text-white text-xs">
                                            {request.student_display_name?.charAt(0) || request.student_username?.charAt(0) || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="text-sm font-medium text-white truncate">
                                                {request.student_display_name || request.student_username}
                                            </h4>
                                            <Badge 
                                                className={cn(
                                                    "text-xs",
                                                    request.status === 'pending' && "bg-yellow-500/20 text-yellow-300",
                                                    request.status === 'accepted' && "bg-green-500/20 text-green-300",
                                                    request.status === 'declined' && "bg-red-500/20 text-red-300"
                                                )}
                                            >
                                                {request.status}
                                            </Badge>
                                        </div>
                                        
                                        <p className="text-xs text-slate-400 mb-1">
                                            {request.session_type} • {new Date(request.created_at).toLocaleDateString()}
                                        </p>
                                        
                                        <p className="text-sm text-slate-300 line-clamp-2 mb-2">
                                            {request.description}
                                        </p>
                                        
                                        {request.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button 
                                                    size="sm"
                                                    onClick={() => respondToRequest(request.id, 'accept')}
                                                    className="bg-green-600 hover:bg-green-500 text-white h-7 px-3 text-xs"
                                                >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Accept
                                                </Button>
                                                <Button 
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => respondToRequest(request.id, 'decline')}
                                                    className="border-slate-600 hover:bg-slate-700 h-7 px-3 text-xs"
                                                >
                                                    <X className="h-3 w-3 mr-1" />
                                                    Decline
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {requests.length > 3 && !showAll && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowAll(true)}
                                className="w-full text-slate-400 hover:text-white"
                            >
                                View all {requests.length} requests
                            </Button>
                        )}
                        
                        {showAll && requests.length > 3 && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowAll(false)}
                                className="w-full text-slate-400 hover:text-white"
                            >
                                Show less
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default TeacherNotifications;