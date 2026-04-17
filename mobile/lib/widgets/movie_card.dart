import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/theme/app_colors.dart';
import '../data/models/movie_model.dart'; 

class MovieCard extends StatelessWidget {
  final Movie movie;
  final VoidCallback onTap;

  const MovieCard({
    super.key,
    required this.movie,
    required this.onTap,
  });

  List<Widget> _buildBadges() {
    String q = movie.quality?.toLowerCase() ?? '';
    String l = movie.lang?.toLowerCase() ?? '';
    String epClean = movie.episodeCurrent?.replaceAll(RegExp(r'Tập\s*|Hoàn\s*tất', caseSensitive: false), '').trim() ?? '';
    
    String checkString = '$l $q';
    List<Widget> badges = [];

    Widget badgeItem(String text, Color bgColor) {
      return Container(
        margin: const EdgeInsets.only(top: 2),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(2),
          border: Border.all(color: Colors.white.withValues(alpha: 0.2), width: 0.5),
        ),
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 9,
            fontWeight: FontWeight.bold,
          ),
        ),
      );
    }

    if (checkString.contains('vietsub')) {
      badges.add(badgeItem(epClean.isNotEmpty ? 'VS $epClean' : 'VS', AppColors.badgeVietsub));
    } else if (checkString.contains('thuyết minh')) {
      badges.add(badgeItem(epClean.isNotEmpty ? 'TM $epClean' : 'TM', AppColors.badgeThuyetMinh));
    } else if (checkString.contains('lồng tiếng')) {
      badges.add(badgeItem(epClean.isNotEmpty ? 'LT $epClean' : 'LT', AppColors.badgeLongTieng));
    } else if (l.isNotEmpty || q.isNotEmpty) {
      badges.add(badgeItem(epClean.isNotEmpty ? 'VS $epClean' : 'VS', AppColors.badgeVietsub));
    }

    return badges;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Image & Overlay Section (Aspect 2:3)
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(5)),
                    child: CachedNetworkImage(
                      imageUrl: movie.thumbUrl ?? '',
                      fit: BoxFit.cover,
                      alignment: Alignment.topCenter,
                      errorWidget: (context, url, error) => Container(
                        color: Colors.grey[900],
                        child: const Icon(Icons.movie, color: Colors.grey),
                      ),
                    ),
                  ),
                  
                  Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.8),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),

                  Positioned(
                    bottom: 4,
                    right: 4,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: _buildBadges(),
                    ),
                  ),

                  if (movie.progressPercentage != null && movie.progressPercentage! > 0)
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      child: LinearProgressIndicator(
                        value: movie.progressPercentage! / 100,
                        backgroundColor: Colors.grey[800],
                        color: AppColors.primary,
                        minHeight: 2,
                      ),
                    ),
                ],
              ),
            ),

            // Content Below Image
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    movie.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: AppColors.foreground,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          movie.originName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 10,
                            color: Colors.grey[500],
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                      Text(
                        movie.year.toString(),
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.grey[400],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
