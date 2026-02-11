'use client';
import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const registered = searchParams.get('registered');

    useEffect(() => {
        if (registered) {
            toast.success('Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.', { duration: 6000 });
        }
    }, [registered]);

    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Vui lòng nhập email và mật khẩu');
            return;
        }
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (data.success) {
                login(data.data.user, data.data.token);
                if (data.data.user.role === 'admin') {
                    router.push('/admin');
                } else {
                    router.push('/');
                }
            } else {
                toast.error(data.message || 'Đăng nhập thất bại');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    // Handle Google Login
    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ idToken: credentialResponse.credential })
            });

            const data = await response.json();

            if (data.success) {
                login(data.data.user, data.data.token);
                if (data.data.user.role === 'admin') {
                    router.push('/admin');
                } else {
                    router.push('/');
                }
            } else {
                toast.error(data.message || 'Đăng nhập thất bại');
            }
        } catch (error) {
            console.error('Google login error:', error);
            toast.error('Lỗi khi đăng nhập bằng Google');
        } finally {
            setLoading(false);
        }
    };

    const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();

    const [width, setWidth] = useState('100%');

    useEffect(() => {
        // Dynamic width calculation or just set to a fixed pixel width if 100% fails
        // Google Sign-In button sometimes complains about 100% width
        // Let's try to not set width in props and handle container width instead
    }, []);

    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div className="min-h-screen bg-deep-black flex items-center justify-center px-4">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                        <img
                            src="/logo.png"
                            alt="Pchill Logo"
                            className="h-20 w-auto object-contain rounded-md"
                        />
                        <span className="text-4xl font-bold text-gold-gradient ml-2">PCHILL</span>
                    </Link>

                    {/* Login Card */}
                    <div className="bg-surface-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
                        <h1 className="text-2xl font-bold text-white mb-2 text-center">Đăng nhập</h1>
                        <p className="text-gray-400 text-sm text-center mb-6">
                            Đăng nhập để lưu tiến độ xem và trải nghiệm đầy đủ
                        </p>

                        {/* Email Login Form */}
                        <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Email</label>
                                <Input
                                    type="email"
                                    placeholder="email@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    className="bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                    required
                                />
                            </div>
                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className="text-sm text-gray-400">Mật khẩu</label>
                                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                                        Quên mật khẩu?
                                    </Link>
                                </div>
                                <Input
                                    type="password"
                                    placeholder="******"
                                    value={password}
                                    autoComplete="current-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Đang đăng nhập...
                                    </>
                                ) : (
                                    'Đăng nhập'
                                )}
                            </Button>
                            <div className="text-center text-sm text-gray-400">
                                Chưa có tài khoản? <Link href="/register" className="text-primary hover:underline">Đăng ký ngay</Link>
                            </div>
                        </form>

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-surface-900 text-gray-500">Hoặc tiếp tục với</span>
                            </div>
                        </div>

                        {/* Google Login */}
                        <div className="mb-6 flex justify-center">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => toast.error('Đăng nhập Google thất bại')}
                                useOneTap={false}
                                theme="filled_black"
                                size="large"
                                // removed width="100%"
                            />
                        </div>
                    </div>

                    <p className="text-center text-gray-500 text-sm mt-6">
                        Bằng việc đăng nhập, bạn đồng ý với{' '}
                        <Link href="/terms" className="text-primary hover:underline whitespace-nowrap">Điều khoản dịch vụ</Link>
                    </p>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-deep-black"></div>}>
            <LoginContent />
        </Suspense>
    );
}
