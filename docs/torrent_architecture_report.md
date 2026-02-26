# Báo cáo Kiến trúc: Hệ thống Streaming Torrent Premium (pChill)

Tài liệu này tổng hợp toàn bộ logic, các quyết định chuyển đổi kiến trúc và giải pháp kỹ thuật cuối cùng cho tính năng xem phim chất lượng cao (Torrent/4K) dành cho người dùng VIP trên hệ thống pChill.

---

## 1. Bối cảnh & Mục tiêu ban đầu
**Mục tiêu:** Cung cấp nguồn phim chất lượng gốc (4K HDR, Remux) cho gói Premium mà không làm quá tải chi phí lưu trữ và băng thông của máy chủ pChill.
**Ý tưởng ban đầu:** Sử dụng **WebTorrent (P2P streaming)** để người xem tự chia sẻ băng thông cho nhau ngay trên trình duyệt.

### ❌ Sự sụp đổ của lý thuyết P2P (WebTorrent)
Qua phân tích thực tế, giải pháp P2P trên nền web bộc lộ các yếu điểm "chí mạng":
1. **Tử huyệt iOS/Safari:** Apple kiểm soát rất chặt WebRTC. iPhone xem torrent trên trình duyệt sẽ bị ngắt kết nối liên tục, giật lag và không ổn định.
2. **Trải nghiệm người dùng cực tệ:** Thiết bị của người xem phải hoạt động hết công suất (vừa tải phim về, vừa chia sẻ lên mạng) dẫn đến nóng máy, hao pin tụt dốc không phanh.
3. **Bài toán "Mồi nước" (Cold Start):** Nhược điểm cốt lõi của torrent là nếu phim cũ không có ai seed, phim sẽ không chạy. Để khắc phục, Server pChill phải tự đứng ra làm "WebSeed", hệ quả là Server vẫn tốn băng thông -> Đi ngược lại mục tiêu ban đầu.

---

## 2. Bước ngoặt 1: Chuyển hướng sang "Động cơ" Real-Debrid
Thay vì để hàng ngàn người dùng chắp vá băng thông cho nhau, chúng ta quyết định thuê một "Gã khổng lồ" đứng ra tải hộ: **Real-Debrid (RD)**. 

### ✅ Cơ chế hoạt động của Real-Debrid
Máy chủ RD có đường truyền hàng trăm Gbps, nó chuyên "kéo" các file Torrent trên mạng về máy chủ của nó với tốc độ ánh sáng và sinh ra một **Direct Link (Link tải/stream HTTP trực tiếp)**.
*   *Lợi thế キャッシュ (Cache):* 99% phim rạp, phim hot đều đã được người dùng khác trên luồng toàn cầu tải về máy chủ RD. Do đó, RD đã có sẵn file tĩnh. Tốc độ khởi tạo luồng gần như là **TỨC THÌ (Instant)**.

### ❓ Nút thắt cổ chai ở máy chủ Node.js (Vấn đề Lead Dev lo ngại)
Nếu chúng ta lấy Direct Link từ RD, **ai sẽ là người truyền link đó cho người xem?**
*   **Sai lầm phổ biến:** Server Node.js tải luồng từ RD về (Proxy/Pipe), rồi trả cho Client.
    *   *Hậu quả:* Băng thông server sập tức khắc (100 người x 10GB = 1TB băng thông/giờ). RAM tràn gây crash. Không xử lý được Header `Range` khiến người xem không thể tua phim.
*   **Giải pháp sơ bộ (Client-Direct Stream):** Trả thẳng Direct Link của RD về cho giao diện web (Client). Video Player của người dùng sẽ kết nối thẳng vào RD để xem phim.
    *   *Kết quả:* Server Node.js hoàn toàn rảnh rỗi (Băng thông = 0).

---

## 3. Bước ngoặt 2: Những lỗ hổng chết người của Cloudflare Worker

Giải pháp sử dụng Cloudflare Worker làm Serverless Proxy ban đầu tưởng chừng hoàn hảo, nhưng thực tế chứa 3 lỗ hổng cấu trúc "chí mạng" sẽ đánh sập hệ thống pChill trong vài ngày:

