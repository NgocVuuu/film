# Hướng Dẫn Cấu Hình Hệ Thống Streaming Phân Tán (pChill)

Tài liệu này tổng hợp toàn bộ các cấu hình rời rạc của dự án liên quan đến hệ thống Multi-Debrid Fallback, Nginx Proxy và Health Check. Admin có thể tra cứu và cấu hình lại khi triển khai trên Server/VPS mới.

## 1. Cấu hình Biến Môi Trường (`.env` trên Node.js Backend)

Để kích hoạt hệ thống Streaming mới, file `.env` của Backend cần đảm bảo có các biến sau:

```env
# Mật khẩu bảo mật cho Token Stream (Phải khớp hoàn toàn với file Script Nginx)
NGINX_JWT_SECRET=super_secret_pchill_jwt_key_2026

# --- REAL-DEBRID POOL ---
# Hỗ trợ nhiều tài khoản, ngăn cách bằng dấu phẩy
REAL_DEBRID_API_KEY=YOUR_RD_TOKEN_1,YOUR_RD_TOKEN_2

# --- ALL-DEBRID POOL (FALLBACK) ---
# Điền khi muốn Nginx tự động chuyển hướng nếu Real-Debrid sập chặn
ALL_DEBRID_API_KEY=YOUR_AD_TOKEN_1
```

## 2. Kịch bản Tự Động Định Tuyến Nginx (IaC Script)

File Bash Script tự động cài Nginx Streaming được lưu tại: `server/scripts/setup_nginx_node.sh`

**Các tham số cần sửa trước khi quăng lên VPS mới chạy:**
Mở file bằng lệnh `nano setup_nginx_node.sh` và sửa 3 dòng đầu tiên:
```bash
DOMAIN="stream3.pchill.com"               # Thay bằng Domain trỏ về IP của VPS này
EMAIL="admin@pchill.online"               # Email để Certbot cấp phát HTTPS
NGINX_JWT_SECRET="super_secret_pchill_jwt_key_2026"  # Khớp với biến .env của Server Node.js
```

**Các tham số Tuning Nginx (Dành cho VPS yếu hoặc chống OOM):**
Tìm đến Block `location /play` trong file file Script. Thay đổi giá trị để tránh vỡ RAM:
```nginx
# Hiện tại đang ép Nginx KHÔNG ghi ổ cứng (Tối ưu SSD)
proxy_max_temp_file_size 0;

# Bộ đệm Cache RAM cho Video Streaming.
# Cấu hình "32 4m" = 1 user sẽ nếch tối đa 128MB RAM
# CHÚ Ý OOM KHẨN CẤP: Nếu VPS bạn 1GB RAM và có 10 người xem cùng lúc, hãy bóp nhỏ lại thành "16 2m"
proxy_buffers 32 4m;
proxy_buffer_size 8m;
proxy_busy_buffers_size 12m;
```

## 3. Cấu Hình Health Check (Giám Sát Node) & Mongo Database

Ngay sau khi Cài đặt Nginx thành công cho Server, bắt buộc truy cập Database MongoDB để khai báo sự tồn tại của máy chủ này cho Hệ Thống:

1. Vào Collection `ServerNodes`.
2. Insert Record mới:
```json
{
  "name": "Nginx Node 3 (Frankfurt)",
  "domain": "https://stream3.pchill.com",
  "status": "active",
  "apiKeys": ["rd_key_0", "ad_key_1"] 
}
```
*Lưu ý:* `apiKeys` là trường không bắt buộc, Backend hiện tại tự động Hash xoay vòng.

**Node.js Health Check:**
Hoạt động hoàn toàn tự động ngay khi Node.js chạy (Import tại `server.js` dòng 287).
* Hàm ping `/health` mỗi 30s.
* Hồi đáp chậm quá 3s -> Tự gán Status trên Mongo thành `offline`.
* Hồi phục -> Tự gán `active`.

## 4. Bật / Tắt Multi-Debrid Provider bằng Code

