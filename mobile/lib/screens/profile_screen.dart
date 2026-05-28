import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_colors.dart';
import '../providers/watch_history_provider.dart';
import '../providers/bookmark_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cá Nhân'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // User Info Placeholder
          Center(
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 50,
                  backgroundColor: AppColors.primary,
                  child: Icon(Icons.person, size: 50, color: Colors.white),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Khách',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Tính năng đăng nhập đang được phát triển.'),
                        backgroundColor: AppColors.card,
                      ),
                    );
                  },
                  child: const Text('Đăng nhập', style: TextStyle(color: Colors.white)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          // Settings Section
          const Text(
            'Cài đặt',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          _buildSettingsTile(
            icon: Icons.history,
            title: 'Xóa lịch sử xem',
            onTap: () {
              _showConfirmDialog(
                context,
                title: 'Xóa lịch sử xem?',
                content: 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử xem không?',
                onConfirm: () {
                  context.read<WatchHistoryProvider>().clearHistory();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Đã xóa lịch sử xem.'),
                      backgroundColor: AppColors.card,
                    ),
                  );
                },
              );
            },
          ),
          const Divider(color: Colors.white24),
          _buildSettingsTile(
            icon: Icons.bookmark_remove_rounded,
            title: 'Xóa phim đã lưu',
            onTap: () {
              _showConfirmDialog(
                context,
                title: 'Xóa phim đã lưu?',
                content: 'Bạn có chắc chắn muốn xóa toàn bộ danh sách phim đã lưu không?',
                onConfirm: () {
                  context.read<BookmarkProvider>().clearBookmarks();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Đã xóa danh sách phim đã lưu.'),
                      backgroundColor: AppColors.card,
                    ),
                  );
                },
              );
            },
          ),
          const SizedBox(height: 32),

          // About Section
          const Text(
            'Giới thiệu',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.primary),
          ),
          const SizedBox(height: 16),
          _buildSettingsTile(
            icon: Icons.info_outline,
            title: 'Phiên bản',
            trailing: const Text('1.0.0', style: TextStyle(color: Colors.grey)),
            onTap: () {},
          ),
          const Divider(color: Colors.white24),
          _buildSettingsTile(
            icon: Icons.privacy_tip_outlined,
            title: 'Điều khoản và Chính sách',
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Chỉ hỗ trợ cho mục đích phi thương mại.'),
                  backgroundColor: AppColors.card,
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
    Widget? trailing,
  }) {
    return ListTile(
      leading: Icon(icon, color: Colors.white),
      title: Text(title, style: const TextStyle(color: Colors.white)),
      trailing: trailing ?? const Icon(Icons.chevron_right, color: Colors.white54),
      onTap: onTap,
    );
  }

  void _showConfirmDialog(BuildContext context, {required String title, required String content, required VoidCallback onConfirm}) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        title: Text(title, style: const TextStyle(color: Colors.white)),
        content: Text(content, style: const TextStyle(color: Colors.white70)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Hủy', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
            onPressed: () {
              Navigator.pop(ctx);
              onConfirm();
            },
            child: const Text('Đồng ý', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
