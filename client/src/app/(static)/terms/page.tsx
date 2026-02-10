'use client';
import StaticPage from '@/components/StaticPage';

export default function TermsPage() {
    return (
        <StaticPage
            title="Điều khoản sử dụng"
            content={
                <div className="space-y-4">
                    <p>Chào mừng bạn đến với Pchill. Khi truy cập website của chúng tôi, bạn đồng ý với các điều khoản sau:</p>
                    <ul className="list-disc pl-5 space-y-2">
                        <li>Bạn phải đủ 13 tuổi trở lên để sử dụng dịch vụ này.</li>
                        <li>Không sử dụng nội dung website cho mục đích thương mại trái phép.</li>
                        <li>Chúng tôi có quyền khóa tài khoản nếu phát hiện hành vi gian lận hoặc spam.</li>
                        <li>Nội dung phim được tổng hợp từ nhiều nguồn, chúng tôi không chịu trách nhiệm về nội dung bản quyền từ bên thứ 3.</li>
                    </ul>
                </div>
            }
        />
    );
}
