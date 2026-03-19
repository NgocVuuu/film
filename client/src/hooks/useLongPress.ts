'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseLongPressOptions {
    delay?: number;
    shouldPreventDefault?: boolean;
}

export function useLongPress(
    callback: (e: any) => void,
    { delay = 500, shouldPreventDefault = false }: UseLongPressOptions = {}
) {
    const [longPressTriggered, setLongPressTriggered] = useState(false);
    const timeout = useRef<NodeJS.Timeout | undefined>(undefined);
    const target = useRef<any>(null);

    const start = useCallback(
        (event: any) => {
            if (shouldPreventDefault && event.target) {
                event.target.addEventListener('touchend', preventDefault, { passive: false });
                target.current = event.target;
            }
            timeout.current = setTimeout(() => {
                callback(event);
                setLongPressTriggered(true);
            }, delay);
        },
        [callback, delay, shouldPreventDefault]
    );

    const clear = useCallback(
        (event?: any, shouldTriggerClick = true) => {
            if (timeout.current) {
                clearTimeout(timeout.current);
                timeout.current = undefined;
            }
            if (shouldTriggerClick && !longPressTriggered) {
                // Normal click would have happened
            }
            setLongPressTriggered(false);
            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener('touchend', preventDefault);
                target.current = null;
            }
        },
        [shouldPreventDefault, longPressTriggered]
    );

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                clear(undefined, false);
            }
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, [clear]);

    const preventDefault = (e: any) => {
        if (!e.cancelable) return;
        e.preventDefault();
    };

    return {
        onMouseDown: (e: any) => start(e),
        onTouchStart: (e: any) => start(e),
        onMouseUp: (e: any) => clear(e),
        onMouseLeave: (e: any) => clear(e, false),
        onTouchEnd: (e: any) => clear(e),
    };
}
