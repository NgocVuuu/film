import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
  final FocusNode _searchFocus = FocusNode();
  Timer? _debounce;
  List<Movie> _searchResults = [];
  bool _isLoading = false;
  String _errorMsg = '';

  bool _showSuggestions = false;
  List<String> _recentSearches = [];

  String _selectedCategory = '';
  String _selectedCountry = '';
  String _selectedYear = '';
  String _selectedStatus = '';

  final List<Map<String, String>> _categories = [
    {'name': 'Hành Động', 'slug': 'hanh-dong'},
    {'name': 'Tình Cảm', 'slug': 'tinh-cam'},
    {'name': 'Hài Hước', 'slug': 'hai-huoc'},
    {'name': 'Cổ Trang', 'slug': 'co-trang'},
    {'name': 'Tâm Lý', 'slug': 'tam-ly'},
    {'name': 'Viễn Tưởng', 'slug': 'vien-tuong'},
    {'name': 'Kinh Dị', 'slug': 'kinh-di'},
    {'name': 'Hoạt Hình', 'slug': 'hoat-hinh'},
  ];

  final List<Map<String, String>> _countries = [
    {'name': 'Trung Quốc', 'slug': 'trung-quoc'},
    {'name': 'Hàn Quốc', 'slug': 'han-quoc'},
    {'name': 'Nhật Bản', 'slug': 'nhat-ban'},
    {'name': 'Thái Lan', 'slug': 'thai-lan'},
    {'name': 'Âu Mỹ', 'slug': 'au-my'},
    {'name': 'Việt Nam', 'slug': 'viet-nam'},
  ];

  final List<String> _years = List.generate(
    10,
    (index) => (DateTime.now().year - index).toString(),
  );

  final List<Map<String, String>> _statuses = [
    {'name': 'Hoàn thành', 'slug': 'completed'},
    {'name': 'Đang chiếu', 'slug': 'ongoing'},
  ];

  @override
  void initState() {
    super.initState();
    _loadRecentSearches();
    _searchFocus.addListener(() {
      if (_searchFocus.hasFocus && _searchController.text.isEmpty) {
        setState(() {
          _showSuggestions = true;
        });
      }
    });
  }

  Future<void> _loadRecentSearches() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _recentSearches = prefs.getStringList('recentSearches') ?? [];
    });
  }

  Future<void> _saveSearchHistory(String query) async {
    if (query.trim().isEmpty) return;

    final prefs = await SharedPreferences.getInstance();

    _recentSearches.remove(query.trim());
    _recentSearches.insert(0, query.trim());
    if (_recentSearches.length > 5) {
      _recentSearches = _recentSearches.sublist(0, 5);
    }

    await prefs.setStringList('recentSearches', _recentSearches);
    setState(() {});
  }

  Future<void> _clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('recentSearches');
    setState(() {
      _recentSearches = [];
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    if (query.isEmpty) {
      setState(() {
        _showSuggestions = true;
      });
    } else {
      setState(() {
        _showSuggestions = false;
      });
    }

    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), () {
      _performSearch(query);
    });
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty &&
        _selectedCategory.isEmpty &&
        _selectedCountry.isEmpty &&
        _selectedYear.isEmpty &&
        _selectedStatus.isEmpty) {
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
      List<Movie> results = [];

      // If filters are active, use filterMovies logic. If only query, use searchMovies
      if (_selectedCategory.isNotEmpty ||
          _selectedCountry.isNotEmpty ||
          _selectedYear.isNotEmpty ||
          _selectedStatus.isNotEmpty) {
        Map<String, dynamic> params = {};
        if (query.trim().isNotEmpty) params['keyword'] = query.trim();
        if (_selectedCategory.isNotEmpty)
          params['category'] = _selectedCategory;
        if (_selectedCountry.isNotEmpty) params['country'] = _selectedCountry;
        if (_selectedYear.isNotEmpty) params['year'] = _selectedYear;
        if (_selectedStatus.isNotEmpty) params['status'] = _selectedStatus;

        results = await provider.filterMovies(params);
      } else {
        results = await provider.searchMovies(query);
      }

      setState(() {
        _searchResults = results;
        if (results.isEmpty) {
          _errorMsg = 'Không tìm thấy kết quả nào phù hợp.';
        }
      });
    } catch (e) {
      setState(() {
        _errorMsg = 'Đã xảy ra lỗi khi tìm kiếm.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  void _submitSearch(String query) {
    FocusScope.of(context).unfocus();
    _searchController.text = query;
    setState(() {
      _showSuggestions = false;
    });
    _saveSearchHistory(query);
    _performSearch(query);
  }

  void _showFilterSheet() {
    FocusScope.of(context).unfocus(); // Đóng bàn phím khi mở Bộ lọc
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            Widget buildSection(
              String title,
              List<dynamic> items,
              String selectedValue,
              Function(String) onSelected, {
              bool isYear = false,
            }) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: items.map((item) {
                      String label = isYear ? item : item['name'];
                      String value = isYear ? item : item['slug'];
                      bool isSelected = selectedValue == value;
                      return ChoiceChip(
                        label: Text(label),
                        selected: isSelected,
                        selectedColor: AppColors.primary,
                        backgroundColor: Colors.white.withValues(alpha: 0.1),
                        labelStyle: TextStyle(
                          color: isSelected ? Colors.black : Colors.white,
                        ),
                        onSelected: (selected) {
                          setModalState(() {
                            onSelected(selected ? value : '');
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                ],
              );
            }

            return Padding(
              padding: EdgeInsets.fromLTRB(
                16.0,
                16.0,
                16.0,
                MediaQuery.of(context).viewInsets.bottom + 16.0,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Bộ Lọc Tìm Kiếm',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.grey),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const Divider(color: Colors.grey),
                    buildSection('Thể loại', _categories, _selectedCategory, (
                      v,
                    ) {
                      _selectedCategory = v;
                    }),
                    buildSection('Quốc gia', _countries, _selectedCountry, (v) {
                      _selectedCountry = v;
                    }),
                    buildSection('Tình trạng', _statuses, _selectedStatus, (v) {
                      _selectedStatus = v;
                    }),
                    buildSection('Năm phát hành', _years, _selectedYear, (v) {
                      _selectedYear = v;
                    }, isYear: true),

                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.grey),
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () {
                              setModalState(() {
                                _selectedCategory = '';
                                _selectedCountry = '';
                                _selectedYear = '';
                                _selectedStatus = '';
                              });
                            },
                            child: const Text('Thiết lập lại'),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                            ),
                            onPressed: () {
                              Navigator.pop(context);
                              setState(() {
                                _showSuggestions = false;
                              });
                              _performSearch(_searchController.text);
                            },
                            child: const Text(
                              'Lọc phim',
                              style: TextStyle(
                                color: Colors.black,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
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
                focusNode: _searchFocus,
                onChanged: _onSearchChanged,
                onSubmitted: _submitSearch,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Tên phim, diễn viên, đạo diễn...',
                  hintStyle: TextStyle(color: Colors.grey[600], fontSize: 14),
                  prefixIcon: Icon(Icons.search, color: Colors.grey[400]),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  suffixIcon:
                      _searchController.text.isNotEmpty || _searchFocus.hasFocus
                      ? IconButton(
                          icon: const Icon(
                            Icons.clear,
                            color: Colors.grey,
                            size: 20,
                          ),
                          onPressed: () {
                            _searchController.clear();
                            _onSearchChanged('');
                            FocusScope.of(context).unfocus();
                            setState(() {
                              _showSuggestions = false;
                            });
                          },
                        )
                      : null,
                ),
              ),
            ),
          ),
          Expanded(
            child: _showSuggestions && _recentSearches.isNotEmpty
                ? _buildRecentSearches()
                : _isLoading
                ? const Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  )
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
                        Icon(
                          Icons.movie_creation_outlined,
                          size: 64,
                          color: Colors.grey[700],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Bạn muốn xem gì hôm nay?',
                          style: TextStyle(
                            color: Colors.grey[500],
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.only(
                      left: 12,
                      right: 12,
                      bottom: 20,
                    ),
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
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
                              builder: (context) =>
                                  MovieDetailScreen(movie: movie),
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

  Widget _buildRecentSearches() {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Tìm kiếm gần đây',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            TextButton(
              onPressed: _clearHistory,
              child: const Text(
                'Xóa',
                style: TextStyle(color: Colors.redAccent),
              ),
            ),
          ],
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _recentSearches
              .map(
                (term) => InkWell(
                  onTap: () => _submitSearch(term),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.1),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.history, color: Colors.grey, size: 14),
                        const SizedBox(width: 6),
                        Text(
                          term,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}
