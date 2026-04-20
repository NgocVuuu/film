import 'package:flutter/foundation.dart';
import '../../core/api/api_client.dart';

class EpisodeData {
  final String name;
  final String slug;
  final String? filename;
  final String? linkEmbed;
  final String? linkM3u8;

  EpisodeData({
    required this.name,
    required this.slug,
    this.filename,
    this.linkEmbed,
    this.linkM3u8,
  });

  factory EpisodeData.fromJson(Map<String, dynamic> json) {
    return EpisodeData(
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      filename: json['filename'],
      linkEmbed: json['link_embed'],
      linkM3u8: json['link_m3u8'],
    );
  }
}

class EpisodeServer {
  final String serverName;
  final List<EpisodeData> serverData;

  EpisodeServer({
    required this.serverName,
    required this.serverData,
  });

  factory EpisodeServer.fromJson(Map<String, dynamic> json) {
    return EpisodeServer(
      serverName: json['server_name'] ?? '',
      serverData: (json['server_data'] as List?)
              ?.map((e) => EpisodeData.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

class Movie {
  final String id;
  final String name;
  final String originName;
  final String slug;
  final String? thumbUrl;
  final String? posterUrl;
  final int year;
  final String? episodeCurrent;
  final String? episodeTotal;
  final String? quality;
  final String? lang;
  final double? progressPercentage;
  final String? content;
  final String? type;
  final List<EpisodeServer> episodes;

  Movie({
    required this.id,
    required this.name,
    required this.originName,
    required this.slug,
    this.thumbUrl,
    this.posterUrl,
    required this.year,
    this.episodeCurrent,
    this.episodeTotal,
    this.quality,
    this.lang,
    this.progressPercentage,
    this.content,
    this.type,
    this.episodes = const [],
  });

  factory Movie.fromJson(Map<String, dynamic> json) {
    return Movie(
      id: json['_id'] ?? '',
      name: json['name'] ?? 'Tên Phim',
      originName: json['origin_name'] ?? 'Tên gốc',
      slug: json['slug'] ?? '',
      thumbUrl: _fixImageUrl(json['thumb_url']),
      posterUrl: _fixImageUrl(json['poster_url']),
      year: json['year'] ?? DateTime.now().year,
      episodeCurrent: json['episode_current'],
      episodeTotal: json['episode_total'],
      quality: json['quality'],
      lang: json['lang'],
      content: json['content'],
      type: json['type'],
      progressPercentage: json['progress'] != null
          ? (json['progress']['percentage'] as num?)?.toDouble()
          : null,
      episodes: (json['episodes'] as List?)
              ?.map((e) => EpisodeServer.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  static String? _fixImageUrl(dynamic url) {
    if (url == null || url.toString().isEmpty) return null;
    String finalUrl = url.toString();

    // Xá» lÃ½ link thiáº¿u domain
    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('//')) {
      if (finalUrl.startsWith('/')) {
        finalUrl = 'https://phimimg.com$finalUrl';
      } else {
        // Thá» fix domain náº¿u format quen thuá»™c
        finalUrl = 'https://phimimg.com/$finalUrl';
      }
    } else if (finalUrl.startsWith('//')) {
      finalUrl = 'https:$finalUrl';
    }

    if (kIsWeb) {
      final encodedUrl = Uri.encodeComponent(finalUrl);
      return '${ApiClient.baseUrl}/proxy/image?url=$encodedUrl';
    }

    return finalUrl;
  }
}

