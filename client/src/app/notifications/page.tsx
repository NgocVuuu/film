'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Check, Trash2, Bell, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Notification {
    _id: string;
    content: string;
    type: string;
    isRead: boolean;
    link?: string;
    createdAt: string;
}

export default function NotificationsPage() {
    const { user, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
            return;
        }

        fetchNotifications();
    }, [user, authLoading]);

    const fetchNotifications = async () => {
        try {
            const res = await customFetch(`/api/notifications?limit=50`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRead = async (id: string, link?: string) => {
        try {
            await customFetch(`/api/notifications/${id}/read`, { method: 'PUT', credentials: 'include' });
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            if (link) router.push(link);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await customFetch(`/api/notifications/${id}`, { method: 'DELETE', credentials: 'include' });
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await customFetch(`/api/notifications/read-all`, { method: 'PUT', credentials: 'include' });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) {
            console.error(e);
        }
    };

    const timeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `Vừa xong`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    if (loading) return <div className="min-h-screen pt-24 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="min-h-screen bg-deep-black text-white pt-24 pb-10">
            <div className="container mx-auto px-4 max-w-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gold-gradient flex items-center gap-3">
                        <Bell className="w-8 h-8" /> Thông báo
                    </h1>
                    {notifications.length > 0 && (
                        <Button onClick={handleMarkAllRead} variant="outline" className="border-white/10 hover:bg-white/10 text-primary">
                            <Check className="w-4 h-4 mr-2" /> Đánh dấu đã đọc tất cả
                        </Button>
                    )}
                </div>

                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <div className="text-center py-20 bg-surface-900 rounded-xl border border-white/5">
                            <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">Bạn không có thông báo nào.</p>
                        </div>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif._id}
                                onClick={() => handleRead(notif._id, notif.link)}
                                className={`relative p-4 rounded-xl border border-white/5 cursor-pointer transition-all hover:bg-white/5 group ${!notif.isRead ? 'bg-surface-800 border-primary/20' : 'bg-transparent'}`}
                            >
                                <div className="flex gap-4">
                                    <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${!notif.isRead ? 'bg-primary shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'bg-gray-600'}`}></div>
                                    <div className="flex-1">
                                        <p className={`text-sm md:text-base ${!notif.isRead ? 'text-white font-medium' : 'text-gray-400'}`}>
                                            {notif.content}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                                            {timeAgo(notif.createdAt)}
                                            {notif.type === 'episode' && <span className="bg-primary/20 text-primary px-2 py-0.5 rounded text-[10px] font-bold">TẬP MỚI</span>}
                                        </p>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all self-center"
                                        onClick={(e) => handleDelete(notif._id, e)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
