import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
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
  VideoPlayerController? _videoPlayerController;
  ChewieController? _chewieController;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _initializePlayer();
  }

  Future<void> _initializePlayer() async {
    try {
      final url = widget.episodeUrl;

      if (url == null || url.isEmpty) {
        if (mounted) {
          setState(() {
            _errorMessage = 'Liên kết video không hợp lệ.';
            _isLoading = false;
          });
        }
        return;
      }

      _videoPlayerController = VideoPlayerController.networkUrl(Uri.parse(url));

      await _videoPlayerController!.initialize();

      _chewieController = ChewieController(
        videoPlayerController: _videoPlayerController!,
        aspectRatio: 16 / 9,
        autoPlay: true,
        looping: false,
        deviceOrientationsAfterFullScreen: [DeviceOrientation.portraitUp],
        deviceOrientationsOnEnterFullScreen: [
          DeviceOrientation.landscapeLeft,
          DeviceOrientation.landscapeRight
        ],
        materialProgressColors: ChewieProgressColors(
          playedColor: AppColors.primary,
          handleColor: AppColors.primary,
          bufferedColor: Colors.white54,
          backgroundColor: Colors.white24,
        ),
        cupertinoProgressColors: ChewieProgressColors(
          playedColor: AppColors.primary,
          handleColor: AppColors.primary,
          bufferedColor: Colors.white54,
          backgroundColor: Colors.white24,
        ),
      );

      _videoPlayerController!.addListener(() {
        _saveProgress();
      });

      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
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
    if (!mounted || _videoPlayerController?.value.isInitialized != true) return;

    final position = _videoPlayerController?.value.position.inSeconds.toDouble() ?? 0;
    final duration = _videoPlayerController?.value.duration.inSeconds.toDouble() ?? 0;

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
    _videoPlayerController?.removeListener(_saveProgress);
    _videoPlayerController?.dispose();
    _chewieController?.dispose();
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
                  : _chewieController != null &&
                          _chewieController!.videoPlayerController.value.isInitialized
                      ? Chewie(controller: _chewieController!)
                      : const Text('Đang khởi tạo...', style: TextStyle(color: Colors.white)),
        ),
      ),
    );
  }
}
