import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ModernEssayEditor from '../components/classroom/ModernEssayEditor';
import { RoomProvider } from '@/lib/liveblocks';
import { useUser } from '@/hooks/useUser';

const EssayEditorPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { user } = useUser();
    const [roomId, setRoomId] = useState<string>('');

    const essayTitle = searchParams.get('title') || 'Untitled Essay';
    const hasFile = searchParams.get('hasFile') === 'true';

    useEffect(() => {
        // Generate a unique room ID for this essay session
        const generateRoomId = () => {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const sanitizedTitle = essayTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
            return `essay-${user?.id || 'guest'}-${sanitizedTitle}-${timestamp}-${random}`;
        };

        setRoomId(generateRoomId());
    }, [essayTitle, user]);

    if (!roomId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Preparing essay editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden bg-slate-100">
            <RoomProvider
                id={roomId}
                initialPresence={{}}
                initialStorage={{}}
            >
                <ModernEssayEditor
                    sessionId={roomId}
                    isTeacher={false}
                    currentUserId={user?.id || 'guest'}
                    currentUsername={user?.username || 'Student'}
                    essayTitle={essayTitle}
                />
            </RoomProvider>
        </div>
    );
};

export default EssayEditorPage;
