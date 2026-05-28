import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/watch_history_provider.dart';
import '../data/models/movie_model.dart';
import '../widgets/movie_card.dart';
import 'movie_detail_screen.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Phim Đang Xem'),
        centerTitle: true,
      ),
      body: Consumer<WatchHistoryProvider>(
        builder: (context, provider, child) {
          final history = provider.history.reversed.toList();

          if (history.isEmpty) {
            return const Center(
              child: Text(
                'Bạn chưa xem bộ phim nào.',
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
            itemCount: history.length,
            itemBuilder: (context, index) {
              final item = history[index];
              final syntheticMovie = Movie(
                id: item.slug, 
                slug: item.slug,
                name: item.name,
                originName: item.name, // Placeholder
                thumbUrl: item.thumbUrl,
                posterUrl: item.thumbUrl, 
                year: DateTime.now().year,
                episodeCurrent: item.episodeName,
                progressPercentage: item.progress,
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
