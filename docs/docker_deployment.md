# Hướng Dẫn Kịch Bản Tác Chiến (Wargame Deployment)

Tài liệu này đóng gói toàn bộ quy trình Triển khai Tự động bằng Docker (Infrastructure as Code) và Hệ thống Giám sát Phân cập (Monitoring) để giải quyết 2 bài toán Khẩn cấp: "Cứu Viện Thần Tốc" (Deploy Nginx thứ 4,5 trong 30 giây) và "Đôi Mắt Của Chúa" (Grafana Dashboard).

---

## 🚀 KỊCH BẢN 2: "Cứu Viện Thần Tốc" (Auto Deploy Nginx)

Chỉ cần copy Folder chứa 2 file này lên VPS mới mua, gõ `docker compose up -d` là hệ thống Proxy bọc thép đã sẵn sàng gánh thêm 300 VIP.

### 1. File `Dockerfile` (Bọc thép môi trường OpenResty)

```dockerfile
# Sử dụng base image OpenResty (Ubuntu/Debian) được tối ưu cho hiệu năng cao
FROM openresty/openresty:jammy

# Cập nhật OS và Cài đặt wget, ca-certificates (Cần cho lua_ssl_trusted_certificate)
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Cài đặt OPM (OpenResty Package Manager) để kéo thư viện bổ sung
RUN opm get bungle/lua-resty-session \
    && opm get ledgetech/lua-resty-http \
    && opm get SkyLothar/lua-resty-jwt

# Tạo file rd_keys.json rỗng hoặc đẩy cấu hình có sẵn vào
# Lưu ý: Lúc chạy production, mount file cấu hình json thật từ bên ngoài vào
RUN echo "{}" > /usr/local/openresty/nginx/conf/rd_keys.json

# Copy cấu hình Nginx thần thánh đã được tinh chỉnh
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

# Mở port 80 và 443
EXPOSE 80 443

CMD ["/usr/local/openresty/bin/openresty", "-g", "daemon off;"]
```

### 2. File `docker-compose.yml` (Luân chuyển hệ thống)

```yaml
version: "3.8"

services:
  nginx-streaming:
    build: .
    container_name: pchill-nginx-node
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NGINX_JWT_SECRET=${NGINX_JWT_SECRET} # Lấy từ ENV máy chủ
    volumes:
      # Nạp mã API Key thật vào thùng chứa mã nguồn Nginx
      - ./rd_keys.json:/usr/local/openresty/nginx/conf/rd_keys.json:ro
      # Volume mount chứng chỉ SSL (Giả sử dùng Certbot Let's Encrypt ngoài máy host)
      - /etc/letsencrypt:/etc/letsencrypt:ro
    dns:
      - 1.1.1.1
      - 8.8.8.8
    deploy:
      resources:
        limits:
          memory: 3G # Khống chế RAM tối đa 3GB để chừa cho OS
```

---

## 👁️ KỊCH BẢN 3: "Đôi Mắt Của Chúa" (Prometheus Metrics)

Để theo dõi lưu lượng băng thông (Mbps) và số lượng CCU (Concurrent Users) của từng cái Nginx này theo thời gian thực, ta bổ sung Cổng Metrics vào chính file Nginx Config, sau đó dùng Prometheus hút dữ liệu.

### 1. Bổ sung `stub_status` vào file `nginx.conf`

Vào file `nginx_proxy_setup.md` (hoặc `nginx.conf`), thêm 1 Block `server` ảo, chỉ mở nội bộ cho đội kỹ thuật giám sát:

```nginx
http {
    # Cấu hình cũ ...
    
    # Server giám sát cục bộ (Metrics Export)
    server {
        listen 8080;
        server_name localhost;

        # Chỉ cho phép IP Của VPS Mẹ (VPS Grafana) vào hút metrics
        # allow 14.22.x.x;
        # deny all;

        location /stub_status {
            stub_status; # Module mặc định của Nginx để tính CCU và Băng thông
            access_log off;
        }
    }
}
```

### 2. File cấu hình `prometheus.yml` (Nằm ở VPS Trung tâm)

VPS Trung tâm chứa Prometheus sẽ quét vòng mảng các Node Nginx mỗi 5 giây 1 lần để vẽ biểu đồ Tình trạng máu (Health Check).

```yaml
global:
  scrape_interval: 5s # Quét băng thông mỗi 5 giây (Real-time tracking)

scrape_configs:
  - job_name: 'nginx-streaming-nodes'
    metrics_path: '/stub_status'
    static_configs:
      - targets: ['stream1.pchill.com:8080', 'stream2.pchill.com:8080', 'stream3.pchill.com:8080']
        labels:
          group: 'vietnam-cluster'
```

### CÁC CHỈ SỐ VÀNG CẦN KÉO LÊN GRAFANA DASHBOARD:
Khi Grafana đã hút được data trên, Sếp hãy setup 3 Biểu đồ Gauge (Đồng hồ công tơ mét) sau:
1. **Network Out (Mbps):** Theo dõi sự phình lên của các Node. Tính tổng bằng `rate(nginx_http_responses_total[1m])`. Nếu chạm mốc `800Mbps`, lập tức Call Server API đẻ thêm Instance VPS tự động!
2. **Reading/Writing Sockets (CCU):** Chỉ số cho biết đang có bao nhiêu luồng `Active Connections` đang kéo phim. Tính ra số lượng VIP đang thức.
3. **HTTP 424 / 50X Rate:** Nhận diện ngay lập tức Node Nginx nào đang bị dính Dead Key (RD lỗi) thông qua chuỗi báo lỗi tăng vọt. Kích hoạt thông báo Telegram báo khẩn về Smartphone sếp.
