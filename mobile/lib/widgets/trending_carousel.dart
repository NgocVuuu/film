import 'package:flutter/material.dart';
import '../data/models/movie_model.dart';
import '../core/theme/app_colors.dart';
import 'movie_carousel.dart';

class TrendingCarousel extends StatelessWidget {
  final String title;
  final List<Movie> movies;

  const TrendingCarousel({
    super.key,
    required this.title,
    required this.movies,
  });

  @override
  Widget build(BuildContext context) {
    if (movies.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 12),
      padding: const EdgeInsets.only(top: 24, bottom: 8),
      decoration: BoxDecoration(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(40),
          topRight: Radius.circular(40),
        ),
        border: Border(top: BorderSide(color: AppColors.primary.withValues(alpha: 0.2))),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppColors.primary.withValues(alpha: 0.15),
            AppColors.primary.withValues(alpha: 0.02),
            Colors.transparent,
          ],
        ),
      ),
      child: MovieCarousel(
        title: title,
        movies: movies,
      ),
    );
  }
}
