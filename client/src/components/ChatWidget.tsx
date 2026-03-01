'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAuthToken } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { MessageCircle } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export default function ChatWidget() {
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [unread, setUnread] = useState(0);

    // Drag-to-hide states
    const [isHidden, setIsHidden] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchConversation = useCallback(async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_URL}/api/chat/my`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setUnread(data.data.unreadUser || 0);
            }
        } catch (err) {
            console.error('fetchConversation error:', err);
        }
    }, []);

    // Initialize conversation on mount
    useEffect(() => {
        if (!user || user.role === 'admin') return;
        fetchConversation();

        // We could theoretically connect a socket here just for the unread badge,
        // but it might be overkill if we only need the initial number. Let's keep it simple.
        const intervalId = setInterval(fetchConversation, 30000); // Check every 30s
        return () => clearInterval(intervalId);
    }, [user, fetchConversation]);

    const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
        setIsDragging(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        dragStart.current = { x: clientX, y: clientY };
        initialPos.current = { x: pos.x, y: pos.y };
    };

    const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
        if (!isDragging) return;
        // Prevent default scrolling on mobile when dragging widget
        if ('touches' in e && e.cancelable) {
            // e.preventDefault(); // React synthetic events don't reliably allow preventDefault here if passive, using touch-none class instead
        }
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;

        // Allow dragging in any direction
        setPos({ x: initialPos.current.x + dx, y: initialPos.current.y + dy });
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        // If swiped far enough on any axis, hide it
        if (Math.abs(pos.x) > 80 || pos.y > 80 || pos.y < -80) {
            setIsHidden(true);
            // Removed sessionStorage.setItem to allow reappear on reload as requested by user
        } else {
            // snap back
            setPos({ x: 0, y: 0 });
        }
    };

    const handleOpen = () => {
        // If the user was dragging, don't open the chat
        if (Math.abs(pos.x) > 10 || Math.abs(pos.y) > 10) {
            setPos({ x: 0, y: 0 }); // snap back just in case
            return;
        }
        setUnread(0);
        router.push('/profile?tab=chat');
    };

    const isChatOpen = pathname === '/profile' && searchParams.get('tab') === 'chat';

    // Only show for logged-in non-admin users, and hide if chat tab is already open or dismissed
    // Also wait for mount to prevent hydration mismatch
    if (!mounted || !user || user.role === 'admin' || isChatOpen || isHidden) return null;

    return (
        <div
            className="fixed bottom-28 right-4 z-50 md:bottom-6 md:right-6 flex flex-col items-end gap-3 touch-none"
            style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            onMouseDown={handleTouchStart}
            onMouseMove={handleTouchMove}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Floating Button */}
            <button
                onClick={handleOpen}
                className="relative w-14 h-14 rounded-full bg-[#FFBE00] text-black shadow-lg shadow-[#FFBE00]/30 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
                title="Chat với Admin"
            >
                <MessageCircle className="w-6 h-6" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>
        </div>
    );
}
