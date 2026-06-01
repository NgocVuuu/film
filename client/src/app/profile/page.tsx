'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import {
    User, Lock, Save, Loader2, LogOut, Crown,
    ChevronRight, FileText, Shield,
    Plus, ArrowLeft, Mail, Smartphone, MessageCircle,
    Trophy, PlayCircle
} from 'lucide-react';
import ProfileChatTab from '@/components/ProfileChatTab';
import { customFetch } from '@/lib/api';
import { PWASettings } from '@/components/PWASettings';
import { PremiumUpsellCard } from '@/components/PremiumUpsellCard';
import { PWAAds } from '@/components/PWAAds';
import { DonateButton } from '@/components/DonateButton';

function ProfileContent() {
    const { user, loading: authLoading, refresh, logout } = useAuth(); // Changed checkAuth to refresh
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const isEditMode = mode === 'edit';
    const initTab = searchParams.get('tab') as 'profile' | 'security' | 'pwa' | 'chat';
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'pwa' | 'chat'>(initTab || 'profile');
    const isMobileSubView = isEditMode || activeTab === 'chat';

    // ... (rest of state)

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    // ... (rest of code)

    // Profile State
    const [displayName, setDisplayName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [updatingProfile, setUpdatingProfile] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // PWA section toggle (collapsed by default)
    const [showPwaSection, setShowPwaSection] = useState(false);

    // Refresh user data on mount to get latest subscription info
    useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            setDisplayName(user.displayName || '');
            setAvatar(user.avatar || '');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (initTab) {
            setActiveTab(initTab);
        }
    }, [initTab]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingProfile(true);
        try {
            const res = await customFetch(`/api/auth/update-profile`, {
                method: 'PUT',
                credentials: 'include',
                body: JSON.stringify({ displayName, avatar })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Cập nhật thông tin thành công!');
                refresh(); // Refresh user data
            } else {
                toast.error(data.message || 'Lỗi cập nhật.');
            }
        } catch {
            toast.error('Lỗi kết nối.');
        } finally {
            setUpdatingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Mật khẩu mới không khớp.');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        setChangingPassword(true);
        try {
            const res = await customFetch(`/api/auth/change-password`, {
                method: 'PUT',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Đổi mật khẩu thành công!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(data.message || 'Lỗi đổi mật khẩu.');
            }
        } catch {
            toast.error('Lỗi kết nối.');
        } finally {
            setChangingPassword(false);
        }
    };

    if (authLoading || !user) {
        return <div className="min-h-screen bg-deep-black flex items-center justify-center text-primary"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    return (
        <div className="bg-deep-black text-foreground h-[calc(100dvh-9.5rem)] md:h-[calc(100vh-4rem)] overflow-hidden flex flex-col pt-[env(safe-area-inset-top)]">
            <div className={`container mx-auto w-full max-w-full flex-1 flex flex-col min-h-0 overflow-hidden ${activeTab === 'chat' ? 'px-0 md:px-8' : 'px-4'}`}>

                {activeTab !== 'chat' && (
                    <h1 className={`text-xl md:text-2xl font-bold mb-3 md:mb-4 mt-1 text-white items-center gap-2 shrink-0 ${isMobileSubView ? 'flex' : 'hidden md:flex'}`}>
                        {isMobileSubView && (
                            <button onClick={() => {
                                setActiveTab('profile');
                                router.push('/profile');
                            }} className="md:hidden mr-2">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                        )}
                        <User className="w-6 h-6 text-primary" />
                        Quản lý tài khoản
                    </h1>
                )}

                {/* Mobile Dashboard View */}
                <div className={`md:hidden ${isMobileSubView ? 'hidden' : 'block'} pb-8 overflow-y-auto overflow-x-hidden flex-1`}>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="relative shrink-0">
                            <img
                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                alt={user.displayName}
                                className="w-16 h-16 rounded-full border-2 border-primary object-cover"
                            />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                {user.isPremium ? (
                                    <span className="bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm shrink-0">PREMIUM</span>
                                ) : (
                                    <span className="bg-surface-700 text-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10 shrink-0">FREE</span>
                                )}
                                <h2 className="font-bold text-white text-lg truncate">{user.displayName}</h2>
                            </div>
                            <p className="text-gray-400 text-sm truncate">{user.email}</p>
                        </div>
                    </div>

                    <div className="mb-8">
                        <div className={`p-4 rounded-xl border flex flex-col justify-between h-32 relative overflow-hidden group ${user.isPremium ? 'bg-linear-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/30' : 'bg-surface-900/50 border-white/10'}`}>
                            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Crown className={`w-12 h-12 ${user.isPremium ? 'text-yellow-500' : 'text-gray-600'}`} />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className={`text-sm font-bold ${user.isPremium ? 'text-yellow-400' : 'text-gray-300'}`}>
                                        {user.isPremium ? 'Thành viên Premium' : 'Thành viên Miễn phí'}
                                    </p>
                                    {user.isPremium && user.subscription?.endDate && (
                                        <p className="text-[10px] text-yellow-500/70 font-medium">
                                            Hết hạn: {new Date(user.subscription.endDate).toLocaleDateString('vi-VN')}
                                        </p>
                                    )}
                                </div>
                                <p className="text-gray-500 text-xs leading-relaxed font-vietnamese">
                                    {user.isPremium
                                        ? 'Cảm ơn bạn đã "nuôi" ad! Nhờ bạn mà server vẫn chạy phà phà, cùng tận hưởng đặc quyền thôi nào! ✨🙏'
                                        : '💝 Donate bất kỳ số tiền nào để được ẩn quảng cáo trong 1 tháng, nội dung là email Pchill của bạn. Cảm ơn bạn đã ủng hộ Pchill!'}
                                </p>
                            </div>
                            {/* Hidden: Nâng cấp / Gia hạn button */}
                            {false && (
                                <Link href="/pricing">
                                    <Button className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black text-xs h-8 font-bold mt-auto relative z-10 shadow-lg shadow-yellow-500/10">
                                        {user?.isPremium ? 'Gia hạn' : 'Nâng cấp'} <span className="ml-1 text-[10px]">▲</span>
                                    </Button>
                                </Link>
                            )}
                        </div>

                        <DonateButton className="mt-3 w-full justify-center" />
                    </div>

                    {/* PWA Features Section */}
                    <div className="mb-8">
                        <button
                            onClick={() => setShowPwaSection(prev => !prev)}
                            className="w-full flex items-center justify-between gap-2 mb-4 group"
                        >
                            <div className="flex items-center gap-2">
                                <Smartphone className="w-5 h-5 text-primary" />
                                <h2 className="text-lg font-bold text-white">Ứng dụng di động</h2>
                            </div>
                            <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showPwaSection ? 'rotate-90' : ''}`} />
                        </button>
                        {showPwaSection && <PWASettings />}
                    </div>

                    <Link href="/profile?mode=edit" className="block w-full bg-white hover:bg-gray-100 text-black font-bold py-3.5 text-center rounded-xl mb-4 shadow-lg transition-colors">
                        Quản lý tài khoản
                    </Link>

                    <div className="mb-8">
                        <PWAAds />
                    </div>

                    <div className="space-y-1">
                        <MobileMenuLink href="/my-lists" icon={Plus} label="Danh sách phim của tôi" />
                        <div className="h-px bg-white/5 my-2 mx-4" />
                        
                        {/* New Features Mobile */}
                        <MobileMenuLink href="/leaderboard" icon={Trophy} label="Bảng Xếp Hạng" />
                        <MobileMenuLink href="/moments" icon={PlayCircle} label="Khoảnh Khắc PChill" />
                        <div className="h-px bg-white/5 my-2 mx-4" />

                        <button
                            onClick={() => {
                                setActiveTab('chat');
                                // Force scroll to top or update URL if needed
                                router.push('/profile?tab=chat');
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors group border-b border-white/5"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-9 h-9 rounded-full bg-surface-800 flex items-center justify-center border border-white/5 group-hover:bg-primary/20 group-hover:border-primary/50 transition-colors">
                                    <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>
                                <span className="font-medium text-gray-200 group-hover:text-white transition-colors text-sm">Chat with Ad</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                        </button>
                        <MobileMenuLink href="/dmca" icon={Shield} label="DMCA - Bản quyền" />
                        <MobileMenuLink href="/terms" icon={FileText} label="Điều khoản sử dụng" />
                        <MobileMenuLink href="/privacy" icon={Lock} label="Chính sách bảo mật" />
                        <MobileMenuLink href="/feedback" icon={Mail} label="Liên hệ & Góp ý" />
                    </div>

                    <button onClick={handleLogout} className="mt-8 flex items-center gap-4 text-red-500 font-medium px-4 w-full py-4 hover:bg-surface-900/50 rounded-xl transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span>Đăng xuất</span>
                    </button>
                </div>

                <div className={`flex flex-col md:flex-row gap-4 md:gap-8 flex-1 overflow-hidden min-h-0 ${activeTab === 'chat' ? 'pb-0 md:pb-8' : 'pb-6 md:pb-8'} ${isMobileSubView ? 'flex' : 'hidden md:flex'}`}>
                    {/* Sidebar / Tabs */}
                    <div className={`w-full md:w-72 shrink-0 px-4 md:px-0 ${activeTab === 'chat' ? 'hidden md:block' : ''}`}>
                        <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                            <div className={`hidden md:block p-3 border-b border-white/10 ${user.isPremium ? 'bg-surface-900 relative' : 'bg-surface-800'}`}>
                                {user.isPremium && (
                                    <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />
                                )}
                                <div className="relative z-10 flex items-center gap-3">
                                    <div className="relative shrink-0">
                                        <img
                                            src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                            alt={user.displayName}
                                            className={`w-12 h-12 rounded-full border ${user.isPremium ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]' : 'border-primary'} object-cover shadow-lg`}
                                        />
                                        <div className="absolute -bottom-0.5 -right-0.5 bg-surface-910 p-0.5 rounded-full border border-white/10">
                                            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <h3 className={`text-base font-bold truncate ${user.isPremium ? 'text-yellow-400' : 'text-white'}`}>{user.displayName}</h3>
                                            {user.isPremium && <Crown className="w-4 h-4 text-yellow-500 shrink-0 animate-pulse" />}
                                        </div>
                                        <p className="text-xs truncate text-gray-400 leading-tight">{user.email}</p>
                                        {user.role === 'admin' && (
                                            <span className="mt-1 inline-block px-1.5 py-0.5 bg-red-500/20 text-red-500 text-[9px] font-bold rounded border border-red-500/20 uppercase tracking-tighter">
                                                Admin
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <nav className="grid grid-cols-2 md:flex md:flex-col p-2 gap-2 md:gap-0 md:space-y-1">
                                {/* Desktop Sidebar Status Banner */}
                                <div className={`hidden md:block mb-2 p-3 rounded-lg border relative overflow-hidden group ${user.isPremium ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-surface-800/50 border-white/5'}`}>
                                    <div className="absolute -top-1 -right-1 opacity-10 group-hover:opacity-15 transition-opacity">
                                        <Crown className={`w-8 h-8 ${user.isPremium ? 'text-yellow-500' : 'text-gray-600'}`} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <p className={`text-sm font-bold ${user.isPremium ? 'text-yellow-400' : 'text-gray-300'}`}>
                                                {user.isPremium ? 'Thành viên Premium' : 'Thành viên Miễn phí'}
                                            </p>
                                            {user.isPremium && user.subscription?.endDate && (
                                                <p className="text-[10px] text-yellow-500/70 font-medium shrink-0">
                                                    Hết hạn: {new Date(user.subscription.endDate).toLocaleDateString('vi-VN')}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 leading-normal font-vietnamese">
                                            {user.isPremium
                                                ? 'Cảm ơn bạn đã "nuôi" ad! Nhờ bạn mà server vẫn chạy phà phà, cùng tận hưởng đặc quyền thôi nào! ✨🙏'
                                                : '💝 Donate bất kỳ số tiền nào để được ẩn quảng cáo trong 1 tháng, nội dung là email Pchill của bạn. Cảm ơn bạn đã ủng hộ Pchill!'}
                                        </p>
                                    </div>
                                </div>

                                <div className="hidden md:flex justify-center mb-1.5">
                                    <DonateButton />
                                </div>

                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`flex-1 md:flex-none md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2 md:px-3 md:py-2.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <User className="w-3.5 h-3.5" />
                                    <span className="whitespace-nowrap">Thông tin cá nhân</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className={`flex-1 md:flex-none md:w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-3 py-2 md:px-3 md:py-2.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span className="whitespace-nowrap">Bảo mật & Mật khẩu</span>
                                </button>
                                {/* Hidden: Ứng dụng di động on desktop */}
                                {false && (
                                    <button
                                        onClick={() => setActiveTab('pwa')}
                                        className={`hidden md:flex w-full items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'pwa' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                    >
                                        <Smartphone className="w-3.5 h-3.5 shrink-0" />
                                        <span className="flex-1 text-left whitespace-nowrap">Ứng dụng di động</span>
                                        {user?.isPremium && (
                                            <Crown className="w-3 h-3 text-yellow-500 shrink-0" />
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        setActiveTab('chat');
                                        router.push('/profile?tab=chat');
                                    }}
                                    className={`hidden md:flex w-full items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'chat' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span className="flex-1 text-left whitespace-nowrap">Chat with Ad</span>
                                </button>

                                <div className="hidden md:block border-t border-white/10 my-1.5 pt-1.5">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <LogOut className="w-3.5 h-3.5 shrink-0" />
                                        <span>Đăng xuất</span>
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto min-h-0 rounded-xl custom-scrollbar relative">
                        <div className={`h-full ${activeTab === 'chat' ? '' : 'bg-surface-900 border border-white/10 p-6 md:p-8'}`}>
                            {activeTab === 'profile' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xl font-bold text-white border-b border-white/10 pb-4 mb-6">Thông tin cá nhân</h2>
                                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Tên hiển thị</label>
                                            <Input
                                                value={displayName}
                                                onChange={(e) => setDisplayName(e.target.value)}
                                                className="bg-black/20 border-white/10 text-white focus:border-primary"
                                                placeholder="Nhập tên hiển thị của bạn"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Email</label>
                                            <Input
                                                value={user.email}
                                                disabled
                                                className="bg-black/20 border-white/10 text-gray-500 cursor-not-allowed"
                                            />
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Lock className="w-3 h-3" /> Email không thể thay đổi
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Avatar URL</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={avatar}
                                                    onChange={(e) => setAvatar(e.target.value)}
                                                    className="bg-black/20 border-white/10 text-white focus:border-primary"
                                                    placeholder="https://example.com/avatar.jpg"
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                Hỗ trợ ảnh từ URL (Google Photos, Imgur...).
                                            </p>
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <Button type="submit" disabled={updatingProfile} className="bg-primary hover:bg-gold-600 text-black font-bold">
                                                {updatingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                                Lưu thay đổi
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            ) : activeTab === 'security' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <h2 className="text-xl font-bold text-white border-b border-white/10 pb-4 mb-6">Đổi mật khẩu</h2>
                                    {/* Warning for Google Users */}
                                    {!user.hasPassword ? (
                                        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 p-4 rounded-lg text-sm mb-4">
                                            Lưu ý: Nếu bạn đăng nhập bằng Google, bạn không thể đổi mật khẩu tại đây.
                                        </div>
                                    ) : null}

                                    <form onSubmit={handleChangePassword} className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Mật khẩu hiện tại</label>
                                            <Input
                                                type="password"
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                className="bg-black/20 border-white/10 text-white focus:border-primary"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Mật khẩu mới</label>
                                            <Input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="bg-black/20 border-white/10 text-white focus:border-primary"
                                                placeholder="••••••••"
                                            />
                                            <p className="text-xs text-gray-500">Tối thiểu 6 ký tự.</p>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-300">Xác nhận mật khẩu mới</label>
                                            <Input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="bg-black/20 border-white/10 text-white focus:border-primary"
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <Button type="submit" disabled={changingPassword} className="bg-primary hover:bg-gold-600 text-black font-bold">
                                                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                                Cập nhật mật khẩu
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            ) : activeTab === 'pwa' ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="border-b border-white/10 pb-4 mb-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <Smartphone className="w-6 h-6 text-primary" />
                                            <h2 className="text-xl font-bold text-white">Ứng dụng di động</h2>
                                        </div>
                                        <p className="text-sm text-gray-400">
                                            Cài đặt app lên thiết bị và trải nghiệm xem phim mượt mà hơn
                                        </p>
                                    </div>

                                    {user.isPremium ? (
                                        <PWASettings />
                                    ) : (
                                        <PWAInstallGuide />
                                    )}
                                </div>
                            ) : activeTab === 'chat' ? (
                                <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full">
                                    <ProfileChatTab onBack={() => {
                                        setActiveTab('profile');
                                        router.push('/profile');
                                    }} />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-deep-black flex items-center justify-center text-primary">
                <Loader2 className="animate-spin w-8 h-8" />
            </div>
        }>
            <ProfileContent />
        </Suspense>
    );
}

function MobileMenuLink({ href, icon: Icon, label }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
    return (
        <Link href={href} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors group border-b border-white/5 last:border-0">
            <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-surface-800 flex items-center justify-center border border-white/5 group-hover:bg-primary/20 group-hover:border-primary/50 transition-colors">
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                </div>
                <span className="font-medium text-gray-200 group-hover:text-white transition-colors text-sm">{label}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
        </Link>
    );
}

function PWAInstallGuide() {
    return (
        <div className="space-y-3">
            <p className="text-sm text-gray-300 leading-relaxed">
                Cài app <span className="text-primary font-semibold">Pchill</span> miễn phí — chỉ cần thêm web ra màn hình chính, không cần App Store hay Google Play!
            </p>

            {/* iOS */}
            <div className="bg-surface-800/60 border border-white/8 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-base"></span>
                    <p className="text-sm font-bold text-white">iPhone / iPad (Safari)</p>
                </div>
                <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                        <span>Mở Safari và truy cập trang web</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                        <span>Nhấn nút <span className="text-white font-medium">Chia sẻ</span> <span className="text-primary">⬆</span> ở góc trên phải</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                        <span>Chọn <span className="text-white font-medium">&quot;Thêm vào màn hình chính&quot;</span> rồi nhấn <span className="text-white font-medium">Thêm</span></span>
                    </div>
                </div>
            </div>

            {/* Android */}
            <div className="bg-surface-800/60 border border-white/8 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm font-bold text-white">Android (Chrome)</p>
                </div>
                <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                        <span>Mở Chrome và truy cập trang web</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                        <span>Nhấn dấu <span className="text-white font-medium">⋮</span> (3 chấm) góc trên phải</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                        <span>Chọn <span className="text-white font-medium">&quot;Thêm vào màn hình chính&quot;</span> rồi xác nhận</span>
                    </div>
                </div>
            </div>


        </div>
    );
}


