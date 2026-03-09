# Báo cáo tính năng — Web xem phim Full-stack

> Source code nhánh `main`. Nhánh `torrent` đang phát triển, không nằm trong gói này.

---

## Tổng quan kỹ thuật

| Thành phần | Công nghệ |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT + Google OAuth + Firebase |
| Thanh toán | SePay (VietQR) |
| Email | Resend |
| Push Notification | Web Push (VAPID) |
| PWA | Service Worker, Workbox |
| Dữ liệu phim | API crawler: Ophim, KKPhim, NguonC + TMDB |

---

## Tính năng người dùng

### Xem phim
- Trang chủ với Hero Slider, Trending, phim mới, theo thể loại
- Trang chi tiết phim: poster, mô tả, diễn viên, đạo diễn, đánh giá
- Chọn tập / chọn server (đa server)
- Video player với thanh tiến trình, bỏ qua intro/outro
- Bộ lọc nâng cao: thể loại, quốc gia, năm, loại phim
- Tìm kiếm hybrid (DB nội bộ + API bên ngoài)
- 30+ thể loại phim
- Bộ sưu tập đặc biệt: Marvel, DC, Phim buồn/chữa lành, Phim Hàn, Anime

### Theo dõi tiến độ
- Lưu vị trí xem, tiếp tục từ đó mà xem lại
- Lịch sử xem đầy đủ
- Đồng bộ tiến độ nhiều thiết bị (khi đăng nhập)
- Free: lưu tối đa 20 phim — Premium: không giới hạn

### Yêu thích & Danh sách
- Danh sách yêu thích
- Xem sau
- Tạo danh sách cá nhân (tối đa 20 danh sách/người)
- Công khai hoặc riêng tư

### Bình luận & Cộng đồng
- Bình luận + đánh giá sao (1–10)
- Reply lồng nhau
- Bình luận theo từng tập
- Feed bình luận mới nhất trên trang chủ

### Yêu cầu phim
- Người dùng gửi yêu cầu thêm phim
- Nhiều người yêu cầu = ưu tiên cao hơn
- Theo dõi trạng thái: chờ / đang xử lý / hoàn thành
- Tự động xử lý qua GitHub Actions mỗi 30 phút

### Thông báo
- Thông báo tập mới, yêu cầu phim hoàn thành, reply bình luận
- Push Notification trên trình duyệt (Premium)
- Badge số thông báo chưa đọc

### Đăng ký Premium
- 4 gói: 1 tháng / 3 tháng / 6 tháng / 12 tháng
- Tiết kiệm 31–43% với gói dài hạn
- Thanh toán VietQR (SePay)

**Quyền lợi Premium:**
- Không quảng cáo
- Lưu tiến độ không giới hạn
- Push Notification
- Ưu tiên hỗ trợ

### Tài khoản
- Đăng ký email + xác thực email
- Đăng nhập Google OAuth
- Đổi mật khẩu, quên mật khẩu qua email
- Chỉnh sửa hồ sơ, avatar
- Lịch sử giao dịch, trạng thái gói

### Chat hỗ trợ
- Chat trực tiếp với admin
- Lịch sử tin nhắn phân trang
- Real-time (WebSocket)

### PWA
- Cài đặt như app native trên điện thoại
- Trang offline thân thiện
- Hỗ trợ iOS (iPhone/iPad)

### Khác
- Báo lỗi video (server hỏng, không load)
- Gửi phản hồi / báo cáo lỗi app
- Dark mode
- Responsive (desktop / tablet / mobile)
- Tối ưu SEO (sitemap, robots, OpenGraph, Schema.org)
- Quảng cáo Adsterra (5 vị trí: home, watch, inline ×2, interstitial)

---

## Tính năng Admin

### Dashboard
- Thống kê: tổng user, doanh thu, user mới, phim, lượt xem
- Biểu đồ xu hướng (area chart, bar chart)
- Top phim trending

### Quản lý người dùng
- Danh sách, tìm kiếm, lọc theo role / trạng thái
- Xem chi tiết: lịch sử thanh toán, tổng chi, gói hiện tại
- Ban / unban / xóa tài khoản

### Quản lý phim
- CRUD đầy đủ (thêm / sửa / xóa phim)
- Quản lý tập phim và server
- Bật/tắt hiển thị, đánh dấu nổi bật (hero slider)
- Tìm kiếm, lọc theo loại / trạng thái

### Kiểm duyệt bình luận
- Xem, ẩn, xóa bình luận
- Lọc theo phim, trạng thái

### Quản lý đăng ký
- Danh sách gói đang hoạt động
- Lịch sử thanh toán, phân tích doanh thu
- Hủy gói thủ công

### Yêu cầu phim & Báo cáo lỗi
- Duyệt / từ chối yêu cầu phim
- Xem / đánh dấu đã sửa báo cáo lỗi video

### Phản hồi người dùng
- Xem danh sách feedback
- Cập nhật trạng thái (chưa đọc / đã đọc / đã phản hồi)

### Crawler & Đồng bộ dữ liệu
- Bật/tắt, chạy thủ công
- Đồng bộ từ Ophim, KKPhim, NguonC
- Danh sách đen (không đồng bộ phim cụ thể)

### Thông báo hàng loạt
- Gửi thông báo cho tất cả hoặc từng user cụ thể

---

## Cơ sở dữ liệu (15 collection)

User, Movie, WatchProgress, Favorite, Comment, MovieList, Notification, Payment, MovieRequest, Report, Feedback, ChatConversation, ChatMessage, ViewLog, PushSubscription

---

## API (50+ endpoint)

Auth, Movies, Search, Progress, Favorites, Comments, MovieLists, Notifications, Chat, Subscriptions, Requests, Reports, Feedback, PushNotifications, Admin (25+ route)

---

## Số liệu tóm tắt

| Hạng mục | Số lượng |
|---|---|
| Trang frontend | 25+ |
| API endpoint | 50+ |
| Collection MongoDB | 15 |
| Thể loại phim | 30+ |
| Gói subscription | 4 |
| Trang quản trị | 12+ |
| Vị trí quảng cáo | 5 |
