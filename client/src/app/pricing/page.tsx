'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Crown, Check, Loader2, ArrowRight, X, Copy, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { API_URL } from '@/lib/config';
import { customFetch } from '@/lib/api';

interface Plan {
    id: string;
    name: string;
    tier: string;
    duration: number;
    price: number;
    originalPrice?: number;
    badge?: string;
    features: string[];
}

interface PaymentData {
    paymentId: string;
    qrUrl: string;
    content: string;
    amount: number;
    bankInfo: {
        bankCode: string;
        accountNumber: string;
        accountName: string;
    };
}

export default function PricingPage() {
    const { user, refresh } = useAuth(); // refresh to refresh user data
    const router = useRouter();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [showModal, setShowModal] = useState(false);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchPlans();
        return () => stopPolling();
    }, []);

    // Polling for payment status
    useEffect(() => {
        if (showModal && paymentData) {
            startPolling();
        } else {
            stopPolling();
        }
    }, [showModal, paymentData]);

    const startPolling = () => {
        if (pollingRef.current) return;

        pollingRef.current = setInterval(async () => {
            try {
                const res = await customFetch(`/api/subscriptions/status`);
                const data = await res.json();

                if (data.success && data.data.status === 'active' && data.data.tier === 'premium') {
                    // Payment successful
                    toast.success('Thanh toán thành công! Gói Premium đã được kích hoạt.');
                    stopPolling();
                    setShowModal(false);
                    setPaymentData(null);
                    await refresh(); // Refresh layout/user data
                    router.push('/'); // Redirect home
                }
            } catch (e) {
                console.error('Polling error', e);
            }
        }, 3000); // Check every 3s
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const fetchPlans = async () => {
        try {
            const response = await fetch(`${API_URL}/api/subscriptions/plans`);
            const data = await response.json();
            if (data.success) {
                setPlans(data.data);
            }
        } catch (error) {
            console.error('Fetch plans error:', error);
            toast.error('Lỗi khi tải danh sách gói');
        } finally {
            setLoading(false);
        }
    };

    const handleSubscribe = async (plan: Plan) => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để đăng ký');
            router.push('/login');
            return;
        }

        if (user.subscription?.tier === 'premium' && user.subscription?.status === 'active') {
            const endDate = new Date(user.subscription.endDate!);
            if (endDate > new Date()) {
                toast.error('Bạn đã là thành viên Premium');
                return;
            }
        }

        try {
            setProcessingPlan(plan.id);

            // Get token for auth header if using manual fetch wrapper or rely on cookies if setup
            const token = localStorage.getItem('token');
const response = await customFetch(`/api/subscriptions/create-payment`, {
                method: 'POST'   planId: plan.id,
                    duration: plan.duration,
                    amount: plan.price
                })
            });

            const data = await response.json();

            if (data.success) {
                setPaymentData(data.data);
                setShowModal(true);
            } else {
                toast.error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Subscribe error:', error);
            toast.error('Lỗi khi tạo giao dịch');
        } finally {
            setProcessingPlan(null);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Đã sao chép');
    };

    return (
        <div className="min-h-screen bg-deep-black py-20 relative">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
                        <Crown className="w-5 h-5 text-primary" />
                        <span className="text-primary font-bold">Nâng cấp Premium</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Trải nghiệm <span className="text-gold-gradient">không giới hạn</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        Thanh toán qua mã QR - Kích hoạt tự động sau 30 giây.
                    </p>
                </div>

                {/* Pricing Cards */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                className={`relative bg-surface-900 border rounded-2xl p-8 transition-all hover:border-primary/50 ${plan.badge
                                    ? 'border-primary shadow-2xl shadow-primary/20 scale-105 z-10'
                                    : 'border-white/10'
                                    }`}
                            >
                                {plan.badge && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <span className="px-4 py-1 bg-primary text-black text-xs font-bold rounded-full">
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                    <div className="flex items-baseline justify-center gap-1">
                                        <span className="text-4xl font-bold text-primary">
                                            {formatPrice(plan.price)}
                                        </span>
                                    </div>
                                    {plan.originalPrice && (
                                        <p className="text-sm text-gray-500 line-through mt-1">
                                            {formatPrice(plan.originalPrice)}
                                        </p>
                                    )}
                                </div>

                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-3">
                                            <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                            <span className="text-gray-300 text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={processingPlan !== null}
                                    className={`w-full ${plan.badge
                                        ? 'bg-primary hover:bg-primary/90 text-black'
                                        : 'bg-white/10 hover:bg-white/20 text-white'
                                        } font-bold`}
                                >
                                    {processingPlan === plan.id ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Đang xử lý...
                                        </>
                                    ) : (
                                        <>
                                            Đăng ký ngay
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Disclaimer */}
                <p className="text-center text-gray-500 mt-12">
                    Hỗ trợ tất cả ngân hàng tại Việt Nam (VietQR).
                </p>
            </div>

            {/* Payment Modal */}
            {showModal && paymentData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-surface-900 border border-white/10 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Left: QR Code */}
                        <div className="w-full md:w-1/2 bg-white p-8 flex flex-col items-center justify-center text-center">
                            <h3 className="text-black font-bold text-xl mb-4">Quét mã để thanh toán</h3>
                            <div className="border-4 border-black p-2 rounded-xl mb-4">
                                <img
                                    src={paymentData.qrUrl}
                                    alt="VietQR Payment"
                                    className="w-full max-w-62.5 aspect-square object-contain"
                                />
                            </div>
                            <p className="text-gray-600 text-sm mb-4">
                                Sử dụng App Ngân hàng hoặc Ví MoMo/ZaloPay
                            </p>
                            <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-full animate-pulse">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Đang chờ thanh toán...
                            </div>
                        </div>

                        {/* Right: Info */}
                        <div className="w-full md:w-1/2 p-8 bg-surface-800 text-white flex flex-col gap-6">
                            <div>
                                <h3 className="text-xl font-bold mb-1">Thông tin chuyển khoản</h3>
                                <p className="text-gray-400 text-sm">Nếu không quét được mã, bạn có thể chuyển khoản thủ công.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Ngân hàng</p>
                                    <p className="font-mono font-bold text-lg">{paymentData.bankInfo.bankCode}</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5 relative group cursor-pointer" onClick={() => copyToClipboard(paymentData.bankInfo.accountNumber)}>
                                    <p className="text-gray-400 text-xs uppercase mb-1">Số tài khoản</p>
                                    <p className="font-mono font-bold text-lg text-primary">{paymentData.bankInfo.accountNumber}</p>
                                    <Copy className="w-4 h-4 absolute top-4 right-4 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Chủ tài khoản</p>
                                    <p className="font-mono font-bold text-lg">{paymentData.bankInfo.accountName}</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-lg border border-primary/30 relative group cursor-pointer" onClick={() => copyToClipboard(paymentData.content)}>
                                    <p className="text-gray-400 text-xs uppercase mb-1">Nội dung chuyển khoản (Bắt buộc)</p>
                                    <p className="font-mono font-bold text-lg text-yellow-400">{paymentData.content}</p>
                                    <p className="text-xs text-red-400 mt-1">* Nhập chính xác nội dung này</p>
                                    <Copy className="w-4 h-4 absolute top-4 right-4 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Số tiền</p>
                                    <p className="font-mono font-bold text-lg">{formatPrice(paymentData.amount)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