1.  **Bẫy IP Động của CF (Real-Debrid Ban):** Cloudflare Edge Server liên tục thay đổi IP. Nếu 100 user xem, request chia ra hàng tá IP CF khác nhau ➔ AI của Real-Debrid lập tức khóa vĩnh viễn tài khoản.
2.  **Lỗ hổng "Open Proxy":** Việc truyền link trần `?url=rd.com/...` phơi bày toàn bộ dữ liệu. Bất kỳ kẻ nào cũng có thể đổi tham số để dùng Worker của pChill stream lậu nội dung khác, làm cạn kiệt tài khoản CF.
3.  **Vi phạm Terms of Service (ToS):** Cloudflare cấm dùng bộ đệm CDN miễn phí của họ để stream Video dung lượng lớn (Non-HTML content). Đẩy hàng TB qua Worker sẽ khiến domain bị khóa (Abuse/Ban) lập tức.

---

## 4. Kiến trúc Tối thượng: Dedicated Nginx Streaming Proxy + JWT

Để phá vỡ cả 2 bài toán (Không tải nặng Server API Node.js & Không bị khóa tài khoản Real-Debrid / Cloudflare), chúng ta dời phần Stream sang một máy chủ **Nginx Proxy độc lập** (Ví dụ: VPS 1Gbps / 10Gbps giá rẻ tại Hetzner/OVH) và bảo mật luồng bằng **JWT (JSON Web Token)**.

**Luồng Streaming Hoàn Hảo (Mô hình mới):**
1. **App (Khách):** Bấm xem phim 4K (gửi Magnet link).
2. **Node.js (Server API pChill):** Gọi API Real-Debrid ➔ Nhận về `Direct Link`.
3. **Node.js (Server API pChill):** Mã hóa cái link đó vào một chuỗi Token **JWT** với thời hạn ngắn (VD: 6 tiếng).
4. **Node.js (Server API pChill):** Trả về URL của Nginx Proxy (Ví dụ: `https://stream.pchill.com/play?token=eyJhbG...`).
5. **App (Khách):** Trình phát Vidstack lấy URL đó để chạy. Trình duyệt gửi request tới Nginx Proxy.
6. **Nginx Proxy (Máy chủ ảo chuyên biệt - Trực tiếp DNS không qua CF):** 
    - Nhận request, dùng mã secret kết hợp Nginx-lua script để giải mã JWT rẽ nhánh lấy `Direct Link`.
    - Gọi đến máy chủ Real-Debrid (Với **duy nhất 1 IP tĩnh** của Nginx VPS).
    - Proxy trả luồng dữ liệu về cho Khách qua cơ chế chunking/range hoàn hảo.

**Kết quả Tuyệt Đối:**
*   **RD an toàn 100%:** Real-Debrid chỉ nhìn thấy 1 IP duy nhất của máy chủ VPS.
*   **Bảo mật 100%:** Luồng link ẩn sau lớp JWT, không ai có thể lấy Nginx Proxy của pChill làm trạm trung chuyển lậu. Hết hạn token là link "cháy".
*   **Không vi phạm ToS:** Tên miền phụ `stream.pchill.com` sẽ được tắt Dấu mây màu cam (DNS Only) trên Cloudflare để không đi qua proxy của CF, máy chủ tự xử lý hoàn toàn.
*   **Chi phí cực nhỏ:** Máy chủ Nginx Proxy có thể xử lý luồng 1Gbps rất dễ dàng với lượng RAM vô cùng thấp (dưới 1GB RAM) do cấu trúc tối ưu của Nginx.

---

## 4. Trải nghiệm người dùng: Vidstack Video Player
Để tận dụng tối đa chất lượng cao cấp này, hệ thống sử dụng **Vidstack** (thay vì Artplayer) cho tập khách hàng VIP.

### 🌟 Phân luồng logic đa cấp
Trang `WatchPage` của pChill hiện tại thực hiện logic định tuyến người dùng cực kỳ thông minh:
*   **Tài khoản FREE:** Nhận được nguồn phim HLS m3u8 thông thường hoặc Embed iFrame rẻ tiền từ nguồn bên ngoài.
*   **Tài khoản PREMIUM:** Trình phát Vidstack "xịn sò" được triệu hồi. Nút bấm mang tên "PREMIUM 4K - TORRENT" xuất hiện.

