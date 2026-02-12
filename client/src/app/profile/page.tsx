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
    Plus, ArrowLeft, Mail
} from 'lucide-react';
import { customFetch } from '@/lib/api';

function ProfileContent() {
    const { user, loading: authLoading, refresh, logout } = useAuth(); // Changed checkAuth to refresh
    const router = useRouter();
    const searchParams = useSearchParams();
    const mode = searchParams.get('mode');
    const isEditMode = mode === 'edit';
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

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

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            setDisplayName(user.displayName || '');
            setAvatar(user.avatar || '');
        }
    }, [user, authLoading, router]);

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
        <div className="min-h-screen bg-deep-black text-foreground pt-24 pb-20">
            <div className="container mx-auto px-4 max-w-4xl">
                
                <h1 className={`text-3xl font-bold mb-8 text-white items-center gap-3 ${isEditMode ? 'flex' : 'hidden md:flex'}`}>
                    {isEditMode && (
                        <Link href="/profile" className="md:hidden mr-2">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                    )}
                    <User className="w-8 h-8 text-primary" />
                    Quản lý tài khoản
                </h1>

                {/* Mobile Dashboard View */}
                <div className={`md:hidden ${isEditMode ? 'hidden' : 'block'} pb-8`}>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="relative shrink-0">
                            <img 
                                src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                                alt={user.displayName} 
                                className="w-16 h-16 rounded-full border-2 border-primary object-cover"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">LV.1</span>
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
                        <div className="bg-surface-900/50 p-4 rounded-xl border border-white/10 flex flex-col justify-between h-32 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Crown className="w-12 h-12"/>
                            </div>
                            <p className="text-gray-400 text-xs font-medium leading-relaxed relative z-10">
                                {user.isPremium ? 'Thành viên cao cấp' : 'Bạn đang là thành viên miễn phí'}
                            </p>
                            <Button className="w-full bg-[#fbbf24] hover:bg-[#f59e0b] text-black text-xs h-8 font-bold mt-auto relative z-10 shadow-lg shadow-yellow-500/10">
                                {user.isPremium ? 'Gia hạn' : 'Nâng cấp'} <span className="ml-1 text-[10px]">▲</span>
                            </Button>
                        </div>
                    </div>

                    <Link href="/profile?mode=edit" className="block w-full bg-white hover:bg-gray-100 text-black font-bold py-3.5 text-center rounded-xl mb-8 shadow-lg transition-colors">
                        Quản lý tài khoản
                    </Link>

                    <div className="space-y-1">
                        <MobileMenuLink href="/my-lists" icon={Plus} label="Danh sách phim của tôi" />
                        <div className="h-px bg-white/5 my-2 mx-4" />
                        <MobileMenuLink href="/dmca" icon={Shield} label="DMCA - Bản quyền" />
                        <MobileMenuLink href="/terms" icon={FileText} label="Điều khoản sử dụng" />
                        <MobileMenuLink href="/privacy" icon={Lock} label="Chính sách bảo mật" />
                        <MobileMenuLink href="/contact" icon={Mail} label="Liên hệ & Góp ý" />
                    </div>
                    
                    <button onClick={handleLogout} className="mt-8 flex items-center gap-4 text-red-500 font-medium px-4 w-full py-4 hover:bg-surface-900/50 rounded-xl transition-colors">
                        <LogOut className="w-5 h-5"/> 
                        <span>Đăng xuất</span>
                    </button>
                </div>

                <div className={`flex flex-col md:flex-row gap-8 ${isEditMode ? 'block' : 'hidden md:flex'}`}>
                    {/* Sidebar / Tabs */}
                    <div className="w-full md:w-64 shrink-0">
                        <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden sticky top-24">
                            <div className="p-6 text-center border-b border-white/10 bg-surface-800">
                                <div className="relative inline-block">
                                    <img
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}`}
                                        alt={user.displayName}
                                        className="w-24 h-24 rounded-full border-4 border-primary mx-auto mb-3 object-cover shadow-lg"
                                    />
                                    <div className="absolute bottom-0 right-0 bg-surface-900 p-1.5 rounded-full border border-white/10">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-white truncate">{user.displayName}</h3>
                                <p className="text-sm text-gray-400 truncate">{user.email}</p>
                                {user.role === 'admin' && (
                                    <span className="mt-2 inline-block px-2 py-0.5 bg-red-500/20 text-red-500 text-xs font-bold rounded border border-red-500/20 uppercase">
                                        Admin
                                    </span>
                                )}
                            </div>
                            <nav className="p-2 space-y-1">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'profile' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <User className="w-4 h-4" />
                                    Thông tin cá nhân
                                </button>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeTab === 'security' ? 'bg-primary text-black' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                                >
                                    <Lock className="w-4 h-4" />
                                    Bảo mật & Mật khẩu
                                </button>

                                {/* Mobile Only Links - Removed as now handled by Dashboard View */}


                                <div className="border-t border-white/10 my-2 pt-2">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Đăng xuất
                                    </button>
                                </div>
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <div className="bg-surface-900 border border-white/10 rounded-xl p-6 md:p-8">
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
                            ) : (
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
                            )}
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

