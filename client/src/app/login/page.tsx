'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Phone, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [verificationId, setVerificationId] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [loading, setLoading] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email'); // Default email for testing

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
                login(data.data.user);
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
        // ... (existing code, keep as is but I'll need to copy it if I replace whole file, or use careful replacement)
        // Since I'm using replace_chunk, I'll be careful.
        // Actually I'm replacing from line 25 to end, so I need to include the rest.
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
                login(data.data.user);
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

    // Setup reCAPTCHA
    const setupRecaptcha = () => {
        if (!(window as any).recaptchaVerifier) {
            (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                size: 'invisible',
                callback: () => {
                    // reCAPTCHA solved
                }
            });
        }
    };

    // Send OTP
    const handleSendOTP = async () => {
        if (!phoneNumber.trim()) {
            toast.error('Vui lòng nhập số điện thoại');
            return;
        }

        // Validate Vietnamese phone number
        const phoneRegex = /^(\+84|84|0)[3|5|7|8|9][0-9]{8}$/;
        if (!phoneRegex.test(phoneNumber)) {
            toast.error('Số điện thoại không hợp lệ');
            return;
        }

        try {
            setLoading(true);
            setupRecaptcha();

            // Format phone number to E.164
            let formattedPhone = phoneNumber;
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '+84' + formattedPhone.substring(1);
            } else if (formattedPhone.startsWith('84')) {
                formattedPhone = '+' + formattedPhone;
            }

            const appVerifier = (window as any).recaptchaVerifier;
            const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);

            setVerificationId((confirmationResult as any).verificationId);
            setStep('otp');
            toast.success('Mã OTP đã được gửi!');
        } catch (error: any) {
            console.error('Send OTP error:', error);
            toast.error(error.message || 'Lỗi khi gửi OTP');

            // Reset recaptcha on error
            if ((window as any).recaptchaVerifier) {
                (window as any).recaptchaVerifier.clear();
                (window as any).recaptchaVerifier = null;
            }
        } finally {
            setLoading(false);
        }
    };

    // Verify OTP
    const handleVerifyOTP = async () => {
        if (!otp.trim() || otp.length !== 6) {
            toast.error('Vui lòng nhập mã OTP 6 số');
            return;
        }

        try {
            setLoading(true);

            // Get Firebase user token
            const currentUser = auth.currentUser;
            if (!currentUser) {
                toast.error('Phiên đăng nhập đã hết hạn');
                setStep('phone');
                return;
            }

            const idToken = await currentUser.getIdToken();

            // Send to backend to verify and create/login user
            const response = await fetch(`${API_URL}/api/auth/phone/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    idToken,
                    displayName: phoneNumber
                })
            });

            const data = await response.json();

            if (data.success) {
                login(data.data.user);
                if (data.data.user.role === 'admin') {
                    router.push('/admin');
                } else {
                    router.push('/');
                }
            } else {
                toast.error(data.message || 'Xác thực thất bại');
            }
        } catch (error: any) {
            console.error('Verify OTP error:', error);
            toast.error(error.message || 'Lỗi khi xác thực OTP');
        } finally {
            setLoading(false);
        }
    };

    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id';

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

                        {/* Login Method Tabs */}
                        <div className="flex bg-surface-800 p-1 rounded-lg mb-6">
                            <button
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'email' ? 'bg-primary text-black shadow' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setLoginMethod('email')}
                            >
                                Email
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginMethod === 'phone' ? 'bg-primary text-black shadow' : 'text-gray-400 hover:text-white'}`}
                                onClick={() => setLoginMethod('phone')}
                            >
                                Số điện thoại
                            </button>
                        </div>

                        {/* Email Login Form */}
                        {loginMethod === 'email' && (
                            <form onSubmit={handleEmailLogin} className="space-y-4 mb-6">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Email</label>
                                    <Input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
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
                        )}


                        {/* Phone Login Form */}
                        {loginMethod === 'phone' && (
                            <>
                                {/* Phone Login */}
                                {step === 'phone' ? (
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="text-sm text-gray-400 mb-2 block">Số điện thoại</label>
                                            <Input
                                                type="tel"
                                                placeholder="0xxxxxxxxx"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                                            />
                                        </div>
                                        <Button
                                            onClick={handleSendOTP}
                                            disabled={loading}
                                            className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Đang gửi...
                                                </>
                                            ) : (
                                                <>
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    Gửi mã OTP
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="text-sm text-gray-400 mb-2 block">Mã OTP</label>
                                            <Input
                                                type="text"
                                                placeholder="Nhập 6 số"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                className="bg-surface-800 border-white/10 text-white placeholder-gray-500 text-center text-2xl tracking-widest"
                                                maxLength={6}
                                                autoFocus
                                                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                                            />
                                            <p className="text-xs text-gray-500 mt-2">
                                                Mã OTP đã được gửi đến {phoneNumber}
                                            </p>
                                        </div>
                                        <Button
                                            onClick={handleVerifyOTP}
                                            disabled={loading || otp.length !== 6}
                                            className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Đang xác thực...
                                                </>
                                            ) : (
                                                'Xác nhận OTP'
                                            )}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setStep('phone');
                                                setOtp('');
                                            }}
                                            variant="ghost"
                                            className="w-full text-gray-400"
                                        >
                                            Thay đổi số điện thoại
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="relative mb-6">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-surface-900 text-gray-500">Hoặc tiếp tục với</span>
                            </div>
                        </div>

                        {/* Google Login */}
                        <div className="mb-6">
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={() => toast.error('Đăng nhập Google thất bại')}
                                useOneTap={false}
                                theme="filled_black"
                                size="large"
                                width="100%"
                            />
                        </div>

                        <div id="recaptcha-container"></div>
                    </div>

                    <p className="text-center text-gray-500 text-sm mt-6">
                        Bằng việc đăng nhập, bạn đồng ý với{' '}
                        <Link href="/terms" className="text-primary hover:underline">Điều khoản dịch vụ</Link>
                    </p>
                </div>
            </div>
        </GoogleOAuthProvider>
    );
}