### Các tính năng "Ăn tiền" của Vidstack Player cho Premium:
1. **Truyền hình lên TV (Cast & AirPlay):** Hỗ trợ đúc phim thẳng lên Smart TV thông qua Google Chromecast và Apple AirPlay chỉ với 1 nút bấm (điều mà phim lậu thông thường rất khó làm).
2. **Mượt mà trên iOS:** Giao diện tối ưu cực tốt cho màn hình "tai thỏ" PWA trên thiết bị Apple. CSS được cấu hình chống "bôi đen nhầm" (user-select: none).
3. **Dịch thuật:** Giao diện 100% tiếng Việt từ cài đặt chất lượng đến phụ đề.
3. **Seamless Fallback:** Nếu link RD gặp trục trặc, trình phát tự động nhận diện và tụt xuống nguồn chiếu độ phân giải HD (HLS) để phim không bao giờ bị dừng giữa chừng.

---

## 5. Tinh chỉnh Thực chiến & Vá Cấu trúc (Reality Check & Red Team Fix)

Dù Nginx Proxy là kiến trúc hoàn hảo, nhưng trong môi trường chạy thật (quy mô hàng trăm người), hệ thống được cấu hình bổ sung các yếu tố bảo mật và vật lý sống còn sau để không bị "đột tử":

1. **Khắc phục Lỗi 403 (IP Binding của Real-Debrid) & Độc tài API Key:** Backend Node.js KHÔNG GỌI lệnh `unrestrictLink`, cũng KHÔNG ĐÍNH KÈM API thật vào Token JWT. Node.js sinh JWT chỉ chứa **Chỉ mục API Key ID (`rd_key_0`)** và Restricted Link. Nginx Lua sử dụng một Dictionary ánh xạ ngầm nội bộ biến `rd_key_0` thành Key thật, rồi tự gọi HTTP Request tới RD để sinh Direct Link.
2. **Xử lý Hiệu ứng Domino khi 1 API Key chết (Dead Letter/Fallback):** Nếu RD trở chứng khóa API hoặc Sập server cục bộ, Script Lua được bọc bẫy lỗi và tự động trả về `HTTP 424 Failed Dependency` (thay vì 500 nổ tung máy chủ). Frontend nhận 424 sẽ âm thầm gọi Node.js xin cấp JWT mới từ một `rd_key_1` khác dự phòng, hệ thống tự động vá mà User không hay biết.
3. **Chống hiệu ứng "Slow Loris" bằng Đệm RAM:** Hệ thống sử dụng cấu hình tĩnh đệm RAM (`proxy_buffering on`, `proxy_buffers 32 64k`) và tuyệt đối cấm đệm đĩa (`proxy_max_temp_file_size 0`) để xả socket sớm cho khách mạng chậm.
4. **Chống bão Spam API bằng Lua Shared Dictionary (In-Memory Cache):** Nginx cấu trúc 1 vùng nhớ chia sẻ `lua_shared_dict rd_cache 10m;`. Khi link được sinh ra, nó được ngầm lưu trong RAM Nginx 4 Tiếng. Các lệnh tua phim (Range Bytes) sau đó tốn 0 mili-giây và 0 API Request.
5. **Chống lạm dụng API bằng Node.js Sticky Session (Load Balancing Tối Tượng):** Thống nhất tải bằng JWT Router phi tập trung. Node.js sử dụng thuật toán **Consistent Hashing MD5** băm chuỗi `(User._id + Magnet_Link)` để gán cứng khách hàng vào 1 định danh Nginx cố định (Tạo ra mộc định danh `proxy_node_1` khảm vào JWT). Các truy vấn tua phim sau đó sẽ mãi mãi dính chặt (Sticky) với Server này, RAM Cache Nginx đảm bảo gánh trọn 1 bộ phim cho 1 người/lần xem.
6. **Cứu nguy tính năng Cast TV Tuyệt đối (JWT + Cookie Exchange):** Giải quyết triệt để lỗi "bấm tua phim sau 60s bị văng do JWT hết hạn" trên SmartTV. JWT Cast Token sống 60 giây dùng để chọc thủng rào Check IP. Khi TV bắt tay thành công trong 60 giây đó, Nginx gửi kèm mệnh lệnh `Set-Cookie: cast_session=Hash_Của_TV; Max-Age=21600` (Sống 6 tiếng). Mọi Request tua phim sau đó dù JWT chết nghểnh, Nginx vẫn duyệt luồng thông qua Cookie Hash đã được niêm phong cho TV đó.
7. **Bắt buộc phân giải tên miền Nginx HTTP:** Block `@proxy` trên Nginx sử dụng biến động để truyền Download Link. Gắn chết `resolver 1.1.1.1 8.8.8.8 valid=300s;` báo cho Nginx biết định tuyến RD.
8. **Chiến lược Băng thông (ToS Violation Prevention):** pChill giới hạn mỗi VPS Nginx chỉ gánh tối đa **10-15 luồng 4K (Khoảng 400Mbps)**. Load balancer Node.js sẽ lo cân và đẩy tải sang các cụm VPS khác theo chiều ngang.

