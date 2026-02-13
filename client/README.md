This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## PWA Features (Premium Only)

Ứng dụng hỗ trợ Progressive Web App (PWA) với các tính năng cao cấp dành riêng cho thành viên Premium:

1.  **Cài đặt App**: Đưa ứng dụng lên màn hình chính, trải nghiệm như app native.
2.  **Offline Mode**: Xem lại danh sách phim, favorites, lịch sử xem khi không có mạng.
3.  **Push Notifications**: Nhận thông báo khi có tập mới hoặc phim mới.
4.  **Share Target**: Chia sẻ link phim từ app khác trực tiếp vào ứng dụng.
5.  **Background Sync**: Đồng bộ tiến độ xem phim khi có mạng trở lại.

### Cài đặt môi trường phát triển

Để test PWA đầy đủ, bạn cần:

1.  **Chạy trên HTTPS**: Service Worker và PWA features yêu cầu HTTPS.
    *   Development: `http://localhost:3000` được coi là secure context.
    *   Testing trên điện thoại: Cần dùng `ngrok` hoặc deploy lên Cloudflare Pages.

2.  **Cấu hình VAPID Keys (Push Notifications)**:
    *   Chạy `cd server && node scripts/generate_vapid.js` để tạo keys.
    *   Thêm keys vào file `.env` ở server:
        ```
        VAPID_PUBLIC_KEY=...
        VAPID_PRIVATE_KEY=...
        VAPID_EMAIL=mailto:admin@yourdomain.com
        ```
    *   Khởi động lại server backend.

3.  **Testing Share Target**:
    *   Chỉ hoạt động khi app đã được cài đặt (Installed PWA).
    *   Trong Android: Chia sẻ link phim bất kỳ -> Chọn app Film -> Tự động mở phim.

4.  **Testing Offline**:
    *   Mở DevTools -> Network -> Chọn "Offline".
    *   Navigate các trang đã cache (Home, Favorites).

### Cloudflare Pages Note

Khi deploy lên Cloudflare Pages, file `sw.js` và `workbox-*.js` cần được serve với header `Service-Worker-Allowed: /`. File `public/_headers` đã được cấu hình sẵn cho việc này.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
