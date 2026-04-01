#!/bin/bash
# ==============================================================================
# pChill Nginx Streaming Node - Auto Setup Script
# Description: Tự động cài đặt Nginx, tối ưu Zero-Disk I/O, Lua JWT Auth và SSL.
# OS Supported: Ubuntu 20.04 / 22.04 LTS (Debian based)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. CẤU HÌNH BIẾN (ADMIN TÙY CHỈNH TẠI ĐÂY TRƯỚC KHI CHẠY)
# ------------------------------------------------------------------------------
DOMAIN="stream2.pchill.com"               # Thay bằng Domain thực tế của Node này
EMAIL="admin@pchill.online"               # Email để đăng ký SSL Certbot
NGINX_JWT_SECRET="YOUR_SECRET_KEY_HERE"   # Khớp với bí mật trên Backend Node.js
# ------------------------------------------------------------------------------

# Kiểm tra quyền Root
if [ "$EUID" -ne 0 ]; then
  echo "Vui lòng chạy script với quyền root (sudo ./setup_nginx_node.sh)"
  exit
fi

echo "======================================================="
echo " BẮT ĐẦU CÀI ĐẶT PCHILL STREAMING NODE"
echo " Domain: $DOMAIN"
echo "======================================================="

# 1. Cập nhật hệ thống & Cài đặt gói cần thiết
echo "[1/5] Đang cập nhật hệ thống và cài đặt môi trường..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git ufw certbot python3-certbot-nginx

# Cài đặt Nginx tích hợp Lua module và Docker
apt-get install -y nginx libnginx-mod-http-lua lua-cjson docker.io docker-compose

# 1.5 Triển khai MediaFlow Proxy thông qua Docker Compose
echo "[1.5/5] Dockerizing MediaFlow Proxy..."
cat > /opt/docker-compose.yml << 'EOF_DOCKER'
version: '3.8'
services:
  mediaflow-proxy:
    image: mhdzumair/mediaflow-proxy:latest
    container_name: mediaflow_proxy
    restart: unless-stopped
    ports:
      - "8888:8888"
    environment:
      - API_PASSWORD=${NGINX_JWT_SECRET}
EOF_DOCKER
cd /opt && docker-compose up -d

# 2. Cấu hình Firewall cơ bản
echo "[2/5] Đang cấu hình Tường lửa (UFW)..."
ufw allow 'Nginx Full'
ufw allow 'OpenSSH'
ufw --force enable

# 3. Tối ưu kiến trúc lõi Nginx (Nginx.conf)
echo "[3/5] Đang cấu hình Nginx Core (Tối ưu Network & Lua Shared Dict)..."

cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 65535;
    multi_accept on;
    use epoll;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # CẤU HÌNH LUA CACHE RAM (Share Dict)
    lua_shared_dict jwt_cookies 10m; # Lưu Cookie Smart TV
    lua_shared_dict rate_limit 5m;   # Rate Limit Token
    
    # [PHASE 3] NVMe Tiered Caching (Khoang bộ nhớ đệm đặc dụng cho Top Phim Hot)
    proxy_cache_path /var/cache/nginx_tiered levels=1:2 keys_zone=hot_movies_cache:50m max_size=100g inactive=7d use_temp_path=off;
    
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

# 4. Cấu hình Virtual Host PChill Streaming L7
echo "[4/5] Đang cấu hình Virtual Host L7 phân tích luồng Streaming..."

