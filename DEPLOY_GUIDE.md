# Hướng dẫn Deploy

## 1. Client (Frontend) - Deploy lên Cloudflare Pages

### Chuẩn bị
1.  Đã cài đặt `@cloudflare/next-on-pages` (đã thực hiện tự động).
2.  Đã thêm script `pages:build` vào `package.json`.
3.  File `next.config.ts` đã được cập nhật để chấp nhận ảnh từ mọi nguồn.

### Các bước thực hiện trên Cloudflare
1.  Đẩy code lên GitHub/GitLab.
2.  Vào [Cloudflare Dashboard](https://dash.cloudflare.com) -> **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
3.  Chọn repository chứa project `film`.
4.  Cấu hình Build:
    *   **Framework Preset**: Next.js
    *   **Build command**: `npm run pages:build` (hoặc `npx @cloudflare/next-on-pages`)
    *   **Build output directory**: `.vercel/output/static` (Cloudflare thường tự nhận, nhưng nếu hỏi thì điền cái này).
    *   **Root directory**: `client` (RẤT QUAN TRỌNG: vì code frontend nằm trong thư mục `client`).
5.  **Environment Variables (Biến môi trường)**:
    *   Thêm biến `NEXT_PUBLIC_API_URL`: Điền URL của server backend sau khi deploy xong (ví dụ `https://api.yourdomain.com`).
    *   `NODE_VERSION`: `18` (hoặc cao hơn).

## 2. Server (Backend) - Deploy lên VPS qua Coolify

### Chuẩn bị
1.  Đã có file `Dockerfile` trong thư mục `server`.
2.   VPS đã cài Coolify.

### Các bước thực hiện trên Coolify
1.  Tạo **Project** mới -> **New Resource** -> **Application** -> **Public Repository** (hoặc GitHub App).
2.  Điền URL repo GitHub của bạn.
3.  **Build Pack**: Chọn **Docker** (hoặc Nixpacks cũng được, nhưng Dockerfile mình đã tạo sẵn thì chọn Docker cho chắc).
4.  **Base Directory**: `/server` (RẤT QUAN TRỌNG: để Coolify biết Dockerfile nằm ở đâu).
5.  **Ports Exposes**: `5000`.
6.  **Environment Variables**:
    *   Copy toàn bộ nội dung file `server/.env` vào mục Environment Variables của Coolify.
    *   Sửa `MONGO_URI` thành connection string của MongoDB Atlas (như đã hướng dẫn).
    *   Sửa `CLIENT_URL` thành domain của frontend (Cloudflare Pages) sau khi có.
7.  **Domains**: Cấu hình domain cho server (ví dụ `api.pchill.com` hoặc `api.yourdomain.com`).
8.  Bấm **Deploy**.

### Lưu ý quan trọng
*   **MongoDB Atlas Network Access**: Nhớ vào MongoDB Atlas -> Network Access -> Add IP Address -> Chọn **Allow Access from Anywhere (0.0.0.0/0)** để server trên VPS có thể kết nối được.
*   **Google OAuth & CORS**:
    *   Sau khi có domain frontend và backend, nhớ cập nhật lại `CLIENT_URL` trong env backend.
    *   Thêm domain frontend vào `Authorized JavaScript origins` và `Authorized redirect URIs` trong Google Cloud Console.
