import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:better_player/better_player.dart';
import 'package:provider/provider.dart';
import '../data/models/movie_model.dart';
import '../core/theme/app_colors.dart';
import '../providers/watch_history_provider.dart';

class VideoPlayerScreen extends StatefulWidget {
  final Movie movie;
  final String? episodeName;
  final String? episodeUrl;

  const VideoPlayerScreen({
    super.key,
    required this.movie,
    this.episodeName,
    this.episodeUrl,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> {
  late BetterPlayerController _betterPlayerController;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  void _initializePlayer() {
    try {
      final url = widget.episodeUrl;
      
      if (url == null || url.isEmpty) {
        setState(() {
          _errorMessage = 'Liên kết video không hợp lệ.';
          _isLoading = false;
        });
        return;
      }

      BetterPlayerConfiguration betterPlayerConfiguration = BetterPlayerConfiguration(
        aspectRatio: 16 / 9,
        fit: BoxFit.contain,
        autoPlay: true,
        looping: false,
        deviceOrientationsAfterFullScreen: [DeviceOrientation.portraitUp],
        deviceOrientationsOnFullScreen: [
          DeviceOrientation.landscapeLeft,
          DeviceOrientation.landscapeRight
        ],
        fullScreenAspectRatio: 16 / 9,
        controlsConfiguration: BetterPlayerControlsConfiguration(
          progressBarPlayedColor: AppColors.primary,
          progressBarHandleColor: AppColors.primary,
          progressBarBufferedColor: Colors.white54,
          progressBarBackgroundColor: Colors.white24,
          loadingColor: AppColors.primary,
          enableSkips: true,
        ),
      );

      BetterPlayerDataSource dataSource = BetterPlayerDataSource(
        BetterPlayerDataSourceType.network,
        url,
      );

      _betterPlayerController = BetterPlayerController(betterPlayerConfiguration);
      _betterPlayerController.setupDataSource(dataSource).then((_) {
         if (mounted) {
            setState(() {
              _isLoading = false;
            });
         }
      });
      
      _betterPlayerController.addEventsListener((BetterPlayerEvent event) {
        if (event.betterPlayerEventType == BetterPlayerEventType.progress) {
             _saveProgress();
        }
      });

    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Lỗi tải video: $e';
        });
      }
    }
  }

  void _saveProgress() {
    if (!mounted || _betterPlayerController.videoPlayerController?.value.initialized != true) return;
    
    final position = _betterPlayerController.videoPlayerController?.value.position.inSeconds.toDouble() ?? 0;
    final duration = _betterPlayerController.videoPlayerController?.value.duration?.inSeconds.toDouble() ?? 0;

    if (duration > 0) {
      double progress = position / duration;
      Provider.of<WatchHistoryProvider>(context, listen: false).addOrUpdate(
        widget.movie,
        widget.episodeName ?? widget.movie.episodeCurrent ?? 'Tập 1',
        widget.episodeUrl ?? '',
        progress,
      );
    }
  }

  @override
  void dispose() {
    _betterPlayerController.dispose();
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black, // Màn hình video luôn đen
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
        title: Text(
          '${widget.movie.name} - ${widget.episodeName ?? ""}',
          style: const TextStyle(fontSize: 16, color: Colors.white),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: _isLoading
              ? const CircularProgressIndicator(color: AppColors.primary)
              : _errorMessage != null
                  ? Text(_errorMessage!, style: const TextStyle(color: Colors.red))
                  : BetterPlayer(controller: _betterPlayerController),
        ),
      ),
    );
  }
}
