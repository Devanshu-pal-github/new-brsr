import { useEffect } from 'react';

export const useInactivityDetector = (callback, timeouts, isActive) => {
    useEffect(() => {
        if (!isActive) return;

        const timer = setTimeout(() => {
            callback(0); // Trigger callback with level 0
        }, timeouts[0] || 30000); // Default to 30 seconds

        return () => clearTimeout(timer);
    }, [callback, timeouts, isActive]);
};