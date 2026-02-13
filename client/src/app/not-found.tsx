'use client';

import Link from 'next/link';
import { Home, MoveLeft, Ghost, Film, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Texture/Noise could go here */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>

      <div className="text-center max-w-lg w-full relative z-10">
        
        {/* Playful Icon Animation */}
        <div className="relative mb-6 h-40 flex items-center justify-center">
            {/* Background glowing blur */}
            <div className="absolute w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            
            <div className="relative animate-bounce-slow">
                <Ghost className="w-24 h-24 text-gray-700 absolute top-0 left-8 rotate-12 opacity-50" />
                <Clapperboard className="w-28 h-28 text-primary relative z-10 -rotate-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
            </div>
            
            <div className="absolute -bottom-2 right-10 bg-red-600 text-white text-xs font-bold px-2 py-1 rotate-12 rounded scale-90 md:scale-100 shadow-lg">
                MISSING SCENE
            </div>
        </div>

        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-linear-to-br from-white via-gray-400 to-gray-800 mb-2 font-heading tracking-tighter">
            404
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-primary to-yellow-200">
          Cắt! Cảnh này chưa quay!
        </h2>
        
        <div className="space-y-2 mb-8 text-gray-400 text-base md:text-lg leading-relaxed px-4">
          <p>
            Bạn vừa đi lạc vào hậu trường hoặc trôi dạt sang vũ trụ khác rồi.
          </p>
          <p className="italic text-gray-500 text-sm">
            (Hoặc là editor lỡ tay xóa mất file này rồi cũng nên... 🤫)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button 
            variant="outline" 
            onClick={() => window.history.back()}
            className="w-full sm:w-auto gap-2 border-white/10 hover:bg-white/10 text-white rounded-full h-12 px-6"
          >
            <MoveLeft className="w-4 h-4" />
            Quay xe gấp
          </Button>
          
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full gap-2 bg-primary hover:bg-gold-400 text-black font-extrabold rounded-full h-12 px-8 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:shadow-[0_0_30px_rgba(234,179,8,0.5)] transition-all transform hover:scale-105">
              <Film className="w-4 h-4" />
              Về rạp chiếu bóng
            </Button>
          </Link>
        </div>

        {/* Funny Footer */}
        <div className="mt-12 text-xs text-gray-600 font-mono">
            Error Code: 404_NOT_FOUND_BUT_FOUND_A_BUG_MAYBE
        </div>
      </div>
    </div>
  );
}
