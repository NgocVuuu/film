'use client';
import { useEffect, useState } from 'react';
import { HeroSlider } from '@/components/HeroSlider';
import { MovieCarousel } from '@/components/MovieCarousel';
import { ContinueWatchingCard } from '@/components/ContinueWatchingCard';
import { LazyMovieSection } from '@/components/LazyMovieSection';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import LoadingScreen from '@/components/LoadingScreen';
import { API_URL } from '@/lib/config';

interface Movie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  year: number;
  view?: number;
  poster_url?: string;
  progress?: {
    currentTime: number;
    duration: number;
    percentage: number;
    episodeSlug: string;
    episodeName: string;
  };
}

export default function Home() {

  const [loading, setLoading] = useState(true);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]); // Array for Hero
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]); // New Trending
  const [continueWatchingMovies, setContinueWatchingMovies] = useState<Movie[]>([]); // New Continue Watching

  // Categories State
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [chinaMovies, setChinaMovies] = useState<Movie[]>([]);
  const [koreaMovies, setKoreaMovies] = useState<Movie[]>([]);
  const [usukMovies, setUsukMovies] = useState<Movie[]>([]);
  const [cartoonMovies, setCartoonMovies] = useState<Movie[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<Movie[]>([]);
  const [familyMovies, setFamilyMovies] = useState<Movie[]>([]);

  const [thailandMovies, setThailandMovies] = useState<Movie[]>([]);
  const [japanMovies, setJapanMovies] = useState<Movie[]>([]);
  const [actionMovies, setActionMovies] = useState<Movie[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<Movie[]>([]);

  useEffect(() => {
    // Fetch data from our Node.js server
    fetch(`${API_URL}/api/movies/home`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const {
            trendingMovies,
            featuredMovies,
            latestMovies,
            continueWatching,
            chinaMovies,
            koreaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies,
            thailandMovies,
            japanMovies,
            actionMovies,
            romanceMovies
          } = data.data;

          setTrendingMovies(trendingMovies || []);
          setFeaturedMovies(featuredMovies || []);
          setContinueWatchingMovies(continueWatching || []);

          // DEBUG: Log continue watching data
          console.log('[Homepage] Continue Watching Data:', continueWatching);
          console.log('[Homepage] Continue Watching Count:', continueWatching?.length || 0);

          setLatestMovies(latestMovies || []);
          setChinaMovies(chinaMovies || []);
          setKoreaMovies(koreaMovies || []);
          setUsukMovies(usukMovies || []);
          setCartoonMovies(cartoonMovies || []);
          setHorrorMovies(horrorMovies || []);
          setFamilyMovies(familyMovies || []);
          setThailandMovies(thailandMovies || []);
          setJapanMovies(japanMovies || []);
          setActionMovies(actionMovies || []);
          setRomanceMovies(romanceMovies || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching home data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-deep-black text-foreground pb-20">

      {/* Hero Slider Section */}
      {featuredMovies.length > 0 && (
        <HeroSlider movies={featuredMovies} />
      )}

      {/* Carousel Sections */}
      <div className="container mx-auto px-4 space-y-12 -mt-10 relative z-20">

        {/* Trending Section */}
        {trendingMovies.length > 0 && (
          <TrendingCarousel movies={trendingMovies} />
        )}

        {/* Continue Watching Section */}
        {continueWatchingMovies.length > 0 && (
          <div className="container mx-auto px-4 mt-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              Tiếp tục xem ({continueWatchingMovies.length})
            </h2>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {continueWatchingMovies.filter(m => m.progress).map((movie) => (
                  <div key={movie._id} className="flex-shrink-0 w-40 snap-start">
                    <ContinueWatchingCard movie={movie as any} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}



        {/* Eager-loaded sections */}
        <MovieCarousel
          title="Phim Mới Cập Nhật"
          movies={latestMovies}
          viewAllLink="/phim-moi"
        />

        <MovieCarousel
          title="Đề Cử Cho Bạn"
          movies={trendingMovies.slice().reverse()}
        />

        {/* Lazy-loaded sections - only load when scrolled into view */}
        <LazyMovieSection
          title="C-Drama Đỉnh Cao"
          movies={chinaMovies}
          viewAllLink="/quoc-gia/trung-quoc"
        />

        <LazyMovieSection
          title="K-Drama Cực Phẩm"
          movies={koreaMovies}
          viewAllLink="/quoc-gia/han-quoc"
        />

        <LazyMovieSection
          title="Phim Thái Lan Đặc Sắc"
          movies={thailandMovies}
          viewAllLink="/quoc-gia/thai-lan"
        />

        <LazyMovieSection
          title="Phim Nhật Bản Hấp Dẫn"
          movies={japanMovies}
          viewAllLink="/quoc-gia/nhat-ban"
        />

        <LazyMovieSection
          title="Phim Hành Động Kịch Tính"
          movies={actionMovies}
          viewAllLink="/the-loai/hanh-dong"
        />

        <LazyMovieSection
          title="Phim Tình Cảm Lãng Mạn"
          movies={romanceMovies}
          viewAllLink="/the-loai/tinh-cam"
        />

        <LazyMovieSection
          title="Thế Giới Tuổi Thơ"
          movies={cartoonMovies}
          viewAllLink="/hoat-hinh"
        />

        <LazyMovieSection
          title="Bom Tấn Hollywood"
          movies={usukMovies}
        />

        <LazyMovieSection
          title="Nỗi Ám Ảnh Đêm Khuya"
          movies={horrorMovies}
          viewAllLink="/the-loai/kinh-di"
        />

        <LazyMovieSection
          title="Gia Đình Là Số 1"
          movies={familyMovies}
          viewAllLink="/the-loai/gia-dinh"
        />

      </div>
    </div>
  );
}
