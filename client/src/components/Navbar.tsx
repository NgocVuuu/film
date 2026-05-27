'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, LogOut, Check, Filter, Crown, Film, List, MessageSquare, Heart, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { DonateButton } from './DonateButton';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { usePWA } from '@/hooks/usePWA';

interface Notification {
    _id: string;
    content: string;
    type: string;
    isRead: boolean;
    link?: string;
    createdAt: string;
}

const genres = [
    { name: "Hành Động", slug: "hanh-dong" },
    { name: "Viễn Tưởng", slug: "vien-tuong" },
    { name: "Cổ Trang", slug: "co-trang" },
    { name: "Chiến Tranh", slug: "chien-tranh" },
    { name: "Kinh Dị", slug: "kinh-di" },
    { name: "Tình Cảm", slug: "tinh-cam" },
    { name: "Hài Hước", slug: "hai-huoc" },
    { name: "Hình Sự", slug: "hinh-su" },
    { name: "Tâm Lý", slug: "tam-ly" },
    { name: "Võ Thuật", slug: "vo-thuat" },
    { name: "Hoàn Hình", slug: "hoat-hinh" },
    { name: "Thần Thoại", slug: "than-thoai" },
    { name: "Khoa Học", slug: "khoa-hoc" },
    { name: "Phiêu Lưu", slug: "phieu-luu" },
    { name: "Âm Nhạc", slug: "am-nhac" },
    { name: "Gia Đình", slug: "gia-dinh" }
];

