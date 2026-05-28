import 'package:flutter/material.dart';
import '../data/models/movie_model.dart';
import '../data/repositories/movie_repository.dart';
import '../core/api/api_client.dart';

class MoviesProvider extends ChangeNotifier {
  final MovieRepository _repository = MovieRepository(ApiClient());

  Map<String, List<Movie>> _homeData = {};
  bool _isLoading = false;
  String? _errorMessage;

  Map<String, List<Movie>> get homeData => _homeData;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  MoviesProvider() {
    fetchHomeData();
  }

  Future<void> fetchHomeData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _homeData = await _repository.getHomeData();
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch specific movie detail and its episodes
  Future<Movie?> fetchMovieDetail(String slug) async {
    try {
      return await _repository.getMovieDetail(slug);
    } catch (e) {
      return null;
    }
  }

  // Search movies (Keyword hybrid search)
  Future<List<Movie>> searchMovies(String keyword) async {
    if (keyword.isEmpty) return [];
    try {
      return await _repository.searchMovies(keyword);
    } catch (e) {
      return [];
    }
  }

  // Filter movies (Advanced Search)
  Future<List<Movie>> filterMovies(Map<String, dynamic> params) async {
    try {
      return await _repository.filterMovies(params);
    } catch (e) {
      return [];
    }
  }

  // Helper method
  List<Movie> getList(String key) => _homeData[key] ?? [];
}
