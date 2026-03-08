'use client';
import { useEffect, useState } from 'react';
import { HeroSlider } from '@/components/HeroSlider';
import { MovieCarousel } from '@/components/MovieCarousel';
import { ContinueWatchingCard } from '@/components/ContinueWatchingCard';
import { LazyMovieSection } from '@/components/LazyMovieSection';
import { TrendingCarousel } from '@/components/TrendingCarousel';
import { PWAAds } from '@/components/PWAAds';
import LoadingScreen from '@/components/LoadingScreen';
import { customFetch } from '@/lib/api';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { MarvelBanner } from '@/components/MarvelBanner';
import { DCUBanner } from '@/components/DCUBanner';
import { StephenChowBanner } from '@/components/StephenChowBanner';
import { KoreanDrama2016Banner } from '@/components/KoreanDrama2016Banner';
import { SadMoviesBanner } from '@/components/SadMoviesBanner';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const UNIVERSE_BANNERS = [MarvelBanner, DCUBanner, StephenChowBanner, KoreanDrama2016Banner, SadMoviesBanner];

function UniverseBannersCarousel() {
  return (
    <Carousel
      opts={{ align: 'start', loop: true, dragFree: true }}
      className="w-full relative group/banners md:px-8"
    >
      <CarouselContent className="-ml-3">
        {UNIVERSE_BANNERS.map((Banner, i) => (
          <CarouselItem key={i} className="pl-3 basis-[88vw] md:basis-1/2 lg:basis-1/3">
            <Banner compact />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-0 opacity-0 group-hover/banners:opacity-100 transition-opacity bg-black/70 border-white/10 hover:bg-primary hover:text-black hidden md:flex" />
      <CarouselNext className="right-0 opacity-0 group-hover/banners:opacity-100 transition-opacity bg-black/70 border-white/10 hover:bg-primary hover:text-black hidden md:flex" />
    </Carousel>
  );
}

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
  useScrollRestoration(!loading);
  const [featuredMovies, setFeaturedMovies] = useState<Movie[]>([]); // Array for Hero
  const [upcomingMovies, setUpcomingMovies] = useState<Movie[]>([]); // New Upcoming Movies
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
  const [actionMovies, setActionMovies] = useState<Movie[]>([]);
  const [romanceMovies, setRomanceMovies] = useState<Movie[]>([]);
  const [comedyMovies, setComedyMovies] = useState<Movie[]>([]);
  const [adventureMovies, setAdventureMovies] = useState<Movie[]>([]);
  const [scifiMovies, setScifiMovies] = useState<Movie[]>([]);
  const [crimeMovies, setCrimeMovies] = useState<Movie[]>([]);
  const [historyDramaMovies, setHistoryDramaMovies] = useState<Movie[]>([]);
  const [martialArtsMovies, setMartialArtsMovies] = useState<Movie[]>([]);
  const [shortDramaMovies, setShortDramaMovies] = useState<Movie[]>([]);
  const [tvShows, setTvShows] = useState<Movie[]>([]);
  const [warMovies, setWarMovies] = useState<Movie[]>([]);
  const [mysteryMovies, setMysteryMovies] = useState<Movie[]>([]);
  const [schoolMovies, setSchoolMovies] = useState<Movie[]>([]);
  const [documentaryMovies, setDocumentaryMovies] = useState<Movie[]>([]);
  const [fantasyMovies, setFantasyMovies] = useState<Movie[]>([]);
  const [hkMovies, setHkMovies] = useState<Movie[]>([]);
  const [vnMovies, setVnMovies] = useState<Movie[]>([]);
  const [hotAnimeMovies, setHotAnimeMovies] = useState<Movie[]>([]);
  const [legendaryAnimeMovies, setLegendaryAnimeMovies] = useState<Movie[]>([]);
  const [xianxiaMovies, setXianxiaMovies] = useState<Movie[]>([]);

  useEffect(() => {
    // Fetch data from our Node.js server
    customFetch(`/api/movies/home`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const {
            trendingMovies,
            featuredMovies,
            upcomingMovies,
            latestMovies,
            continueWatching,
            chinaMovies,
            koreaMovies,
            usukMovies,
            cartoonMovies,
            horrorMovies,
            familyMovies,
            thailandMovies,
            actionMovies,
            romanceMovies,
            comedyMovies,
            adventureMovies,
            scifiMovies,
            crimeMovies,
            historyDramaMovies,
            martialArtsMovies,
            shortDramaMovies,
            tvShows,
            warMovies,
            mysteryMovies,
            schoolMovies,
            documentaryMovies,
            fantasyMovies,
            hkMovies,
            vnMovies,
            hotAnimeMovies,
            legendaryAnimeMovies,
            xianxiaMovies
          } = data.data;

          setTrendingMovies(trendingMovies || []);
          setFeaturedMovies(featuredMovies || []);
          // Merge local history with API history for instant sync
          let mergedHistory = continueWatching || [];
          try {
            const localHistoryStr = localStorage.getItem('history');
            if (localHistoryStr) {
              const localHistory = JSON.parse(localHistoryStr);
              if (Array.isArray(localHistory) && localHistory.length > 0) {
                // Build a map of API items by slug for O(1) lookup
                const apiMap = new Map<string, any>((continueWatching || []).map((item: any) => [item.slug, item]));

                const finalHistory: any[] = [];
                const processedSlugs = new Set();

                // First pass: local items (may have most recent data from this device)
                for (const localItem of localHistory) {
                  if (!localItem?.slug || !localItem.progress) continue;
                  const apiItem = apiMap.get(localItem.slug);
                  if (apiItem) {
                    // Both exist — keep the one with newer timestamp (cross-device sync)
                    const localTime = localItem.viewedAt ? new Date(localItem.viewedAt).getTime() : 0;
                    const apiTime = apiItem.viewedAt ? new Date(apiItem.viewedAt).getTime() : 0;
                    finalHistory.push(localTime >= apiTime ? localItem : apiItem);
                  } else {
                    finalHistory.push(localItem);
                  }
                  processedSlugs.add(localItem.slug);
                }

                // Second pass: add API-only items (watched on another device)
                for (const apiItem of (continueWatching || [])) {
                  if (apiItem?.slug && !processedSlugs.has(apiItem.slug)) {
                    finalHistory.push(apiItem);
                  }
                }

                // Sort by viewedAt descending
                finalHistory.sort((a, b) => {
                  const timeA = a.viewedAt ? new Date(a.viewedAt).getTime() : 0;
                  const timeB = b.viewedAt ? new Date(b.viewedAt).getTime() : 0;
                  return timeB - timeA;
                });

                mergedHistory = finalHistory.slice(0, 10);
              }
            }
          } catch (e) {
            console.error('Error merging local history:', e);
          }

          setContinueWatchingMovies(mergedHistory);

          setLatestMovies(latestMovies || []);
          setChinaMovies(chinaMovies || []);
          setKoreaMovies(koreaMovies || []);
          setUsukMovies(usukMovies || []);
          setCartoonMovies(cartoonMovies || []);
          setHorrorMovies(horrorMovies || []);
          setFamilyMovies(familyMovies || []);
          setThailandMovies(thailandMovies || []);
          setActionMovies(actionMovies || []);
          setRomanceMovies(romanceMovies || []);
          setComedyMovies(comedyMovies || []);
          setAdventureMovies(adventureMovies || []);
          setScifiMovies(scifiMovies || []);
          setCrimeMovies(crimeMovies || []);
          setHistoryDramaMovies(historyDramaMovies || []);
          setMartialArtsMovies(martialArtsMovies || []);
          setShortDramaMovies(shortDramaMovies || []);
          setTvShows(tvShows || []);
          setWarMovies(warMovies || []);
          setMysteryMovies(mysteryMovies || []);
          setSchoolMovies(schoolMovies || []);
          setDocumentaryMovies(documentaryMovies || []);
          setFantasyMovies(fantasyMovies || []);
          setHkMovies(hkMovies || []);
          setVnMovies(vnMovies || []);
          setHotAnimeMovies(hotAnimeMovies || []);
          setLegendaryAnimeMovies(legendaryAnimeMovies || []);
          setXianxiaMovies(xianxiaMovies || []);
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
      {trendingMovies.length > 0 && (
        <HeroSlider movies={trendingMovies} />
      )}

      {/* UNIVERSE BANNERS */}
      <div className="container mx-auto px-4 mt-10 md:mt-14 relative z-20 mb-2">
        <UniverseBannersCarousel />
      </div>

      {/* Carousel Sections */}
      <div className="container mx-auto px-4 space-y-12 mt-4 relative z-20">

        {/* 1. Cinema / Featured */}
        {featuredMovies.length > 0 && (
          <MovieCarousel
            title="Phim lẻ chiếu rạp đẳng cấp nhất"
            movies={featuredMovies}
            viewAllLink="/danh-sach/phim-chieu-rap"
          />
        )}

        {/* 1.5 Upcoming Movies (Chiếu rạp nhưng chỉ mới có trailer) */}
        {upcomingMovies.length > 0 && (
          <MovieCarousel
            title="Phim rạp sắp chiếu"
            movies={upcomingMovies}
            viewAllLink="/danh-sach/phim-chieu-rap"
          />
        )}

        {/* 2. Trending Section */}
        {trendingMovies.length > 0 && (
          <TrendingCarousel movies={trendingMovies} />
        )}

        {/* 3. Recommended */}
        <MovieCarousel
          title="Phim nổi bật đề cử cho bạn"
          movies={trendingMovies.slice().reverse()}
        />

        {/* Continue Watching Section */}
        {continueWatchingMovies.filter(m => m.progress).length > 0 && (
          <div className="container mx-auto px-4 mt-8">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary rounded-full"></span>
              Tiếp tục xem ({continueWatchingMovies.filter(m => m.progress).length})
            </h2>
            <div className="relative">
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
                {continueWatchingMovies.filter(m => m.progress).map((movie) => (
                  <div key={movie._id} className="shrink-0 w-40 snap-start">
                    <ContinueWatchingCard movie={movie as typeof movie & { progress: NonNullable<typeof movie.progress> }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. Hot Anime */}
        <LazyMovieSection
          title="Top Anime & Hoạt hình Hot nhất"
          movies={hotAnimeMovies}
          viewAllLink="/hoat-hinh"
        />

        {/* 4.1 Legendary Anime */}
        <LazyMovieSection
          title="Anime Huyền thoại vượt thời gian"
          movies={legendaryAnimeMovies}
          viewAllLink="/hoat-hinh?sort=view&maxYear=2015"
        />

        {/* 4.2 Animation */}
        <LazyMovieSection
          title="Thế giới hoạt hình đa sắc màu"
          movies={cartoonMovies}
          viewAllLink="/hoat-hinh?category=gia-dinh&sort=newest"
        />

        {/* 4.3 Xianxia / Chinese Animation */}
        <LazyMovieSection
          title="Hoạt hình Tiên Hiệp Trung Quốc đỉnh nhất"
          movies={xianxiaMovies}
          viewAllLink="/hoat-hinh?country=trung-quoc&sort=newest"
        />

        {/* 5. China */}
        <LazyMovieSection
          title="Siêu phẩm Trung Quốc hot nhất"
          movies={chinaMovies}
          viewAllLink="/quoc-gia/trung-quoc"
        />

        {/* 6. Korea */}
        <LazyMovieSection
          title="Phim Hàn Quốc châm ngòi cảm xúc"
          movies={koreaMovies}
          viewAllLink="/quoc-gia/han-quoc"
        />

        {/* 7. Action */}
        <LazyMovieSection
          title="Hành động nghẹt thở và kịch tính"
          movies={actionMovies}
          viewAllLink="/the-loai/hanh-dong"
        />

        {/* 8. Latest */}
        <MovieCarousel
          title="Phim mới cập nhật hàng ngày"
          movies={latestMovies}
          viewAllLink="/phim-moi"
        />

        {/* 9. Hollywood / USUK */}
        <LazyMovieSection
          title="Bom tấn Hollywood và đỉnh cao điện ảnh"
          movies={usukMovies}
          viewAllLink="/quoc-gia/au-my"
        />

        {/* 10. Romance */}
        <LazyMovieSection
          title="Tình cảm lãng mạn ngọt ngào"
          movies={romanceMovies}
          viewAllLink="/the-loai/tinh-cam"
        />

        {/* 11. Horror */}
        <LazyMovieSection
          title="Nỗi ám ảnh kinh dị rùng rợn"
          movies={horrorMovies}
          viewAllLink="/the-loai/kinh-di"
        />

        {/* 12. Comedy */}
        <LazyMovieSection
          title="Hài hước sảng khoái xua tan mệt mỏi"
          movies={comedyMovies}
          viewAllLink="/the-loai/hai-huoc"
        />

        {/* 13. Adventure */}
        <LazyMovieSection
          title="Phiêu lưu kỳ thú và hành trình mới"
          movies={adventureMovies}
          viewAllLink="/the-loai/phieu-luu"
        />

        {/* 14. Family / Animation for kids */}
        <LazyMovieSection
          title="Phim Gia Đình Gắn Kết Yêu Thương"
          movies={familyMovies}
          viewAllLink="/the-loai/gia-dinh"
        />

        {/* 15. Martial Arts */}
        <LazyMovieSection
          title="Võ thuật đỉnh cao và hành động thực chiến"
          movies={martialArtsMovies}
          viewAllLink="/the-loai/vo-thuat"
        />

        {/* 16. Historical / Cổ Trang */}
        <LazyMovieSection
          title="Cổ Trang và kiếm hiệp Trung Hoa"
          movies={historyDramaMovies}
          viewAllLink="/the-loai/co-trang"
        />

        {/* 17. Crime */}
        <LazyMovieSection
          title="Hình sự và hồ sơ tội phạm phá án"
          movies={crimeMovies}
          viewAllLink="/the-loai/hinh-su"
        />

        {/* 18. Sci-Fi */}
        <LazyMovieSection
          title="Viễn tưởng và khoa học kỳ ảo"
          movies={scifiMovies}
          viewAllLink="/the-loai/vien-tuong"
        />

        {/* 19. Short Drama */}
        <LazyMovieSection
          title="Phim ngắn Short Drama mới lạ"
          movies={shortDramaMovies}
          viewAllLink="/the-loai/short-drama"
        />

        {/* 20. Thailand */}
        <LazyMovieSection
          title="Phim Thái Lan kịch tính và hài hước"
          movies={thailandMovies}
          viewAllLink="/quoc-gia/thai-lan"
        />

        {/* 21. Vietnam */}
        <LazyMovieSection
          title="Phim lẻ Việt Nam đặc sắc chọn lọc"
          movies={vnMovies}
          viewAllLink="/quoc-gia/viet-nam"
        />

        {/* 22. Hong Kong */}
        <LazyMovieSection
          title="Phim Hồng Kông kinh điển một thời"
          movies={hkMovies}
          viewAllLink="/quoc-gia/hong-kong"
        />

        {/* 23. TV Shows */}
        <LazyMovieSection
          title="TV Show truyền hình thực tế bùng nổ"
          movies={tvShows}
          viewAllLink="/tv-shows"
        />

        {/* 24. War */}
        <LazyMovieSection
          title="Hùng ca chiến tranh và lịch sử hào hùng"
          movies={warMovies}
          viewAllLink="/the-loai/chien-tranh"
        />

        {/* 25. Fantasy */}
        <LazyMovieSection
          title="Thần thoại và thế giới ma thuật"
          movies={fantasyMovies}
          viewAllLink="/the-loai/than-thoai"
        />

        {/* 26. School */}
        <LazyMovieSection
          title="Thanh xuân học đường Trung Hoa"
          movies={schoolMovies}
          viewAllLink="/the-loai/hoc-duong"
        />

        {/* 27. Mystery */}
        <LazyMovieSection
          title="Bí ẩn và những câu đố chưa có lời giải"
          movies={mysteryMovies}
          viewAllLink="/the-loai/bi-an"
        />

        {/* 28. Documentary */}
        <LazyMovieSection
          title="Thước phim tài liệu và đời thực"
          movies={documentaryMovies}
          viewAllLink="/the-loai/tai-lieu"
        />

        <div className="pb-8">
          <PWAAds variant="home" />
        </div>

      </div>
    </div>
  );
}
