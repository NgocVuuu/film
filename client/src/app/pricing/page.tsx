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

    useEffect(() => {
        fetchPlans();
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

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
                        Hỗ trợ thanh toán qua WeScan và BuyMeACoffee.
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
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-max">
                                        <span className="px-4 py-1 bg-primary text-black text-xs font-bold rounded-full shadow-sm whitespace-nowrap">
                                            {plan.badge}
                                        </span>
                                    </div>
                                )}

                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-4xl font-bold text-primary">
                                                {formatPrice(plan.price)}
                                            </span>
                                        </div>
                                    </div>
                                    {plan.originalPrice && (
                                        <p className="text-sm text-gray-500 line-through mt-2">
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
                        Hỗ trợ tất cả ngân hàng tại Việt Nam, Thẻ Quốc Tế (Visa, MasterCard), PayPal.
                    </p>
                    <p className="text-gray-500 font-medium text-base mt-4">
                        Mỗi sự ủng hộ của bạn giúp ad duy trì và cải thiện dịch vụ. Cảm ơn bạn rất nhiều! ❤️
                    </p>
                </div>
            </div>

            {/* Payment Modal */}
            {showModal && paymentData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pt-24"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-surface-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[calc(100vh-8rem)] overflow-hidden shadow-2xl relative flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 z-10 bg-black/30 rounded-full backdrop-blur-md transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="px-4 pb-4 md:px-5 md:pb-5 pt-3 bg-surface-800 text-white flex flex-col gap-3 overflow-y-auto">
                            <div className="text-center mb-0 mt-1">
                                <h3 className="text-lg font-bold mb-0.5">Nâng cấp Premium</h3>
                                <p className="text-gray-400 text-[11px]">Sếp vui lòng chọn hướng thanh toán bên dưới nhé.</p>
                            </div>

                            {/* Step 1: Copy Data */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-300">BƯỚC 1: Sao chép thông tin</p>

                                <div className="bg-black/30 p-3 rounded-lg border border-primary/30 relative group shadow-inner">
                                    <p className="text-gray-400 text-[10px] uppercase mb-1">Mã Giao Dịch (BẮT BUỘC)</p>
                                    <div className="flex justify-between items-center">
                                        <p className="font-mono font-bold text-lg text-yellow-400">{paymentData.content}</p>
                                        <Button variant="ghost" size="sm" onClick={() => copyToClipboard(paymentData.content)} className="text-gray-400 hover:text-white h-6 w-6 p-0 group">
                                            <Copy className="w-3.5 h-3.5 group-active:scale-95 transition-transform" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 shadow-inner">
                                        <p className="text-gray-400 text-[10px] uppercase mb-1">Số tiền (WeScan)</p>
                                        <div className="flex justify-between items-center">
                                            <p className="font-mono font-bold text-base text-primary/90">{formatPrice(paymentData.amount)}</p>
                                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(paymentData.amount.toString())} className="text-gray-400 hover:text-white h-6 w-6 p-0 group shrink-0">
                                                <Copy className="w-3.5 h-3.5 group-active:scale-95 transition-transform" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="bg-yellow-500/5 p-2.5 rounded-lg border border-yellow-500/10 shadow-inner">
                                        <p className="text-yellow-500/80 text-[10px] uppercase mb-1">Buy Me A Coffee</p>
                                        <div className="flex justify-between items-center">
                                            <p className="font-mono font-bold text-xs text-yellow-400">Chọn gói thời hạn tương ứng</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Choose Method */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-300">BƯỚC 2: Chọn cổng thanh toán và dán Mã Giao Dịch</p>
                                <div className="grid grid-cols-2 gap-3 mb-1">
                                    <a
                                        href="https://wescan.vn/dngocvu14"
                                        target="_blank"
                                        className="p-2.5 border border-primary/20 bg-primary/5 rounded-xl text-center hover:bg-primary/20 transition-all flex flex-col justify-center gap-1"
                                    >
                                        <p className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                                            WeScan <ArrowRight className="w-3 h-3" />
                                        </p>
                                        <p className="text-[9px] text-gray-400 leading-tight">Mở App Ngân hàng quét thẻ WeScan</p>
                                    </a>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[10px] text-yellow-500 mb-0 font-medium text-center">
                                            Vào mục <b>Shop/Extras</b> trên BMC và chọn gói tương ứng:
                                        </p>
                                        <a
                                            href="https://buymeacoffee.com/pchill_admin/extras"
                                            target="_blank"
                                            className="p-2.5 border border-yellow-500/20 bg-yellow-500/5 rounded-xl text-center hover:bg-yellow-500/20 transition-all flex flex-col justify-center gap-1"
                                        >
                                            <p className="text-sm font-bold text-yellow-400 flex items-center justify-center gap-1.5">
                                                Buy me a coffee (Thẻ Quốc Tế, PayPal) <ArrowRight className="w-3 h-3" />
                                            </p>
                                            <p className="text-[9px] text-gray-400 leading-tight">Chọn chính xác gói 1T / 3T / 6T / 12T trong mục Extras</p>
                                        </a>
                                    </div>
                                </div>
                                <p className="text-[10px] text-red-500 mb-0 font-medium leading-tight text-center">
                                    * LƯU Ý: Phải ghi đúng Mã Giao Dịch vào phần Lời Nhắn nhé sếp!
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 mt-2">
                                <div className="flex items-center justify-center gap-1.5 text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-full text-[10px] w-fit mx-auto border border-amber-200 shadow-sm">
                                    <Crown className="w-3.5 h-3.5" />
                                    Xử lý thủ công (5-30p)
                                </div>

                                <Button
                                    onClick={() => {
                                        toast.success('Ghi nhận thành công! Yêu cầu của bạn sẽ được duyệt sớm.', { duration: 5000 });
                                        setShowModal(false);
                                    }}
                                    className="w-full bg-primary hover:bg-primary/90 text-black font-bold py-4 text-sm shadow-xl shrink-0"
                                >
                                    Tôi đã hoàn tất chuyển khoản
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
