import 'dart:async';
import 'package:flutter/material.dart';
import '../core/api/api_client.dart';
import '../data/models/notification_model.dart';
import 'auth_provider.dart';

class NotificationProvider with ChangeNotifier {
  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _loading = false;
  Timer? _pollingTimer;
  
  final AuthProvider _authProvider;
  final ApiClient _apiClient = ApiClient();

  NotificationProvider(this._authProvider) {
    if (_authProvider.isAuthenticated && _authProvider.token != null) {
      _apiClient.dio.options.headers['Authorization'] = 'Bearer ${_authProvider.token}';
      fetchNotifications();
      _startPolling();
    } else {
      _stopPolling();
    }
  }

  List<NotificationModel> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get loading => _loading;

  Future<void> fetchNotifications() async {
    if (!_authProvider.isAuthenticated) {
      _notifications = [];
      _unreadCount = 0;
      notifyListeners();
      return;
    }
    
    try {
      _loading = true;
      notifyListeners();

      final response = await _apiClient.dio.get('/notifications?limit=20');
      
      if (response.data['success'] == true) {
        final dataList = response.data['data'] as List?;
        if (dataList != null) {
          _notifications = dataList.map((json) => NotificationModel.fromJson(json)).toList();
        }
        _unreadCount = response.data['unreadCount'] ?? 0;
      }
    } catch (e) {
      debugPrint('Error fetching notifications: $e');
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void _startPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = Timer.periodic(const Duration(minutes: 2), (_) {
      if (_authProvider.isAuthenticated) {
        fetchNotifications();
      }
    });
  }

  void _stopPolling() {
    _pollingTimer?.cancel();
    _notifications = [];
    _unreadCount = 0;
    notifyListeners();
  }

  Future<void> markAsRead(String id) async {
    if (!_authProvider.isAuthenticated) return;
    try {
      await _apiClient.dio.post('/notifications/$id/read');
      
      final index = _notifications.indexWhere((n) => n.id == id);
      if (index != -1) {
        final old = _notifications[index];
        _notifications[index] = NotificationModel(
          id: old.id,
          content: old.content,
          type: old.type,
          isRead: true,
          link: old.link,
          createdAt: old.createdAt,
        );
      }
      _unreadCount = _unreadCount > 0 ? _unreadCount - 1 : 0;
      notifyListeners();
    } catch (e) {
      debugPrint('Error marking notification as read: $e');
    }
  }

  Future<void> markAllAsRead() async {
    if (!_authProvider.isAuthenticated) return;
    try {
      await _apiClient.dio.post('/notifications/mark-all-read');
      
      _notifications = _notifications.map((old) => NotificationModel(
        id: old.id,
        content: old.content,
        type: old.type,
        isRead: true,
        link: old.link,
        createdAt: old.createdAt,
      )).toList();
      
      _unreadCount = 0;
      notifyListeners();
    } catch (e) {
      debugPrint('Error marking all notifications as read: $e');
    }
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }
}
