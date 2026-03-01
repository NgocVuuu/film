'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/* WeScan logo — ~10% smaller than before (86×25) */
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
        content: <Image src="/bmc-button.png" alt="Buy Me a Coffee" width={86} height={25} className="block" unoptimized />,
        bg: 'bg-[#FFDD00]',
    },
    {
        label: 'WeScan',
        href: 'https://wescan.vn/dngocvu14',
        content: <WeScanLogo />,
        bg: 'bg-white border border-gray-200',
    },
];

const AUTO_CLOSE_MS = 5000;

/** Donate button — swaps in-place with 2 brand buttons, no layout shift */
export function DonateButton({ className = '' }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

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
        /* Outer wrapper keeps a stable size — sub-panel is absolutely positioned over it */
        <div className={`relative inline-flex items-center ${className}`}>
            {/* Main trigger — always in flow, becomes invisible when open */}
            <button
                ref={triggerRef}
                onClick={openPanel}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold text-black
                    bg-linear-to-r from-yellow-500 via-orange-500 to-yellow-600
                    rounded-full shadow-lg whitespace-nowrap
                    transition-opacity duration-200
                    ${open ? 'opacity-0 pointer-events-none' : 'opacity-100 hover:opacity-90'}`}
            >
                Mời ad mỳ tôm 🍜
            </button>

            {/* Brand buttons — absolutely overlay the trigger, no layout shift */}
            <div
                className={`absolute inset-0 flex items-center gap-1.5 transition-opacity duration-200
                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            >
                {OPTIONS.map(({ label, href, content, bg }) => (
                    <a
                        key={href}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                        title={label}
                        className={`${bg} rounded-lg shadow-md overflow-hidden flex items-center justify-center h-full shrink-0 hover:scale-105 transition-transform`}
                    >
                        {content}
                    </a>
                ))}
            </div>
        </div>
    );
}