Nếu trong tương lai bạn muốn tắt luồng AllDebrid đi (để tiết kiệm tiền tài khoản dự phòng), mở file `server/utils/debridManager.js`:
```javascript
this.providers = [
    { id: 'rd', service: realDebrid, priority: 1, name: 'Real-Debrid' },
    // Dùng // (comment) dòng dưới đây để tắt tính năng Fallback sang AllDebrid
    { id: 'ad', service: allDebrid, priority: 2, name: 'AllDebrid' }, 
];
```

## 5. Lệnh Quản Trị Hệ Thống Cơ Bản

**Restart Backend Backend (áp dụng config Node.js mới):**
```bash
pm2 restart pchill-server --update-env
# hoặc
npm run dev
```

**Restart Trạm Proxy (trên VPS Nginx):**
```bash
systemctl restart nginx
```

## 6. Lớp Cứu Sinh DMCA & Tránh Dính Án Phạt Cloudflare (Quan trọng)

**CẢNH BÁO ĐỎ:** Tuyệt đối KHÔNG sử dụng `Cloudflare Tunnel` hoặc bật Đám mây màu cam (Proxy) cho tên miền của các Nginx Streaming Node. Theo Điều khoản sử dụng (ToS Mục 2.8) của Cloudflare, việc truyền tải dữ liệu Media dung lượng lớn qua mạng lưới của họ sẽ khiến Tên miền của dự án bị Khóa (Banned) vĩnh viễn.

**Cách triển khai an toàn (Mô hình DNS Phân Tách):**
1. **Frontend & API Node.js:** Trỏ tên miền (`pchill.online`, `api.pchill.online`) qua Cloudflare Proxy (Bật đám mây Cam) để giấu IP thật và chống DDoS HTTP.
2. **Nginx Streaming Nodes:** Trỏ tên miền (`stream3.pchill.com`, v.v..) trực tiếp bằng **A Record (Đám mây Xám - DNS Only)** về IP thực của VPS.
3. **Chống DMCA:** Chọn mua VPS Nginx ở các Datacenter / Quốc gia phớt lờ bản quyền (DMCA-Ignored Offshore) như **Nga, Hà Lan, Panama** (Ví dụ: AlexHost, FlokiNET, Zomro). Nếu một server bị Report khóa mạng, chỉ cần dùng kịch bản Docker/Bash đẻ ra Node mới trong 5 phút.

## 7. Chống Tấn Công Preflight DDoS (CORS Optimization)

Mặc định trình duyệt sẽ Spam một HTTP Request `OPTIONS` mỗi khi người dùng tua video. Để tránh việc Nginx bị quá tải bởi hàng triệu luồng rác này, đoạn mã sau đã được tích hợp vững chắc vào `setup_nginx_node.sh`:
```nginx
if ($request_method = 'OPTIONS') {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
    # Bắt trình duyệt Cache lại giấy phép này trong 20 ngày
    add_header 'Access-Control-Max-Age' 1728000 always; 
    add_header 'Content-Type' 'text/plain charset=UTF-8';
    add_header 'Content-Length' 0;
    return 204;
}
```

## 8. Tối ưu Vòng Lặp Sự Kiện (Node.js Worker Threads)

Tính năng săn phim 4K tự động (`hunter.js`) và Auto-sync phim OPHIM/KKPHIM đã được bóc tách hoàn toàn khỏi luồng chính của máy chủ.
Thay vì bắt Backend phải "nín thở" chờ tính toán dữ liệu cào về, quá trình này hiện được đưa vào chạy ngầm thông qua tệp: `server/workers/crawlerWorker.js`.

**Lợi ích System:**
Cấu trúc siêu phân luồng này giúp luồng chính (**Main Thread**) hoàn toàn rảnh tay để cấp phát JWT Stream Token độc quyền và quản lý Socket.IO. Kể cả khi có 1000 CCU VIP cùng kết nối, hệ thống cũng không suy suyển hay bị "lag" giật khung hình.
