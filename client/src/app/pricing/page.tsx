'use client';
import { useEffect, useState } from 'react';
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
    requestId: string;
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
    const { user } = useAuth();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
    const [showModal, setShowModal] = useState(false);

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

        // Warn if already on same tier (still allow - will be stacked by admin)
        const activeTier = user.subscription?.status === 'active' ? user.subscription?.tier : null;
        if (activeTier === plan.tier) {
            const endDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : null;
            if (endDate && endDate > new Date()) {
                const tierLabel = plan.tier === 'vip' ? 'PChill VIP' : 'Premium';
                toast(`Bạn đã là thành viên ${tierLabel}. Thời gian sẽ được cộng dồn thêm!`, { icon: 'ℹ️' });
            }
        }

        try {
            setProcessingPlan(plan.id);

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

    const premiumPlans = plans.filter(p => p.tier === 'premium');
    const vipPlans = plans.filter(p => p.tier === 'vip');

    return (
        <div className="min-h-screen bg-deep-black py-20 relative">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-6">
                        <Crown className="w-5 h-5 text-primary" />
                        <span className="text-primary font-bold">Nâng cấp tài khoản</span>
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

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-16 max-w-5xl mx-auto mb-16">

                        {/* === PREMIUM SECTION === */}
                        {premiumPlans.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                        <span className="text-base">🏅</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Gói Premium</h2>
                                        <p className="text-sm text-gray-500">Xem phim không quảng cáo</p>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {premiumPlans.map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`relative bg-surface-900 border rounded-2xl p-6 transition-all hover:border-primary/50 ${
                                                plan.badge ? 'border-primary shadow-xl shadow-primary/10' : 'border-white/10'
                                            }`}
                                        >
                                            {plan.badge && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                    <span className="px-3 py-0.5 bg-primary text-black text-xs font-bold rounded-full whitespace-nowrap">
                                                        {plan.badge}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-center mb-4">
                                                <h3 className="text-sm font-bold text-gray-300 mb-1">{plan.name}</h3>
                                                <div className="text-3xl font-bold text-primary">{formatPrice(plan.price)}</div>
                                                {plan.originalPrice && (
                                                    <p className="text-xs text-gray-600 line-through mt-0.5">{formatPrice(plan.originalPrice)}</p>
                                                )}
                                            </div>
                                            <ul className="space-y-2 mb-5">
                                                {plan.features.map((f, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                                        <span className="text-gray-400 text-xs">{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button
                                                onClick={() => handleSubscribe(plan)}
                                                disabled={processingPlan !== null}
                                                className="w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold text-sm"
                                            >
                                                {processingPlan === plan.id ? (
                                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Đang xử lý...</>
                                                ) : (
                                                    <>Đăng ký<ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* === VIP SECTION === */}
                        {vipPlans.length > 0 && (
                            <div>
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                        <span className="text-base">💎</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Gói PChill VIP</h2>
                                        <p className="text-sm text-yellow-500/70">Tất cả Premium + máy chủ tốc độ cao độc quyền</p>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-5">
                                    {vipPlans.map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`relative bg-gradient-to-b from-yellow-500/5 to-surface-900 border rounded-2xl p-6 transition-all hover:border-yellow-500/50 ${
                                                plan.badge ? 'border-yellow-500/60 shadow-xl shadow-yellow-500/10' : 'border-yellow-500/20'
                                            }`}
                                        >
                                            {plan.badge && (
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                                    <span className="px-3 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded-full whitespace-nowrap">
                                                        {plan.badge}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="text-center mb-4">
                                                <h3 className="text-sm font-bold text-yellow-300 mb-1">{plan.name}</h3>
                                                <div className="text-3xl font-bold text-yellow-400">{formatPrice(plan.price)}</div>
                                                {plan.originalPrice && (
                                                    <p className="text-xs text-gray-600 line-through mt-0.5">{formatPrice(plan.originalPrice)}</p>
                                                )}
                                            </div>
                                            <ul className="space-y-2 mb-5">
                                                {plan.features.map((f, i) => (
                                                    <li key={i} className="flex items-start gap-2">
                                                        <Check className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                                                        <span className="text-gray-300 text-xs">{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            <Button
                                                onClick={() => handleSubscribe(plan)}
                                                disabled={processingPlan !== null}
                                                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm shadow-lg shadow-yellow-500/20"
                                            >
                                                {processingPlan === plan.id ? (
                                                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Đang xử lý...</>
                                                ) : (
                                                    <>Đăng ký VIP<ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="text-center mt-12 space-y-2">
                    <p className="text-gray-500 text-sm">
                        Hỗ trợ tất cả ngân hàng tại Việt Nam (VietQR) và thẻ quốc tế (BuyMeACoffee).
                    </p>
                    <p className="text-gray-600 text-xs italic">
                        Mỗi sự ủng hộ của bạn giúp ad duy trì và cải thiện dịch vụ. Cảm ơn bạn rất nhiều! ❤️
                    </p>
                </div>
            </div>

            {/* Payment Modal */}
            {showModal && paymentData && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-surface-900 border border-white/10 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-hidden shadow-2xl relative flex flex-col"
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
                                <h3 className="text-lg font-bold mb-0.5">Thông tin thanh toán</h3>
                                <p className="text-gray-400 text-[11px]">Sếp vui lòng chọn hướng thanh toán bên dưới nhé.</p>
                            </div>

                            {/* Step 1: Copy transaction code */}
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
                                        <p className="font-mono font-bold text-xs text-yellow-400">Chọn gói thời hạn tương ứng</p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Choose payment method */}
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
                                                Buy Me A Coffee <ArrowRight className="w-3 h-3" />
                                            </p>
                                            <p className="text-[9px] text-gray-400 leading-tight">Thẻ Quốc Tế, PayPal - Chọn gói 1T/3T/6T/12T</p>
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
                                    Xử lý thủ công (5-30 phút)
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
