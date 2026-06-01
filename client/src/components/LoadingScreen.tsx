'use client';

import { useEffect, useState } from 'react';

type Season = 'tet' | 'valentine' | 'christmas' | 'normal' | 'halloween' | 'summer';

const MESSAGES = {
    tet: [
        "Đang gói bánh chưng... đợi tí nhé!",
        "Tết này vẫn giống Tết xưa, vẫn chưa có gấu vẫn ưa xem phim",
        "Đang lì xì cho server...",
        "Năm mới xem phim thả ga, không lo deadline!",
        "Chúc mừng năm mới! Phim hay sắp chiếu..."
    ],
    valentine: [
        "Đang tìm gấu cho bạn... à nhầm, tìm phim",
        "Valentine này ở nhà xem phim với tớ nhé?",
        "Yêu hay không yêu nói một lời... xem phim đã",
        "Loading tình yêu cực mạnh...",
        "Phim hay hơn người yêu cũ của bạn!"
    ],
    christmas: [
        "Ông già Noel đang mang phim tới...",
        "Jingle bells, Jingle bells, phim hay all the way",
        "Tuyệt vời hơn cả quà Giáng sinh",
        "Đang rã đông phim...",
        "Lạnh quá! Vào xem phim cho ấm nà"
    ],
    halloween: [
        "Đang gọi hồn các bộ phim...",
        "Cẩn thận! Phim ma sắp xuất hiện",
        "Bí ngô đang tải dữ liệu...",
        "Đừng quay lại sau lưng..."
    ],
    summer: [
        "Trời nóng hay phim hot?\nChắc chắn là cả hai!",
        "Ngoài kia nắng đổ lửa,\ntrong này siêu phẩm đổ bộ...",
        "Mùa hè vẫy gọi,\nnhưng combo 'điều hoà + sofa' mới là chân ái...",
        "Nhiệt độ ngoài trời 40 độ,\nnhưng độ 'cuốn' của phim là 100 độ!",
        "Ai cũng đi du lịch biển,\nchỉ có chúng ta trung thành với màn hình...",
        "Đang đàm phán với mặt trời\nđể giảm nhiệt độ đường truyền...",
        "Thay vì ra đường đổ mồ hôi,\nnằm nhà cày phim cho nhẹ nhõm...",
        "Chuẩn bị sẵn ly trà đá đi,\nphim hay sắp bắt đầu rồi!"
    ],
    normal: [
        "Đang hack vào NASA để lấy phim...",
        "Server đang chạy bằng cơm, bạn thông cảm chờ xíu nhé!",
        "Đẹp trai/xinh gái thế này thì đợi vài giây có sao đâu...",
        "Đang gọi thợ lặn đi nối lại cáp quang biển...",
        "Chờ đợi là hạnh phúc, nhưng phim này còn hạnh phúc hơn!",
        "Đang make-up cho giao diện lộng lẫy nhất...",
        "Đừng nôn nóng, siêu phẩm đang được rã đông...",
        "Phim sắp chiếu rồi, chuẩn bị sẵn bỏng ngô đi nào!"
    ]
};

import { Sun } from 'lucide-react';

