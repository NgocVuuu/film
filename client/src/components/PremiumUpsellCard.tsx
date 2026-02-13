'use client';

import { Crown, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface PremiumUpsellCardProps {
  feature: string;
  compact?: boolean;
}

export function PremiumUpsellCard({ feature, compact = false }: PremiumUpsellCardProps) {
  if (compact) {
    return (
      <div className="p-4 rounded-xl bg-linear-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Crown className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-yellow-400">Tính năng Premium</h3>
            <p className="text-xs text-gray-400">{feature} chỉ dành cho Premium</p>
          </div>
        </div>
        <Link href="/pricing">
          <Button className="w-full bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black text-xs h-9 font-bold shadow-lg">
            Nâng cấp Premium
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl bg-linear-to-br from-yellow-500/10 to-orange-500/5 border border-yellow-500/30 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Crown className="w-20 h-20 text-yellow-500" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-yellow-500/20 rounded-xl">
            <Crown className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-yellow-400">Tính năng Premium</h3>
            <p className="text-xs text-gray-400">Độc quyền cho thành viên Premium</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-white font-medium">{feature}</p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <span>Cài đặt app lên màn hình chính</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <span>Xem phim offline không cần mạng</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <span>Nhận thông báo phim mới</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
              <span>Trải nghiệm app-like không quảng cáo</span>
            </li>
          </ul>
        </div>

        <Link href="/pricing">
          <Button className="w-full bg-linear-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-bold h-11 shadow-lg group/btn transition-all">
            <span>Nâng cấp Premium ngay</span>
            <ChevronRight className="w-5 h-5 ml-1 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </Link>

        <p className="text-center text-xs text-gray-500 mt-3">
          Chỉ từ 30.000đ/tháng
        </p>
      </div>
    </div>
  );
}
