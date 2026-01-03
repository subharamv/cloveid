import { useState, useEffect, useRef } from 'react';

export const useIdleTimer = (timeout: number, onIdle: () => void) => {
    const [isIdle, setIsIdle] = useState(false);
    const timeoutId = useRef<number | null>(null);

    const resetTimer = () => {
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
        }
        timeoutId.current = window.setTimeout(() => {
            setIsIdle(true);
            onIdle();
        }, timeout);
    };

    const handleActivity = () => {
        resetTimer();
    };

    useEffect(() => {
        resetTimer();

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('scroll', handleActivity);
        window.addEventListener('click', handleActivity);

        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current);
            }
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('scroll', handleActivity);
            window.removeEventListener('click', handleActivity);
        };
    }, [timeout, onIdle]);

    return isIdle;
};