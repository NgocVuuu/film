'use client';

import { useEffect, useState } from 'react';

type Season = 'tet' | 'valentine' | 'christmas' | 'normal' | 'halloween';

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
    normal: [
        "Đang tải phim cực nét...",
        "Chờ xíu, server đang chạy bằng cơm",
        "Đẹp trai/xinh gái thế này thì đợi tí có sao...",
        "Bình tĩnh, phim hay đáng để chờ đợi",
        "Đang make up cho giao diện...",
        "Server đang thở, vui lòng chờ...",
        "Đang hack vào NASA để lấy phim..."
    ]
};

export default function LoadingScreen() {
    const [theme, setTheme] = useState<Season>('normal');
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        // Determine season
        const now = new Date();
        const month = now.getMonth() + 1; // 1-12
        const date = now.getDate();

        if (month === 1 || (month === 2 && date <= 15)) { // Jan & early Feb -> Tet (Approx)
            setTheme('tet');
        } else if (month === 2 && date > 10 && date < 16) {
            setTheme('valentine');
        } else if (month === 12) {
            setTheme('christmas');
        } else if (month === 10 && date > 20) {
            setTheme('halloween');
        } else {
            setTheme('normal'); // Default to normal for testing, can override to test themes
            // For demo purposes, if user specifically asked for themes, we might randomization or force one?
            // Let's stick to date logic but maybe prioritize closest holiday.
            // If strictly logic, likely 'normal' for most of the year.
            // Let's force 'tet' if specifically requested for checking? No, stick to real date or force via code if needed.
            // The user asked for "designs for themes", so I will implement the logic.
            // Right now it's Oct 2026? Feb 11th 2026 -> It is Tet/Valentine season! 
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
            default: return 'bg-surface-800 border-primary/20 text-primary';
        }
    };

    return (
        <div className="fixed inset-0 z-100 bg-deep-black flex flex-col items-center justify-center p-4">

            {/* Main Visual */}
            <div className="relative mb-8">
                {/* Glow Effect */}
                <div className={`absolute inset-0 blur-3xl opacity-50 ${theme === 'valentine' ? 'bg-pink-500' : theme === 'tet' ? 'bg-yellow-500' : 'bg-primary'}`}></div>

                <div className="relative bg-black/50 p-6 rounded-full border border-white/10 backdrop-blur-md shadow-2xl">
                    <img src="/logo.png" alt="Pchill Logo" className="w-20 h-20 object-contain animate-pulse" />
                </div>
            </div>

            {/* Logo Text */}
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-r from-white via-gray-200 to-gray-500 mb-2">
                PCHILL
            </h2>

            {/* Progress Bar */}
            <div className="w-full max-w-md h-2 bg-gray-800 rounded-full overflow-hidden mb-6 relative">
                <div
                    className={`h-full transition-all duration-300 ease-out ${theme === 'valentine' ? 'bg-pink-500' : theme === 'tet' ? 'bg-yellow-500' : 'bg-primary'}`}
                    style={{ width: `${progress}%` }}
                ></div>
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent animate-shimmer" style={{ transform: 'skewX(-20deg)' }}></div>
            </div>

            {/* Message Box */}
            <div className={`max-w-lg text-center px-6 py-4 rounded-xl border backdrop-blur-sm animate-fade-in-up ${getThemeColors()}`}>
                <p className="font-bold text-lg md:text-xl italic">
                    &quot;{message}&quot;
                </p>
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
