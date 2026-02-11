'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { API_URL } from '@/lib/config';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { login } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Đang xác thực...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token không hợp lệ hoặc đã thiếu.');
            return;
        }

        const verifyToken = async () => {
            try {
                const response = await fetch(`${API_URL}/api/auth/verify-email?token=${token}`);
                const data = await response.json();

                if (data.success) {
                    setStatus('success');
                    setMessage('Xác thực tài khoản thành công!');
                    // Auto login if data provided
                    if (data.data && data.data.user) {
                        // We might not want to auto-login here if we want to be strict, 
                        // but logic says we can. 
                        // However, better to let user login manually or just define behavior.
                        // Let's just show success and button to login/home
                    }
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Xác thực thất bại.');
                }
            } catch (error) {
                console.error('Verify error:', error);
                setStatus('error');
                setMessage('Lỗi kết nối đến máy chủ.');
            }
        };

        verifyToken();
    }, [token]);

    return (
        <div className="min-h-screen bg-deep-black flex flex-col items-center justify-center px-4">
            <div className="bg-surface-900 border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md w-full text-center">
                {status === 'loading' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                        <h2 className="text-xl font-semibold text-white">Đang xác thực...</h2>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Thành công!</h2>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <Link href="/login">
                            <Button className="bg-primary hover:bg-primary/90 text-black px-8">
                                Đăng nhập ngay
                            </Button>
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Xác thực thất bại</h2>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <Link href="/login">
                            <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                                Quay lại đăng nhập
                            </Button>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-deep-black flex items-center justify-center text-white">Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
