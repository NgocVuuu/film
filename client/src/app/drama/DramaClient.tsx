'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flame, Trash2, MessageCircle, Star, ExternalLink, ThumbsUp, ChevronDown } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { cn } from '@/lib/utils';
import { CommentSection } from '@/components/CommentSection';
import { useAuth } from '@/contexts/auth-context';

interface DramaMovie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  content: string;
  year: number;
  quality: string;
  fire_count: number;
  trash_count: number;
}

export default function DramaClient() {
  const [tab, setTab] = useState<'trash' | 'fire'>('trash');
  const [movies, setMovies] = useState<DramaMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCommentFor, setOpenCommentFor] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}/api/movies/drama-ranking?type=${tab}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMovies(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [tab]);

  const handleToggleComment = (slug: string) => {
      setOpenCommentFor(prev => prev === slug ? null : slug);
  };

  return (
    <div className={cn("min-h-screen text-white pb-20 pt-20 md:pt-28 relative overflow-hidden transition-colors duration-1000", tab === 'trash' ? "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/40 via-deep-black to-deep-black" : "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-orange-950/40 via-deep-black to-deep-black")}>
      
      {/* Background Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 z-0">
         <div className="absolute top-1/4 left-[5%] md:left-[10%] text-6xl md:text-8xl animate-pulse blur-[2px] opacity-30 mix-blend-screen -rotate-12">{tab === 'trash' ? '🍅' : '🔥'}</div>
         <div className="absolute top-1/3 right-[5%] md:right-[15%] text-7xl md:text-9xl animate-pulse blur-[4px] opacity-20 mix-blend-screen rotate-12 duration-1000">{tab === 'trash' ? '🗑️' : '🍿'}</div>
         <div className="absolute bottom-1/4 left-[15%] md:left-[20%] text-7xl md:text-8xl animate-pulse blur-[3px] opacity-20 mix-blend-screen rotate-45 duration-[3000ms]">{tab === 'trash' ? '💩' : '✨'}</div>
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker { animation: ticker 20s linear infinite; }
      `}</style>

      {/* Marquee Ticker */}
      <div className="absolute top-[60px] md:top-[80px] left-[-5%] w-[110%] overflow-hidden bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 py-1.5 z-10 border-y border-white/20 shadow-[0_0_20px_rgba(249,115,22,0.4)] -rotate-2">
        <div className="whitespace-nowrap flex w-max animate-ticker opacity-90">
            <span className="text-black font-black uppercase tracking-widest text-xs md:text-sm px-4">🔥 HOT DRAMA 🍅 THỊ PHI ĐIỆN ẢNH 🍿 HÓNG BIẾN CỰC MẠNH 💬 CHÊ PHIM KHÔNG TRƯỢT PHÁT NÀO 🏆 MÂM XÔI VÀNG 🎬 BOM TẤN HAY BOM XỊT</span>
            <span className="text-black font-black uppercase tracking-widest text-xs md:text-sm px-4">🔥 HOT DRAMA 🍅 THỊ PHI ĐIỆN ẢNH 🍿 HÓNG BIẾN CỰC MẠNH 💬 CHÊ PHIM KHÔNG TRƯỢT PHÁT NÀO 🏆 MÂM XÔI VÀNG 🎬 BOM TẤN HAY BOM XỊT</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10 mt-8 md:mt-12">
        
        <div className="text-center mb-10 md:mb-14">
            <h1 className={cn("text-4xl md:text-6xl font-black mb-4 font-heading text-transparent bg-clip-text transition-colors duration-500 drop-shadow-lg", tab === 'trash' ? "bg-gradient-to-r from-red-500 to-rose-400" : "bg-gradient-to-r from-orange-500 to-yellow-400")}>
                Góc Drama
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-2xl mx-auto font-medium">
                Nơi cộng đồng không ngần ngại "ném đá" những tác phẩm tệ hại nhất và tôn vinh những bộ phim cuốn hút nhất.
            </p>
        </div>

        {/* Custom Tabs */}
        <div className="flex p-1 md:p-1.5 bg-black/40 backdrop-blur-xl rounded-xl md:rounded-2xl mb-8 md:mb-12 max-w-sm md:max-w-md mx-auto border border-white/10 relative z-10 shadow-2xl">
            <button
                onClick={() => setTab('trash')}
                className={cn(
                    "flex-1 py-2.5 md:py-3.5 px-3 md:px-6 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all duration-300 flex items-center justify-center gap-1.5 md:gap-2 uppercase tracking-wide whitespace-nowrap",
                    tab === 'trash' ? "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)] scale-105" : "text-gray-500 hover:text-red-400 hover:bg-white/5"
                )}
            >
                <span className="text-base md:text-xl drop-shadow-lg">🍅</span> Rác Phẩm
            </button>
            <button
                onClick={() => setTab('fire')}
                className={cn(
                    "flex-1 py-2.5 md:py-3.5 px-3 md:px-6 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all duration-300 flex items-center justify-center gap-1.5 md:gap-2 uppercase tracking-wide whitespace-nowrap",
                    tab === 'fire' ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-105" : "text-gray-500 hover:text-orange-400 hover:bg-white/5"
                )}
            >
                <span className="text-base md:text-xl drop-shadow-lg">🔥</span> Siêu Phẩm
            </button>
        </div>

        {loading ? (
            <div className="space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-full h-48 bg-surface-900/50 animate-pulse rounded-3xl border border-white/5" />
                ))}
            </div>
        ) : movies.length === 0 ? (
            <div className="text-center py-20 bg-surface-900/50 rounded-3xl border border-white/5">
                <p className="text-gray-500">Chưa có bảng xếp hạng nào cho hạng mục này.</p>
            </div>
        ) : (
            <div className="space-y-8">
                {movies.map((movie, index) => (
                    <div key={movie._id} className="relative group bg-surface-900/40 backdrop-blur-xl rounded-[32px] border border-white/10 overflow-hidden transition-all duration-500 hover:bg-surface-800/60 hover:shadow-[0_15px_40px_rgba(0,0,0,0.5)] hover:-translate-y-1 hover:border-white/20 z-10">
                        <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none", tab === 'trash' ? "bg-red-500" : "bg-orange-500")} />
                        
                        <div className="p-2.5 md:p-5 flex gap-3 md:gap-5 relative">
                            {/* Ranking Badge */}
                            <div className={cn("absolute top-0 right-3 md:right-6 px-2 py-1 md:px-3 md:py-1.5 rounded-b-xl flex flex-col items-center justify-center shadow-xl z-20 transition-transform group-hover:scale-110 origin-top", 
                                index === 0 ? "bg-gradient-to-b from-yellow-300 to-yellow-600 border-x border-b border-yellow-300/50 shadow-[0_5px_15px_rgba(250,204,21,0.4)]" : 
                                index === 1 ? "bg-gradient-to-b from-gray-300 to-gray-500 border-x border-b border-gray-300/50 shadow-[0_5px_15px_rgba(156,163,175,0.4)]" : 
                                index === 2 ? "bg-gradient-to-b from-amber-600 to-amber-800 border-x border-b border-amber-500/50 shadow-[0_5px_15px_rgba(217,119,6,0.4)]" : 
                                "bg-gradient-to-b from-surface-800 to-surface-900 border-x border-b border-white/10"
                            )}>
                                <span className={cn("text-[8px] md:text-[10px] font-black uppercase tracking-widest mb-0.5", 
                                    index === 0 ? "text-yellow-900/80" : 
                                    index === 1 ? "text-gray-800/80" : 
                                    index === 2 ? "text-amber-200/80" : "text-gray-500"
                                )}>TOP</span>
                                <span className={cn("text-xl md:text-2xl font-black leading-none drop-shadow-sm", 
                                    index === 0 ? "text-white" : 
                                    index === 1 ? "text-white" : 
                                    index === 2 ? "text-white" : "text-white/20"
                                )}>
                                    #{index + 1}
                                </span>
                            </div>

                            <Link href={`/movie/${movie.slug}`} className="shrink-0 w-16 h-24 md:w-28 md:h-40 rounded-lg md:rounded-xl overflow-hidden shadow-lg group block">
                                <img src={movie.thumb_url} alt={movie.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </Link>

                            <div className="flex-1 flex flex-col min-w-0 pr-10 md:pr-12">
                                <Link href={`/movie/${movie.slug}`} className="hover:text-primary transition-colors">
                                    <h3 className="text-sm md:text-xl font-bold truncate leading-tight">{movie.name}</h3>
                                    <p className="text-[10px] md:text-sm text-gray-400 truncate mt-0.5 md:mt-1">{movie.origin_name} ({movie.year})</p>
                                </Link>

                                <div className="hidden md:block mt-2 md:mt-3 text-[13px] md:text-sm text-gray-300/80 line-clamp-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: movie.content }} />

                                <div className="mt-auto pt-2 flex items-center justify-between gap-2 relative z-10">
                                    <div className="flex items-center">
                                        <div className={cn("flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border shadow-inner", tab === 'trash' ? "bg-red-950/30 border-red-500/20" : "bg-orange-950/30 border-orange-500/20")}>
                                            <span className="text-sm md:text-lg drop-shadow-md">{tab === 'trash' ? '🍅' : '🔥'}</span>
                                            <span className={cn("text-xs md:text-base font-black", tab === 'trash' ? "text-red-400" : "text-orange-400")}>
                                                {tab === 'trash' ? movie.trash_count : movie.fire_count}
                                            </span>
                                            <span className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase ml-0.5 md:ml-1 mt-0.5 tracking-wider hidden xs:inline">Vote</span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleToggleComment(movie.slug)}
                                        className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold text-white transition-all bg-white/10 hover:bg-white/20 px-2.5 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl shrink-0 whitespace-nowrap shadow-lg border border-white/5 active:scale-95"
                                    >
                                        <MessageCircle className="w-3 h-3 md:w-4 md:h-4" />
                                        <span>Bình luận</span>
                                        <ChevronDown className={cn("w-3 h-3 md:w-4 md:h-4 transition-transform", openCommentFor === movie.slug && "rotate-180")} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Inline Comment Section */}
                        {openCommentFor === movie.slug && (
                            <div className="border-t border-white/10 bg-black/40 backdrop-blur-md p-4 md:p-6 animate-fade-in relative z-20 shadow-inner">
                                <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                                    <CommentSection 
                                        movieSlug={movie.slug} 
                                        hideRatingForm={true} 
                                        formPosition="top" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
