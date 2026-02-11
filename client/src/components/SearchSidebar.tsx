'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from './ui/button';
import { ChevronDown, ChevronUp, Filter, Check } from 'lucide-react';

export function SearchSidebar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [openSection, setOpenSection] = useState<string | null>('category');

    const toggleSection = (section: string) => {
        setOpenSection(openSection === section ? null : section);
    };

    const handleFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all') {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        params.delete('page'); // Reset to page 1
        router.push(`/search?${params.toString()}`);
    };

    const isActive = (key: string, value: string) => {
        const current = searchParams.get(key);
        if (value === 'all') return !current;
        return current === value;
    };

    const filters = [
        {
            id: 'category',
            title: 'Thể loại',
            options: [
                { label: 'Tất cả', value: 'all' },
                { label: 'Hành động', value: 'hanh-dong' },
                { label: 'Tình cảm', value: 'tinh-cam' },
                { label: 'Hài hước', value: 'hai-huoc' },
                { label: 'Kinh dị', value: 'kinh-di' },
                { label: 'Tâm lý', value: 'tam-ly' },
                { label: 'Viễn tưởng', value: 'vien-tuong' },
                { label: 'Hoạt hình', value: 'hoat-hinh' },
            ]
        },
        {
            id: 'country',
            title: 'Quốc gia',
            options: [
                { label: 'Tất cả', value: 'all' },
                { label: 'Trung Quốc', value: 'trung-quoc' },
                { label: 'Hàn Quốc', value: 'han-quoc' },
                { label: 'Việt Nam', value: 'viet-nam' },
                { label: 'Thái Lan', value: 'thai-lan' },
                { label: 'Âu Mỹ', value: 'au-my' },
                { label: 'Nhật Bản', value: 'nhat-ban' },
            ]
        },
        {
            id: 'year',
            title: 'Năm phát hành',
            options: [
                { label: 'Tất cả', value: 'all' },
                { label: '2024', value: '2024' },
                { label: '2023', value: '2023' },
                { label: '2022', value: '2022' },
                { label: '2021', value: '2021' },
                { label: 'Trước 2021', value: 'old' },
            ]
        },
        {
            id: 'sort',
            title: 'Sắp xếp',
            options: [
                { label: 'Mới cập nhật', value: 'updated' },
                { label: 'Năm sản xuất', value: 'year' },
                { label: 'Lượt xem', value: 'view' },
            ]
        }
    ];

    return (
        <div className="w-full lg:w-64 flex-shrink-0 space-y-4">
            <div className="flex items-center gap-2 font-bold text-white mb-4">
                <Filter className="w-5 h-5 text-primary" />
                Bộ lọc tìm kiếm
            </div>

            {filters.map((group) => (
                <div key={group.id} className="border border-white/10 rounded-lg overflow-hidden bg-surface-900">
                    <button
                        onClick={() => toggleSection(group.id)}
                        className="w-full flex items-center justify-between p-3 text-sm font-medium text-white hover:bg-white/5 transition-colors"
                    >
                        {group.title}
                        {openSection === group.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {openSection === group.id && (
                        <div className="p-3 bg-black/20 space-y-1">
                            {group.options.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleFilter(group.id, opt.value)}
                                    className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors ${isActive(group.id, opt.value)
                                            ? 'text-primary bg-primary/10'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                        }`}
                                >
                                    {opt.label}
                                    {isActive(group.id, opt.value) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
