import { createClient } from "@liveblocks/client";
import { createLiveblocksContext, createRoomContext } from "@liveblocks/react";

// Create the client with your Liveblocks API key
const client = createClient({
  // Use auth endpoint for proper authentication with token
  authEndpoint: async (room) => {
    // Get the JWT token from localStorage (using the correct key 'authToken')
    const token = localStorage.getItem('authToken');

    if (!token) {
      // For development/testing, use the dev token fallback if no real token exists
      console.warn('No authentication token found, using development fallback');
      // Use the development token that the auth middleware accepts
      const devToken = 'dev-token-for-testing';

      console.log('🔄 Liveblocks Development Auth Request:', {
        room,
        usingDevToken: true,
        timestamp: new Date().toISOString()
      });

      const response = await fetch("http://localhost:10000/api/liveblocks/auth", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${devToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          room,
        }),
      });

      if (!response.ok) {
        throw new Error(`Development authentication failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    }

    console.log('🔄 Liveblocks Frontend Auth Request:', {
      room,
      tokenLength: token?.length || 0,
      timestamp: new Date().toISOString()
    });

    const response = await fetch("http://localhost:10000/api/liveblocks/auth", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room,
      }),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  },

  // Throttle updates to avoid too many API calls
  throttle: 16,
});

// Create Liveblocks context
export const {
  suspense: {
    useRoom,
    useMyPresence,
    useUpdateMyPresence,
    useSelf,
    useOthers,
    useOthersMapped,
    useOthersConnectionIds,
    useOther,
    useBroadcastEvent,
    useEventListener,
    useErrorListener,
    useStorage,
    useObject,
    useMap,
    useList,
    useBatch,
    useHistory,
    useUndo,
    useRedo,
    useCanUndo,
    useCanRedo,
    useMutation,
    useStatus,
    useLostConnectionListener,
  },
} = createLiveblocksContext(client);


// Room context for collaborative features
export const {
  RoomProvider,
  suspense: {
    useUser,
    useUsers,
  },
} = createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client);

// Export the client
export { client };

// Types for our collaborative editing
export type Presence = {
  cursor?: { x: number; y: number };
  selection?: { from: number; to: number };
  user?: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  };
};

export type Storage = {
  document: string;
  version: number;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    avatar?: string;
    role: 'teacher' | 'student';
    permissions: {
      canEdit: boolean;
      canComment: boolean;
    };
  };
};

export type RoomEvent = {
  type: 'PERMISSION_CHANGED';
  userId: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
  };
};