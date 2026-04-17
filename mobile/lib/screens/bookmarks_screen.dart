import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/bookmark_provider.dart';
import '../widgets/movie_card.dart';
import '../data/models/movie_model.dart';
import '../data/models/bookmark_model.dart';
import 'movie_detail_screen.dart';

class BookmarksScreen extends StatelessWidget {
  const BookmarksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Phim Yêu Thích'),
        centerTitle: true,
      ),
      body: Consumer<BookmarkProvider>(
        builder: (context, provider, child) {
          final bookmarks = provider.bookmarks.reversed.toList();

          if (bookmarks.isEmpty) {
            return const Center(
              child: Text(
                'Bạn chưa lưu phim nào.',
                style: TextStyle(color: Colors.grey, fontSize: 16),
              ),
            );
          }

          return GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 0.65,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
            ),
            itemCount: bookmarks.length,
            itemBuilder: (context, index) {
              final BookmarkItem item = bookmarks[index];
              final syntheticMovie = Movie(
                id: item.slug, 
                slug: item.slug,
                name: item.name,
                originName: item.originName,
                thumbUrl: item.thumbUrl,
                posterUrl: item.thumbUrl, // fallback
                year: item.year,
              );
              return MovieCard(
                movie: syntheticMovie,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => MovieDetailScreen(movie: syntheticMovie),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}
