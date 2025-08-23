// src/services/analyticsService.js
import mixpanel from 'mixpanel-browser';

/**
 * Identifies the user to Mixpanel, connecting their actions to their profile.
 * Call this once after a user logs in.
 * @param {object} user - The user object from your application.
 * @param {string} user.id - The unique ID of the user.
 * @param {string} user.username - The user's display name.
 * @param {string} user.role - The user's role ('student' or 'teacher').
 */
export const identifyUser = (user) => {
    if (user && user.id) {
        mixpanel.identify(user.id);
        mixpanel.people.set({
            "$name": user.username,
            "role": user.role,
        });
    }
};

/**
 * Tracks a custom event. All components should call this central function.
 * @param {string} eventName - The name of the event to track (e.g., 'Lesson Started').
 * @param {object} [properties={}] - Optional: An object of key-value pairs to send with the event.
 */
export const trackEvent = (eventName, properties = {}) => {
    // Check if mixpanel is initialized before trying to track
    if (mixpanel.get_distinct_id()) {
        mixpanel.track(eventName, properties);
    } else {
        console.warn(`Mixpanel not initialized. Could not track event: ${eventName}`);
    }
};

/**
 * Resets the Mixpanel user identity. Call this on logout.
 */
export const resetUser = () => {
    mixpanel.reset();
};

// Bundle the functions into a single default export for easy importing.
const analytics = {
    identify: identifyUser,
    track: trackEvent,
    reset: resetUser,
};

export default analytics;