import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme/app_colors.dart';
import '../data/models/movie_model.dart';
import '../providers/movies_provider.dart';
import '../widgets/movie_card.dart';
import 'movie_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();      
  Timer? _debounce;
  List<Movie> _searchResults = [];
  bool _isLoading = false;
  String _errorMsg = '';

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), () {
      _performSearch(query);
    });
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isLoading = false;
        _errorMsg = '';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMsg = '';
    });

    try {
      final provider = Provider.of<MoviesProvider>(context, listen: false);     
      final results = await provider.searchMovies(query);
      setState(() {
        _searchResults = results;
        if (results.isEmpty) {
          _errorMsg = 'KhÃ´ng tÃ¬m tháº¥y káº¿t quáº£ nÃ o cho "$query"';       
        }
      });
    } catch (e) {
      setState(() {
        _errorMsg = 'ÄÃ£ xáº£y ra lá»—i khi tÃ¬m kiáº¿m.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _showFilterSheet() {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('TÃ­nh nÄƒng lá»c má»Ÿ rá»™ng Ä‘ang Ä‘Æ°á»£c cáº­p nháº­t...')),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: null,
        backgroundColor: AppColors.card,
        elevation: 0,
        titleSpacing: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list, color: AppColors.primary),
            onPressed: _showFilterSheet,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16.0, 8.0, 16.0, 16.0),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              ),
              child: TextField(
                controller: _searchController,
                onChanged: _onSearchChanged,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Nháº­p tÃªn phim, diá»…n viÃªn...',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  prefixIcon: Icon(Icons.search, color: Colors.grey[400]),        
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, color: Colors.grey, size: 20),      
                          onPressed: () {
                            _searchController.clear();
                            _onSearchChanged('');
                            FocusScope.of(context).unfocus();
                          },
                        )
                      : null,
                ),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                : _errorMsg.isNotEmpty
                    ? Center(
                        child: Text(
                          _errorMsg,
                          style: const TextStyle(color: Colors.grey, fontSize: 16),
                        ),
                      )
                    : _searchResults.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,      
                              children: [
                                Icon(Icons.movie_creation_outlined, size: 64, color: Colors.grey[700]),
                                const SizedBox(height: 16),
                                Text(
                                  'Báº¡n muá»‘n xem gÃ¬ hÃ´m nay?',
                                  style: TextStyle(color: Colors.grey[500], fontSize: 16),
                                )
                              ],
                            ),
                          )
                        : GridView.builder(
                            padding: const EdgeInsets.only(left: 12, right: 12, bottom: 20),
                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 3,
                              childAspectRatio: 0.6,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 12,
                            ),
                            itemCount: _searchResults.length,
                            itemBuilder: (context, index) {
                              final movie = _searchResults[index];
                              return MovieCard(
                                movie: movie,
                                onTap: () {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => MovieDetailScreen(movie: movie),
                                    ),
                                  );
                                },
                              );
                            },
                          ),
          ),
        ],
      ),
    );
  }
}


