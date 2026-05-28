import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:flutter_html/flutter_html.dart';
import '../data/models/movie_model.dart';
import '../core/theme/app_colors.dart';
import '../providers/movies_provider.dart';
import '../providers/bookmark_provider.dart';
import 'video_player_screen.dart';

class MovieDetailScreen extends StatefulWidget {
  final Movie movie;

  const MovieDetailScreen({super.key, required this.movie});

  @override
  State<MovieDetailScreen> createState() => _MovieDetailScreenState();
}

class _MovieDetailScreenState extends State<MovieDetailScreen> {
  late Future<Movie?> _movieDetailFuture;

  @override
  void initState() {
    super.initState();
    // Fetch full detail specifically for this movie when screen opens
    _movieDetailFuture = Provider.of<MoviesProvider>(context, listen: false)
        .fetchMovieDetail(widget.movie.slug);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Movie?>(
      future: _movieDetailFuture,
      builder: (context, snapshot) {
        // Fallback to the brief movie data passed from Home if detail isn't loaded yet
        Movie displayMovie = snapshot.data ?? widget.movie;
        bool isLoading = snapshot.connectionState == ConnectionState.waiting;

        return Scaffold(
          backgroundColor: AppColors.background,
          body: CustomScrollView(
            slivers: [
              SliverAppBar(
                expandedHeight: 300.0,
                pinned: true,
                backgroundColor: AppColors.background,
                iconTheme: const IconThemeData(color: Colors.white),
                actions: [
                  Consumer<BookmarkProvider>(
                    builder: (context, bookmarkProvider, child) {
                      final isBookmarked =
                          bookmarkProvider.isBookmarked(displayMovie.slug);
                      return IconButton(
                        icon: Icon(
                          isBookmarked ? Icons.bookmark : Icons.bookmark_border,
                          color: isBookmarked ? AppColors.primary : Colors.white,
                        ),
                        onPressed: () {
                          bookmarkProvider.toggleBookmark(displayMovie);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(isBookmarked
                                  ? 'Đã xoá khỏi danh sách lưu'
                                  : 'Đã thêm vào danh sách lưu'),
                              duration: const Duration(seconds: 2),
                              backgroundColor: AppColors.card,
                            ),
                          );
                        },
                      );
                    },
                  ),
                ],
                flexibleSpace: FlexibleSpaceBar(
                  title: Text(
                    displayMovie.name,
                    style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  background: Stack(
                    fit: StackFit.expand,
                    children: [
                      CachedNetworkImage(
                        imageUrl: displayMovie.thumbUrl ?? '',
                        fit: BoxFit.cover,
                        alignment: Alignment.topCenter,
                        errorWidget: (context, url, error) =>
                            Container(color: AppColors.card),
                      ),
                      // Lớp phủ Gradient đen mờ để chữ hiển thị rõ
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.bottomCenter,
                            end: Alignment.topCenter,
                            colors: [AppColors.background, Colors.transparent],
                            stops: [0.0, 0.5], // Mờ dần từ dưới lên
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Thông tin cơ bản
                      Text(
                        displayMovie.originName,
                        style: TextStyle(
                            color: Colors.grey[400],
                            fontSize: 16,
                            fontStyle: FontStyle.italic),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Text('Năm: ${displayMovie.year}',
                              style: const TextStyle(color: Colors.white70)),
                          const SizedBox(width: 16),
                          if (displayMovie.quality != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                border: Border.all(color: Colors.white54),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(displayMovie.quality!,
                                  style: const TextStyle(
                                      color: Colors.white, fontSize: 12)),
                            ),
                          const SizedBox(width: 8),
                          if (displayMovie.episodeCurrent != null)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppColors.primary,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(displayMovie.episodeCurrent!,
                                  style: const TextStyle(
                                      color: Colors.black,
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold)),
                            ),
                        ],
                      ),
                      const SizedBox(height: 24),

                      // Nút Xem Phim
                      if (isLoading)
                        const Center(
                            child: CircularProgressIndicator(
                                color: AppColors.primary))
                      else if (displayMovie.episodes.isNotEmpty)
                        SizedBox(
                          width: double.infinity,
                          height: 50,
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.black, // Chữ đen trên nền Vàng
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            icon: const Icon(Icons.play_circle_fill, size: 28),
                            label: const Text('XEM PHIM',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold, fontSize: 16)),
                            onPressed: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => VideoPlayerScreen(
                                      movie: displayMovie,
                                      episodeName: displayMovie.episodes.first.serverData.first.name,
                                      episodeUrl: displayMovie
                                          .episodes.first.serverData.first.linkM3u8),
                                ),
                              );
                            },
                          ),
                        )
                      else
                        const Center(
                          child: Text(
                            'Đang cập nhật link phim...',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ),

                      const SizedBox(height: 16),
                      const Divider(color: Colors.white24),
                      const SizedBox(height: 16),

                      // Nội dung mô tả / Plot
                      const Text(
                        'Nội dung phim',
                        style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 18,
                            fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      // Sử dụng flutter_html để render HTML nội dung (tránh các tag text)
                      if (displayMovie.content != null)
                        Html(
                          data: displayMovie.content ?? '',
                          style: {
                            "body": Style(
                              color: Colors.white70,
                              fontSize: FontSize(14.0),
                              lineHeight: const LineHeight(1.5),
                              margin: Margins.zero,
                              padding: HtmlPaddings.zero,
                            ),
                          },
                        )
                      else
                        const Text(
                          'Đang cập nhật nội dung...',
                          style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                              height: 1.5),
                        ),
                      const SizedBox(height: 40),

                      // Episodes Grid
                      if (displayMovie.episodes.isNotEmpty && displayMovie.episodes.first.serverData.length > 1)
                        ...[
                          const Text(
                            'Danh sách tập',
                            style: TextStyle(
                                color: AppColors.primary,
                                fontSize: 18,
                                fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 12),
                          GridView.builder(
                            physics: const NeverScrollableScrollPhysics(),
                            shrinkWrap: true,
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 4,
                              childAspectRatio: 2,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                            ),
                            itemCount: displayMovie.episodes.first.serverData.length,
                            itemBuilder: (context, index) {
                              final ep = displayMovie.episodes.first.serverData[index];
                              return InkWell(
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => VideoPlayerScreen(
                                          movie: displayMovie,
                                          episodeName: ep.name,
                                          episodeUrl: ep.linkM3u8),
                                    ),
                                  );
                                },
                                child: Container(
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: Colors.grey[800],
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: Colors.white24),
                                  ),
                                  child: Text(
                                    ep.name,
                                    style: const TextStyle(
                                        color: Colors.white, fontSize: 14),
                                  ),
                                ),
                              );
                            },
                          ),
                          const SizedBox(height: 40),
                        ],
                    ],
                  ),
                ),
              )
            ],
          ),
        );
      },
    );
  }
}
