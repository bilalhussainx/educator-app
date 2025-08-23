// src/services/analyticsService.ts
import mixpanel from 'mixpanel-browser';
import { User } from '../types/index.ts'; // Adjust path if your types file is elsewhere

// This function identifies the user to Mixpanel.
export const identifyUser = (user: User) => {
    if (user) {
        mixpanel.identify(user.id);
        mixpanel.people.set({
            "$name": user.username,
            "role": user.role,
        });
    }
};

// This is our central tracking function.
export const trackEvent = (eventName: string, properties: object = {}) => {
    if (mixpanel.get_distinct_id()) {
        mixpanel.track(eventName, properties);
    } else {
        console.warn(`Mixpanel not initialized. Could not track event: ${eventName}`);
    }
};

// A specific function to call when the user logs out.
export const resetUser = () => {
    mixpanel.reset();
};

const analytics = {
    identify: identifyUser,
    track: trackEvent,
    reset: resetUser,
};

export default analytics;