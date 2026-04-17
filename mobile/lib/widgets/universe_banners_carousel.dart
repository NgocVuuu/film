import 'package:flutter/material.dart';

class UniverseBannersCarousel extends StatelessWidget {
  const UniverseBannersCarousel({super.key});

  final List<Map<String, String>> banners = const [
    {'title': 'MARVEL\nUNIVERSE', 'color': '0xFFE23636', 'subtitle': 'Vũ trụ siêu anh hùng'},
    {'title': 'DC\nUNIVERSE', 'color': '0xFF0078F2', 'subtitle': 'Liên minh công lý'},
    {'title': 'CHÂU TINH TRÌ', 'color': '0xFFFACC15', 'subtitle': 'Vua hài kịch'},
    {'title': 'PHIM HÀN', 'color': '0xFFE879F9', 'subtitle': 'Huyền thoại 2016'},
    {'title': 'PHIM BUỒN', 'color': '0xFF94A3B8', 'subtitle': 'Chạm đến trái tim'},
  ];

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        scrollDirection: Axis.horizontal,
        itemCount: banners.length,
        itemBuilder: (context, index) {
          final banner = banners[index];
          return Container(
            width: 250,
            margin: const EdgeInsets.only(right: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Color(int.parse(banner['color']!)).withValues(alpha: 0.3), 
              border: Border.all(color: Color(int.parse(banner['color']!)).withValues(alpha: 0.5)),
            ),
            child: Stack(
              children: [
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          Colors.black.withValues(alpha: 0.8),
                          Colors.transparent,
                        ],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        banner['title']!,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        banner['subtitle']!,
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
