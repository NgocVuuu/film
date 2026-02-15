'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    Film,
    LogOut,
    Menu,
    X,
    RefreshCw,
    MessageSquare,
    Flag,
    Video,
    Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

const navigation = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Movies', href: '/admin/movies', icon: Video },
    { name: 'Comments', href: '/admin/comments', icon: MessageSquare },
    { name: 'Reports', href: '/admin/reports', icon: Flag },
    { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
    { name: 'Movie Requests', href: '/admin/requests', icon: Film },
    { name: 'Notifications', href: '/admin/notifications', icon: Bell },
    { name: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
    { name: 'Crawler', href: '/admin/crawler', icon: RefreshCw },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                toast.error('Vui lòng đăng nhập');
                router.push('/login');
            } else if (user.role !== 'admin') {
                toast.error('Bạn không có quyền truy cập');
                router.push('/');
            }
        }
    }, [user, loading, router]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    if (loading || !user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-deep-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-deep-black">
            {/* Mobile sidebar toggle */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface-900 border-b border-white/10 px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold text-white">Admin Panel</h1>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? <X /> : <Menu />}
                </Button>
            </div>

            {/* Sidebar */}
            <aside className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-surface-900 border-r border-white/10 transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-white/10">
                        <Link href="/admin">
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-yellow-500 text-transparent bg-clip-text">
                                Admin Panel
                            </h1>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary text-black font-bold'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User info & logout */}
                    <div className="p-4 border-t border-white/10">
                        <div className="mb-3 px-4 py-2 bg-white/5 rounded-lg">
                            <p className="text-xs text-gray-500">Logged in as</p>
                            <p className="text-sm text-white font-medium truncate">{user.displayName}</p>
                        </div>
                        <Button
                            onClick={handleLogout}
                            variant="outline"
                            className="w-full border-white/10 text-white hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Đăng xuất
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0 overflow-x-hidden">
                <div className="p-4 md:p-6 lg:p-8">
                    {children}
                </div>
            </main>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
