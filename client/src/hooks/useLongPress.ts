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
    const startPos = useRef<{x: number, y: number} | null>(null);

    const start = useCallback(
        (event: any) => {
            if (event.touches && event.touches.length > 0) {
                startPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            } else if (event.clientX !== undefined) {
                startPos.current = { x: event.clientX, y: event.clientY };
            }

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

    const move = useCallback(
        (event: any) => {
            if (!startPos.current || !timeout.current) return;
            let currentX = undefined;
            let currentY = undefined;
            if (event.touches && event.touches.length > 0) {
                currentX = event.touches[0].clientX;
                currentY = event.touches[0].clientY;
            } else if (event.clientX !== undefined) {
                currentX = event.clientX;
                currentY = event.clientY;
            }
            
            if (currentX !== undefined && currentY !== undefined) {
                // Determine if swiped more than 10px
                if (Math.abs(currentX - startPos.current.x) > 10 || Math.abs(currentY - startPos.current.y) > 10) {
                    clear(event, false);
                    startPos.current = null;
                }
            }
        },
        [clear]
    );

    return {
        onMouseDown: (e: any) => start(e),
        onTouchStart: (e: any) => start(e),
        onMouseMove: (e: any) => move(e),
        onTouchMove: (e: any) => move(e),
        onMouseUp: (e: any) => clear(e),
        onMouseLeave: (e: any) => clear(e, false),
        onTouchEnd: (e: any) => clear(e),
    };
}
