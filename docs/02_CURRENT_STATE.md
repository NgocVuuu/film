# [02] Hiện Trạng Hệ Thống (Mã Nguồn Đã Xây Dựng)

Dưới đây là thống kê các chức năng cốt lõi đã được lập trình và hoàn thiện sẵn trong Source Code của dự án pChill (Nhánh `torrent`). Quản trị viên chỉ việc cài đặt lên Server là hệ thống tự chạy.

## 1. Hệ Thống Backend (Node.js API)
- **Crawler Tự Động (Hunter):** File `server/crawler.js` kết hợp node-cron, tự động đi săn phim chất lượng 4K/Bluray từ mạng Torrent theo chu kỳ 6 tiếng/lần.
- **Debrid Manager:** File `server/utils/debridManager.js` kết hợp `realDebrid.js` có sẵn thuật toán giải mã Magnet Link. Đã code sẵn hệ thống Load Balancer với thuật toán **Round Robin** và **Least Connections** phân tải trên MongoDB `ServerNodes`.
- **JWT Streaming Tokenizer:** Hệ thống sẽ cấp phát một Token ngắn hạn (6 giờ), mang theo chữ ký kỹ thuật số `NGINX_JWT_SECRET`. Trình duyệt Player của người dùng chỉ nhận được quyền truy cập Nginx thông qua Token này, ngăn chặn tuyệt đối tình trạng lấy cắp Link mang sang web khác.
- **Bảo vệ Băng thông (Quota Limit):** Có sẵn cơ chế tự động giới hạn 1 User VIP chỉ được request tối đa 15 luồng Streaming / ngày (bằng Redis/NodeCache) để chống kẻ gian cắm Bot phá hoại băng thông hệ thống.

## 2. Hệ Thống Edge Proxy (Nginx)
- **Bash Script Lõi Nginx (`server/scripts/setup_nginx_node.sh`):** Đã được khắc phục hoàn toàn theo chuẩn Streaming. Script này sinh ra các tệp cấu hình Nginx có:
  - `proxy_buffering off;` - Ép Nginx phục vụ Video dưới chuẩn đường ống Stateless (Không ghi RAM/SSD).
  - Tích hợp `lua-resty-jwt` mã hóa và kiểm tra vé quyền truy cập (Token).
  - Tự động bắt tiêu đề `Range` và chuyển cho Backend xử lý thao tác Tua phim (Seeking) của User với độ trễ cực thấp.
  - Phá giải cơ chế Spam Preflight (CORS) của Trình Duyệt bằng cách ép Cache Option trong 20 ngày.

## 3. Hệ Thống Frontend (Real-time Video Player)
- **Phòng Xem Chung (Watch Party):** Tích hợp Socket.IO mạnh mẽ. Khung Live Chat được cấu hình dưới giao diện kính mờ (Glassmorphism), có thanh Overlay thu gọn mượt mà. 
- Nhận biết đặc quyền Host (Chủ phòng): Chỉ có Chủ phòng mới được bấm Dừng/Chạy phim, toàn bộ Room sẽ đồng bộ theo miligiây.
- **Player Hỗ Trợ Đa Giải Pháp:** Chạy thẳng các file M3U8 từ MediaFlow truyền về, ép tương thích toàn diện trên thiết bị iOS, SmartTV và thiết bị di động với giao diện tùy chỉnh cao.
