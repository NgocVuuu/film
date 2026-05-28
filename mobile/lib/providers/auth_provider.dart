import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api/api_client.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;
  String? _token;

  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;
  String? get token => _token;

  final ApiClient _apiClient = ApiClient();

  AuthProvider() {
    _loadUser();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
    
    if (_token != null && _token!.isNotEmpty) {
      try {
        _apiClient.dio.options.headers['Authorization'] = 'Bearer $_token';
        
        // This relies on the endpoint that verifies token and returns user
        final response = await _apiClient.dio.get('/auth/me');
        
        if (response.data['success'] == true) {
          _user = response.data['user'] ?? response.data['data']; // Adjust based on your BE response
          _isAuthenticated = true;
        } else {
          await logout();
        }
      } catch (e) {
        // If 401 Unathorized or network fail, don't clear token immediately, just mark not authenticated
        // Wait, if it's 401, usually the token expired. Let's clear it.
        await logout();
      }
    }
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    try {
      final response = await _apiClient.dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      
      if (response.data['success'] == true) {
        _token = response.data['token'];
        _user = response.data['user'] ?? response.data['data'];
        _isAuthenticated = true;
        
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', _token!);
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    _token = null;
    _user = null;
    _isAuthenticated = false;
    _apiClient.dio.options.headers.remove('Authorization');
    notifyListeners();
  }
}
