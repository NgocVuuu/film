'use client';

import Link from 'next/link';
import { WifiOff, Home, RefreshCw, Heart, Clock, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Radar Effect Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-30 animate-pulse-slow"></div>

      <div className="max-w-md w-full text-center relative z-10">
        <div className="mb-10">
          <div className="relative inline-block mb-6">
            <div className={`absolute inset-0 rounded-full blur-xl transition-all duration-500 ${isOnline ? 'bg-green-500/30' : 'bg-red-500/20'}`}></div>
            <div className="relative bg-surface-900/80 p-6 rounded-full border border-white/10 backdrop-blur-md">
                {isOnline ? (
                     <div className="relative">
                        <RefreshCw className="w-12 h-12 text-green-500 animate-spin" />
                     </div>
                ) : (
                    <div className="relative">
                        <CloudOff className="w-12 h-12 text-gray-400" />
                        <WifiOff className="w-6 h-6 text-red-500 absolute -bottom-1 -right-1 bg-surface-900 rounded-full p-1" />
                    </div>
                )}
            </div>
          </div>

          <h1 className="text-3xl font-black text-white mb-3">
             {isOnline ? 'Đã bắt được tín hiệu!' : 'Alo? Alo? Nghe rõ trả lời!'}
          </h1>
          <p className="text-gray-400 mb-8 leading-relaxed px-4">
             {isOnline 
                ? 'Tàu mẹ đã kết nối lại. Sẵn sàng quay về không gian điện ảnh.' 
                : 'Mất kết nối với Trái Đất rồi. Có khi nào cá mập lại cắn cáp quang không?'}
          </p>
          
          {isOnline && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 shadow-lg shadow-green-900/20 animate-in fade-in slide-in-from-bottom-2">
              <p className="text-green-400 font-bold text-sm flex items-center justify-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Mạng đã ngon! Bấm nút dưới để reload.
              </p>
            </div>
          )}

          <Button
            onClick={handleRetry}
            className={`w-full font-bold h-12 rounded-xl transition-all ${
                isOnline 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/40 hover:scale-105' 
                : 'bg-gray-800 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!isOnline}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isOnline ? 'animate-spin-slow' : ''}`} />
            {isOnline ? 'Quay về trang chủ' : 'Đang chờ tín hiệu...'}
          </Button>
        </div>

        <div className="bg-surface-900/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-white font-bold mb-4 text-left flex items-center gap-2 text-sm uppercase tracking-wider text-gray-500">
             Trong khi chờ đợi:
          </h2>
          <div className="space-y-2">
            <Link 
              href="/"
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/5"
            >
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                  <Home className="w-5 h-5 text-primary" />
              </div>
              <span className="text-gray-300 font-medium group-hover:text-white">Trang chủ (Cache)</span>
            </Link>
            <Link 
              href="/favorites"
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/5"
            >
               <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500/20 transition-colors">
                  <Heart className="w-5 h-5 text-red-500" />
               </div>
              <span className="text-gray-300 font-medium group-hover:text-white">Phim yêu thích</span>
            </Link>
            <Link 
              href="/history"
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-all group text-left border border-transparent hover:border-white/5"
            >
               <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                  <Clock className="w-5 h-5 text-blue-500" />
               </div>
              <span className="text-gray-300 font-medium group-hover:text-white">Lịch sử xem</span>
            </Link>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-8 font-mono">
          SYSTEM_STATUS: {isOnline ? 'ONLINE' : 'DISCONNECTED'}
        </p>
      </div>
    </div>
  );
}
