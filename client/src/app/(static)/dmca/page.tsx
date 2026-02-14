'use client';
import StaticPage from '@/components/StaticPage';

export default function DmcaPage() {
    return (
        <StaticPage
            title="DMCA - Bản quyền"
            content={
                <div className="space-y-4">
                    <p>Pchill là website chia sẻ phim. Chúng tôi cam kết tuân thủ Đạo luật Bản quyền Kỹ thuật số Thiên niên kỷ (DMCA).</p>
                    <p>Nếu bạn là chủ sở hữu bản quyền và tin rằng nội dung của mình bị vi phạm, vui lòng liên hệ với chúng tôi để yêu cầu gỡ bỏ.</p>
                    <div className="bg-white/5 p-4 rounded-lg border border-white/10 mt-4">
                        <p className="font-bold text-white">Quy trình báo cáo:</p>
                        <ol className="list-decimal pl-5 mt-2 space-y-1">
                            <li>Gửi email đến: <strong>copyright@pchill.online</strong></li>
                            <li>Cung cấp bằng chứng sở hữu bản quyền.</li>
                            <li>Cung cấp liên kết (URL) nội dung vi phạm trên website của chúng tôi.</li>
                        </ol>
                        <p className="mt-2 text-sm">Chúng tôi sẽ xem xét và xử lý trong vòng 24-48 giờ làm việc.</p>
                    </div>
                </div>
            }
        />
    );
}
