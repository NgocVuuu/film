'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseLongPressOptions {
    delay?: number;
    shouldPreventDefault?: boolean;
}

export function useLongPress(
    callback: (e: any) => void,
    { delay = 500, shouldPreventDefault = true }: UseLongPressOptions = {}
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
        (event: any, shouldTriggerClick = true) => {
            timeout.current && clearTimeout(timeout.current);
            shouldTriggerClick && !longPressTriggered && setLongPressTriggered(false);
            if (shouldPreventDefault && target.current) {
                target.current.removeEventListener('touchend', preventDefault);
            }
        },
        [shouldPreventDefault, longPressTriggered]
    );

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
