'use client';

import { FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';

interface EmptyStateProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    actionLink?: string;
    icon?: React.ElementType;
}

export function EmptyState({
    title = 'Chưa có dữ liệu',
    description = 'Danh sách này đang trống. Hãy khám phá thêm nội dung mới!',
    actionLabel = 'Khám phá ngay',
    actionLink = '/',
    icon: Icon = FileQuestion
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-white/5 p-4 rounded-full mb-4">
                <Icon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            <p className="text-gray-400 max-w-sm mb-6">{description}</p>
            <Link href={actionLink}>
                <Button className="bg-primary text-black hover:bg-gold-600 font-bold">
                    {actionLabel}
                </Button>
            </Link>
        </div>
    );
}
