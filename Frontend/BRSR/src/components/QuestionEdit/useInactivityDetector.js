import { useEffect } from 'react';

export const useInactivityDetector = ({ timeouts = [300000], onTimeout }) => {
    useEffect(() => {
        let timeoutIds = [];

        const resetTimeouts = () => {
            timeoutIds.forEach(id => clearTimeout(id));
            timeoutIds = timeouts.map(timeout => 
                setTimeout(onTimeout, timeout)
            );
        };

        // Set up event listeners for user activity
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, resetTimeouts);
        });

        // Initial setup
        resetTimeouts();

        // Cleanup
        return () => {
            timeoutIds.forEach(id => clearTimeout(id));
            events.forEach(event => {
                document.removeEventListener(event, resetTimeouts);
            });
        };
    }, [timeouts, onTimeout]);
};