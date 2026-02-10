'use client';
import { useEffect, useState } from 'react';
import { HeroSlider } from '@/components/HeroSlider';
import { MovieCarousel } from '@/components/MovieCarousel';
import { API_URL } from '@/lib/config';

interface Movie {
  _id: string;
  name: string;
  origin_name: string;
  slug: string;
  thumb_url: string;
  year: number;
  poster_url?: string;
}

export default function Home() {

  const [loading, setLoading] = useState(true);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]); // Array for Hero

  // Categories State
  const [latestMovies, setLatestMovies] = useState<Movie[]>([]);
  const [chinaMovies, setChinaMovies] = useState<Movie[]>([]);
  const [koreaMovies, setKoreaMovies] = useState<Movie[]>([]);
  const [usukMovies, setUsukMovies] = useState<Movie[]>([]);
  const [cartoonMovies, setCartoonMovies] = useState<Movie[]>([]);
  const [horrorMovies, setHorrorMovies] = useState<Movie[]>([]);
  const [familyMovies, setFamilyMovies] = useState<Movie[]>([]);

  useEffect(() => {
    // Fetch data from our Node.js server
    fetch(`${API_URL}/api/movies/home`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const {
            featuredMovies,
            latestMovies,
            chinaMovies,
            koreaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies
          } = data.data;

          setFeaturedMovies(featuredMovies);
          setLatestMovies(latestMovies);
          setChinaMovies(chinaMovies);
          setKoreaMovies(koreaMovies);
          setUsukMovies(usukMovies);
          setCartoonMovies(cartoonMovies);
          setHorrorMovies(horrorMovies);
          setFamilyMovies(familyMovies);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching home data:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-deep-black flex items-center justify-center">
        <div className="text-primary animate-pulse text-xl">Đang tải phim cực hot...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-deep-black text-foreground pb-20">

      {/* Hero Slider Section */}
      {featuredMovies.length > 0 && (
        <HeroSlider movies={featuredMovies} />
      )}

      {/* Carousel Sections */}
      <div className="container mx-auto px-4 space-y-8 -mt-10 relative z-20">

        <MovieCarousel
          title="🔥 Phim Mới Cập Nhật"
          movies={latestMovies}
          viewAllLink="/phim-moi"
        />

        <MovieCarousel
          title="🇨🇳 C-Drama Đỉnh Cao"
          movies={chinaMovies}
        />

        <MovieCarousel
          title="🇰🇷 K-Drama Cực Phẩm"
          movies={koreaMovies}
        />

        <MovieCarousel
          title="🦄 Thế Giới Tuổi Thơ"
          movies={cartoonMovies}
          viewAllLink="/hoat-hinh"
        />

        <MovieCarousel
          title="🇺🇸 Bom Tấn Hollywood"
          movies={usukMovies}
        />

        <MovieCarousel
          title="👻 Nỗi Ám Ảnh Đêm Khuya"
          movies={horrorMovies}
        />

        <MovieCarousel
          title="👨‍👩‍👧‍👦 Gia Đình Là Số 1"
          movies={familyMovies}
        />

      </div>
    </div>
  );
}
