'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Search, User, LogOut, Crown, Bell, Check, Heart, Clock, Filter, List, Film, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { customFetch } from '@/lib/api';

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { user, loading, logout } = useAuth();

    // Notifications
    const [notifications, setNotifications] = useState<Record<string, unknown>[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);
    const [imageError, setImageError] = useState(false);
    
    // Browse Menu
    const [showBrowseMenu, setShowBrowseMenu] = useState(false);
    const [showGenreMenu, setShowGenreMenu] = useState(false);
    const browserMenuRef = useRef<HTMLDivElement>(null);

    const genres = [
        { name: 'Hành động', slug: 'hanh-dong' },
        { name: 'Tình cảm', slug: 'tinh-cam' },
        { name: 'Hài hước', slug: 'hai-huoc' },
        { name: 'Cổ trang', slug: 'co-trang' },
        { name: 'Tâm lý', slug: 'tam-ly' },
        { name: 'Hình sự', slug: 'hinh-su' },
        { name: 'Chiến tranh', slug: 'chien-tranh' },
        { name: 'Thể thao', slug: 'the-thao' },
        { name: 'Võ thuật', slug: 'vo-thuat' },
        { name: 'Viễn tưởng', slug: 'vien-tuong' },
        { name: 'Khoa học', slug: 'khoa-hoc' },
        { name: 'Kinh dị', slug: 'kinh-di' },
        { name: 'Âm nhạc', slug: 'am-nhac' },
        { name: 'Thần thoại', slug: 'than-thoai' },
        { name: 'Tài liệu', slug: 'tai-lieu' },
        { name: 'Gia đình', slug: 'gia-dinh' },
        { name: 'Hoạt hình', slug: 'hoat-hinh' },
        { name: 'Chiếu rạp', slug: 'chieu-rap' },
        { name: 'Học đường', slug: 'hoc-duong' },
        { name: 'Bí ẩn', slug: 'bi-an' },
        { name: 'Phiêu lưu', slug: 'phieu-luu' }
    ];

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await customFetch(`/api/notifications?limit=5`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setNotifications(data.data);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const handleNotificationClick = async (notification: { _id: string; isRead?: boolean; link?: string }) => {
        if (!notification.isRead) {
            try {
                await customFetch(`/api/notifications/${notification._id}/read`, {
                    method: 'PUT',
                    credentials: 'include'
                });
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(n => (n as { _id: string; isRead?: boolean })._id === notification._id ? { ...n, isRead: true } : n));
            } catch (e) { console.error(e); }
        }
        setShowNotifications(false);
        if (notification.link) router.push(notification.link);
    };

    const handleMarkAllRead = async () => {
        try {
            await customFetch(`/api/notifications/read-all`, {
                method: 'PUT',
                credentials: 'include'
            });
            setUnreadCount(0);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        } catch (e) { console.error(e); }
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

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 0) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Click outside to close menus
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (browserMenuRef.current && !browserMenuRef.current.contains(event.target as Node)) {
                setShowBrowseMenu(false);
                setShowGenreMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        setShowUserMenu(false);
        router.push('/');
    };

    // Early return for loading state
    if (loading) {
        return null;
    }

    return (
        <header
            className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-deep-black/95 backdrop-blur-sm shadow-md shadow-primary/10' : 'bg-transparent'
                }`}
        >
            <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 gap-4">
                {/* Logo - Left */}
                <Link href="/" className="flex items-center gap-2 shrink-0">
                    <img
                        src="/logo.png"
                        alt="Pchill Logo"
                        className="h-8 md:h-14 w-auto object-contain rounded-md"
                    />
                    <span className="text-2xl font-bold tracking-tighter text-gold-gradient hidden sm:block">
                        PCHILL
                    </span>
                </Link>

                {/* Actions - Right */}
                <div className="flex items-center gap-1 md:gap-3 shrink-0 ml-auto">
                    {/* Search Icon */}
                    <Link 
                        href="/search" 
                        className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    >
                        <Search className="w-5 h-5 md:w-6 md:h-6" />
                    </Link>

                    {/* Filter / Browse Menu */}
                    <div ref={browserMenuRef} className="relative">
                        <button
                            onClick={() => {
                                setShowBrowseMenu(!showBrowseMenu);
                                setShowGenreMenu(false); // Reset sub-menu on toggle
                            }}
                            className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        >
                            <Filter className="w-5 h-5 md:w-6 md:h-6" />
                        </button>

                        {/* Browse Menu Content */}
                        {showBrowseMenu && (
                            <div className="fixed inset-x-0 bottom-[calc(3rem+env(safe-area-inset-bottom))] md:bottom-auto top-auto md:absolute md:top-full md:right-0 md:inset-x-auto w-full md:w-64 bg-black/95 backdrop-blur-md md:border border-white/10 md:rounded-lg overflow-hidden shadow-2xl z-50 rounded-t-xl transition-all animate-in slide-in-from-bottom-10 md:slide-in-from-top-2 border-t">
                                {/* Mobile Handle */}
                                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 md:hidden"></div>
                                
                                <div className="p-2 space-y-1 pb-2">
                                    {!showGenreMenu ? (
                                        <>
                                            <Link 
                                                href="/phim-moi" 
                                                onClick={() => setShowBrowseMenu(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
                                            >
                                                <Crown className="w-4 h-4 text-primary" />
                                                Đề xuất / Phim mới
                                            </Link>
                                            <Link 
                                                href="/phim-le" 
                                                onClick={() => setShowBrowseMenu(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
                                            >
                                                <Film className="w-4 h-4 text-blue-400" />
                                                Phim lẻ
                                            </Link>
                                            <Link 
                                                href="/phim-bo" 
                                                onClick={() => setShowBrowseMenu(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
                                            >
                                                <List className="w-4 h-4 text-green-400" />
                                                Phim bộ
                                            </Link>
                                            <button 
                                                onClick={() => setShowGenreMenu(true)}
                                                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white hover:bg-white/10 rounded-lg"
                                            >
                                                <span className="flex items-center gap-3">
                                                    <Filter className="w-4 h-4 text-purple-400" />
                                                    Thể loại
                                                </span>
                                                <span className="text-gray-500">›</span>
                                            </button>
                                        </>
                                    ) : (
                                        <div className="h-[50vh] md:h-auto md:max-h-[60vh] flex flex-col overscroll-contain">
                                            <button 
                                                onClick={() => setShowGenreMenu(false)}
                                                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-white border-b border-white/10 mb-2 shrink-0"
                                            >
                                                ‹ Quay lại
                                            </button>
                                            <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-1 gap-1 p-2 overscroll-contain">
                                                {genres.map((genre) => (
                                                    <Link
                                                        key={genre.slug}
                                                        href={`/search?category=${genre.slug}`}
                                                        onClick={() => setShowBrowseMenu(false)}
                                                        className="px-3 py-2 text-sm text-gray-300 hover:text-primary hover:bg-white/5 rounded transition-colors text-center md:text-left"
                                                    >
                                                        {genre.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {/* Backdrop for Mobile */}
                        {showBrowseMenu && (
                            <div 
                                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                                onClick={() => setShowBrowseMenu(false)}
                            />
                        )}
                    </div>

                    {/* Notifications */}
                    {user && (
                        <div ref={notificationRef} className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            >
                                <Bell className="w-5 h-5 md:w-6 md:h-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50">
                                    <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                                        <h3 className="text-sm font-bold text-white">Thông báo</h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={handleMarkAllRead}
                                                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                                            >
                                                <Check className="w-3 h-3" /> Đã đọc tất cả
                                            </button>
                                        )}
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length > 0 ? (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif._id}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/10 transition-colors flex gap-3 ${!notif.isRead ? 'bg-white/5' : ''}`}
                                                >
                                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${!notif.isRead ? 'bg-primary' : 'bg-transparent'}`}></div>
                                                    <div className="flex-1">
                                                        <p className="text-sm text-gray-200 line-clamp-2">{notif.content}</p>
                                                        <p className="text-xs text-gray-500 mt-1">{timeAgo(notif.createdAt)}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-8 text-center text-gray-500 text-sm">
                                                Chưa có thông báo nào
                                            </div>
                                        )}
                                    </div>
                                    <Link href="/notifications" className="block p-2 text-center text-xs text-gray-400 hover:text-white hover:bg-white/5 border-t border-white/10 transition-colors">
                                        Xem tất cả
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}

                    {/* User Menu / Login */}
                    {user ? (
                        <div ref={userMenuRef} className="relative hidden md:block">
                            <button
                                onClick={() => setShowUserMenu(!showUserMenu)}
                                className="flex items-center gap-2 p-1 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            >
                                {user.avatar && !imageError ? (
                                    <img 
                                        src={user.avatar} 
                                        alt={user.displayName || user.email} 
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                        <User className="w-4 h-4 text-primary" />
                                    </div>
                                )}
                            </button>

                            {showUserMenu && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50">
                                    <div className="p-3 border-b border-white/10 bg-white/5">
                                        <p className="text-sm font-bold text-white truncate">{user.displayName || user.email}</p>
                                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                    </div>

                                    {/* Favorites & History Links - Desktop only (mobile has bottom nav) */}
                                    <Link
                                        href="/favorites"
                                        onClick={() => setShowUserMenu(false)}
                                        className="hidden lg:flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5"
                                    >
                                        <Heart className="w-4 h-4" />
                                        Danh sách yêu thích
                                    </Link>

                                    <Link
                                        href="/history"
                                        onClick={() => setShowUserMenu(false)}
                                        className="hidden lg:flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5"
                                    >
                                        <Clock className="w-4 h-4" />
                                        Đang xem
                                    </Link>

                                    <Link
                                        href="/my-lists"
                                        onClick={() => setShowUserMenu(false)}
                                        className="hidden lg:flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5"
                                    >
                                        <List className="w-4 h-4" />
                                        Danh sách của tôi
                                    </Link>

                                    {user.isPremium && (
                                        <div className="px-3 py-2.5 border-b border-white/5 bg-yellow-500/10">
                                            <div className="flex items-center gap-2 text-yellow-500">
                                                <Crown className="w-4 h-4" />
                                                <span className="text-xs font-semibold">Premium</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Admin & Static Links */}
                                    {user.role === 'admin' && (
                                        <Link
                                            href="/admin"
                                            onClick={() => setShowUserMenu(false)}
                                            className="block px-3 py-2.5 text-sm font-semibold text-primary hover:bg-white/10 transition-colors border-b border-white/5"
                                        >
                                            Trang quản trị (Admin)
                                        </Link>
                                    )}

                                    <Link
                                        href="/feedback"
                                        onClick={() => setShowUserMenu(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Góp ý & Báo lỗi
                                    </Link>

                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="hidden md:block">
                            <Button
                                onClick={() => router.push('/login')}
                                variant="outline"
                                className="border-primary/50 text-primary hover:bg-primary hover:text-black transition-colors text-sm"
                            >
                                Đăng nhập
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
