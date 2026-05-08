'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MovieCarousel } from '@/components/MovieCarousel';

interface UpdatedMovie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  quality?: string;
  episode_current?: string;
  updatedAt: string;
  year: number;
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

  return (
    <div className="-mx-4 md:mx-0 mt-4 md:mt-8">
      <MovieCarousel
        title="Mới cập nhật hôm nay"
        movies={movies}
        viewAllLink="/moi-cap-nhat"
      />
    </div>
  );
}
