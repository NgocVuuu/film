class NotificationModel {
  final String id;
  final String content;
  final String type;
  final bool isRead;
  final String? link;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.content,
    required this.type,
    required this.isRead,
    this.link,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id'] ?? '',
      content: json['content'] ?? '',
      type: json['type'] ?? '',
      isRead: json['isRead'] ?? false,
      link: json['link'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }
}
