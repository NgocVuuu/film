import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_colors.dart';
import '../providers/movies_provider.dart';
import '../providers/watch_history_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/hero_slider.dart';
import '../widgets/movie_carousel.dart';
import '../widgets/universe_banners_carousel.dart';
import '../widgets/trending_carousel.dart';
import '../widgets/history_carousel.dart';
import 'search_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _isScrolled = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(() {
      if (_scrollController.offset > 0 && !_isScrolled) {
        setState(() => _isScrolled = true);
      } else if (_scrollController.offset <= 0 && _isScrolled) {
        setState(() => _isScrolled = false);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _showBrowseMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(
              top: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Handle/Thanh kÃƒÂ©o
                Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(
                      Icons.workspace_premium,
                      color: AppColors.primary,
                    ),
                  ),
                  title: const Text(
                    'Ã„Ã¡Â» xuÃ¡ÂºÂ¥t / Phim mÃ¡Â»â€ºi',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(
                    'Phim hot cÃ¡Âºp nhÃ¡Âºt mÃ¡Â»â€”i ngÃƒÂ y',
                    style: TextStyle(color: Colors.grey, fontSize: 11),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.blue.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.movie_creation, color: Colors.blue),
                  ),
                  title: const Text(
                    'Phim lÃ¡ÂºÂ»',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.green.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.video_library, color: Colors.green),
                  ),
                  title: const Text(
                    'Phim bÃ¡Â»â„¢',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  onTap: () {
                    Navigator.pop(context);
                  },
                ),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.purple.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.category, color: Colors.purple),
                  ),
                  title: const Text(
                    'ThÃ¡Â»Æ’ loÃ¡ÂºÂ¡i',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () {
                    Navigator.pop(context);
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showNotificationsDialog(
    BuildContext context,
    NotificationProvider provider,
  ) {
    showDialog(
      context: context,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          backgroundColor: AppColors.background.withValues(alpha: 0.95),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Thông báo',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (provider.unreadCount > 0)
                TextButton.icon(
                  onPressed: () {
                    provider.markAllAsRead();
                    Navigator.pop(dialogContext);
                  },
                  icon: const Icon(
                    Icons.check,
                    size: 16,
                    color: AppColors.primary,
                  ),
                  label: const Text(
                    'Đã đọc tất cả',
                    style: TextStyle(fontSize: 12, color: AppColors.primary),
                  ),
                ),
            ],
          ),
          content: SizedBox(
            width: double.maxFinite,
            height: 300,
            child: provider.loading
                ? const Center(child: CircularProgressIndicator())
                : provider.notifications.isEmpty
                ? const Center(
                    child: Text(
                      'Chưa có thông báo nào',
                      style: TextStyle(color: Colors.grey),
                    ),
                  )
                : ListView.builder(
                    itemCount: provider.notifications.length,
                    itemBuilder: (context, index) {
                      final notif = provider.notifications[index];
                      return ListTile(
                        onTap: () {
                          if (!notif.isRead) {
                            provider.markAsRead(notif.id);
                          }
                          Navigator.pop(dialogContext);
                          // Handle link navigation if notif.link is not null
                        },
                        leading: Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: notif.isRead
                                ? Colors.transparent
                                : AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        title: Text(
                          notif.content,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          _formatDate(notif.createdAt),
                          style: const TextStyle(
                            color: Colors.grey,
                            fontSize: 12,
                          ),
                        ),
                      );
                    },
                  ),
          ),
        );
      },
    );
  }

  String _formatDate(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inSeconds < 60) return '${diff.inSeconds} giây trước';
    if (diff.inMinutes < 60) return '${diff.inMinutes} phút trước';
    if (diff.inHours < 24) return '${diff.inHours} giờ trước';
    return '${date.day}/${date.month}/${date.year}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      extendBodyBehindAppBar: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          decoration: BoxDecoration(
            color: _isScrolled
                ? Colors.black.withValues(alpha: 0.95)
                : Colors.transparent,
            boxShadow: _isScrolled
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [],
          ),
          child: ClipRRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(
                sigmaX: _isScrolled ? 8 : 0,
                sigmaY: _isScrolled ? 8 : 0,
              ),
              child: AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                title: ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [
                      AppColors.primary,
                      Colors.yellow,
                      AppColors.primary,
                    ],
                  ).createShader(bounds),
                  child: Image.asset(
                    'assets/images/logo.png',
                    width: 40,
                    height: 40,
                  ),
                ),
                actions: [
                  IconButton(
                    icon: const Icon(Icons.search, color: Colors.white),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SearchScreen()),
                      );
                    },
                  ),
                  IconButton(
                    icon: const Icon(
                      Icons.filter_alt_outlined,
                      color: Colors.white,
                    ),
                    onPressed: _showBrowseMenu,
                  ),
                  Consumer2<AuthProvider, NotificationProvider>(
                    builder: (context, authProvider, notificationProvider, child) {
                      if (!authProvider.isAuthenticated) {
                        return const SizedBox.shrink(); // Non logged-in users don't see notifications
                      }

                      return Stack(
                        children: [
                          IconButton(
                            icon: const Icon(
                              Icons.notifications_none,
                              color: Colors.white,
                            ),
                            onPressed: () => _showNotificationsDialog(
                              context,
                              notificationProvider,
                            ),
                          ),
                          if (notificationProvider.unreadCount > 0)
                            Positioned(
                              top: 12,
                              right: 12,
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(
                                  color: Colors.red,
                                  shape: BoxShape.circle,
                                ),
                              ),
                            ),
                        ],
                      );
                    },
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
          ),
        ),
      ),
      body: Consumer2<MoviesProvider, WatchHistoryProvider>(
        builder: (context, moviesProvider, historyProvider, child) {
          if (moviesProvider.isLoading && moviesProvider.homeData.isEmpty) {
            return const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            );
          }

          if (moviesProvider.errorMessage != null &&
              moviesProvider.homeData.isEmpty) {
            return Center(
              child: Text(
                moviesProvider.errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            );
          }

          return RefreshIndicator(
            color: AppColors.primary,
            backgroundColor: AppColors.card,
            onRefresh: () => moviesProvider.fetchHomeData(),
            child: SingleChildScrollView(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Hero Slider (allTrending)
                  HeroSlider(movies: moviesProvider.getList('allTrending')),

                  // Lá»‹ch sá»­ xem phim (Tiếp tục xem)
                  if (historyProvider.history.isNotEmpty)
                    HistoryCarousel(
                      title: 'Tiếp tục xem',
                      history: historyProvider.history,
                    ),

                  // Chá»§ Ä‘á» Hot (Universe Banners)
                  Padding(
                    padding: const EdgeInsets.only(
                      left: 16,
                      top: 20,
                      bottom: 8,
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 4,
                          height: 24,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Chá»§ Ä‘á» Ä‘ang hot',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const UniverseBannersCarousel(),

                  const SizedBox(height: 10),

                  // Phim ráº¡p
                  MovieCarousel(
                    title: 'Phim lẻ chiếu rạp đẳng cấp nhất',
                    movies: moviesProvider.getList('featuredMovies'),
                  ),
                  MovieCarousel(
                    title: 'Phim rạp sắp chiếu',
                    movies: moviesProvider.getList('upcomingMovies'),
                  ),

                  // Section Trending (Bo gÃ³c + LinearGradient VÃ ng)
                  TrendingCarousel(
                    title: 'Phim bộ nổi bật',
                    movies: moviesProvider.getList('seriesTrending'),
                  ),
                  TrendingCarousel(
                    title: 'Phim lẻ nổi bật',
                    movies: moviesProvider.getList('movieTrending'),
                  ),

                  // Äá» cá»­
                  MovieCarousel(
                    title: 'Phim ná»•i báº­t Ä‘á» cá»­ cho báº¡n',
                    movies: moviesProvider
                        .getList('allTrending')
                        .reversed
                        .toList(),
                  ),

                  // CÃ¡c thá»ƒ loáº¡i khÃ¡c
                  MovieCarousel(
                    title: 'Top Anime & Hoạt hình Hot nhất',
                    movies: moviesProvider.getList('hotAnimeMovies'),
                  ),
                  MovieCarousel(
                    title: 'Hoạt hình Tiên Hiệp Trung Quốc đỉnh nhất',
                    movies: moviesProvider.getList('xianxiaMovies'),
                  ),
                  MovieCarousel(
                    title: 'Siêu phẩm Trung Quốc hot nhất',
                    movies: moviesProvider.getList('chinaMovies'),
                  ),
                  MovieCarousel(
                    title: 'Phim HÃ n Quá»‘c chÃ¢m ngÃ²i cáº£m xÃºc',
                    movies: moviesProvider.getList('koreaMovies'),
                  ),
                  MovieCarousel(
                    title: 'HÃ nh Ä‘á»™ng ngháº¹t thá»Ÿ vÃ  ká»‹ch tÃ­nh',
                    movies: moviesProvider.getList('actionMovies'),
                  ),
                  MovieCarousel(
                    title: 'Phim má»›i cáº­p nháº­t hÃ ng ngÃ y',
                    movies: moviesProvider.getList('latestMovies'),
                  ),
                  MovieCarousel(
                    title: 'Bom táº¥n Hollywood vÃ  Ä‘á»‰nh cao Ä‘iá»‡n áº£nh',
                    movies: moviesProvider.getList('usukMovies'),
                  ),

                  const SizedBox(height: 40),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
