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
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
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
                    planId: plan.id
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
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-white">Gói Premium</h2>
                                    <p className="text-sm text-gray-500">Xem phim không quảng cáo</p>
                                </div>
                                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                                    {premiumPlans.map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`relative bg-surface-900 border rounded-2xl p-6 transition-all flex flex-col hover:border-primary/50 ${
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
                                            <ul className="space-y-2 mb-5 flex-grow">
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
                                                className="w-full mt-auto bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 font-bold text-sm"
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
                                <div className="mb-8">
                                    <h2 className="text-xl font-bold text-white">Gói PChill VIP</h2>
                                    <p className="text-sm text-yellow-500/70">Tất cả Premium + máy chủ tốc độ cao độc quyền</p>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-5">
                                    {vipPlans.map((plan) => (
                                        <div
                                            key={plan.id}
                                            className={`relative bg-gradient-to-b from-yellow-500/5 to-surface-900 border rounded-2xl p-6 transition-all flex flex-col hover:border-yellow-500/50 ${
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
                                            <ul className="space-y-2 mb-5 flex-grow">
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
                                                className="w-full mt-auto bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm shadow-lg shadow-yellow-500/20"
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
                {/* Discord Instructions */}
                <div className="max-w-3xl mx-auto mt-4 mb-12">
                    <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-2xl p-6 text-center shadow-lg">
                        <div className="w-12 h-12 bg-[#5865F2] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#5865F2]/20">
                            <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.074.11 18.09.12 18.1a19.904 19.904 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                            </svg>
                        </div>
                        <h3 className="text-[#5865F2] font-bold text-lg mb-2">
                            BƯỚC QUAN TRỌNG: XÁC NHẬN HÓA ĐƠN
                        </h3>
                        <p className="text-gray-300 text-sm mb-6 max-w-xl mx-auto leading-relaxed">
                            Sau khi thực hiện thanh toán, sếp vui lòng chụp lại màn hình hóa đơn chuyển khoản thành công và gửi vào kênh <span className="font-bold text-white px-2 py-0.5 bg-white/10 rounded">#vip</span> hoặc <span className="font-bold text-white px-2 py-0.5 bg-white/10 rounded">#premium</span> trên máy chủ Discord. Admin sẽ kiểm tra và cấp quyền ngay lập tức (Thời gian xử lý: 15-30 phút).
                        </p>
                        <a
                            href="https://discord.gg/bnHvX3FM"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.074.11 18.09.12 18.1a19.904 19.904 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                            </svg>
                            Tham gia Server Discord
                        </a>
                    </div>
                </div>

                {/* Disclaimer */}
                <div className="text-center mt-8 space-y-2">
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
                    className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
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
                                        href="https://wescan.vn/Paul14"
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
                                <div className="bg-[#5865F2]/10 border border-[#5865F2]/30 rounded-xl p-3 text-center">
                                    <p className="text-[#5865F2] font-bold text-xs mb-1 flex items-center justify-center gap-1.5">
                                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.074.11 18.09.12 18.1a19.904 19.904 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                                        </svg> 
                                        BƯỚC 3: XÁC NHẬN SIÊU TỐC
                                    </p>
                                    <p className="text-gray-300 text-[11px] leading-tight mb-2">
                                        Sau khi thanh toán, chụp hóa đơn và gửi vào kênh <span className="font-bold text-white">#vip</span> hoặc <span className="font-bold text-white">#premium</span> trên Discord để Admin duyệt ngay lập tức nhé!
                                    </p>
                                    <a
                                        href="https://discord.gg/bnHvX3FM"
                                        target="_blank"
                                        className="inline-flex items-center justify-center gap-1.5 bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-bold py-1.5 px-4 rounded-full transition-colors"
                                    >
                                        Tham gia Discord
                                    </a>
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
