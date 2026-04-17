import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../data/models/bookmark_model.dart';
import '../data/models/movie_model.dart';

class BookmarkProvider extends ChangeNotifier {
  static const String _bookmarkKey = 'bookmarks_v1';
  List<BookmarkItem> _bookmarks = [];
  bool _isInit = false;

  List<BookmarkItem> get bookmarks => _bookmarks;

  BookmarkProvider() {
    _loadBookmarks();
  }

  Future<void> _loadBookmarks() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String>? itemsString = prefs.getStringList(_bookmarkKey);

    if (itemsString != null) {
      _bookmarks = itemsString
          .map((item) => BookmarkItem.fromJson(item))
          .toList();
    }
    _isInit = true;
    notifyListeners();
  }

  Future<void> _saveBookmarks() async {
    final prefs = await SharedPreferences.getInstance();
    final itemsString = _bookmarks.map((item) => item.toJson()).toList();
    await prefs.setStringList(_bookmarkKey, itemsString);
  }

  bool isBookmarked(String slug) {
    return _bookmarks.any((item) => item.slug == slug);
  }

  Future<void> toggleBookmark(Movie movie) async {
    if (!_isInit) await _loadBookmarks();

    final itemIndex = _bookmarks.indexWhere((i) => i.slug == movie.slug);

    if (itemIndex >= 0) {
      // Remove if exists
      _bookmarks.removeAt(itemIndex);
    } else {
      // Add if doesn't exist
      final newItem = BookmarkItem(
        slug: movie.slug,
        name: movie.name,
        originName: movie.originName,
        thumbUrl: movie.thumbUrl ?? movie.posterUrl,
        year: movie.year,
        addedAt: DateTime.now().millisecondsSinceEpoch,
      );
      _bookmarks.insert(0, newItem);
    }

    notifyListeners();
    _saveBookmarks();
  }

  Future<void> clearBookmarks() async {
    _bookmarks.clear();
    notifyListeners();
    _saveBookmarks();
  }
}
