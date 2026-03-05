'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Check, Filter } from 'lucide-react';
import { useState } from 'react';

export function SearchSidebar() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [openSection, setOpenSection] = useState<string | null>('sort');

    const toggleSection = (section: string) => {
        const isOpening = openSection !== section;
        setOpenSection(isOpening ? section : null);

        if (isOpening) {
            setTimeout(() => {
                const element = document.getElementById(`filter-group-${section}`);
                const container = document.getElementById('filter-scroll-container');
                if (element && container) {
                    // Mobile drawer: scroll within drawer using getBoundingClientRect for accuracy
                    const drawerHeaderHeight = 68; // sticky header inside mobile drawer
                    const scrollTop = container.scrollTop + element.getBoundingClientRect().top - container.getBoundingClientRect().top - drawerHeaderHeight;
                    container.scrollTo({ top: scrollTop, behavior: 'smooth' });
                } else if (element) {
                    // Desktop: scroll the page, offset by navbar height so header stays visible
                    const navbarHeight = 72;
                    const top = element.getBoundingClientRect().top + window.scrollY - navbarHeight - 8;
                    window.scrollTo({ top, behavior: 'smooth' });
                }
            }, 100);
        }
    };

    const handleFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === 'all') {
            params.delete(key);
        } else {
            params.set(key, value);
        }
        params.delete('page');
        router.push(`/search?${params.toString()}`, { scroll: false });
    };

    const isActive = (key: string, value: string) => {
        const current = searchParams.get(key);
        if (value === 'all') return !current;
        return current === value || decodeURIComponent(current || '') === value;
    };

    // Count active filters per group (excluding sort)
    const getActiveCount = (id: string) => {
        if (id === 'sort') return 0;
        const val = searchParams.get(id);
        return val ? 1 : 0;
    };

    const currentYear = new Date().getFullYear();
    const recentYears = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i)
        .map(y => ({ label: String(y), value: String(y) }));

    const filters = [
        {
            id: 'sort',
            title: 'Sắp xếp',
            options: [
                { label: 'Mới cập nhật', value: 'updated' },
                { label: 'Năm sản xuất', value: 'year' },
                { label: 'Lượt xem nhiều nhất', value: 'view' },
            ]
        },
        {
            id: 'category',
            title: 'Thể loại',
            options: [
                { label: 'Tất cả', value: 'all' },
                { label: 'Hành động', value: 'hanh-dong' },
                { label: 'Tình cảm', value: 'tinh-cam' },
                { label: 'Hài hước', value: 'hai-huoc' },
                { label: 'Cổ trang', value: 'co-trang' },
                { label: 'Tâm lý', value: 'tam-ly' },
                { label: 'Hình sự', value: 'hinh-su' },
                { label: 'Chiến tranh', value: 'chien-tranh' },
                { label: 'Thể thao', value: 'the-thao' },
                { label: 'Võ thuật', value: 'vo-thuat' },
                { label: 'Viễn tưởng', value: 'vien-tuong' },
                { label: 'Phiêu lưu', value: 'phieu-luu' },
                { label: 'Khoa học', value: 'khoa-hoc' },
                { label: 'Kinh dị', value: 'kinh-di' },
                { label: 'Âm nhạc', value: 'am-nhac' },
                { label: 'Thần thoại', value: 'than-thoai' },
                { label: 'Tài liệu', value: 'tai-lieu' },
                { label: 'Gia đình', value: 'gia-dinh' },
                { label: 'Hoạt hình', value: 'hoat-hinh' },
                { label: 'Chiếu rạp', value: 'chieu-rap' },
                { label: 'Học đường', value: 'hoc-duong' },
                { label: 'Bí ẩn', value: 'bi-an' }
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
                { label: 'Đài Loan', value: 'dai-loan' },
                { label: 'Hồng Kông', value: 'hong-kong' },
                { label: 'Ấn Độ', value: 'an-do' },
                { label: 'Anh', value: 'anh' },
                { label: 'Pháp', value: 'phap' },
            ]
        },
        {
            id: 'year',
            title: 'Năm phát hành',
            options: [
                { label: 'Tất cả', value: 'all' },
                ...recentYears,
                { label: '2010–2019', value: '2010s' },
                { label: '2000–2009', value: '2000s' },
                { label: 'Trước 2000', value: '1990s' },
            ]
        },
    ];

    return (
        <div className="w-full lg:w-64 shrink-0 space-y-3 md:space-y-4">
            <div className="hidden lg:flex items-center gap-2 font-bold text-white mb-4">
                <Filter className="w-5 h-5 text-primary" />
                Bộ lọc tìm kiếm
            </div>

            {filters.map((group) => {
                const activeCount = getActiveCount(group.id);
                const isSort = group.id === 'sort';
                const currentSortVal = isSort ? (searchParams.get('sort') || 'updated') : null;
                const currentSortLabel = isSort
                    ? group.options.find(o => o.value === currentSortVal)?.label || 'Mới cập nhật'
                    : null;

                return (
                    <div key={group.id} id={`filter-group-${group.id}`} className="border border-white/10 rounded-lg overflow-hidden bg-surface-900 scroll-mt-4">
                        <button
                            onClick={() => toggleSection(group.id)}
                            className="w-full flex items-center justify-between p-3 text-sm font-medium text-white hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <span>{group.title}</span>
                                {isSort && currentSortLabel && (
                                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-normal">
                                        {currentSortLabel}
                                    </span>
                                )}
                                {!isSort && activeCount > 0 && (
                                    <span className="w-4 h-4 rounded-full bg-primary text-black text-[10px] font-bold flex items-center justify-center">
                                        {activeCount}
                                    </span>
                                )}
                            </div>
                            {openSection === group.id ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
                        </button>
                        {openSection === group.id && (
                            <div className="p-2 bg-black/20">
                                {isSort ? (
                                    // Sort: horizontal pill buttons
                                    <div className="flex flex-wrap gap-1.5">
                                        {group.options.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleFilter(group.id, opt.value)}
                                                className={`flex-1 min-w-fit px-3 py-1.5 text-xs rounded-lg transition-colors font-medium whitespace-nowrap ${(searchParams.get('sort') || 'updated') === opt.value
                                                    ? 'bg-primary text-black'
                                                    : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    // Other filters: list
                                    <div className="space-y-0.5">
                                        {group.options.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleFilter(group.id, opt.value)}
                                                className={`w-full flex items-center justify-between px-2 py-1.5 text-sm rounded transition-colors ${isActive(group.id, opt.value)
                                                    ? 'text-primary bg-primary/10 font-medium'
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                            >
                                                {opt.label}
                                                {isActive(group.id, opt.value) && <Check className="w-3 h-3 shrink-0" />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
