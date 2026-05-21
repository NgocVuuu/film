'use client';
import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleOAuthProvider, useGoogleLogin, TokenResponse } from '@react-oauth/google';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
        // Xử lý sau khi Discord redirect về
        const discordLogin = searchParams.get('discord_login');
        if (discordLogin === 'success') {
            window.history.replaceState({}, '', window.location.pathname);
            // Reload để auth context đọc cookie mới từ server
            window.location.replace('/');
        }
    }, [registered, searchParams]);

    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Vui lòng nhập email và mật khẩu');
            return;
        }
        try {
            setLoading(true);
            setNeedsVerification(false); // Reset state
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
                if (data.message && data.message.includes('xác thực')) {
                    setNeedsVerification(true);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        try {
            setResendLoading(true);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                setNeedsVerification(false);
            } else {
                toast.error(data.message || 'Gửi lại thất bại');
            }
        } catch (error: unknown) {
            console.error('Resend error:', error);
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    toast.error('Yêu cầu quá lâu. Vui lòng thử lại.');
                } else if (error.message?.includes('Failed to fetch')) {
                    toast.error('Không kết nối được server.');
                } else {
                    toast.error(error.message || 'Lỗi kết nối');
                }
            } else {
                toast.error('Lỗi kết nối');
            }
        } finally {
            setResendLoading(false);
        }
    };

    // Handle Google Login
    const handleGoogleSuccess = async (tokenResponse: TokenResponse) => {
        try {
            setLoading(true);
            // tokenResponse contains access_token. 
            // We'll send this to a new or updated backend endpoint.
            // For now, let's keep the backend as is and see if we can get it to work.
            // If the backend expects an idToken, we might need to adjust it later.
            const response = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                // Adjusting the payload to indicate it's an access token if needed, 
                // but usually backends can handle both or we'll update server next.
                body: JSON.stringify({ accessToken: tokenResponse.access_token })
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

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleSuccess,
        onError: () => toast.error('Đăng nhập Google thất bại'),
    });

    // Discord OAuth - server-side redirect flow
    const handleDiscordLogin = () => {
        window.location.href = `${API_URL}/api/auth/discord`;
    };

    return (
        <div className="min-h-screen bg-deep-black flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <div className="relative w-auto h-20">
                        <Image
                            src="/logo.png"
                            alt="Pchill Logo"
                            width={200}
                            height={80}
                            className="h-20 w-auto object-contain rounded-md"
                            priority
                        />
                    </div>
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

                        {needsVerification && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center">
                                <p className="text-yellow-500 text-sm mb-2">Bạn dã đăng ký nhưng chưa xác thực?</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleResendVerification}
                                    disabled={resendLoading}
                                    className="w-full text-yellow-500 border-yellow-500 hover:bg-yellow-500 hover:text-black"
                                >
                                    {resendLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        'Gửi lại email xác thực'
                                    )}
                                </Button>
                            </div>
                        )}
                    </form>

                    <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-surface-900 text-gray-500">Hoặc tiếp tục với</span>
                        </div>
                    </div>

                    {/* Social Login Buttons (Horizontal Alignment) */}
                    <div className="flex gap-3.5 mb-6 w-full">
                        {/* Google Login Custom Button */}
                        <button
                            type="button"
                            onClick={() => googleLogin()}
                            className="flex-1 h-12 bg-white hover:bg-gray-100 text-black border-none flex items-center justify-center gap-2 font-bold transition-all rounded-xl shadow-md active:scale-95 text-xs xs:text-sm"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Google
                        </button>

                        {/* Discord Login Button */}
                        <button
                            type="button"
                            onClick={handleDiscordLogin}
                            className="flex-1 h-12 bg-[#5865F2] hover:bg-[#4752C4] text-white border-none flex items-center justify-center gap-2 font-bold transition-all rounded-xl shadow-md active:scale-95 text-xs xs:text-sm"
                        >
                            <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.074.11 18.09.12 18.1a19.904 19.904 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                            </svg>
                            Discord
                        </button>
                    </div>
                </div>

                <p className="text-center text-gray-500 text-sm mt-6">
                    Bằng việc đăng nhập, bạn đồng ý với{' '}
                    <Link href="/terms" className="text-primary hover:underline whitespace-nowrap">Điều khoản dịch vụ</Link>
                    {' '}và{' '}
                    <Link href="/privacy" className="text-primary hover:underline whitespace-nowrap">Chính sách bảo mật</Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
    return (
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <Suspense fallback={<div className="min-h-screen bg-deep-black"></div>}>
                <LoginContent />
            </Suspense>
        </GoogleOAuthProvider>
    );
}
