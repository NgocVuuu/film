'use client';
import StaticPage from '@/components/StaticPage';

export default function PrivacyPage() {
    return (
        <StaticPage
            title="Chính sách bảo mật"
            content={
                <div className="space-y-4">
                    <p>Chúng tôi tôn trọng quyền riêng tư của bạn. Dưới đây là cách chúng tôi xử lý thông tin:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li><strong>Thông tin thu thập:</strong> Email, tên hiển thị (khi đăng nhập), lịch sử xem phim (để đồng bộ tiến độ).</li>
                        <li><strong>Bảo mật:</strong> Mật khẩu của bạn được mã hóa hoàn toàn. Chúng tôi không chia sẻ thông tin cá nhân với bên thứ ba.</li>
                        <li><strong>Cookies:</strong> Website sử dụng cookies để lưu trạng thái đăng nhập và cài đặt cá nhân.</li>
                    </ul>
                </div>
            }
        />
    );
}