export function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [showBrowseMenu, setShowBrowseMenu] = useState(false);
    const [showGenreMenu, setShowGenreMenu] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [imageError, setImageError] = useState(false);

    const browserMenuRef = useRef<HTMLDivElement>(null);
    const browseMenuContentRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading, logout } = useAuth();
    const { isPWA } = usePWA();
    const searchParams = useSearchParams();
    const isChatOpen = pathname === '/profile' && searchParams.get('tab') === 'chat';

    const {
        notifications,
        unreadCount: notifUnreadCount,
        markAsRead,
        markAllAsRead
    } = useNotifications();

    const handleMarkAllRead = async () => {
        await markAllAsRead();
    };

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.isRead) {
            await markAsRead(notif._id);
        }
        setShowNotifications(false);
        if (notif.link) {
            router.push(notif.link);
        }
    };

    const handleLogout = async () => {
        await logout();
        setShowUserMenu(false);
        router.push('/login');
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

    // Also close menus when the route changes
    useEffect(() => {
        setShowBrowseMenu(false);
        setShowGenreMenu(false);
        setShowNotifications(false);
        setShowUserMenu(false);
    }, [pathname]);

    // Close menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isClickInsideTrigger = browserMenuRef.current?.contains(event.target as Node);
            const isClickInsideContent = browseMenuContentRef.current?.contains(event.target as Node);

            if (!isClickInsideTrigger && !isClickInsideContent) {
                setShowBrowseMenu(false);
                setShowGenreMenu(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const timeAgo = (date: string) => {
        const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return `${seconds} giây trước`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút trước`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ trước`;
        return new Date(date).toLocaleDateString();
    };

    // Early return for loading state
    if (loading) {
        return null;
    }

    return (
        <>
            <header
                className={`fixed top-0 z-[100] w-full transition-all duration-300 pt-[env(safe-area-inset-top)] ${isChatOpen ? 'hidden md:block' : ''} ${isScrolled ? 'bg-deep-black/95 backdrop-blur-sm shadow-md shadow-primary/10' : 'bg-transparent'
                    }`}
            >
                <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-4 gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <img
                            src="/logo.png"
                            alt="PCHILL"
                            className="w-10 h-10 md:w-11 md:h-11 object-contain"
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

                        {/* Filter / Browse Menu Trigger */}
                        <div ref={browserMenuRef} className="relative">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowBrowseMenu(!showBrowseMenu);
                                    setShowGenreMenu(false);
                                }}
                                className="p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors touch-manipulation"
                            >
                                <Filter className="w-5 h-5 md:w-6 md:h-6" />
                            </button>

                            {/* Desktop Browse Menu Content (Inside header) */}
                            {showBrowseMenu && (
                                <div
                                    ref={browseMenuContentRef}
                                    className="hidden md:block absolute top-full right-0 mt-2 w-64 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50 animate-in slide-in-from-top-2"
                                >
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
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowGenreMenu(true);
                                                    }}
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
                                            <div className="max-h-[60vh] flex flex-col">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowGenreMenu(false);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400 hover:text-white border-b border-white/10 mb-2 shrink-0"
                                                >
                                                    ‹ Quay lại
                                                </button>
                                                <div className="flex-1 overflow-y-auto grid md:grid-cols-1 gap-1 p-2 overscroll-contain">
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
                        </div>

                        {/* Discord Link */}
                        <a
                            href="https://discord.gg/bnHvX3FM"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 text-[#5865F2] hover:text-[#4752C4] bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            title="Tham gia Discord"
                        >
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.074.11 18.09.12 18.1a19.904 19.904 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                            </svg>
                        </a>

                        {/* Upgrade Premium Button */}
                        <Link 
                            href="/pricing" 
                            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/30 rounded-full transition-all text-yellow-400 text-xs md:text-sm font-bold"
                        >
                            <Crown className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            <span className="hidden sm:inline">Nâng Cấp</span>
                        </Link>

                        {/* Notifications */}
                        {user && (
                            <div ref={notificationRef} className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                >
                                    <Bell className="w-5 h-5 md:w-6 md:h-6" />
                                    {notifUnreadCount > 0 && (
                                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50">
                                        <div className="p-3 border-b border-white/10 flex justify-between items-center bg-white/5">
                                            <h3 className="text-sm font-bold text-white">Thông báo</h3>
                                            {notifUnreadCount > 0 && (
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
                                        <div className={`p-3 border-b border-white/10 ${user.isPremium ? 'bg-surface-900 relative overflow-hidden' : 'bg-white/5'}`}>
                                            {user.isPremium && (
                                                <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />
                                            )}
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-bold truncate ${user.isPremium ? 'text-yellow-400' : 'text-white'}`}>
                                                        {user.displayName || user.email}
                                                    </p>
                                                    {user.isPremium && <Crown className="w-4 h-4 text-yellow-500 shrink-0 animate-pulse" />}
                                                </div>
                                                <p className="text-xs truncate text-gray-400">{user.email}</p>
                                            </div>
                                        </div>

                                        <Link href="/profile" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5">
                                            <User className="w-4 h-4" /> Trang cá nhân
                                        </Link>
                                        <Link href="/favorites" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5">
                                            <Heart className="w-4 h-4" /> Danh sách yêu thích
                                        </Link>
                                        <Link href="/history" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5">
                                            <Clock className="w-4 h-4" /> Phim đang xem
                                        </Link>
                                        <Link href="/my-lists" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5">
                                            <List className="w-4 h-4" /> Danh sách của tôi
                                        </Link>


                                        {user.role === 'admin' && (
                                            <Link href="/admin" onClick={() => setShowUserMenu(false)} className="block px-3 py-2.5 text-sm font-semibold text-primary hover:bg-white/10 transition-colors border-b border-white/5">
                                                Trang quản trị (Admin)
                                            </Link>
                                        )}

                                        <div className="flex justify-center px-2 py-1.5">
                                            <DonateButton />
                                        </div>

                                        <Link href="/feedback" onClick={() => setShowUserMenu(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors border-b border-white/5">
                                            <MessageSquare className="w-4 h-4" /> Góp ý & Báo lỗi
                                        </Link>

                                        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors">
                                            <LogOut className="w-4 h-4" /> Đăng xuất
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            pathname !== '/login' && (
                                <div className="hidden md:block">
                                    <Button onClick={() => router.push('/login')} variant="outline" className="border-primary/50 text-primary hover:bg-primary hover:text-black transition-colors text-sm">
                                        Đăng nhập
                                    </Button>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile Browse Menu - Moved outside to escape header's stacking context (backdrop-blur) */}
            {showBrowseMenu && (
                <div className="md:hidden">
                    {/* Content (Bottom Sheet) */}
                    <div
                        ref={browseMenuContentRef}
                        className={`fixed inset-x-0 bottom-0 top-auto w-full bg-black/95 backdrop-blur-xl z-[200] rounded-t-3xl transition-all animate-in slide-in-from-bottom border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] ${isPWA ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : 'pb-20'
                            }`}
                    >
                        {/* Drawer Handle */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto my-2.5"></div>

                        <div className="p-3 space-y-1.5">
                            {!showGenreMenu ? (
                                <>
                                    <Link
                                        href="/phim-moi"
                                        className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-[0.98]"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                                            <Crown className="w-4.5 h-4.5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="text-white">Đề xuất / Phim mới</div>
                                            <div className="text-[10px] text-gray-400 font-normal leading-tight">Phim hot cập nhật mỗi ngày</div>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/phim-le"
                                        className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-[0.98]"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                                            <Film className="w-4.5 h-4.5 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="text-white">Phim lẻ</div>
                                            <div className="text-[10px] text-gray-400 font-normal leading-tight">Phim lẻ điện ảnh đặc sắc</div>
                                        </div>
                                    </Link>
                                    <Link
                                        href="/phim-bo"
                                        className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-[0.98]"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                            <List className="w-4.5 h-4.5 text-green-400" />
                                        </div>
                                        <div>
                                            <div className="text-white">Phim bộ</div>
                                            <div className="text-[10px] text-gray-400 font-normal leading-tight">Phim truyền hình dài tập</div>
                                        </div>
                                    </Link>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowGenreMenu(true);
                                        }}
                                        className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-[0.98]"
                                    >
                                        <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                                            <Filter className="w-4.5 h-4.5 text-purple-400" />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <div className="text-white">Thể loại</div>
                                            <div className="text-[10px] text-gray-400 font-normal leading-tight">Lọc phim theo chủ đề</div>
                                        </div>
                                        <span className="text-gray-500 text-xs">›</span>
                                    </button>
                                </>
                            ) : (
                                <div className="h-[55vh] flex flex-col overscroll-contain">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowGenreMenu(false);
                                        }}
                                        className="flex items-center gap-2 px-1 py-2.5 text-[11px] font-bold text-primary mb-1.5 shrink-0 animate-in fade-in slide-in-from-left-2 tracking-wider"
                                    >
                                        ‹ QUAY LẠI
                                    </button>
                                    <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 pb-6 overscroll-contain touch-pan-y">
                                        {genres.map((genre) => (
                                            <Link
                                                key={genre.slug}
                                                href={`/search?category=${genre.slug}`}
                                                className="px-3 py-3.5 text-[13px] font-medium text-gray-300 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-all text-center active:scale-95 flex items-center justify-center"
                                            >
                                                {genre.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/80 z-[190] backdrop-blur-md animate-in fade-in duration-300"
                        onClick={() => setShowBrowseMenu(false)}
                    />
                </div>
            )}
        </>
    );
}

