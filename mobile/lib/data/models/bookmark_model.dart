import 'dart:convert';
import 'movie_model.dart';

class BookmarkItem {
  final String slug;
  final String name;
  final String originName;
  final String? thumbUrl;
  final int year;
  final int addedAt;

  BookmarkItem({
    required this.slug,
    required this.name,
    required this.originName,
    this.thumbUrl,
    required this.year,
    required this.addedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'slug': slug,
      'name': name,
      'originName': originName,
      'thumbUrl': thumbUrl,
      'year': year,
      'addedAt': addedAt,
    };
  }

  factory BookmarkItem.fromMap(Map<String, dynamic> map) {
    return BookmarkItem(
      slug: map['slug'] ?? '',
      name: map['name'] ?? '',
      originName: map['originName'] ?? '',
      thumbUrl: map['thumbUrl'],
      year: map['year']?.toInt() ?? 0,
      addedAt: map['addedAt']?.toInt() ?? 0,
    );
  }

  String toJson() => json.encode(toMap());

  factory BookmarkItem.fromJson(String source) =>
      BookmarkItem.fromMap(json.decode(source));

  Movie toMovie() {
    return Movie(
      id: '',
      name: name,
      slug: slug,
      originName: originName,
      year: year,
      thumbUrl: thumbUrl,
    );
  }
}
