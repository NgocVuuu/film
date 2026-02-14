'use client';
import StaticPage from '@/components/StaticPage';

export default function PrivacyPage() {
    return (
        <StaticPage
            title="Chính sách bảo mật"
            content={
                <div className="space-y-6 text-gray-300">
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">1. Thu thập thông tin</h2>
                        <p>Chúng tôi chỉ thu thập thông tin cơ bản khi bạn đăng ký tài khoản (Tên hiển thị, Email) để cá nhân hoá trải nghiệm xem phim của bạn.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">2. Sử dụng thông tin</h2>
                        <p>Thông tin của bạn được sử dụng để duy trì tài khoản, ghi nhớ lịch sử xem phim và danh sách yêu thích. Chúng tôi cam kết không bán hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">3. Bảo mật dữ liệu</h2>
                        <p>Chúng tôi sử dụng các biện pháp bảo mật tiêu chuẩn (Mã hóa mật khẩu bằng bcrypt, Token JWT) để bảo vệ tài khoản của bạn khỏi truy cập trái phép.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">4. Cookies</h2>
                        <p>Chúng tôi sử dụng cookies để duy trì trạng thái đăng nhập. Bạn có thể tắt cookies trong trình duyệt, nhưng một số tính năng của website có thể không hoạt động chính xác.</p>
                    </section>
                    <section>
                        <h2 className="text-xl font-bold text-white mb-2">5. Liên hệ</h2>
                        <p>Nếu có bất kỳ câu hỏi nào về chính sách bảo mật, vui lòng liên hệ với chúng tôi qua email: support@pchill.online</p>
                    </section>
                </div>
            }
        />
    );
}