cat > /etc/nginx/sites-available/pchill_stream << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # Endpoint Dấu IP Gốc của Real-Debrid (Node.js sẽ trỏ vào đây)
    location /rd_proxy/ {
        # Chỉ nhận lệnh điều khiển từ IP của Backend pChill (Bật lên nếu cần bảo mật nghiêm ngặt)
        # allow IP_BACKEND_NODEJS;
        # deny all;

        proxy_pass https://api.real-debrid.com/;
        proxy_set_header Host api.real-debrid.com;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_ssl_server_name on;
        
        # Bắt các mã lỗi Debrid chết yểu (403, 429) và lật thành 424 cho Node.js tự xoay vòng API Key
        error_page 403 429 =424 @fallback_trigger;
    }

    # Location dùng chung báo lỗi Domino Fallback
    location @fallback_trigger {
        return 424 '{"error": "PROXY_KEY_DEAD", "message": "Real-Debrid API bị chặn hoặc hết hạn"}';
    }

    # Endpoint siêu nhẹ dành cho Backend giăng lưới kiểm tra sinh tử (Health Check)
    location /health {
        add_header Content-Type text/plain;
        return 200 "OK";
    }

    # [PHASE 3] Lõi NVMe Tiered Caching (Cho phim đắt khách)
    # Backend Node.js sẽ trỏ link phim Hot có chữ /play/hot ở url để Nginx kích hoạt ổ cứng
    location /play/hot {
        proxy_cache hot_movies_cache;
        proxy_cache_valid 200 7d;
        proxy_cache_lock on;       # Tránh Bão Bầy Đàn băng thông khi chưa có cache
        proxy_cache_lock_timeout 5s;
        proxy_cache_background_update on;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        
        # [NVMe D-I/O] Mở khóa giới hạn đĩa, cho phép chứa file phim cực lớn
        proxy_max_temp_file_size 100000m;

        proxy_buffering on;
        proxy_buffers 32 4m;
        proxy_buffer_size 8m;
        proxy_busy_buffers_size 12m;

        add_header Access-Control-Allow-Origin "*";
        add_header X-Cache-Status \$upstream_cache_status;

        # Preflight OPTIONS request handling
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        access_by_lua_block {
            local jwt = require "resty.jwt"
            local secret = "${NGINX_JWT_SECRET}"
            local token = ngx.var.arg_token
            if not token then
                 ngx.status = 403
                 ngx.say("Bạn không có quyền truy cập luồng Tiered Caching này.")
                 return ngx.exit(403)
            end
        }
        # proxy_pass \$target_url;
        return 200 "NVMe Tiered Cache Ready.";
    }

    # Lõi Streaming 4K / Tối ưu RAM hoàn toàn (Cho phim thường)
    location /play {
        # [Zero-Disk I/O] Cấm Nginx ghi file đệm ra ổ cứng
        proxy_max_temp_file_size 0;

        # Keep-Alive connection từ Nginx sang MediaFlow để tối ưu CCU
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # [Zero-Buffer] Vô hiệu hóa hoàn toàn bộ đệm phản hồi để luồng video đi trực tiếp đồng bộ thời gian thực
        proxy_buffering off;
        proxy_set_header X-Accel-Buffering no;

        # Chuyển tiếp các tiêu đề dải byte quan trọng theo đúng kỹ thuật Range Requests
        proxy_set_header Range \$http_range;
        proxy_set_header If-Range \$http_if_range;

        # Header bảo mật
        add_header Access-Control-Allow-Origin "*";
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        
        # Preflight OPTIONS request handling
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000 always;
            add_header 'Content-Type' 'text/plain charset=UTF-8';
            add_header 'Content-Length' 0;
            return 204;
        }

        # Timeout cho video phim siêu dài
        proxy_read_timeout 36000s;
        proxy_send_timeout 36000s;

        # Lua Block chặn và xử lý luồng Video (Kiểm tra Token/Cookie)
        access_by_lua_block {
            local jwt = require "resty.jwt"
            local secret = "${NGINX_JWT_SECRET}"
            local token = ngx.var.arg_token
            local cookie_hash = ngx.var.cookie_phash
            local shared_dict = ngx.shared.jwt_cookies

            -- 1. Xác thực Token JWT
            local jwt_obj = jwt:verify(secret, token)
            if not jwt_obj.verified then
                 ngx.status = 403
                 ngx.say("Token truy cập không hợp lệ hoặc đã hết hạn.")
                 return ngx.exit(403)
            end

            -- 2. Trích xuất URL
            local target_url = jwt_obj.payload.url
            if not target_url then
                 ngx.status = 400
                 ngx.say("Thiếu tham số URL trong Token.")
                 return ngx.exit(400)
            end

            -- 3. Chuyển hướng âm thầm (Reverse Proxy) tới MediaFlow
            -- Định dạng MediaFlow yêu cầu header hoặc query parameter
            -- Ở đây ta dùng proxy_pass qua Nginx upstream để MediaFlow xử lý che IP (Rewrite M3U8)
            ngx.var.target_url = target_url
        }

        # Chuyển tiếp tới MediaFlow Proxy (Hoạt động port 8888 cài bằng Docker)
        proxy_pass http://127.0.0.1:8888/proxy/stream?api_password=${NGINX_JWT_SECRET}&d=\$target_url;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Kích hoạt Site Nginx
rm /etc/nginx/sites-enabled/default
ln -s /etc/nginx/sites-available/pchill_stream /etc/nginx/sites-enabled/

# Test Nginx
nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
else
    echo "Lỗi cú pháp Nginx, xin kiểm tra."
    exit 1
fi

# 5. Cấp phát bảo mật SSL bằng Certbot
echo "[5/5] Cấp phát chứng chỉ SSL Let's Encrypt cho $DOMAIN..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

echo "======================================================="
echo " CÀI ĐẶT THÀNH CÔNG NODE STREAMING!"
echo " Domain: https://$DOMAIN"
echo " Lõi RAM Bật: proxy_max_temp_file_size 0"
echo " Lua RAM Cache: ON"
echo "======================================================="
echo "[HƯỚNG DẪN KẾT NỐI VÀO BACKEND NODE.JS]"
echo "Đăng nhập Cpanel MongoDB của pChill -> ServerNodes -> Thêm Node"
echo "{ name: 'Node Auto 1', domain: 'https://$DOMAIN', status: 'active', apiKeys: ['rd_key_xx'] }"
echo "======================================================="
