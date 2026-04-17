import 'dart:ui';
import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import 'home_screen.dart';
import 'history_screen.dart';
import 'bookmarks_screen.dart';
import 'profile_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  // Danh sách các màn hình của từng Tab
  final List<Widget> _screens = [
    const HomeScreen(),
    const HistoryScreen(),
    const BookmarksScreen(),
    const ProfileScreen(),
  ];

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBody: true, // Để nội dung có thể cuộn dưới Bottom Nav trong suốt
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0), // Margin giống web
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24), // Bo góc 2xl (16-24px)
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.15), // Bóng shadow-primary/20
                  blurRadius: 24,
                  spreadRadius: 2,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12), // backdrop-blur-xl
                child: Container(
                  height: 64, // Gọn gàng như thanh h-12 + padding
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.8), // bg-black/80
                    border: Border.all(color: Colors.white.withValues(alpha: 0.1), width: 1), // border-white/10
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildNavItem(0, Icons.home_outlined, Icons.home, 'Trang chủ'),
                      _buildNavItem(1, Icons.schedule_outlined, Icons.schedule, 'Đang xem'),
                      _buildNavItem(2, Icons.favorite_outline, Icons.favorite, 'Yêu thích'), // Matching heart icon on web
                      _buildNavItem(3, Icons.person_outline, Icons.person, 'Cá nhân'),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, IconData activeIcon, String label) {
    final isActive = _selectedIndex == index;
    return GestureDetector(
      onTap: () => _onItemTapped(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 60, // Đảm bảo ấn trúng dễ dàng
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isActive ? activeIcon : icon,
              color: isActive ? AppColors.primary : Colors.grey[400],
              size: 24, // Kích thước icon chuẩn
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10, // Chữ nhỏ giống thiết kế mobile web (text-[10px])
                fontWeight: FontWeight.w500,
                color: isActive ? AppColors.primary : Colors.grey[400],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
