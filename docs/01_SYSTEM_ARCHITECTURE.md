# [01] Kiến Trúc Lõi Hệ Thống 4K Streaming (PChill - Nhánh Torrent)

Hệ thống pChill (Phiên bản "Torrent") đã trải qua quá trình tái cấu trúc toàn diện, loại bỏ hoàn toàn mô hình Máy chủ chứa phim vật lý (P2P/Hosting cổ điển) để chuyển dịch sang kiến trúc **Multi-Debrid + Stateless Reverse Proxy**.

## 1. Bản Chất của Hệ Thống Zero-Storage
Thay vì dùng ổ đĩa cứng NVMe có dung lượng hàng chục Terabyte để lưu trữ phim 4K (chi phí cực kỳ đắt đỏ), pChill hoạt động như một cỗ máy trung chuyển thông minh:
- **Tài nguyên gốc:** Hàng triệu phim 4K/Bluray đã được lưu sẵn dạng Cache trên kho máy chủ đám mây của Real-Debrid và AllDebrid.
- **PChill Backend:** Nhận Magnet Link từ Frontend, gửi mã băm (Hash) lên API của Debrid. Debrid sẽ giải nén phim và cung cấp Liên Kết Trực Tiếp (Direct HTTP Link).
- **Trình duyệt (Video Player):** Khi End-User xem phim, họ thực sự đang tải byte dữ liệu trực tiếp từ Băng thông của Real-Debrid (thông qua Proxy ngụy trang).

## 2. Kiến Trúc "Ngụy Trang IP" Bằng Nginx + MediaFlow (Sống Còn)
Real-Debrid cấm việc nhiều hộ gia đình (nhiều địa chỉ IP) dùng chung 1 tài khoản Premium để stream trực tuyến. Hệ thống PChill phá vỡ rào cản này bằng:
1. **Node.js (Lõi API):** Giao tiếp với Database, kiểm tra quyền VIP của người dùng, phân bổ Token (`NGINX_JWT_SECRET`).
2. **Nginx Edge Server (Máy Chủ Xung Kích Rìa):** Trực tiếp nhận Token từ User. Nginx thay mặt người dùng kết nối tới hệ thống nội bộ của mình (Mạng ảo). Mọi luồng kéo dữ liệu của hàng ngàn User đối với Real-Debrid đều mang 1 Địa chỉ IP gốc của Máy Chủ Nginx này!
3. **MediaFlow (Lõi xử lý HLS):** Chuyển đổi định dạng MPEG-DASH thành M3U8 (Tốc độ bit thích ứng) tức thì On-The-Fly.

> [!CAUTION]  
> Nginx **bắt buộc** phải có chỉ thị `proxy_buffering off;`. Hệ thống pChill không dùng bộ nhớ RAM (Buffer) của máy chủ để chứa cả Gigabyte phim 4K vì nó tăng độ trễ và làm nổ RAM/SSD. Nginx nhận bao nhiêu Byte từ MediaFlow sẽ "trả ngắt dòng" (Pipe) bấy nhiêu về trình duyệt ngay lập tức. Đây là yếu tố định cỡ Scaling!

## 3. Kiến trúc Cân Bằng Tải Pool Hạt Giống (Horizontal Scaling)
Một tài khoản Real-Debrid chỉ chịu được tối đa 50-100 luồng 4K trước khi sập (Ban IP do hút vài Terabyte Data). 
Vậy làm sao để gánh 2,000 CCU?
- **Giải pháp:** Cơ chế *Round Robin Load Balancer* có sẵn trong Source Code Node.js (`server/utils/debridManager.js`).
- **Hoạt động:** Hệ thống ôm 1 rổ mã API (Khoảng 10-20 API Key của Real-Debrid). Backend Node.js sẽ rải đều Request đan xen vào các Key này. Cháy Key 1 -> Nhảy sang Key 2 -> Rớt đài Real-Debrid -> Rớt về lưới AllDebrid dự phòng. Không bao giờ Down-Time.

## 4. Tốc độ Cổng Mạng Quyết Định Quy Mô (Uplink Bottleneck)
Phim 4K có Bitrate trung bình **~25 Mbps**. Khi bạn Stream thông qua Proxy, mạng máy chủ phải gánh Dữ liệu vào (Ingress từ RD) VÀ Dữ liệu ra (Egress tới User) = Gấp Đôi Băng Thông = **~50 Mbps / 1 View.**
- **Mức trần 1 Gbps (1000 Mbps):** Một máy chủ Nginx với cổng Unmetered 1000 Mbps (như BuyVM $30-$60) sẽ gánh được Mức Đỉnh: `1000 Mbps / 50 Mbps = ~20 CCU Xem 4K Cùng Lúc` (Hoặc ~100 CCU nếu xem 1080p).
- **Chiến lược Scale ngang (Horizontal Nginx Nodes):** Vì cổng 1 Gbps sẽ chật cứng khi đạt mốc 20-30 người kéo 4K, bạn không nâng cấp CPU RAM mà mua thêm **1 VPS BuyVM 1000 Mbps khác** làm Node 2, Node 3... Code Node.js sẽ tự động Load-Balancer vòng quanh các Node này.
Do đó, bài toán Scaling của bạn phụ thuộc hoàn toàn vào số lượng Cụm Nginx 1 Gbps được mua thêm chứ Server Lõi Node.js không cần nâng cắp!
