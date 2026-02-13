'use client';

import { useEffect } from 'react';
import { Power, RefreshCw, VideoOff, Siren } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Error Pattern Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent opacity-50"></div>

      <div className="text-center max-w-md w-full relative z-10 p-8 rounded-3xl bg-surface-900/50 backdrop-blur-xl border border-white/5 shadow-2xl">
        
        <div className="relative mb-8 inline-block">
            <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative bg-surface-800 p-4 rounded-full border border-red-500/30">
                <Siren className="w-12 h-12 text-red-500 animate-pulse" />
                <VideoOff className="w-6 h-6 text-white absolute bottom-2 right-2 bg-surface-900 rounded-full p-1" />
            </div>
        </div>

        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
          Ối dồi ôi! Lỗi rồi!
        </h2>
        
        <div className="space-y-3 mb-8 text-gray-400">
            <p className="font-medium text-red-400">
                Error 500: Server đi vắng
            </p>
            <p className="text-sm leading-relaxed">
            Máy chiếu đang bị hỏng hoặc đội ngũ kỹ thuật đang bận ăn trưa. 
            Bạn thử tải lại trang xem nhân phẩm có tốt hơn không nhé?
            </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={reset}
            className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            Thử vận may lần nữa
          </Button>
          
          <Link href="/" className="w-full">
            <Button variant="ghost" className="w-full gap-2 text-gray-400 hover:text-white hover:bg-white/5 h-12 rounded-xl">
              <Power className="w-4 h-4" />
              Thôi, về trang chủ cho lành
            </Button>
          </Link>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-black/50 rounded-lg text-left overflow-auto max-h-40 border border-red-900/30">
            <p className="text-xs text-red-400 font-mono wrap-break-word">
              {error.message || 'Unknown error'}
            </p>
            {error.digest && (
              <p className="text-xs text-gray-500 mt-2 font-mono">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
