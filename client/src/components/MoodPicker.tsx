'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HeartCrack, Smile, Brain, Flame, Shuffle, X, ChevronLeft } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { MovieCard } from '@/components/MovieCard';

interface Movie {
    _id: string;
    name: string;
    origin_name: string;
    slug: string;
    thumb_url: string;
    year: number;
    episode_current?: string;
    quality?: string;
}

export function MoodPicker() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Show after 3 seconds of idle/visit if not dismissed today
    const dismissedDate = localStorage.getItem('moodPickerDismissedDate');
    const today = new Date().toISOString().split('T')[0];
    
    if (dismissedDate !== today) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('moodPickerDismissedDate', today);
  };

  const handleMoodSelect = async (mood: string) => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('moodPickerDismissedDate', today);
    try {
      if (mood === 'sad') {
        const res = await fetch(`${API_URL}/api/movies/sad-movies`, { credentials: 'include' });
        const data = await res.json();
        if (data.success && data.data && data.data.length > 0) {
            const randomMovie = data.data[Math.floor(Math.random() * data.data.length)];
            router.push(`/movie/${randomMovie.slug}`);
            return;
        } else {
            router.push('/sad-movies');
        }
      } else if (mood === 'funny') {
        // Comedy but exclude animation. We can route to a search or a custom endpoint
        // For simplicity, we can route to /the-loai/hai-huoc?exclude=hoat-hinh if supported,
        // or just fetch a random comedy movie and go to it. Let's fetch one!
        const res = await fetch(`${API_URL}/api/movies/random?mood=funny`);
        const data = await res.json();
        if (data.success && data.data) {
          router.push(`/movie/${data.data.slug}`);
        } else {
            router.push('/the-loai/hai-huoc');
        }
      } else if (mood === '18+') {
        const res = await fetch(`${API_URL}/api/movies/random?mood=18plus`);
        const data = await res.json();
        if (data.success && data.data) {
          router.push(`/movie/${data.data.slug}`);
        } else {
            router.push('/the-loai/phim-18');
        }
      } else if (mood === 'brain') {
        const res = await fetch(`${API_URL}/api/movies/random?mood=brain`);
        const data = await res.json();
        if (data.success && data.data) {
          router.push(`/movie/${data.data.slug}`);
        } else {
             router.push('/the-loai/tam-ly');
        }
      } else if (mood === 'random') {
        const res = await fetch(`${API_URL}/api/movies/random?mood=random`);
        const data = await res.json();
        if (data.success && data.data) {
          router.push(`/movie/${data.data.slug}`);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
        // Keep loading state until navigation completes
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] p-4 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      {/* Overlay to close when clicking outside */}
      <div className="absolute inset-0" onClick={handleDismiss}></div>
      
      <div className="bg-surface-900/95 backdrop-blur-2xl border border-white/10 p-6 md:p-8 rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] pointer-events-auto max-w-2xl w-full relative overflow-hidden z-10 scale-100 transition-all duration-500 animate-in zoom-in-95">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent blur-xl rounded-full"></div>
        
        <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20"
        >
            <X className="w-5 h-5" />
        </button>

        {loading && (
            <div className="absolute inset-0 bg-surface-900/80 backdrop-blur-md z-30 flex items-center justify-center rounded-3xl">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>
            </div>
        )}

        <div className="relative z-10">
            <div className="text-center mb-6">
                <h3 className="text-lg md:text-xl font-bold text-white mb-1 tracking-tight">Chưa biết xem gì?</h3>
                <p className="text-xs md:text-sm text-gray-400">Chọn phim theo tâm trạng hiện tại của bạn nhé!</p>
            </div>

                <div className="grid grid-cols-5 gap-2 md:gap-4">
                  
                  <button onClick={() => handleMoodSelect('sad')} className="flex flex-col items-center gap-2 md:gap-3 group p-2 hover:bg-white/[0.03] rounded-2xl transition-all duration-300">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-900/50 to-blue-600/10 flex items-center justify-center group-hover:scale-105 transition-all duration-300 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] group-hover:border-blue-400/50 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute inset-0 bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                      <HeartCrack className="w-5 h-5 md:w-7 md:h-7 text-blue-300 relative z-10 drop-shadow-md group-hover:animate-pulse" />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-gray-400 group-hover:text-blue-300 text-center transition-colors">Thất tình</span>
                  </button>

                  <button onClick={() => handleMoodSelect('funny')} className="flex flex-col items-center gap-2 md:gap-3 group p-2 hover:bg-white/[0.03] rounded-2xl transition-all duration-300">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-yellow-900/50 to-amber-600/10 flex items-center justify-center group-hover:scale-105 transition-all duration-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] group-hover:shadow-[0_0_25px_rgba(245,158,11,0.3)] group-hover:border-amber-400/50 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute inset-0 bg-amber-400/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                      <Smile className="w-5 h-5 md:w-7 md:h-7 text-amber-300 relative z-10 drop-shadow-md group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-gray-400 group-hover:text-amber-300 text-center transition-colors">Cười xỉu</span>
                  </button>

                  <button onClick={() => handleMoodSelect('brain')} className="flex flex-col items-center gap-2 md:gap-3 group p-2 hover:bg-white/[0.03] rounded-2xl transition-all duration-300">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-purple-900/50 to-fuchsia-600/10 flex items-center justify-center group-hover:scale-105 transition-all duration-300 border border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)] group-hover:shadow-[0_0_25px_rgba(217,70,239,0.3)] group-hover:border-fuchsia-400/50 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute inset-0 bg-fuchsia-400/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                      <Brain className="w-5 h-5 md:w-7 md:h-7 text-fuchsia-300 relative z-10 drop-shadow-md group-hover:rotate-12 transition-transform" />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-gray-400 group-hover:text-fuchsia-300 text-center transition-colors">Hại não</span>
                  </button>

                  <button onClick={() => handleMoodSelect('18+')} className="flex flex-col items-center gap-2 md:gap-3 group p-2 hover:bg-white/[0.03] rounded-2xl transition-all duration-300">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-red-900/50 to-rose-600/10 flex items-center justify-center group-hover:scale-105 transition-all duration-300 border border-rose-500/30 shadow-[0_0_15px_rgba(225,29,72,0.15)] group-hover:shadow-[0_0_25px_rgba(225,29,72,0.3)] group-hover:border-rose-400/50 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute inset-0 bg-rose-400/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                      <Flame className="w-5 h-5 md:w-7 md:h-7 text-rose-300 relative z-10 drop-shadow-md group-hover:scale-110 group-hover:rotate-6 transition-transform" />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-gray-400 group-hover:text-rose-300 text-center transition-colors">Nóng bỏng</span>
                  </button>

                  <button onClick={() => handleMoodSelect('random')} className="flex flex-col items-center gap-2 md:gap-3 group p-2 hover:bg-white/[0.03] rounded-2xl transition-all duration-300">
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-emerald-900/50 to-teal-600/10 flex items-center justify-center group-hover:scale-105 transition-all duration-300 border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.15)] group-hover:shadow-[0_0_25px_rgba(20,184,166,0.3)] group-hover:border-teal-400/50 relative overflow-hidden backdrop-blur-md">
                      <div className="absolute inset-0 bg-teal-400/20 opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                      <Shuffle className="w-5 h-5 md:w-7 md:h-7 text-teal-300 relative z-10 drop-shadow-md group-hover:rotate-180 transition-transform duration-500" />
                    </div>
                    <span className="text-[10px] md:text-xs font-bold text-gray-400 group-hover:text-teal-300 text-center transition-colors">Bất kỳ</span>
                  </button>
                </div>
            </div>
      </div>
    </div>
  );
}
