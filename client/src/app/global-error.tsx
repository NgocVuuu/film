'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Power, ZapOff, Skull } from 'lucide-react';

// Global Error must define its own <html> and <body> tags
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.error('Global Error:', error);
  }, [error]);

  if (!mounted) return null;

  return (
    <html>
      <head>
        <title>Sập rồi! - Pchill Error</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="bg-[#050505] text-white antialiased overflow-hidden font-sans">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative">

          {/* Background effect */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent opacity-40"></div>

          <div className="relative z-10 mb-8 p-6 rounded-full bg-red-500/5 border border-red-500/20 shadow-[0_0_50px_rgba(220,38,38,0.2)] animate-pulse-slow">
            <Skull className="w-20 h-20 text-red-600 drop-shadow-md" />
            <ZapOff className="w-10 h-10 text-gray-200 absolute -bottom-2 -right-2 bg-[#050505] rounded-full p-2 border border-red-500/50" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-red-500 to-red-900 drop-shadow-sm">
            TOANG RỒI!
          </h1>

          <p className="text-gray-400 max-w-lg mb-10 text-lg sm:text-xl leading-relaxed font-medium">
            Hệ thống gặp sự cố nghiêm trọng. <br />
            <span className="text-red-400 italic text-base">&quot;Server vừa bị người yêu cũ của dev đá dây nguồn.&quot;</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center w-full justify-center">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto px-8 py-4 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 hover:scale-105 transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-3"
            >
              <Power className="w-5 h-5" />
              Kích nguồn lại
            </button>

            <Link
              href="/"
              className="w-full sm:w-auto px-8 py-4 rounded-full border border-white/10 text-gray-300 font-bold hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <ZapOff className="w-5 h-5" />
              Thoát hiểm
            </Link>
          </div>

          <div className="mt-16 text-xs text-red-900/40 font-mono uppercase tracking-[0.2em] select-none">
            FATAL_ERROR • {error.digest || 'UNKNOWN_LEAK'}
          </div>
        </div>
      </body>
    </html>
  );
}
