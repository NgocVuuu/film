# Hướng dẫn thiết lập Dedicated Nginx Proxy Streaming (với JWT) cho pChill

Cấu hình mẫu dới đây yêu cầu máy chủ VPS cài đặt OpenResty (Nginx + Lua) để có thể giải mã JWT siêu nhẹ ở tầng mạng.

### 1. Cài đặt OpenResty và Lua JWT:
```bash
# Ubuntu/Debian
wget -qO - https://openresty.org/package/pubkey.gpg | sudo apt-key add -
sudo apt-get -y install software-properties-common
sudo add-apt-repository -y "deb http://openresty.org/package/ubuntu $(lsb_release -sc) main"
sudo apt-get update
sudo apt-get install -y openresty lua-resty-jwt lua-resty-http
```

### 2. Cấu hình Nginx (`/usr/local/openresty/nginx/conf/nginx.conf`):

```nginx
env NGINX_JWT_SECRET;

# Mở khóa giới hạn kẹt kết nối File Descriptors của hệ điều hành
worker_rlimit_nofile 8192; 

events {
    worker_connections 4096;
    multi_accept on;
}

http {
    # Tối ưu streaming
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Cấu trúc RAM chia sẻ cho Script Lua (10MB tương đương chứa hàng ngàn Link Cache chống Spam RD API)
    lua_shared_dict rd_cache 10m;
    lua_shared_dict locks 1m; # Vùng nhớ Semaphore Lock chặn hiệu ứng Bầy Đàn (Thundering Herd)
    lua_shared_dict jwt_blacklist 2m; # Bộ nhớ Kill-Switch cấm Token của Khách hàng bị khóa

    # Khởi tạo vùng nhớ đếm kết nối theo IP (Chống IDM cắn băng thông)
    limit_conn_zone $binary_remote_addr zone=limit_ip:10m;

    # Chỉ định file CA để verify SSL
    lua_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
    lua_ssl_verify_depth 2;

    # NẠP KEYS VÀO RAM KHI KHỞI ĐỘNG (Chống Blocking I/O do đọc file ổ cứng)
    init_worker_by_lua_block {
        local cjson = require "cjson"
        local file = io.open("/usr/local/openresty/nginx/conf/rd_keys.json", "r")
        if file then
            local content = file:read("*a")
            file:close()
            package.loaded.rd_secret_keys = cjson.decode(content)
        end
    }

    # Bật lại Buffering (Chỉ trên RAM) chống hiệu ứng Slow Loris gây nghẽn kết nối RD do khách hàng mạng yếu
    # TUYỆT ĐỐI KHÔNG GHI XUỐNG Ổ CỨNG (proxy_max_temp_file_size 0)
    proxy_buffering on;
    proxy_buffer_size 64k;
    proxy_buffers 32 64k; # Ăn khoảng vài MB RAM mỗi luồng, giúp kéo nhanh từ RD để trả Socket
    proxy_max_temp_file_size 0;

    # Chống Zombie Sockets (Giải phóng kết nối bị treo do khách tắt máy ngang)
    proxy_read_timeout 60s;
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;

    server {
        listen 80;
        server_name _; # Hứng MỌI tên miền trỏ về IP này (Nginx Catch-All)

        # Vô hiệu hóa log để tiết kiệm Disk I/O nếu cần
        # access_log off; 

        # Webhook nhận lệnh Cấm người dùng từ Node.js (Kill-Switch)
        location /admin/ban_user {
            # Chỉ cho phép IP của Server Node.js (Hoặc Localhost) gọi vào cổng này
            # allow 127.0.0.1;
            # deny all;

            content_by_lua_block {
                local user_id = ngx.var.arg_user_id
                if not user_id then
                    ngx.status = 400
                    return ngx.say("Thiếu user_id")
                end
                
                local blacklist = ngx.shared.jwt_blacklist
                -- Khóa token trong 24 tiếng (thời hạn tối đa của JWT)
                blacklist:set(user_id, true, 86400)
                
                ngx.say("Đã đưa user_id " .. user_id .. " vào Blacklist (Cấm sóng)!")
            }
        }

        location /play {
            # Tối đa 3 kết nối đồng thời từ 1 IP. Luồng IDM thứ 4 sẽ bị chém (Lỗi 503)
            limit_conn limit_ip 3; 

            # Giải mã CORS cho Trình phát Vidstack (Bảo mật: Chỉ chấp nhận Domain của bạn)
            add_header 'Access-Control-Allow-Origin' 'https://pchill.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Range, Authorization' always;
            add_header 'Access-Control-Expose-Headers' 'Content-Length, Content-Range' always;
            
            if ($request_method = 'OPTIONS') {
                return 204;
            }

            # Lấy token từ query param
            set $jwt $arg_token;

            # Kiểm tra & Giải mã bằng thư viện LUA
            set $target_url "";
            content_by_lua_block {
                local jwt = require "resty.jwt"

                -- 1. Bảo mật: Đọc Secret từ Biến môi trường thay vì Hardcode (Chống Lộ Key)
                local secret = os.getenv("NGINX_JWT_SECRET") 
                if not secret then
                    ngx.status = 500
                    ngx.say("Lỗi Server: Chưa cấu hình biến môi trường NGINX_JWT_SECRET trong Nginx")
                    return ngx.exit(500)
                end

                if not ngx.var.jwt then
                    ngx.status = ngx.HTTP_UNAUTHORIZED
                    ngx.say("Thiếu Token Streaming")
                    return ngx.exit(ngx.HTTP_UNAUTHORIZED)
                end

                -- Lấy JWT Payload độc lập không màng Expiry Code để xử lý logic nội bộ
                local jwt_obj = jwt:load_jwt(ngx.var.jwt)
                if not jwt_obj or not jwt_obj.valid then
                    ngx.status = ngx.HTTP_FORBIDDEN
                    return ngx.exit(ngx.HTTP_FORBIDDEN)
                end

                -- VÁ LỖI BẢO MẬT: Kiểm tra Blacklist (Kill-Switch) chặn đứng Token của Acc bị Ban
                local blacklist = ngx.shared.jwt_blacklist
                if jwt_obj.payload.user_id and blacklist:get(jwt_obj.payload.user_id) then
                    ngx.status = ngx.HTTP_FORBIDDEN
                    ngx.say("Tài khoản của bạn đã bị khóa hệ thống Streaming. Vui lòng liên hệ Admin.")
                    return ngx.exit(ngx.HTTP_FORBIDDEN)
                end

                -- VÁ LỖI 3: Trích xuất X-Forwarded-For chuẩn xác, chống Crash/Spoofing
                local client_ip = ngx.var.remote_addr
                local xff = ngx.req.get_headers()["X-Forwarded-For"]
                if type(xff) == "table" then xff = xff[1] end
                if xff and type(xff) == "string" then
                    client_ip = string.match(xff, "^%s*(%d+%.%d+%.%d+%.%d+)") or client_ip
                end

                -- 2. Xử lý Cast Token (Chống đứt gãy Tua phim & Chống Hijack mạng 4G)
                -- Lấy user_id từ Payload JWT (ID cố định) thay vì client_ip dễ biến động
                local user_identity = jwt_obj.payload.user_id or client_ip
                
                -- VÁ LỖI 4: Chống Replay Cookie bằng cách mix thêm Expiry Time (Ví dụ sống 6 tiếng từ lúc cấp)
                local cookie_exp = jwt_obj.payload.exp + 21600 -- Tính mốc chết của Cookie
                local session_hash = ngx.encode_base64(ngx.hmac_sha1(secret, jwt_obj.payload.url .. user_identity .. cookie_exp))
                
                -- Client phải truyền lên cả Hash Hash (Trong Cookie)
                local client_cookie_hash = ngx.var.cookie_cast_session
                local has_valid_cookie = (client_cookie_hash == session_hash and ngx.time() < cookie_exp)

                -- Giải mã chữ ký an toàn bằng secret
                local verified_jwt = jwt:verify(secret, ngx.var.jwt)
                local is_expired = (verified_jwt.verified == false and string.find(verified_jwt.reason or "", "expire"))

                -- Luật Sinh Tử: Sai chữ ký => BAN. Hết hạn mà Không có Cast Cookie hợp lệ => BAN.
                if not verified_jwt.verified and not (is_expired and has_valid_cookie) then
                    ngx.status = ngx.HTTP_FORBIDDEN
                    ngx.say("Token Không Hợp Lệ Hoặc Đã Hết Hạn")
                    return ngx.exit(ngx.HTTP_FORBIDDEN)
                end

                -- Trao đổi Cookie: Nếu dùng Cast Token chạm lần đầu tiên thành công -> Cấp thẻ bài Cookie sống 6 Tiếng
                if verified_jwt.verified and jwt_obj.payload.is_cast == true then
                    ngx.header["Set-Cookie"] = "cast_session=" .. session_hash .. "; Max-Age=21600; Path=/; HttpOnly; Secure; SameSite=None"
                end

                -- 2. Anti JWT Replay (Subnet IP Binding)  
                -- BỎ QUA nếu đang xài Cast Mode (Sống bằng Cookie hoặc 60s đầu đời)
                if jwt_obj.payload.is_cast ~= true then
                    local function get_subnet(ip)
                        if not ip then return "" end
                        local ipv4_subnet = string.match(ip, "^(%d+%.%d+%.%d+%.)")
                        if ipv4_subnet then return ipv4_subnet end
                        local ipv6_subnet = string.match(ip, "^([^:]+:[^:]+:[^:]+:[^:]+:)")
                        if ipv6_subnet then return ipv6_subnet end
                        return ip
                    end

                    local token_subnet = get_subnet(jwt_obj.payload.client_ip)
                    local current_subnet = get_subnet(client_ip)

                    if token_subnet ~= current_subnet then
                        ngx.status = ngx.HTTP_UNAUTHORIZED
                        ngx.say("Truy Cập Bị Từ Chối - Cảnh báo Share JWT Token. Vui lòng lấy link mới.")
                        return ngx.exit(ngx.HTTP_UNAUTHORIZED)
                    end
                end

                -- 3. Hệ thống Lua Cache (Chống bão Spam Range Request API RD dồn dập)
                local rd_cache = ngx.shared.rd_cache
                local cached_link = rd_cache:get(jwt_obj.payload.url)

                if cached_link then
                    ngx.var.target_url = cached_link
                    ngx.exec("@proxy")
                    return
                end

                -- 4. CHỐNG THUNDERING HERD (Hiệu ứng bầy đàn): Dùng Lock để chặn bão Request lúc Cache Miss
                local lock = require("resty.lock"):new("locks")
                local elapsed, err = lock:lock(jwt_obj.payload.url)
                if not elapsed then
                    ngx.status = 500
                    ngx.say("Không thể thiết lập Lock chặn bão truy vấn: ", err)
                    return ngx.exit(500)
                end

                -- Double-check bộ đệm (Phòng ngừa việc đã có 1 request đi trước vừa xin và điền Cache xong)
                cached_link = rd_cache:get(jwt_obj.payload.url)
                if cached_link then
                    lock:unlock()
                    ngx.var.target_url = cached_link
                    ngx.exec("@proxy")
                    return
                end

                -- 5. Lấy API Key từ RAM (Tránh Blocking I/O do gọi io.open)
                local actual_api_key = nil
                if package.loaded.rd_secret_keys then
                    actual_api_key = package.loaded.rd_secret_keys[jwt_obj.payload.rd_key_id]
                end

                if not actual_api_key then
                    lock:unlock()
                    ngx.status = 500
                    ngx.say("Lỗi Máy Chủ: Không tìm thấy Real-Debrid API Key của ID này trong bộ nhớ")
                    return ngx.exit(500)
                end

                local http = require "resty.http"
                local httpc = http.new()
                
                -- Sinh Direct Link ngầm, khóa IP tại Nginx Proxy
                local res, err_http = httpc:request_uri("https://api.real-debrid.com/rest/1.0/unrestrict/link", {
                    method = "POST",
                    body = "link=" .. jwt_obj.payload.url,
                    headers = {
                        ["Authorization"] = "Bearer " .. actual_api_key,
                        ["Content-Type"] = "application/x-www-form-urlencoded"
                    },
                    ssl_verify = true -- BẢO MẬT TUYỆT ĐỐI!
                })

                -- 6. Fallback 424 Failed Dependency (Chống Domino Error vì API sập bão táp)
                if not res or res.status ~= 200 then
                    lock:unlock()
                    ngx.status = 424
                    ngx.say("424 Failed Dependency: API Key Của Máy Chủ Proxy hiện tại đã chết hoặc quá tải, Hệ thống Backend hãy Re-route.")
                    return ngx.exit(424)
                end

                local rd_data = cjson.decode(res.body)

                if not rd_data or not rd_data.download then
                    lock:unlock()
                    ngx.status = 424
                    ngx.say("424 Failed Dependency: Nội dung Video trên RD Đã bị Lỗi Định dạng/Cấm stream.")
                    return ngx.exit(424)
                end

                -- Lưu link này vào bộ đệm RAM để tái sử dụng ngay lập tức cho các truy vấn Range (sống 4 Tiếng)
                rd_cache:set(jwt_obj.payload.url, rd_data.download, 14400)
                lock:unlock() -- Mở cổng cho 99 client khác đang xếp hàng được lấy Link từ RAM Cached
                
                ngx.var.target_url = rd_data.download
                
                -- Tạo HTTP request ngầm nội bộ để proxy qua proxy_pass
                ngx.exec("@proxy")
            }
        }

        # Khối Proxy chạy ngầm chỉ khi Token hợp lệ
        location @proxy {
            # Bắt buộc khai báo DNS Resolver để phân giải tên miền của Real-Debrid chống lỗi 502
            resolver 1.1.1.1 8.8.8.8 valid=300s;
            proxy_pass $target_url;
            
            # Giấu IP, truyền đúng Host cho Real-Debrid
            proxy_set_header Host $proxy_host;
            proxy_set_header User-Agent 'pChill-Premium-Streamer';
            
            # Gửi Range Request để cho phép tua phim mượt
            proxy_set_header Range $http_range;
            proxy_set_header If-Range $http_if_range;

            # Xóa các header nội bộ của Nginx làm sai lệch streaming
            proxy_hide_header Content-Disposition;
            
            # Không được redirect (RD có thể ném 302 về CDN)
            proxy_intercept_errors off;
        }
    }
}
```

### 3. Trên Backend Node.js của pChill:
Bạn chỉ cần thêm vào file `.env` của thư mục `server/`:
```env
NGINX_PROXY_URL=http://your-nginx-vps-ip:80
NGINX_JWT_SECRET=YOUR_SUPER_SECRET_KEY_HERE
```
Vậy là hoàn tất vòng lặp an toàn!
