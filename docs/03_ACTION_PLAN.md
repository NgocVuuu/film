# [03] Kế Hoạch Tác Chiến Cho Admin (DevOps Action Plan)

Mã nguồn rỗng không thể tự chạy nếu thiếu sự nuôi dưỡng Hạ Tầng. Đây là cẩm nang những việc bạn **BẮT BUỘC PHẢI MUA/THÊU/THIẾT LẬP** để dự án pChill 4K chính thức lên sóng.

## BƯỚC 1: Đầu Tư Cơ Sở Hạ Tầng Mạng (Web Server)
Yêu cầu sống còn của hệ thống Streaming không nằm ở RAM hay CPU, mà nằm ở **Dung lượng Băng thông (Bandwidth) Unmetered Không giới hạn**. Theo bảng giá, cổng mạng phổ biến là **1000 Mbps (1 Gbps)**.
- ❌ **Tuyệt đối TRÁNH SỐ 1:** Contabo (Chỉ cho phép duy trì vài chục Mbps, bóp nghẹt xuống 10Mbps khi dùng nhiều, Vi phạm ToS DMCA).
- ⚠️ **Cạm Bẫy Trá Hình (AlexHost):** Mặc dù AlexHost ở Moldova phớt lờ hoàn toàn DMCA, nhưng hãy nhìn kỹ bảng giá VPS của họ: **Tất cả các gói (kể cả Managed M6 giá 70 Euro) đều bị giới hạn cổng mạng 100 Mbps!** Với 100 Mbps, Máy chủ Nginx của bạn chỉ gánh được... 2 người xem 4K là "đứng hình". Tuyệt đối không dùng AlexHost làm Trạm Streaming Nginx! (Nó chỉ phù hợp để đặt API Backend).
- ✅ **Lựa chọn Đáng Cân Nhắc Nhất:** `BuyVM` (Đặt tại Luxembourg để né Phạt Bản Quyền DMCA của Mỹ). 
  - *Lưu ý Cấu hình:* Theo bảng giá High Volume VPS, bạn có thể chọn gói từ **$30.00/month (2 Cores, 8GB RAM)**. Điểm cốt lõi là cấu hình Này sở hữu cổng mạng **Unlim. 1000 Mbps** (Gấp 10 lần AlexHost). Hạ tầng hệ thống không ngốn RAM, nên yếu tố sống còn là phải có Port 1Gbps Unmetered.

## BƯỚC 2: Vũ Trang Kho Tài Khoản Hạt Giống (Debrid Pool)
Bạn cần mua tài khoản Premium bên thứ 3 để Backend có cái mà múa API.
1. Truy cập `real-debrid.com` và tạo khoảng **10 tài khoản cá nhân khác nhau**.
2. Thanh toán bằng Crypto (hoặc thẻ ảo) để giấu thân phận. Mua gói dài 180 ngày (~16 Euro/Key). 
3. Vào trang API của họ copy 10 chuỗi Key.
4. Mở file `.env` của Backend pChill, nhét tất cả vào biến: `REAL_DEBRID_API_KEY=Key1,Key2,Key3...`

## BƯỚC 3: Thiết Lập Máy Chủ Trung Gian Nginx (Chống Ban IP)
Khi có VPS Mới (BuyVM chẳng hạn):
1. Cài đặt Hệ điều hành `Ubuntu 22.04 LTS` hoặc Debian.
2. Nạp File `setup_nginx_node.sh` lên máy chủ này.
3. Chạy lệnh: `bash setup_nginx_node.sh`
4. Quá trình cấu hình tự động mất 5 phút (Tự cài module JWT và xóa bỏ `proxy_buffering`).
5. **Cài Đặt MediaFlow Proxy (Core 4K Streamer):** 
   - Trên cùng VPS Nginx này, hãy cài đặt Docker.
   - Deploy Container `MediaFlow` (Tìm repo github: `mediaflow-proxy`).
   - Cấu hình MediaFlow nghe ở Cổng `8888`. Nginx sẽ trỏ vào tệp M3U8 này để đùn phim xuống.

## BƯỚC 4: Kịch Bản Cấu Hình Tên Miền (DNS Phân Tách - Rất Quan Trọng)
1. **Cloudflare Dashboard:** Add tên miền chính của dự án (Ví dụ: `pchill.com`).
2. **Cho Frontend & API Node.js:** Trỏ Record `A` hoặc `CNAME` về Server chính, **BẬT MÀU CAM (PROXY)** để chống DDoS và giấu IP.
3. **Cho Nginx Streaming Node (Node 10 Gbps của BuyVM):** Trỏ Record A (Ví dụ `stream1.pchill.com`) về IP của VPS BuyVM, **TẮT ĐÁM MÂY (MÀU XÁM - DNS ONLY)**. 
   - *Lý do:* Phát Video 4K hút hàng trăm Gigabyte băng thông. Nếu Bật Proxy Cam, AI của Cloudflare sẽ cấm vĩnh viễn tài khoản của bạn vì vi phạm thỏa thuận cung cấp nội dung khối lượng lớn.

## BƯỚC 5: Tải Trọng Kỷ Lục Hình Mẫu (Load Testing K6)
Trước khi khai trương:
- Cài tool `Grafana K6` lên 1 máy tính khỏe.
- Viết kịch bản K6 HTTP GET giả lập 500 User ồ ạt truy cập Link API `/play/hot` cùng lúc.
- Ngồi nhìn CPU và Băng thông con VPS Nginx trồi sụt. Nếu không rớt % nào và Video Player không quay quay (Buffering), hạ tầng bạn đã sẵn sàng!
