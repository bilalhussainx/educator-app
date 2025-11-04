import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ModernEssayEditor from '../components/classroom/ModernEssayEditor';
import { RoomProvider } from '@/lib/liveblocks';
import apiClient from '../services/apiClient';
import { toast } from 'sonner';

const simpleJwtDecode = (token: string) => {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Invalid token:", error);
        return null;
    }
};

const EssaySessionPage: React.FC = () => {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [students] = useState<any[]>([]);
    const [handsRaised] = useState<Set<string>>(new Set());
    const [uploadedDocument, setUploadedDocument] = useState<{
        name: string;
        url: string;
        content?: string;
        instructions?: string;
    } | null>(null);
    const [isLoadingDocument, setIsLoadingDocument] = useState(false);

    // Get auth token and decode user info
    const token = localStorage.getItem('authToken');
    const decodedToken = token ? simpleJwtDecode(token) : null;

    // Load uploaded document if available
    useEffect(() => {
        const loadDocument = async () => {
            const documentParam = searchParams.get('document');
            console.log('📄 Document param from URL:', documentParam);

            // Check if we have a document parameter (could be documentId or 'true')
            if (documentParam && documentParam !== 'false' && documentParam !== 'null') {
                setIsLoadingDocument(true);
                try {
                    // Method 1: Try to get document using the session document endpoint
                    console.log('🔍 Trying to load document for session:', sessionId);
                    const sessionDocResponse = await apiClient.get(`/api/sessions/${sessionId}/document`);

                    if (sessionDocResponse.data.success && sessionDocResponse.data.document) {
                        const doc = sessionDocResponse.data.document;
                        setUploadedDocument({
                            name: doc.original_name || doc.filename || doc.name || 'Uploaded Document',
                            url: doc.url || '',
                            content: doc.content || '',
                            instructions: doc.instructions || ''
                        });
                        console.log('✅ Document loaded from session endpoint:', doc.original_name);
                        toast.success(`Document "${doc.original_name || 'Document'}" loaded successfully`);
                        return; // Success, exit early
                    }

                    // Method 2: If documentParam looks like a UUID, try the documents endpoint
                    if (documentParam.length > 10 && documentParam.includes('-')) {
                        console.log('🔍 Trying to load document by ID:', documentParam);
                        const docResponse = await apiClient.get(`/api/documents/${documentParam}`);

                        if (docResponse.data.success && docResponse.data.document) {
                            const doc = docResponse.data.document;
                            setUploadedDocument({
                                name: doc.original_name || doc.filename || doc.name || 'Uploaded Document',
                                url: doc.url || '',
                                content: doc.content || '',
                                instructions: doc.instructions || ''
                            });
                            console.log('✅ Document loaded from documents endpoint:', doc.original_name);
                            toast.success(`Document "${doc.original_name || 'Document'}" loaded successfully`);
                            return; // Success, exit early
                        }
                    }

                    // If we get here, no document was found
                    console.warn('⚠️ No document found for session or document ID');

                } catch (error) {
                    console.error('❌ Error loading document:', error);

                    // Only show error toast if it's not a 404 (document not found is acceptable)
                    if (error.response?.status !== 404) {
                        toast.error('Failed to load uploaded document');
                    }
                } finally {
                    setIsLoadingDocument(false);
                }
            }
        };

        if (sessionId) {
            // Add a small delay to avoid rate limiting
            const timeoutId = setTimeout(loadDocument, 100);
            return () => clearTimeout(timeoutId);
        }
    }, [sessionId, searchParams]);

    // NOTE: WebSocket connection disabled for essay sessions
    // Essay sessions use Liveblocks (RoomProvider) for real-time collaboration
    // sessionWebSocketService is only needed for coding sessions

    // Redirect to login if no valid token
    useEffect(() => {
        if (!decodedToken || !sessionId) {
            navigate('/login');
            return;
        }
    }, [decodedToken, sessionId, navigate]);

    // WebSocket send message function (disabled for essay sessions - using Liveblocks instead)
    const sendWsMessage = useCallback((type: string, payload: any) => {
        console.log('📝 Essay session message (handled by Liveblocks):', { type, payload });
        // Essay sessions use Liveblocks for real-time messaging
        // This function is kept for compatibility but doesn't send via WebSocket
    }, []);

    // Event handlers
    const handleRaiseHand = useCallback(() => {
        // Implementation for raising hand
        console.log('Hand raised');
    }, []);

    const handleSave = useCallback((content: string) => {
        // Implementation for saving content
        console.log('Saving content:', content);
    }, []);

    if (!decodedToken || !sessionId) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading session...</p>
                </div>
            </div>
        );
    }

    if (isLoadingDocument) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p>Loading uploaded document...</p>
                    <p className="text-sm text-gray-500 mt-2">Session: {sessionId}</p>
                    <p className="text-sm text-gray-500">Document: {searchParams.get('document')}</p>
                </div>
            </div>
        );
    }

    const userId = decodedToken.user?.id || decodedToken.userId || '';
    const username = decodedToken.user?.username || decodedToken.username || 'User';
    const userRole = decodedToken.user?.role || decodedToken.role || 'student';
    const roomId = `essay-${sessionId}`;

    return (
        <div className="w-full h-screen">
            <RoomProvider
                id={roomId}
                initialPresence={{
                    userId,
                    username,
                    role: userRole,
                    cursor: null,
                }}
            >
                <ModernEssayEditor
                    sessionId={sessionId}
                    userId={userId}
                    username={username}
                    userRole={userRole as 'teacher' | 'student'}
                    uploadedDocument={uploadedDocument}
                    sendWsMessage={sendWsMessage}
                    students={students}
                    handsRaised={handsRaised}
                    onRaiseHand={handleRaiseHand}
                    onSave={handleSave}
                />
            </RoomProvider>
        </div>
    );
};

export default EssaySessionPage;