# Kế Hoạch Xây Dựng Ứng Dụng PChill Mobile & Smart TV (Flutter + PikPak)

## 1. Tổng Quan Dự Án
- **Mục tiêu**: Phát triển ứng dụng xem phim đa nền tảng (Smartphone & Smart TV) phục vụ chuyên biệt cho các bộ phim 4K chuẩn HEVC (từ nguồn mkvdrama).
- **Công nghệ Frontend**: Flutter (dự án được lưu trong thư mục `mobile`).
- **Lưu trữ & Streaming**: Sử dụng PikPak Cloud Storage để làm nơi lưu trữ các file phim nặng. Lấy link stream trực tiếp từ PikPak để phát, tận dụng băng thông rộng của nền tảng này.
- **Nguồn phim**: mkvdrama (chuyên phim chất lượng cao 4K H.265/HEVC).

## 2. Kiến Trúc Hệ Thống (Architecture)

### a. Trạm Trung Chuyển (Backend Node.js)
- Viết thêm Module/API kết nối với tài khoản PikPak (thông qua API hoặc Share Link).
- Backend có nhiệm vụ lấy **Direct Link** (link phát trực tiếp .mkv) từ PikPak rồi trả về cho app Flutter.
- Áp dụng cơ chế **Caching (Redis/Memory)** cho các Direct Link vì chúng có thời gian sống (TTL), giúp giảm tải request lên server PikPak và tránh bị ban tài khoản.

### b. Ứng Dụng Đa Nền Tảng (Flutter)
- Dùng chung 1 codebase cho cả màn hình dọc (Smartphone) và màn hình ngang (Smart TV).
- Cần sử dụng các thư viện Video Player mạnh mẽ (như `media_kit` dựa trên `libmpv`) để có thể giải mã phần cứng (Hardware Decoding) mượt mà chuẩn nén nặng HEVC (H.265) và đọc mượt các định dạng sub rời (SRT, ASS) thường có trong file MKV của mkvdrama.
- **Giao diện Smartphone**: Tối ưu chạm vuốt, tích hợp tính năng Khoảnh Khắc (Moments), Bảng Xếp Hạng, Chia sẻ.
- **Giao diện Smart TV (Android TV/WebOS)**: Tối ưu điều hướng bằng nút bấm điều khiển (D-pad / Remote), các thẻ to rõ ràng, trải nghiệm như rạp chiếu tại nhà.

## 3. Các Giai Đoạn Triển Khai (Roadmap)

### Phase 1: Chuẩn bị Môi trường & Backend (PikPak Integration)
- Khai thác API của PikPak để tự động liệt kê file, lấy chi tiết cấu trúc file.
- Viết API `/api/movies/:slug/stream` trên Node.js để trả về link PikPak hợp lệ.
- Kiểm tra tính ổn định của luồng stream khi phát file MKV 4K (có thể từ 5GB - 20GB/tập).

### Phase 2: Xây dựng Core Video Player trên Flutter
- Tích hợp `media_kit` vào thư mục `mobile`.
- Viết trình phát Video tuỳ chỉnh cho Flutter, test độ phân giải 4K HEVC trên thiết bị Android thực tế và Android TV Box/Stick.
- Triển khai chức năng Switch Audio Track (Đổi giọng lồng tiếng/thuyết minh) và Chọn Subtitle (do phim mkvdrama thường là đa track âm thanh/phụ đề).

### Phase 3: Phát triển Giao diện (UI/UX)
- **Smartphone UI**: Xây dựng UI giống Netflix + TikTok (cho phần lướt Moment).
- **Smart TV UI**: Sử dụng FocusNode trong Flutter để xử lý sự kiện bấm phím điều hướng của remote.

### Phase 4: Tích hợp API & Đồng bộ Dữ liệu
- Đồng bộ tính năng PChiller (Lưu tiến trình người dùng ẩn danh), Lịch sử xem, Cảm nghĩ với Database hiện tại.
- Xử lý mượt mà chuyển tiếp giữa điện thoại và TV (ví dụ: đang xem dở trên điện thoại, bật TV lên xem tiếp đúng giây đó).

## 4. Các Vấn Đề Kỹ Thuật & Rủi Ro Cần Lưu Ý
1. **Codec HEVC (H.265)**: Các thiết bị cũ có thể không giải mã được bằng phần cứng, dẫn đến giật lag hoặc nóng máy. Ứng dụng nên kiểm tra thiết bị và cảnh báo hoặc fallback.
2. **Giới hạn API PikPak**: IP từ Backend có thể bị chặn nếu request get link quá nhiều. Giải pháp: Sử dụng token luân phiên hoặc cho phép Client trực tiếp query PikPak nếu an toàn.
3. **Phụ đề ASS phức tạp**: Các bộ phim từ mkvdrama thường đi kèm phụ đề ASS có hiệu ứng. Trình phát `media_kit` xử lý tốt nhất hiện nay trên Flutter nhưng vẫn cần test kỹ để tránh sụt FPS.
