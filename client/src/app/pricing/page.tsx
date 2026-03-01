'use client';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Crown, Check, Loader2, ArrowRight, X, Copy, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
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
    const router = useRouter();

    const { user, refresh } = useAuth(); // refresh to refresh user data
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [showModal, setShowModal] = useState(false);
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
            // [KỊCH BẢN MỚI] Gọi API tạo phiếu nâng cấp thủ công
            const response = await customFetch(`/api/subscriptions/create-upgrade`, {
                method: 'POST',
                body: JSON.stringify({
                    planId: plan.id,
                    planName: plan.name,
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

    const IS_HIDDEN = false; // GỠ BỎ MẶT NẠ BẢO TRÌ

    if (IS_HIDDEN) {
        return (
            <div className="min-h-screen bg-deep-black flex flex-col items-center justify-center text-center p-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Crown className="w-10 h-10 text-primary animate-pulse" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    Tính năng đang được <span className="text-gold-gradient">bảo trì</span>
                </h1>
                <p className="text-gray-400 text-lg max-w-md mx-auto mb-8">
                    Hiện tại hệ thống nâng cấp Premium đang tạm đóng để nâng cấp. Sếp vui lòng quay lại sau nhé! ❤️
                </p>
                <Button
                    onClick={() => router.push('/')}
                    className="bg-primary hover:bg-primary/90 text-black font-bold px-8"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay về trang chủ
                </Button>
            </div>
        );
    }

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
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-2">
                        Hỗ trợ thanh toán ẩn danh qua WeScan và BuyMeACoffee.
                    </p>
                    <p className="text-gray-500 text-sm max-w-xl mx-auto italic">
                        Ủng hộ ad chút để duy trì web nhé, quả thật server đắt lắm 😭
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
                <div className="text-center mt-12 space-y-2">
                    <p className="text-gray-500 text-sm">
                        Hỗ trợ tất cả ngân hàng tại Việt Nam (VietQR).
                    </p>
                    <p className="text-gray-600 text-xs italic">
                        Mỗi sự ủng hộ của bạn giúp ad duy trì và cải thiện dịch vụ. Cảm ơn bạn rất nhiều! ❤️
                    </p>
                </div>
            </div>

            {/* Payment Modal */}
            {showModal && paymentData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-surface-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col md:flex-row my-8">
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Left: QR Code */}
                        <div className="w-full md:w-1/3 bg-white p-4 flex flex-col items-center justify-center text-center shrink-0">
                            <h3 className="text-black font-bold text-base mb-2">Quét mã để thanh toán</h3>
                            <div className="border-4 border-black p-2 rounded-xl mb-2">
                                <img
                                    src={paymentData.qrUrl}
                                    alt="VietQR Payment"
                                    className="w-full max-w-44 aspect-square object-contain"
                                />
                            </div>
                            <p className="text-gray-600 text-xs mb-2">
                                Sử dụng App Ngân hàng hoặc Ví MoMo/ZaloPay
                            </p>
                            <div className="flex items-center gap-2 text-gold-gradient font-semibold bg-primary/5 px-3 py-1.5 rounded-full text-xs">
                                < Crown className="w-3 h-3" />
                                Đang chờ Admin xác nhận...
                            </div>
                        </div>

                        {/* Right: Info */}
                        <div className="w-full md:w-2/3 p-6 bg-surface-800 text-white flex flex-col gap-4 overflow-y-auto">
                            <div>
                                <h3 className="text-lg font-bold mb-1">Hướng dẫn thanh toán ẩn danh</h3>
                                <p className="text-gray-400 text-xs">Sếp có thể chọn 1 trong 2 hình thức bên dưới.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <div className="p-3 border border-primary/20 bg-primary/5 rounded-xl text-center">
                                    <p className="text-xs text-primary font-bold mb-1 uppercase">Phương án 1</p>
                                    <p className="text-sm font-bold text-white">WeScan (Nội địa)</p>
                                </div>
                                <a
                                    href="https://www.buymeacoffee.com/pchill"
                                    target="_blank"
                                    className="p-3 border border-white/10 bg-white/5 rounded-xl text-center hover:bg-white/10 transition-colors"
                                >
                                    <p className="text-xs text-gray-400 font-bold mb-1 uppercase">Phương án 2</p>
                                    <p className="text-sm font-bold text-white flex items-center justify-center gap-1">
                                        Buy Me A Coffee <ArrowRight className="w-3 h-3" />
                                    </p>
                                </a>
                            </div>

                            <div className="space-y-3">
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Tài khoản WeScan (Nội địa)</p>
                                    <div className="flex justify-between items-center">
                                        <p className="font-mono font-bold text-lg">{paymentData.bankInfo.bankCode} - {paymentData.bankInfo.accountNumber}</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(paymentData.bankInfo.accountNumber)}>
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Chủ tài khoản</p>
                                    <p className="font-mono font-bold text-lg">{paymentData.bankInfo.accountName}</p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-lg border border-primary/30 relative group">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Nội dung chuyển khoản (BẮT BUỘC)</p>
                                    <div className="flex justify-between items-center">
                                        <p className="font-mono font-bold text-xl text-yellow-400">{paymentData.content}</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(paymentData.content)} className="text-gray-400 hover:text-white">
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-red-500 mt-2 font-medium">
                                        * Phải ghi đúng nội dung để Admin xác nhận nâng cấp Premium.
                                    </p>
                                </div>
                                <div className="bg-black/30 p-4 rounded-lg border border-white/5">
                                    <p className="text-gray-400 text-xs uppercase mb-1">Số tiền</p>
                                    <p className="font-mono font-bold text-lg">{formatPrice(paymentData.amount)}</p>
                                </div>
                                <Button
                                    onClick={() => setShowModal(false)}
                                    className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-6"
                                >
                                    Tôi đã hoàn tất chuyển khoản
                                </Button>
                                <p className="text-[10px] text-gray-500 text-center">
                                    Phiếu của bạn sẽ được Admin duyệt trong vòng 5-30 phút.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