export default function LoadingScreen() {
    const [theme, setTheme] = useState<Season>('normal');
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Determine season
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const date = now.getDate();

        if (month === 1 || (month === 2 && date <= 15)) {
            setTheme('tet');
        } else if (month === 2 && date > 10 && date < 16) {
            setTheme('valentine');
        } else if (month >= 5 && month <= 8) {
            setTheme('summer');
        } else if (month === 12) {
            setTheme('christmas');
        } else if (month === 10 && date > 20) {
            setTheme('halloween');
        } else {
            setTheme('normal');
        }
    }, []);

    useEffect(() => {
        // Pick random message based on theme
        const themeMessages = MESSAGES[theme];
        const randomMsg = themeMessages[Math.floor(Math.random() * themeMessages.length)];
        setMessage(randomMsg);
    }, [theme]);

    useEffect(() => {
        // Fake progress bar
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                return prev + Math.random() * 10;
            });
        }, 200);
        return () => clearInterval(timer);
    }, []);

    const getThemeColors = () => {
        switch (theme) {
            case 'tet': return 'bg-red-900/20 border-yellow-500/50 text-yellow-500';
            case 'valentine': return 'bg-pink-900/20 border-pink-500/50 text-pink-500';
            case 'christmas': return 'bg-green-900/20 border-red-500/50 text-red-100';
            case 'halloween': return 'bg-orange-900/20 border-orange-500/50 text-orange-500';
            case 'summer': return 'bg-[#0F0A05] border-[#FFB703]/40 text-[#FFB703]';
            default: return 'bg-surface-800 border-primary/20 text-primary';
        }
    };

    return (
        <div className="absolute inset-0 z-100 bg-[#0a090e] flex flex-col items-center justify-center p-4 min-h-screen overflow-hidden">
            {/* Main Visual */}
            <div className={`relative mb-8 flex justify-center ${theme === 'summer' ? 'w-full' : ''}`}>
                {/* Glow Effect */}
                {theme !== 'summer' && <div className={`absolute inset-0 blur-3xl opacity-50 ${theme === 'valentine' ? 'bg-pink-500' : theme === 'tet' ? 'bg-yellow-500' : 'bg-primary'}`}></div>}

                {theme === 'summer' ? (
                    <div className="relative z-10 animate-fade-in-up w-full flex justify-center mt-10">
                        <img src="/summer-logo.png" alt="Pchill Summer" className="w-[350px] max-w-full h-auto object-contain drop-shadow-[0_0_25px_rgba(255,183,3,0.3)] animate-pulse" />
                    </div>
                ) : (
                    <div className="relative bg-black/50 p-6 rounded-full border border-white/10 backdrop-blur-md shadow-2xl z-10">
                        <img src="/logo.png" alt="Pchill Logo" className="w-20 h-20 object-contain animate-pulse drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
                    </div>
                )}
            </div>

            {/* Logo Text */}
            <h2 className={`text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-white via-gray-200 to-gray-500 mb-4 relative z-10 ${theme === 'summer' ? 'bg-linear-to-r from-[#FFB703] via-white to-[#FFB703]' : ''}`}>
                PCHILL
            </h2>

            {/* Progress Bar */}
            <div className="w-full max-w-sm h-2 bg-gray-800 rounded-full overflow-hidden mb-8 relative z-10 border border-white/5">
                <div
                    className={`h-full transition-all duration-300 ease-out ${theme === 'valentine' ? 'bg-pink-500' : theme === 'tet' ? 'bg-yellow-500' : theme === 'summer' ? 'bg-[#FFB703]' : 'bg-primary'}`}
                    style={{ width: `${progress}%` }}
                ></div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ transform: 'skewX(-20deg)' }}></div>
            </div>

            {/* Message Box */}
            <div className={`w-full max-w-md flex items-center justify-between px-6 py-4 rounded-xl border backdrop-blur-sm animate-fade-in-up shadow-2xl relative z-10 ${getThemeColors()}`}>
                {theme === 'summer' && (
                    <Sun className="w-5 h-5 shrink-0 opacity-80" />
                )}
                <p className={`font-bold text-base md:text-lg italic flex-1 text-center px-4 whitespace-pre-line ${theme === 'summer' ? 'font-sans font-medium' : 'drop-shadow-md'}`}>
                    &quot;{message}&quot;
                </p>
                {theme === 'summer' && (
                    <span className="text-xl shrink-0 opacity-90 drop-shadow-md">⭐</span>
                )}
            </div>

            {/* Decorative Elements based on theme */}
            {theme === 'tet' && (
                <>
                    <div className="absolute top-10 left-10 animate-bounce text-4xl">🧧</div>
                    <div className="absolute bottom-10 right-10 animate-bounce delay-75 text-4xl">🌸</div>
                </>
            )}
            {theme === 'valentine' && (
                <>
                    <div className="absolute top-20 left-20 animate-pulse text-4xl">💘</div>
                    <div className="absolute bottom-20 right-20 animate-pulse delay-100 text-4xl">🌹</div>
                </>
            )}
            {theme === 'christmas' && (
                <>
                    <div className="absolute top-10 right-20 animate-spin-slow text-4xl">❄️</div>
                    <div className="absolute bottom-10 left-10 animate-bounce delay-100 text-4xl">🎄</div>
                </>
            )}
        </div>
    );
}
