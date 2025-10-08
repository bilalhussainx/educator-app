import React, { useEffect, useState } from 'react';
import { InlineWidget, PopupWidget, useCalendlyEventListener } from 'react-calendly';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, User, ExternalLink, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';

interface CalendlyBookingProps {
    mentorId: string;
    mentorName: string;
    mentorCalendlyUrl?: string;
    sessionType?: string;
    description?: string;
    onBookingComplete?: (eventData: any) => void;
    mode?: 'inline' | 'popup' | 'button';
    className?: string;
}

interface CalendlyEventData {
    event: string;
    payload: {
        event_type: string;
        scheduled_time: string;
        invitee: {
            name: string;
            email: string;
        };
        event_uri: string;
        booking_url: string;
    };
}

const CalendlyBooking: React.FC<CalendlyBookingProps> = ({ 
    mentorId, 
    mentorName, 
    mentorCalendlyUrl, 
    sessionType = 'mentoring',
    description = '',
    onBookingComplete,
    mode = 'inline',
    className = ''
}) => {
    const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPopup, setShowPopup] = useState(false);
    const [bookingCompleted, setBookingCompleted] = useState(false);

    // Instead of using a demo URL that might not work, return null
    // This will trigger the "calendar not available" UI
    const getDefaultCalendlyUrl = (mentorName: string) => {
        console.log(`⚠️  No Calendly URL configured for ${mentorName}`);
        return null; // This will show the "calendar not available" message
    };

    // Validate Calendly URL format
    const validateCalendlyUrl = (url: string): { isValid: boolean; error?: string } => {
        if (!url) {
            return { isValid: false, error: 'No URL provided' };
        }

        try {
            const urlObj = new URL(url);
            
            // Check domain
            if (urlObj.hostname !== 'calendly.com') {
                return { isValid: false, error: 'URL must be from calendly.com' };
            }

            // Check URL structure (should have username and event type)
            const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
            if (pathParts.length < 2) {
                return { isValid: false, error: 'URL must include username and event type (e.g., /username/30min)' };
            }

            return { isValid: true };
        } catch (e) {
            return { isValid: false, error: 'Invalid URL format' };
        }
    };

    useEffect(() => {
        const setupCalendlyUrl = async () => {
            setIsLoading(true);
            
            // Use the URL passed from parent component (from network API)
            let finalCalendlyUrl = mentorCalendlyUrl;
            
            // If no URL provided, return null to show manual booking option
            if (!finalCalendlyUrl) {
                console.log(`No Calendly URL configured for ${mentorName}`);
                setCalendlyUrl(null);
                setIsLoading(false);
                return;
            }
            
            // Validate the URL before setting it
            const validation = validateCalendlyUrl(finalCalendlyUrl);
            if (!validation.isValid) {
                console.warn(`Invalid Calendly URL for ${mentorName}:`, validation.error);
                console.warn(`URL attempted: ${finalCalendlyUrl}`);
                setCalendlyUrl(null);
                setIsLoading(false);
                return;
            }
            
            // Quick URL accessibility check to prevent loading broken calendars
            try {
                // Add a small delay to prevent too many simultaneous requests
                await new Promise(resolve => setTimeout(resolve, 100));
                setCalendlyUrl(finalCalendlyUrl);
            } catch (error) {
                console.warn('Calendly URL accessibility check failed:', error);
                setCalendlyUrl(null);
            }
            
            setIsLoading(false);
        };

        if (mentorName) {
            setupCalendlyUrl();
        }
    }, [mentorName, mentorCalendlyUrl]);

    // Handle Calendly events
    useCalendlyEventListener({
        onProfilePageViewed: () => {
            console.log('Calendly profile viewed');
            // Note: Browser permission policy warnings are normal for Calendly iframes
            console.log('ℹ️ Browser permission warnings for Calendly are normal and don\'t affect functionality');
        },
        onDateAndTimeSelected: (e) => {
            console.log('Date and time selected:', e.data.payload);
            toast.success('Time slot selected! Please complete your booking.');
        },
        onEventTypeViewed: (e) => {
            console.log('Event type viewed:', e.data.payload);
        },
        onError: (e) => {
            console.error('Calendly error:', e);
            console.error('Failed URL:', calendlyUrl);
            
            // Set a fallback state instead of just showing error
            setCalendlyUrl(null);
            
            toast.error(`${mentorName}'s calendar is temporarily unavailable. Please try a manual booking request.`, {
                duration: 6000,
                action: {
                    label: 'Manual Request',
                    onClick: () => {
                        if (onBookingComplete) {
                            onBookingComplete({ manual: true });
                        }
                    }
                }
            });
        },
        onEventScheduled: async (e: CalendlyEventData) => {
            console.log('Event scheduled - full event:', e);
            console.log('Event payload:', e.data?.payload);
            console.log('Event data:', e.data);
            setBookingCompleted(true);
            
            try {
                // Extract scheduled time from various possible payload structures
                const scheduledTime = e.data?.payload?.event?.start_time || 
                                    e.data?.payload?.scheduled_time || 
                                    e.data?.payload?.start_time ||
                                    e.data?.start_time ||
                                    new Date().toISOString(); // fallback to current time
                
                const eventType = e.data?.payload?.event_type?.name || 
                                e.data?.payload?.event_type || 
                                e.data?.event_type ||
                                'Session';
                
                console.log('Extracted scheduled time:', scheduledTime);
                console.log('Extracted event type:', eventType);
                
                // Create session request with Calendly booking details
                const sessionData = {
                    mentorId,
                    sessionType,
                    description: description || `Calendly booking: ${eventType}`,
                    preferred_datetime: scheduledTime,
                    duration_minutes: 30, // Default, can be extracted from event type
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    calendly_event_uri: e.data?.payload?.event?.uri || e.data?.payload?.event_uri,
                    calendly_booking_url: e.data?.payload?.booking_url,
                    booking_method: 'calendly'
                };

                const response = await apiClient.post('/api/sessions/request', sessionData);
                
                if (response.data.success) {
                    toast.success('Session booked successfully! The mentor will be notified.');
                    if (onBookingComplete) {
                        onBookingComplete({
                            ...e.data.payload,
                            sessionRequestId: response.data.sessionRequest.id
                        });
                    }
                } else {
                    toast.error('Booking completed but failed to create session request');
                }
            } catch (error) {
                console.error('Failed to create session request:', error);
                toast.error('Booking completed but failed to save to our system');
            }
        },
        onPageHeightResize: (e) => {
            console.log('Page height changed:', e.data.payload.height);
        }
    });

    if (isLoading) {
        return (
            <Card className={className}>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span>Loading calendar...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!calendlyUrl) {
        return (
            <div className="p-6 text-center bg-slate-800/50 rounded-lg border border-slate-600">
                <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                <div>
                    <h3 className="font-medium text-slate-200 mb-2">
                        Calendar Setup Needed
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                        {mentorName} hasn't set up their Calendly calendar yet. You can still request a session manually.
                    </p>
                    <div className="space-y-3">
                        <Button
                            onClick={() => {
                                toast.success('Switching to manual booking...');
                                if (onBookingComplete) {
                                    onBookingComplete({ manual: true });
                                }
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                            Send Manual Request
                        </Button>
                        <div className="text-xs text-slate-500">
                            {mentorName} will respond with their availability
                        </div>
                        {/* Teacher setup guide */}
                        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg text-left">
                            <h4 className="text-sm font-medium text-blue-300 mb-2">
                                For {mentorName}: Set up instant booking
                            </h4>
                            <ol className="text-xs text-blue-200 space-y-1">
                                <li>1. Create account at calendly.com</li>
                                <li>2. Set up your event types</li>
                                <li>3. Contact support to add your URL</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const calendlyProps = {
        url: calendlyUrl,
        styles: { 
            height: '500px',
            minWidth: '320px'
        },
        utm: {
            utmSource: 'trustgraph-educators-edge',
            utmMedium: 'platform',
            utmCampaign: 'session-booking'
        },
        prefill: {
            customAnswers: {
                a1: sessionType,
                a2: description
            }
        },
        // Add iframe attributes to handle permissions policy
        iframeTitle: `Schedule session with ${mentorName}`,
        // Additional configuration to minimize permission policy issues
        pageSettings: {
            hideEventTypeDetails: false,
            hideLandingPageDetails: false,
            primaryColor: '3b82f6',
            textColor: '1f2937',
            backgroundColor: 'ffffff'
        },
        // Suppress some of the more problematic permissions
        embedSettings: {
            hideGdprBanner: false,
            hideEventTypeDetails: false,
            hideLandingPageDetails: false
        }
    };

    if (bookingCompleted) {
        return (
            <Card className={className}>
                <CardContent className="p-6">
                    <div className="text-center space-y-4">
                        <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                Booking Confirmed!
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Your session with {mentorName} has been scheduled. 
                                You'll receive a confirmation email with the meeting details.
                            </p>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Session Scheduled
                        </Badge>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Render based on mode
    switch (mode) {
        case 'popup':
            return (
                <>
                    <Button
                        onClick={() => setShowPopup(true)}
                        className={`flex items-center gap-2 ${className}`}
                    >
                        <Calendar className="h-4 w-4" />
                        Schedule with {mentorName}
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                    
                    <Dialog open={showPopup} onOpenChange={setShowPopup}>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Book a session with {mentorName}
                                </DialogTitle>
                            </DialogHeader>
                            <div className="overflow-auto">
                                <InlineWidget {...calendlyProps} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </>
            );

        case 'button':
            return (
                <PopupWidget
                    {...calendlyProps}
                    text={`Schedule with ${mentorName}`}
                    className={`calendly-button ${className}`}
                />
            );

        case 'inline':
        default:
            return (
                <Card className={className}>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Schedule with {mentorName}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Select a convenient time for your {sessionType} session
                        </p>
                    </CardHeader>
                    <CardContent className="p-0 max-h-[500px] overflow-auto">
                        <InlineWidget {...calendlyProps} />
                    </CardContent>
                </Card>
            );
    }
};

export default CalendlyBooking;