'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, Play, ChevronRight } from 'lucide-react';
import { API_URL } from '@/lib/config';

interface UpdatedMovie {
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  quality: string;
  episode_current: string;
  updatedAt: string;
}

export function UpdatedTodayBoard() {
  const [movies, setMovies] = useState<UpdatedMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/movies/updated-today`)
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
  }, []);

  if (loading) return (
    <div className="w-full h-32 animate-pulse bg-surface-900/50 rounded-2xl flex items-center justify-center border border-white/5">
      <div className="flex items-center gap-2 text-primary">
        <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        <span className="text-sm font-medium">Đang tải bảng tin...</span>
      </div>
    </div>
  );

  if (movies.length === 0) return null;

  const getTimeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 60000); // minutes
    if (diff < 60) return `${diff} phút trước`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return 'Hôm nay';
  };

  return (
    <div className="w-full bg-surface-900/40 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-md">
      <div className="flex items-center justify-between p-4 md:p-5 border-b border-white/5 bg-surface-800/30">
        <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Mới cập nhật hôm nay
        </h2>
        <Link href="/danh-sach/phim-moi" className="text-xs font-semibold text-primary hover:text-gold-400 flex items-center transition-colors">
          Xem tất cả <ChevronRight className="w-4 h-4 ml-0.5" />
        </Link>
      </div>

      <div className="p-3 md:p-4">
        <div className="flex gap-3 overflow-x-auto pb-3 custom-scrollbar snap-x">
          {movies.map((movie, idx) => (
            <Link 
              key={idx} 
              href={`/movie/${movie.slug}`}
              className="flex-shrink-0 w-64 md:w-72 bg-surface-800/50 hover:bg-white/5 rounded-2xl p-3 border border-white/5 transition-colors group snap-start flex gap-3"
            >
              <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden relative">
                <img src={movie.thumb_url} alt={movie.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <div className="absolute top-1 right-1">
                    <span className="bg-primary text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm shadow-black/50">Mới</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">{movie.name}</h3>
                <p className="text-xs text-gray-400 truncate mb-1.5">{movie.origin_name}</p>
                <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] font-medium text-gray-300 bg-white/5 px-2 py-0.5 rounded">
                        {movie.episode_current || movie.quality}
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">
                        {getTimeAgo(movie.updatedAt)}
                    </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
