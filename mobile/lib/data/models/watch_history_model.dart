import 'dart:convert';

class WatchHistoryItem {
  final String slug;
  final String name;
  final String? thumbUrl;
  final String episodeName;
  final String episodeUrl;
  final double progress; // 0.0 to 1.0
  final int updatedAt;

  WatchHistoryItem({
    required this.slug,
    required this.name,
    this.thumbUrl,
    required this.episodeName,
    required this.episodeUrl,
    required this.progress,
    required this.updatedAt,
  });

  Map<String, dynamic> toMap() {
    return {
      'slug': slug,
      'name': name,
      'thumbUrl': thumbUrl,
      'episodeName': episodeName,
      'episodeUrl': episodeUrl,
      'progress': progress,
      'updatedAt': updatedAt,
    };
  }

  factory WatchHistoryItem.fromMap(Map<String, dynamic> map) {
    return WatchHistoryItem(
      slug: map['slug'] ?? '',
      name: map['name'] ?? '',
      thumbUrl: map['thumbUrl'],
      episodeName: map['episodeName'] ?? '',
      episodeUrl: map['episodeUrl'] ?? '',
      progress: (map['progress'] as num?)?.toDouble() ?? 0.0,
      updatedAt: map['updatedAt']?.toInt() ?? 0,
    );
  }

  String toJson() => json.encode(toMap());

  factory WatchHistoryItem.fromJson(String source) =>
      WatchHistoryItem.fromMap(json.decode(source));
}
