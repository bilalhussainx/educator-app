import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Calendar,
    Clock,
    DollarSign,
    Zap,
    User,
    MessageSquare,
    CheckCircle,
    ArrowRight,
    Star,
    Award,
    TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../services/apiClient';
import CalendlyBooking from './CalendlyBooking';

interface TeacherProfile {
    id: string;
    username: string;
    display_name: string;
    bio?: string;
    profile_image_url?: string;
    calendly_url?: string;
    session_rate_min_usd?: number;
    session_rate_max_usd?: number;
    session_rate_min_z_credits?: number;
    session_rate_max_z_credits?: number;
    accepts_free_sessions?: boolean;
    default_session_duration?: number;
    average_rating?: number;
    total_reviews?: number;
    total_sessions?: number;
    years_experience?: number;
}

interface EnhancedSessionBookingProps {
    teacher: TeacherProfile;
    onBookingComplete?: (bookingData: any) => void;
    onCancel?: () => void;
}

type BookingStep = 'pricing' | 'calendar' | 'manual' | 'confirmation';
type PaymentMethod = 'usd' | 'z_credits';

const EnhancedSessionBooking: React.FC<EnhancedSessionBookingProps> = ({
    teacher,
    onBookingComplete,
    onCancel
}) => {
    const [currentStep, setCurrentStep] = useState<BookingStep>('pricing');
    const [selectedRate, setSelectedRate] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('usd');
    const [sessionType, setSessionType] = useState<string>('mentoring');
    const [description, setDescription] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingMethod, setBookingMethod] = useState<'calendly' | 'manual'>('calendly');

    // Initialize selected rate to middle of range
    useEffect(() => {
        if (teacher.session_rate_min_usd && teacher.session_rate_max_usd) {
            const midPoint = (teacher.session_rate_min_usd + teacher.session_rate_max_usd) / 2;
            setSelectedRate(Math.round(midPoint));
        } else if (teacher.session_rate_min_usd) {
            setSelectedRate(teacher.session_rate_min_usd);
        }
    }, [teacher]);

    const hasCalendly = !!teacher.calendly_url;
    const hasRateRange = (teacher.session_rate_min_usd && teacher.session_rate_max_usd) || teacher.accepts_free_sessions;

    // Handle manual booking request submission
    const handleManualBookingSubmit = async () => {
        if (!description.trim()) {
            toast.error('Please provide a description for your session request');
            return;
        }

        if (!hasRateRange && selectedRate === 0 && !teacher.accepts_free_sessions) {
            toast.error('Please specify a rate for the session');
            return;
        }

        setIsSubmitting(true);

        try {
            const requestData = {
                mentorId: teacher.id,
                sessionType,
                description,
                chosen_rate_usd: paymentMethod === 'usd' ? selectedRate : 0,
                chosen_rate_z_credits: paymentMethod === 'z_credits' ? selectedRate : 0,
                booking_method: 'manual',
                preferred_datetime: null,
                duration_minutes: teacher.default_session_duration || 30,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                student_message: description
            };

            const response = await apiClient.post('/api/sessions/request', requestData);

            if (response.data.success) {
                toast.success('Session request sent successfully!');
                setCurrentStep('confirmation');
                if (onBookingComplete) {
                    onBookingComplete(response.data.sessionRequest);
                }
            }
        } catch (error: any) {
            console.error('Failed to send session request:', error);
            const errorMessage = error.response?.data?.message || 'Failed to send session request';
            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Calendly booking completion
    const handleCalendlyComplete = (eventData: any) => {
        if (eventData.manual) {
            // User chose manual booking from Calendly fallback
            setBookingMethod('manual');
            setCurrentStep('manual');
        } else {
            // Calendly booking successful
            setCurrentStep('confirmation');
            if (onBookingComplete) {
                onBookingComplete(eventData);
            }
        }
    };

    // Render pricing selection step
    const renderPricingStep = () => {
        const minRate = paymentMethod === 'usd' ? teacher.session_rate_min_usd : teacher.session_rate_min_z_credits;
        const maxRate = paymentMethod === 'usd' ? teacher.session_rate_max_usd : teacher.session_rate_max_z_credits;
        const currency = paymentMethod === 'usd' ? '$' : 'Z';
        const currencyName = paymentMethod === 'usd' ? 'USD' : 'Z-Credits';

        return (
            <div className="space-y-1.5">
                <div className="flex items-center gap-2 pb-1.5 border-b">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {teacher.display_name?.[0] || teacher.username[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{teacher.display_name || teacher.username}</h3>
                        <div className="flex items-center gap-2">
                            {teacher.average_rating && (
                                <div className="flex items-center gap-0.5">
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs">{teacher.average_rating.toFixed(1)}</span>
                                </div>
                            )}
                            {teacher.total_sessions && (
                                <span className="text-xs text-gray-500">{teacher.total_sessions} sessions</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Payment method selection */}
                <div className="space-y-1">
                    <Label className="text-xs font-semibold">Payment Method</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                        <button
                            onClick={() => setPaymentMethod('usd')}
                            className={`p-2 rounded border-2 transition-all ${
                                paymentMethod === 'usd'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <DollarSign className={`h-4 w-4 mx-auto mb-0.5 ${
                                paymentMethod === 'usd' ? 'text-blue-600' : 'text-gray-400'
                            }`} />
                            <div className="text-xs font-medium">USD</div>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('z_credits')}
                            className={`p-2 rounded border-2 transition-all ${
                                paymentMethod === 'z_credits'
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <Zap className={`h-4 w-4 mx-auto mb-0.5 ${
                                paymentMethod === 'z_credits' ? 'text-purple-600' : 'text-gray-400'
                            }`} />
                            <div className="text-xs font-medium">Z-Credits</div>
                        </button>
                    </div>
                </div>

                {/* Rate selection */}
                {hasRateRange && minRate && maxRate ? (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">Your Rate</Label>
                            <div className="text-lg font-bold text-blue-600">
                                {currency}{selectedRate}
                            </div>
                        </div>
                        <Slider
                            value={[selectedRate]}
                            onValueChange={(values) => setSelectedRate(values[0])}
                            min={minRate}
                            max={maxRate}
                            step={paymentMethod === 'usd' ? 5 : 10}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>{currency}{minRate}</span>
                            <span>{currency}{maxRate}</span>
                        </div>
                    </div>
                ) : teacher.accepts_free_sessions ? (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 rounded p-1.5 flex items-center gap-1.5">
                        <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                            {teacher.display_name || teacher.username} offers free sessions!
                        </span>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        <Label className="text-xs font-semibold">Proposed Rate</Label>
                        <Input
                            type="number"
                            placeholder={`Amount in ${currencyName}`}
                            value={selectedRate || ''}
                            onChange={(e) => setSelectedRate(parseFloat(e.target.value) || 0)}
                            min="0"
                            step={paymentMethod === 'usd' ? '5' : '10'}
                            className="h-8 text-xs"
                        />
                    </div>
                )}

                {/* Session type and description */}
                <div className="space-y-1.5">
                    <div>
                        <Label htmlFor="sessionType" className="text-xs font-semibold">Session Type</Label>
                        <select
                            id="sessionType"
                            value={sessionType}
                            onChange={(e) => setSessionType(e.target.value)}
                            className="w-full mt-0.5 px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="mentoring">1-on-1 Mentoring</option>
                            <option value="code_review">Code Review</option>
                            <option value="career_guidance">Career Guidance</option>
                            <option value="interview_prep">Interview Prep</option>
                            <option value="project_help">Project Help</option>
                            <option value="networking">Networking Call</option>
                        </select>
                    </div>

                    <div>
                        <Label htmlFor="description" className="text-xs font-semibold">Message</Label>
                        <Textarea
                            id="description"
                            placeholder="What would you like help with?"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            className="mt-0.5 text-xs resize-none"
                        />
                    </div>
                </div>

                {/* Continue button */}
                <div className="flex gap-1.5 pt-1">
                    {onCancel && (
                        <Button
                            variant="outline"
                            onClick={onCancel}
                            className="flex-1 h-8 text-xs"
                        >
                            Cancel
                        </Button>
                    )}
                    <Button
                        onClick={() => {
                            if (hasCalendly) {
                                setCurrentStep('calendar');
                            } else {
                                setCurrentStep('manual');
                            }
                        }}
                        disabled={!description.trim()}
                        className="flex-1 h-8 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        Continue to {hasCalendly ? 'Calendar' : 'Request'}
                        <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                </div>
            </div>
        );
    };

    // Render calendar/Calendly step
    const renderCalendarStep = () => {
        return (
            <div className="space-y-4">
                <Button
                    variant="ghost"
                    onClick={() => setCurrentStep('pricing')}
                    className="mb-2"
                >
                    ← Back to pricing
                </Button>

                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                        <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <div className="font-semibold text-blue-900 dark:text-blue-100">Selected Rate</div>
                            <div className="text-2xl font-bold text-blue-600">
                                {paymentMethod === 'usd' ? '$' : 'Z'}{selectedRate}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {sessionType} • {teacher.default_session_duration || 30} minutes
                            </div>
                        </div>
                    </div>
                </div>

                <CalendlyBooking
                    mentorId={teacher.id}
                    mentorName={teacher.display_name || teacher.username}
                    mentorCalendlyUrl={teacher.calendly_url}
                    sessionType={sessionType}
                    description={description}
                    onBookingComplete={handleCalendlyComplete}
                    mode="inline"
                />
            </div>
        );
    };

    // Render manual booking request step
    const renderManualStep = () => {
        return (
            <div className="space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => setCurrentStep('pricing')}
                    className="mb-2"
                >
                    ← Back to pricing
                </Button>

                <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200">
                    <MessageSquare className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-sm">
                        Your session request will be sent to {teacher.display_name || teacher.username}.
                        They'll review it and respond with their availability.
                    </AlertDescription>
                </Alert>

                <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">Session Rate</div>
                                <div className="text-3xl font-bold text-blue-600">
                                    {paymentMethod === 'usd' ? '$' : 'Z'}{selectedRate}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
                                <div className="text-lg font-semibold">
                                    {teacher.default_session_duration || 30} min
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Session Type:</span>
                                <span className="font-medium capitalize">{sessionType.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
                                <span className="font-medium">{paymentMethod === 'usd' ? 'USD' : 'Z-Credits'}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-2">
                    <Label className="font-semibold">Your Message</Label>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                        <p className="text-sm whitespace-pre-wrap">{description}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentStep('pricing')}
                        className="flex-1"
                    >
                        Edit Details
                    </Button>
                    <Button
                        onClick={handleManualBookingSubmit}
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                Sending...
                            </>
                        ) : (
                            <>
                                Send Request
                                <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        );
    };

    // Render confirmation step
    const renderConfirmationStep = () => {
        return (
            <div className="text-center space-y-6 py-8">
                <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-12 w-12 text-green-600" />
                </div>

                <div>
                    <h3 className="text-2xl font-bold mb-2">Request Sent Successfully!</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Your session request has been sent to {teacher.display_name || teacher.username}
                    </p>
                </div>

                <Card className="text-left">
                    <CardContent className="p-6 space-y-3">
                        <div className="flex items-start gap-3">
                            <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <div className="font-semibold">Next Steps</div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {teacher.display_name || teacher.username} will review your request and respond
                                    with their availability. You'll receive a notification when they respond.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <MessageSquare className="h-5 w-5 text-purple-600 mt-0.5" />
                            <div>
                                <div className="font-semibold">Stay Updated</div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Check your notifications and messages for updates on this session request.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    onClick={() => {
                        if (onBookingComplete) {
                            onBookingComplete({ step: 'confirmation' });
                        }
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                >
                    Done
                </Button>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="pb-2 border-b mb-3">
                <div className="flex items-center gap-2 text-base font-semibold">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Book a Session
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {currentStep === 'pricing' && 'Choose your rate and session details'}
                    {currentStep === 'calendar' && 'Select a convenient time'}
                    {currentStep === 'manual' && 'Review and send your request'}
                    {currentStep === 'confirmation' && 'Your request has been sent'}
                </p>
            </div>
            <div>
                {currentStep === 'pricing' && renderPricingStep()}
                {currentStep === 'calendar' && renderCalendarStep()}
                {currentStep === 'manual' && renderManualStep()}
                {currentStep === 'confirmation' && renderConfirmationStep()}
            </div>
        </div>
    );
};

export default EnhancedSessionBooking;
