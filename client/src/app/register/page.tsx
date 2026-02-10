'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Loader2, Mail, Lock, User } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';

export default function RegisterPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [formData, setFormData] = useState({
        displayName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        const { displayName, email, password, confirmPassword } = formData;

        if (!displayName || !email || !password || !confirmPassword) {
            toast.error('Vui lòng điền đầy đủ thông tin');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Mật khẩu nhập lại không khớp');
            return;
        }

        if (password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ displayName, email, password })
            });

            const data = await response.json();

            if (data.success) {
                login(data.data.user); // Auto login check if backend returns user
                toast.success('Đăng ký thành công!');
                router.push('/');
            } else {
                toast.error(data.message || 'Đăng ký thất bại');
            }
        } catch (error) {
            console.error('Register error:', error);
            toast.error('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-deep-black flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <Link href="/" className="flex items-center justify-center gap-2 mb-8">
                    <img
                        src="/logo.jpg"
                        alt="Pchill Logo"
                        className="h-20 w-auto object-contain rounded-md"
                        style={{ mixBlendMode: 'screen' }}
                    />
                    <span className="text-4xl font-bold text-gold-gradient ml-2">PCHILL</span>
                </Link>

                <div className="bg-surface-900 border border-white/10 rounded-2xl p-8 shadow-2xl">
                    <h1 className="text-2xl font-bold text-white mb-2 text-center">Đăng ký tài khoản</h1>
                    <p className="text-gray-400 text-sm text-center mb-6">
                        Tạo tài khoản để trải nghiệm đầy đủ tính năng
                    </p>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Tên hiển thị</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                    name="displayName"
                                    placeholder="Nguyễn Văn A"
                                    value={formData.displayName}
                                    onChange={handleChange}
                                    className="pl-10 bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                    name="email"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="pl-10 bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                    name="password"
                                    type="password"
                                    placeholder="******"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="pl-10 bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm text-gray-400 mb-2 block">Nhập lại mật khẩu</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                <Input
                                    name="confirmPassword"
                                    type="password"
                                    placeholder="******"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="pl-10 bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-black font-bold mt-4"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang đăng ký...
                                </>
                            ) : (
                                'Đăng ký ngay'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-400">
                        Đã có tài khoản?{' '}
                        <Link href="/login" className="text-primary hover:underline">
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
