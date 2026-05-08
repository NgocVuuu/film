import '../../data/models/movie_model.dart';
import '../../core/api/api_client.dart';

class MovieRepository {
  final ApiClient _apiClient;

  MovieRepository(this._apiClient);

  Future<Map<String, List<Movie>>> getHomeData() async {
    try {
      final response = await _apiClient.dio.get('/movies/home');

      if (response.statusCode == 200 && response.data['success'] == true) {     
        final data = response.data['data'] as Map<String, dynamic>;

        Map<String, List<Movie>> homeData = {};

        data.forEach((key, value) {
          if (value is List) {
            homeData[key] = value.map((json) => Movie.fromJson(json)).toList(); 
          }
        });

        return homeData;
      }
      return {};
    } catch (e) {
      throw Exception('Lỗi API /movies/home: $e');
    }
  }

  Future<Movie?> getMovieDetail(String slug) async {
    try {
      final response = await _apiClient.dio.get('/movie/$slug');

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = response.data;
        if (data['success'] == true && data['data'] != null) {
          return Movie.fromJson(data['data']);
        } else if (data['_id'] != null) {
          return Movie.fromJson(data);
        }
      }
      return null;
    } catch (e) {
      throw Exception('Lỗi API chi tiết phim: $e');
    }
  }

  Future<List<Movie>> searchMovies(String keyword) async {
    try {
      final response = await _apiClient.dio.get('/search', queryParameters: {'q': keyword});

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> dataList = response.data['data'] ?? [];
        return dataList.map((json) => Movie.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Lỗi API tìm kiếm: $e');
    }
  }

  Future<List<Movie>> filterMovies(Map<String, dynamic> params) async {
    try {
      final response = await _apiClient.dio.get('/movies', queryParameters: params);

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> dataList = response.data['data'] ?? [];
        return dataList.map((json) => Movie.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      throw Exception('Lỗi API lọc phim: $e');
    }
  }
}
