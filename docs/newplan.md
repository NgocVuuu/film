Read URL: https://docs.google.com/document/d/1b1oZWi_dntp3iX9--KpmfJI6xLbxkk16YHqImCxcL2g/export?format=txt

Đọc được rồi! Để tôi đọc hết tài liệu:

Đọc được toàn bộ! Đây là tài liệu rất chi tiết. Tóm tắt nội dung chính:

---

## 📄 Nội dung tài liệu: "Kế hoạch Cải cấu trúc Mã nguồn và Tích hợp Hệ thống Phát Video 4K qua Kiến trúc Debrid/Reverse Proxy"

Đây là một **bản thiết kế kiến trúc kỹ thuật đầy đủ** cho pchill.online, bao gồm:

### 🏗️ Kiến trúc đề xuất
- **Bỏ WebTorrent/P2P** → thay bằng **Real-Debrid API** làm nguồn phim
- **MediaFlow Proxy** làm tầng trung gian — rewrite M3U8 segments, che IP user khỏi Debrid
- **5-7 VPS offshore 1Gbps** (DMCA-Ignored tại Hà Lan/Romania/Iceland) tạo cụm proxy phân tán = 5Gbps tổng

### 💡 Giải quyết các giới hạn Debrid
- Real-Debrid giới hạn **1.57TB/24h/tài khoản** → dùng **pool 8-10 tài khoản** luân phiên (Least-Used algorithm)
- Toàn bộ request đi qua IP proxy → Debrid thấy là "nhiều account cùng IP" (hợp lệ theo ToS)

### 📊 CCU & Băng thông
- 4K Remux: ~100 Mbps/người → **10Gbps port phục vụ ~80 CCU 4K**
- Mix 30% 4K + 70% 1080p → **~200 CCU với 5Gbps tổng (5 VPS 1Gbps)**

### 💰 Chi phí OPEX/tháng (200 CCU)
| Hạng mục | Chi phí |
|----------|---------|
| 5 VPS proxy offshore 1Gbps | $100-150 |
| Backend VPS (API + DB) | $40-70 |
| 8 tài khoản Real-Debrid | $25-30 |
| DNS, domain offshore | $10-25 |
| **Tổng** | **$175-275/tháng** |

### 💸 Chiến lược giá
- **Gói Standard 1080p**: 45,000 VNĐ/tháng
- **Gói Premium 4K**: 89,000 VNĐ/tháng (chỉ 1/3 Netflix 4K = 273k VNĐ)
- Breakeven: chỉ cần **105 subscribers** để cover OPEX
- 1,000 subscribers → lợi nhuận ròng hàng chục triệu/tháng

### 📅 Lộ trình 4 tuần
1. **Tuần 1-2**: Bỏ WebTorrent, tích hợp Real-Debrid API + Zilean/Prowlarr để tìm hash
2. **Tuần 3**: Docker hóa MediaFlow Proxy, deploy 5 VPS, cân bằng tải
3. **Tuần 4**: Nâng cấp HLS.js player (tăng `maxBufferLength` lên 60-120s cho 4K)

---

Đây là tài liệu mà bạn đã nghiên cứu cho **nhánh torrent** đang phát triển đúng không? Bạn muốn bắt đầu implement phần nào trước?