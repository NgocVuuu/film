# Hướng dẫn cài đặt & cấu hình

## Yêu cầu hệ thống

| Thành phần | Phiên bản |
|---|---|
| Node.js | >= 20 |
| npm | >= 10 |
| MongoDB | Atlas (cloud) hoặc local >= 7 |

---

## Cấu trúc project

```
/
├── client/     ← Next.js 15 frontend (deploy lên Vercel/Cloudflare Pages)
├── server/     ← Express.js backend  (deploy lên Railway/Render/VPS)
└── cloudflare-worker/  ← Worker tùy chọn (stream proxy)
```

---

## Bước 1 — Cấu hình Server (`server/`)

```bash
cd server
cp .env.example .env
npm install
```

Mở `server/.env` và điền các giá trị:

### MongoDB
- **Local:** `MONGO_URI=mongodb://localhost:27017/myapp`
- **Atlas (khuyến nghị):** Tạo cluster miễn phí tại [mongodb.com](https://mongodb.com), copy connection string

### JWT Secret
Tạo bằng lệnh:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Google OAuth
1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project → APIs & Services → Credentials → OAuth 2.0 Client ID
3. Authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
4. Copy **Client ID** vào `GOOGLE_CLIENT_ID`

### Firebase (Push Notification + Phone Auth)
1. Vào [Firebase Console](https://console.firebase.google.com) → Project Settings → Service Accounts
2. Click **Generate new private key** → download file JSON
3. Mở file JSON, copy toàn bộ nội dung lên **1 dòng** (dùng [json minifier](https://jsonformatter.org/json-minify))
4. Paste vào `FIREBASE_SERVICE_ACCOUNT=`

### Web Push (VAPID)
```bash
node scripts/generate_vapid.js
```
Copy `publicKey` và `privateKey` vào `.env`

### Email (Resend)
1. Đăng ký tại [resend.com](https://resend.com) (miễn phí 3000 email/tháng)
2. Verify domain → lấy API key → điền `RESEND_API_KEY`

### TMDB API (metadata phim)
1. Đăng ký tại [themoviedb.org](https://www.themoviedb.org/settings/api)
2. Lấy **API Key (v3)** → điền `TMDB_API_KEY`

### Thanh toán SePay (tùy chọn)
1. Đăng ký tại [sepay.vn](https://sepay.vn)
2. Tạo webhook → lấy API key

### Chạy server
```bash
npm start
# hoặc development:
npm run dev
```

---

## Bước 2 — Cấu hình Client (`client/`)

```bash
cd client
cp .env.example .env.local
npm install
```

Mở `client/.env.local` và điền:

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL server, vd: `https://api.yourdomain.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Cùng Client ID ở trên |
| `NEXT_PUBLIC_FIREBASE_*` | Lấy từ Firebase Console → Project Settings → General → Your apps |

### Quảng cáo Adsterra (tùy chọn)
- Đăng ký [Adsterra](https://adsterra.com) → My Sites → Add Site → tạo Ad Units
- Điền các script URL vào `NEXT_PUBLIC_AD_*_SCRIPT`
- Để trống = không hiện quảng cáo (chỉ hiện placeholder màu xám)

### Build & chạy
```bash
npm run build
npm start
# hoặc development:
npm run dev
```

---

## Bước 3 — Cấp quyền Admin

Sau khi đăng nhập bằng tài khoản email muốn làm admin:

```bash
cd server
# Mở scripts/make_admin.js, thay email, rồi chạy:
node scripts/make_admin.js
```

Hoặc điền email vào `ADMIN_EMAILS` trong `.env` (tự động cấp admin khi login lần đầu).

---

## Bước 4 — Deploy

### Client → Vercel (khuyến nghị)
1. Push code lên GitHub
2. Import repo vào Vercel
3. Set biến môi trường trong Vercel Dashboard
4. Deploy tự động khi push code

### Server → Railway (khuyến nghị)
1. Push code (`server/`) lên GitHub
2. Tạo service trên [railway.app](https://railway.app)
3. Set biến môi trường → Deploy
4. Lấy public URL → điền vào `NEXT_PUBLIC_API_URL` của client

### Server → VPS (Ubuntu)
```bash
git clone <repo> && cd server
npm install --production
# Dùng PM2:
npm install -g pm2
pm2 start server.js --name myapp
pm2 save && pm2 startup
```

---

## Tùy chỉnh thương hiệu

| File | Thứ cần sửa |
|---|---|
| `client/src/app/layout.tsx` | Tên app, description, metadataBase URL |
| `client/src/app/sitemap.ts` | `BASE_URL` |
| `client/src/app/robots.ts` | Sitemap URL |
| `client/src/app/(static)/contact/page.tsx` | Email liên hệ |
| `client/src/app/(static)/dmca/page.tsx` | Email DMCA |
| `client/src/app/(static)/privacy/page.tsx` | Email privacy |
| `client/public/manifest.json` | App name, icons |
| `client/public/icons/` | **Thay toàn bộ icon** (icon-72 đến icon-512, PWA icons) |
| `client/public/logo.png` + `logo.jpg` | **Thay logo chính** |
| `client/public/favicon.ico` | **Thay favicon** |
| `client/src/app/icon.png` | **Thay app icon** (dùng cho tab trình duyệt) |
| `client/src/app/apple-icon.png` | **Thay icon iOS** |
| `client/src/app/opengraph-image.png` | **Thay ảnh share OG** (hiện khi share link lên mạng XH) |

> **Lưu ý:** Toàn bộ icon/logo mặc định là placeholder. Bạn cần thay bằng logo/icon thương hiệu của mình trước khi deploy.

---

## Câu hỏi thường gặp

**Q: Dữ liệu phim lấy từ đâu?**  
A: API TMDB + crawler tự động (xem `server/crawler.js`). Cần TMDB API key.

**Q: Có hỗ trợ không?**  
A: Source bán không kèm hỗ trợ cài đặt. Đọc kỹ hướng dẫn trước khi mua.

**Q: Có thể dùng thương mại không?**  
A: Được, nhưng không được resell source gốc.
