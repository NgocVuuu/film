import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/models/watch_history_model.dart';
import '../data/models/movie_model.dart';

class WatchHistoryProvider extends ChangeNotifier {
  static const String _historyKey = 'watch_history_v1';
  List<WatchHistoryItem> _history = [];
  bool _isInit = false;

  List<WatchHistoryItem> get history => _history;

  WatchHistoryProvider() {
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String>? itemsString = prefs.getStringList(_historyKey);
    
    if (itemsString != null) {
      _history = itemsString
          .map((item) => WatchHistoryItem.fromJson(item))
          .toList();
    }
    _isInit = true;
    notifyListeners();
  }

  Future<void> _saveHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final itemsString = _history.map((item) => item.toJson()).toList();
    await prefs.setStringList(_historyKey, itemsString);
  }

  Future<void> addOrUpdate(
    Movie movie,
    String episodeName,
    String episodeUrl,
    double progress,
  ) async {
    if (!_isInit) await _loadHistory();

    final itemIndex = _history.indexWhere((i) => i.slug == movie.slug);
    
    final newItem = WatchHistoryItem(
      slug: movie.slug,
      name: movie.name,
      thumbUrl: movie.thumbUrl,
      episodeName: episodeName,
      episodeUrl: episodeUrl,
      progress: progress,
      updatedAt: DateTime.now().millisecondsSinceEpoch,
    );

    if (itemIndex >= 0) {
      // Update existing record
      _history[itemIndex] = newItem;
    } else {
      // Add new record at the top
      _history.insert(0, newItem);
    }

    // Sort by latest update and limit to 20 recent items
    _history.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    if (_history.length > 20) {
      _history = _history.sublist(0, 20);
    }

    notifyListeners();
    _saveHistory();
  }

  Future<void> removeRecord(String slug) async {
    _history.removeWhere((i) => i.slug == slug);
    notifyListeners();
    _saveHistory();
  }

  Future<void> clearHistory() async {
    _history.clear();
    notifyListeners();
    _saveHistory();
  }
}
