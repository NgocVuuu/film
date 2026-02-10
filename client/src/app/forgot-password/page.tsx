'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Film, Loader2, Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error('Vui lòng nhập email');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                setSent(true);
                toast.success('Email đặt lại mật khẩu đã được gửi!');
            } else {
                toast.error(data.message || 'Gửi yêu cầu thất bại');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
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
                    <Link href="/login" className="text-gray-400 hover:text-white flex items-center gap-2 mb-6 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
                    </Link>

                    <h1 className="text-2xl font-bold text-white mb-2 text-center">Quên mật khẩu?</h1>
                    <p className="text-gray-400 text-sm text-center mb-6">
                        Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
                    </p>

                    {sent ? (
                        <div className="text-center space-y-4">
                            <div className="bg-green-500/10 text-green-400 p-4 rounded-lg border border-green-500/20">
                                Email đã được gửi đến <strong>{email}</strong>. Vui lòng kiểm tra hộp thư đến (và mục spam) để đặt lại mật khẩu.
                            </div>
                            <Button
                                onClick={() => setSent(false)}
                                variant="outline"
                                className="w-full text-white border-white/10 hover:bg-white/10"
                            >
                                Gửi lại nếu chưa nhận được
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Email đăng ký</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                                    <Input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="pl-10 bg-surface-800 border-white/10 text-white placeholder-gray-500"
                                        required
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary hover:bg-primary/90 text-black font-bold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Đang gửi...
                                    </>
                                ) : (
                                    'Gửi liên kết'
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
