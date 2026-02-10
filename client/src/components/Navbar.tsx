'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { Search, Menu, X, Film, Loader2, User, LogOut, Crown, Bell, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@/lib/config';

export default function Navbar() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading, logout } = useAuth();

    // Notifications
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const res = await fetch(`${API_URL}/api/notifications?limit=5`, { credentials: 'include' });
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

    const handleNotificationClick = async (notification: any) => {
        if (!notification.isRead) {
            try {
                await fetch(`${API_URL}/api/notifications/${notification._id}/read`, {
                    method: 'PUT',
                    credentials: 'include'
                });
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(prev => prev.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
            } catch (e) { console.error(e); }
        }
        setShowNotifications(false);
        if (notification.link) router.push(notification.link);
    };

    const handleMarkAllRead = async () => {
        try {
            await fetch(`${API_URL}/api/notifications/read-all`, {
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

    const navLinks = [
        { name: "Trang Chủ", href: "/" },
        { name: "Phim Mới", href: "/phim-moi" },
        { name: "Phim Bộ", href: "/phim-bo" },
        { name: "Phim Lẻ", href: "/phim-le" },
        { name: "Tủ Phim", href: "/favorites" },
        { name: "Lịch Sử", href: "/history" },
    ];

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

    // Debounce search
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        setIsSearching(true);
        const timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`${API_URL}/api/search/hybrid?q=${encodeURIComponent(searchQuery)}`, {
                    credentials: 'include'
                });
                const data = await response.json();
                if (data.success) {
                    setSearchSuggestions(data.data.slice(0, 5));
                    setShowSuggestions(data.data.length > 0);
                }
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    // Click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
            setIsMobileMenuOpen(false);
            setShowSuggestions(false);
            setIsSearchOpen(false);
        }
    };

    const handleSuggestionClick = (slug: string) => {
        router.push(`/movie/${slug}`);
        setSearchQuery('');
        setShowSuggestions(false);
        setIsSearchOpen(false);
    };

    // Hide Navbar on Watch Page (Theater Mode)
    if (pathname && pathname.endsWith('/watch')) {
        return null;
    }

    return (
        <header
            className={`fixed top-0 z-50 w-full transition-all duration-300 ${isScrolled ? 'bg-deep-black/95 backdrop-blur-sm shadow-md shadow-primary/10' : 'bg-transparent'
                }`}
        >
            <div className="container mx-auto flex h-16 items-center justify-between px-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <img
                        src="/logo.png"
                        alt="Pchill Logo"
                        className="h-14 w-auto object-contain rounded-md"
                    />
                    <span className="text-2xl font-bold tracking-tighter text-gold-gradient hidden sm:block">
                        PCHILL
                    </span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-6">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium hover:text-primary transition-colors"
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {/* Search & Actions */}
                <div className="hidden md:flex items-center gap-2">
                    {/* Expandable Search */}
                    <div
                        ref={searchRef}
                        className={`relative flex items-center transition-all duration-300 ${isSearchOpen ? 'w-80 bg-white/10' : 'w-10 bg-transparent'} rounded-full overflow-visible border border-transparent ${isSearchOpen ? 'border-white/10' : ''}`}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-gray-300 hover:text-white hover:bg-transparent flex-shrink-0"
                            onClick={() => {
                                setIsSearchOpen(!isSearchOpen);
                            }}
                        >
                            <Search className="h-5 w-5" />
                        </Button>
                        <form
                            onSubmit={handleSearch}
                            className={`flex-1 ${isSearchOpen ? 'block' : 'hidden'}`}
                        >
                            <input
                                type="text"
                                placeholder="Tìm kiếm phim..."
                                className="w-full bg-transparent border-none outline-none text-white text-sm px-2 placeholder-gray-500 h-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                                onFocus={() => {
                                    if (searchSuggestions.length > 0) setShowSuggestions(true);
                                }}
                            />
                        </form>
                        {isSearchOpen && (
                            <>
                                {isSearching && (
                                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin mr-2" />
                                )}
                                {searchQuery && !isSearching && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-white flex-shrink-0"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSearchSuggestions([]);
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </>
                        )}

                        {/* Search Suggestions Dropdown */}
                        {showSuggestions && searchSuggestions.length > 0 && isSearchOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50">
                                {searchSuggestions.map((movie) => (
                                    <button
                                        key={movie._id}
                                        onClick={() => handleSuggestionClick(movie.slug)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors text-left border-b border-white/5 last:border-0"
                                    >
                                        <img
                                            src={movie.thumb_url}
                                            alt={movie.name}
                                            className="w-12 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{movie.name}</p>
                                            <p className="text-xs text-gray-400 truncate">{movie.origin_name} • {movie.year}</p>
                                        </div>
                                    </button>
                                ))}
                                <button
                                    onClick={handleSearch}
                                    className="w-full p-3 text-center text-sm text-primary hover:bg-white/5 transition-colors border-t border-white/10"
                                >
                                    Xem tất cả kết quả cho "{searchQuery}"
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    {user && (
                        <div ref={notificationRef} className="relative mr-2">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-300 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse ring-2 ring-black"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 top-full mt-2 w-80 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50">
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
                                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.isRead ? 'bg-primary' : 'bg-transparent'}`}></div>
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

                    {/* User Menu */}
                    {!loading && (
                        <div ref={userMenuRef} className="relative">
                            {user ? (
                                <>
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-full transition-colors"
                                    >
                                        <img
                                            src={user.avatar}
                                            alt={user.displayName}
                                            className="w-8 h-8 rounded-full"
                                        />
                                        {user.subscription?.tier === 'premium' && (
                                            <Crown className="w-4 h-4 text-primary" />
                                        )}
                                    </button>

                                    {/* User Dropdown */}
                                    {showUserMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-64 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg overflow-hidden shadow-2xl z-50">
                                            <div className="p-4 border-b border-white/10">
                                                <p className="text-white font-medium truncate">{user.displayName}</p>
                                                <p className="text-xs text-gray-400 truncate">{user.email || user.phoneNumber}</p>
                                                {user.subscription?.tier === 'premium' && (
                                                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary text-xs font-bold rounded border border-primary/20">
                                                        <Crown className="w-3 h-3" />
                                                        Premium
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-2">
                                                <Link
                                                    href="/profile"
                                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors"
                                                    onClick={() => setShowUserMenu(false)}
                                                >
                                                    <User className="w-4 h-4" />
                                                    Tài khoản
                                                </Link>
                                                {user.subscription?.tier !== 'premium' && (
                                                    <Link
                                                        href="/pricing"
                                                        className="flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                                                        onClick={() => setShowUserMenu(false)}
                                                    >
                                                        <Crown className="w-4 h-4" />
                                                        Nâng cấp Premium
                                                    </Link>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        logout();
                                                        setShowUserMenu(false);
                                                        router.push('/');
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white rounded transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Đăng xuất
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Button
                                    onClick={() => router.push('/login')}
                                    className="bg-primary hover:bg-primary/90 text-black font-bold"
                                >
                                    Đăng nhập
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile Toggle */}
                <button
                    className="md:hidden text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-deep-black border-t border-gray-800 px-4 py-4 space-y-4">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Tìm kiếm..."
                            className="w-full rounded-full bg-secondary/20 pl-8 text-sm text-white"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <nav className="flex flex-col space-y-3">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="text-white hover:text-primary block py-2"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
