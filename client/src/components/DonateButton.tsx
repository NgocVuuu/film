'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

const WeScanLogo = () => (
    <svg viewBox="0 0 55 16" width="55" height="16" xmlns="http://www.w3.org/2000/svg">
        <rect width="55" height="16" fill="white" />
        <text x="2" y="12" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="11" fill="#F5A623">WE</text>
        <text x="20" y="12" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="11" fill="#1a1a1a">SCAN</text>
    </svg>
);

const OPTIONS = [
    {
        label: 'Buy Me a Coffee',
        href: 'https://buymeacoffee.com/pchill_admin',
        content: <img src="/bmc-button.png" alt="Buy Me a Coffee" className="h-[22px] w-auto block" />,
        bg: 'bg-[#FFDD00]',
    },
    {
        label: 'WeScan',
        href: 'https://wescan.vn/Paul14',
        content: <WeScanLogo />,
        bg: 'bg-white border border-gray-200',
    },
];

const AUTO_CLOSE_MS = 5000;

export function DonateButton({ className = '' }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openPanel = () => {
        setOpen(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
    };
    const close = () => {
        setOpen(false);
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

    return (
        <div className={`flex items-center min-h-[32px] ${className}`}>
            {!open ? (
                <button
                    onClick={openPanel}
                    className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-bold text-black bg-linear-to-r from-yellow-500 via-orange-500 to-yellow-600 rounded-full shadow-lg whitespace-nowrap hover:opacity-90 transition-opacity w-full md:w-auto"
                >
                    Mời ad mỳ tôm 🍜
                </button>
            ) : (
                <div className="flex items-center justify-center gap-2 w-full animate-in fade-in zoom-in-95 duration-200">
                    {OPTIONS.map(({ label, href, content, bg }) => (
                        <a
                            key={href}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={close}
                            title={label}
                            className={`${bg} rounded-lg shadow-md px-3 py-1 flex items-center justify-center hover:scale-105 transition-transform`}
                        >
                            {content}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