---

## 6. Tổng kết
Việc kết hợp **(Real-Debrid Account Rotation) + (Nginx Proxy 1Gbps RAM-Buffering) + (Vidstack)** đã biến bài toán Streaming P2P rủi ro cao thành một cỗ máy kiếm tiền tự động. pChill giờ đây sở hữu hạ tầng xem phim 4K không độ trễ, không tốn băng thông, an toàn chống rò rỉ IP, mang lại giá trị hoàn toàn vượt trội để chốt sales gói cước Premium. 

---

## 7. Quản trị Rủi ro & Tầm nhìn Mở rộng (Reality Check & Scaling)
Dù hệ thống hiện tại là một "cỗ máy in tiền," ở góc độ DevOps, hệ thống cần được lường trước 3 rủi ro sống còn khi tiến hành Scale-up lên hàng ngàn CCU:

1. **Rủi ro Khóa tài khoản Real-Debrid hàng loạt:** 
   - *Nguy cơ:* RD có thể thay đổi chính sách API, bắt chặt IP Host cấp doanh nghiệp hoặc khóa toàn bộ Account Pool do lưu lượng bất thường.
   - *Giải pháp Dự phòng:* Xây dựng cronjob tự động Health-Check tài khoản. Linh hoạt fallback sang hệ thống Debrid dự bị (như Premiumize, AllDebrid, Offcloud) nếu RD ngừng cung cấp dịch vụ diện rộng.
2. **Ngẽn cổ chai RAM tại Nginx (OOM - Out of Memory):**
   - *Nguy cơ:* Đệm RAM siêu tốc (RAM-Buffering) là con dao hai lưỡi. Với 1000 CCU kéo phim 4K, việc cache không kiểm soát sẽ gây tràn RAM vật lý và làm sụp đổ toàn bộ Node proxy (Crash).
   - *Giải pháp Dự phòng:* Khống chế dung lượng đệm tối đa mỗi Session qua chỉ số `proxy_buffer_size` và `proxy_buffers`. Giám sát (Monitor) chặt chẽ mức tiêu thụ Memory của Nginx qua Zabbix/Prometheus để cảnh báo ngay khi chạm mốc 80% RAM.
3. **Giới hạn Băng thông Vật lý:**
   - *Nguy cơ:* Cổng 1Gbps chỉ là con số lý thuyết. Mỗi luồng 4K đẩy 20-50Mbps, đồng nghĩa với việc 1 Node (giá rẻ) chỉ gánh được ~30 CCU cực đại trước khi bị bóp nghẽn.
   - *Giải pháp Dự phòng:* Sẵn sàng Kịch bản Scale-Out (Nhân bản theo chiều ngang) Nginx ra nhiều VPS. Khi đạt tới một mức lợi nhuận cận biên, hệ thống Node.js sẽ thực thi Load Balancer lên một cụm Server hùng hậu, hoặc chuyển dịch thuê máy chủ Dedicated 10Gbps unmetered riêng biệt phục vụ cho nhu cầu cực cao.

