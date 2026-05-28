import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart'; // Thêm để dùng kIsWeb

class ApiClient {
  late Dio dio;

  // Tự động nhận diện môi trường: Web (Chrome) dùng localhost, Simulator Android dùng 10.0.2.2
  static String get baseUrl {
    // INFO: Đổi port 5000 thành port Backend thật sự của bạn nếu khác
    if (kIsWeb) return 'http://localhost:5000/api';
    return 'http://10.0.2.2:5000/api';
  }

  ApiClient() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    ));

    // Thêm Interceptor để bắt lỗi/log request
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        // print('REQUEST[${options.method}] => PATH: ${options.path}');
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        // print('ERROR[${e.response?.statusCode}] => PATH: ${e.requestOptions.path}');
        return handler.next(e);
      },
    ));
  }
}
