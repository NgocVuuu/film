'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { API_URL } from '@/lib/config';

function PaymentCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'processing' | 'success' | 'failed'>('processing');
    const [message, setMessage] = useState('');

    useEffect(() => {
        processCallback();
    }, [searchParams]);

    const processCallback = async () => {
        try {
            // Get all query params
            const params = new URLSearchParams(searchParams!.toString());

            // Call backend to process
            const response = await fetch(
                `${API_URL}/api/subscriptions/callback?${params.toString()}`,
                { credentials: 'include' }
            );
            const data = await response.json();

            if (data.success) {
                setStatus('success');
                setMessage(data.message || 'Thanh toán thành công!');

                // Update user context after 2 seconds
                setTimeout(() => {
                    window.location.href = '/profile';
                }, 2000);
            } else {
                setStatus('failed');
                setMessage(data.message || 'Thanh toán thất bại');
            }
        } catch (error) {
            console.error('Callback error:', error);
            setStatus('failed');
            setMessage('Có lỗi xảy ra khi xử lý thanh toán');
        }
    };

    return (
        <div className="min-h-screen bg-deep-black flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-surface-900 border border-white/10 rounded-2xl p-8 text-center">
                {status === 'processing' && (
                    <>
                        <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
                        <h1 className="text-2xl font-bold text-white mb-2">Đang xử lý...</h1>
                        <p className="text-gray-400">Vui lòng đợi trong giây lát</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Thanh toán thành công!</h1>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-6">
                            <p className="text-primary text-sm">
                                🎉 Tài khoản của bạn đã được nâng cấp lên Premium
                            </p>
                        </div>
                        <p className="text-sm text-gray-500">Đang chuyển hướng...</p>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Thanh toán thất bại</h1>
                        <p className="text-gray-400 mb-6">{message}</p>
                        <div className="flex gap-3">
                            {/* Hidden: Thử lại button */}
                            {false && (
                                <Button
                                    onClick={() => router.push('/pricing')}
                                    className="flex-1 bg-primary hover:bg-primary/90 text-black font-bold"
                                >
                                    Thử lại
                                </Button>
                            )}
                            <Link href="/" className="flex-1">
                                <Button
                                    variant="outline"
                                    className="w-full border-white/10 text-white hover:bg-white/10"
                                >
                                    Trang chủ
                                </Button>
                            </Link>
                        </div>

                    </>
                )}
            </div>
        </div>
    );
}

export default function PaymentCallbackPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-deep-black flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>}>
            <PaymentCallbackContent />
        </Suspense>
    );
}
