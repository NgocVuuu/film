import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../data/models/movie_model.dart';
import '../core/theme/app_colors.dart';
import '../screens/movie_detail_screen.dart';

class HeroSlider extends StatefulWidget {
  final List<Movie> movies;

  const HeroSlider({super.key, required this.movies});

  @override
  State<HeroSlider> createState() => _HeroSliderState();
}

class _HeroSliderState extends State<HeroSlider> {
  late PageController _pageController;
  double _page = 0.0;

  @override
  void initState() {
    super.initState();
    // Tỷ lệ viewport phù hợp để hiển thị các poster nhỏ (giống 140x210 trên web)
    _pageController = PageController(viewportFraction: 0.45);
    _pageController.addListener(() {
      setState(() {
        _page = _pageController.page ?? 0.0;
      });
    });
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.movies.isEmpty) return const SizedBox(height: 250);

    final displayMovies = widget.movies.take(6).toList();
    final int currentIndex = _page.round().clamp(0, displayMovies.length - 1);
    final currentMovie = displayMovies[currentIndex];

    return SizedBox(
      height: 540, // Chiều cao tổng thể tương đương mobile web
      child: Stack(
        children: [
          // 1. Ảnh nền làm mờ (Background Slide)
          Positioned.fill(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 500),
              child: CachedNetworkImage(
                key: ValueKey<String>(currentMovie.id),
                imageUrl: currentMovie.posterUrl ?? currentMovie.thumbUrl ?? '',
                fit: BoxFit.cover,
                errorWidget: (context, url, error) => Container(color: Colors.grey[900]),
              ),
            ),
          ),
          
          // Lớp phủ Gradient Tối (giống bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent)
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      AppColors.background,
                      AppColors.background.withValues(alpha: 0.9),
                      AppColors.background.withValues(alpha: 0.4),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.4, 0.7, 1.0],
                  ),
                ),
              ),
            ),
          ),

          // Nội dung chính: Poster Carousel và Info
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const SizedBox(height: 20), // Khoảng trống cho Top Nav
                
                // 2. Carousel Poster Phim (Cao ~250 để chứa poster 140x210 + margin)
                SizedBox(
                  height: 250,
                  child: PageView.builder(
                    controller: _pageController,
                    itemCount: displayMovies.length,
                    itemBuilder: (context, index) {
                      final movie = displayMovies[index];
                      double value = index - _page;
                      // Hiệu ứng scale cho phần tử ở giữa và xung quanh
                      double scale = (1 - (value.abs() * 0.15)).clamp(0.8, 1.0);
                      // Hiệu ứng dịch chuyển nhẹ theo chiều ngang giống 3D translate
                      double translateX = value * 20;

                      final isCurrent = index == currentIndex;

                      return GestureDetector(
                        onTap: () {
                          if (isCurrent) {
                            Navigator.push(context, MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: movie)));
                          } else {
                            _pageController.animateToPage(index, duration: const Duration(milliseconds: 300), curve: Curves.easeInOut);
                          }
                        },
                        child: Transform.translate(
                          offset: Offset(translateX, 0),
                          child: Transform.scale(
                            scale: scale,
                            child: Center(
                              child: Container(
                                width: 150, // Kích thước poster width tĩnh
                                height: 225, // Kích thước poster height tĩnh
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: isCurrent
                                      ? [
                                          BoxShadow(
                                            color: AppColors.primary.withValues(alpha: 0.3),
                                            blurRadius: 15,
                                            spreadRadius: 2,
                                          )
                                        ]
                                      : [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.5),
                                            blurRadius: 10,
                                            offset: const Offset(0, 5),
                                          )
                                        ],
                                  border: isCurrent
                                      ? Border.all(color: AppColors.primary.withValues(alpha: 0.6), width: 2)
                                      : null,
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(14), // Nhỏ hơn Container 2px bù border
                                  child: CachedNetworkImage(
                                    imageUrl: movie.posterUrl ?? movie.thumbUrl ?? '',
                                    fit: BoxFit.cover,
                                    errorWidget: (context, url, error) => Container(color: Colors.grey[800]),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                
                const SizedBox(height: 16),

                // 3. Thông tin phim (Fading Section)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      // Tên phim hiệu ứng Gradient Vàng
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: [
                            Color(0xFFFEF08A), // yellow-100
                            Color(0xFFFDE047), // yellow-300
                            Color(0xFFEAB308), // yellow-500
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ).createShader(bounds),
                        child: Text(
                          currentMovie.name,
                          textAlign: TextAlign.center,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 6),
                      
                      // Secondary Info: Origin name (Year) [Episode]
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Flexible(
                            child: Text(
                              currentMovie.originName,
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '(${currentMovie.year})',
                            style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                          if (currentMovie.episodeCurrent != null && currentMovie.episodeCurrent!.isNotEmpty) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.4),
                                border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                currentMovie.episodeCurrent!,
                                style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ]
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // 4. Các nút thao tác (Row Actions)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Nút Xem Ngay (Primary)
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        elevation: 8,
                        shadowColor: AppColors.primary.withValues(alpha: 0.5),
                      ),
                      icon: const Icon(Icons.play_arrow, size: 20),
                      label: const Text('XEM NGAY', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: currentMovie)));
                      },
                    ),
                    const SizedBox(width: 12),
                    // Nút Chi Tiết (Outline)
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                      ),
                      icon: const Icon(Icons.info_outline, size: 20),
                      label: const Text('Chi Tiết', style: TextStyle(fontSize: 14)),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => MovieDetailScreen(movie: currentMovie)));
                      },
                    ),
                  ],
                ),
                
                const SizedBox(height: 30),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
