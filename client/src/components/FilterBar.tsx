'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';

const GENRES = [
    { label: 'Hành Động', value: 'hanh-dong' },
    { label: 'Tình Cảm', value: 'tinh-cam' },
    { label: 'Hài Hước', value: 'hai-huoc' },
    { label: 'Cổ Trang', value: 'co-trang' },
    { label: 'Tâm Lý', value: 'tam-ly' },
    { label: 'Hình Sự', value: 'hinh-su' },
    { label: 'Chiến Tranh', value: 'chien-tranh' },
    { label: 'Thể Thao', value: 'the-thao' },
    { label: 'Võ Thuật', value: 'vo-thuat' },
    { label: 'Viễn Tưởng', value: 'vien-tuong' },
    { label: 'Phiêu Lưu', value: 'phieu-luu' },
    { label: 'Khoa Học', value: 'khoa-hoc' },
    { label: 'Kinh Dị', value: 'kinh-di' },
    { label: 'Âm Nhạc', value: 'am-nhac' },
    { label: 'Thần Thoại', value: 'than-thoai' },
    { label: 'Tài Liệu', value: 'tai-lieu' },
    { label: 'Gia Đình', value: 'gia-dinh' },
    { label: 'Chính Kịch', value: 'chinh-kich' },
    { label: 'Bí Ẩn', value: 'bi-an' },
    { label: 'Học Đường', value: 'hoc-duong' },
    { label: 'Kinh Điển', value: 'kinh-dien' },
    { label: 'Phim 18+', value: 'phim-18' },
];

const COUNTRIES = [
    { label: 'Trung Quốc', value: 'trung-quoc' },
    { label: 'Hàn Quốc', value: 'han-quoc' },
    { label: 'Nhật Bản', value: 'nhat-ban' },
    { label: 'Thái Lan', value: 'thai-lan' },
    { label: 'Âu Mỹ', value: 'au-my' },
    { label: 'Việt Nam', value: 'viet-nam' },
];

const YEARS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

const STATUS = [
    { label: 'Hoàn thành', value: 'completed' },
    { label: 'Đang chiếu', value: 'ongoing' },
];

const SORT_OPTIONS = [
    { label: 'Mới cập nhật', value: 'updated' },
    { label: 'Năm phát hành', value: 'newest' },
    { label: 'Xem nhiều nhất', value: 'view' },
    { label: 'Đánh giá cao', value: 'rating' },
];

export function FilterBar() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL params
    const [filters, setFilters] = useState({
        category: searchParams.get('category') || '',
        country: searchParams.get('country') || '',
        year: searchParams.get('year') || '',
        status: searchParams.get('status') || '',
        sort: searchParams.get('sort') || 'updated',
    });

    const [isExpanded, setIsExpanded] = useState(false);

    // Update filters when URL changes (e.g. back button)
    useEffect(() => {
        setFilters({
            category: searchParams.get('category') || '',
            country: searchParams.get('country') || '',
            year: searchParams.get('year') || '',
            status: searchParams.get('status') || '',
            sort: searchParams.get('sort') || 'updated',
        });
    }, [searchParams]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...filters, [key]: value === 'all' ? '' : value };
        setFilters(newFilters);
        applyFilters(newFilters);
    };

    const applyFilters = (currentFilters: any) => {
        const params = new URLSearchParams(searchParams.toString());

        // Update params
        Object.keys(currentFilters).forEach(key => {
            if (currentFilters[key]) {
                params.set(key, currentFilters[key]);
            } else {
                params.delete(key);
            }
        });

        // Reset page to 1 on filter change
        params.set('page', '1');

        router.push(`/search?${params.toString()}`);
    };

    const clearFilters = () => {
        const params = new URLSearchParams(searchParams.toString());
        // Keep 'q' if exists (search keyword)
        const q = params.get('q');

        const resetFilters = {
            category: '',
            country: '',
            year: '',
            status: '',
            sort: 'updated',
        };

        setFilters(resetFilters);

        if (q) {
            router.push(`/search?q=${q}&sort=updated`);
        } else {
            router.push(`/search?sort=updated`);
        }
    };

    const hasActiveFilters = filters.category || filters.country || filters.year || filters.status || filters.sort !== 'updated';

    return (
        <div className="bg-surface-900/50 border border-white/5 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between mb-4 md:mb-0">
                <Button
                    variant="ghost"
                    className="md:hidden text-white mb-2"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Filter className="w-4 h-4 mr-2" />
                    Bộ lọc tìm kiếm
                </Button>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10 md:hidden"
                        onClick={clearFilters}
                    >
                        <X className="w-4 h-4 mr-1" /> Xóa lọc
                    </Button>
                )}
            </div>

            <div className={`${isExpanded ? 'grid' : 'hidden'} md:grid grid-cols-2 md:grid-cols-5 gap-3`}>
                {/* Category */}
                <select
                    className="bg-surface-800 border-white/10 text-white h-10 px-3 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                >
                    <option value="">Thể loại</option>
                    <option value="all">Tất cả thể loại</option>
                    {GENRES.map(g => (
                        <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                </select>

                {/* Country */}
                <select
                    className="bg-surface-800 border-white/10 text-white h-10 px-3 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={filters.country}
                    onChange={(e) => handleFilterChange('country', e.target.value)}
                >
                    <option value="">Quốc gia</option>
                    <option value="all">Tất cả quốc gia</option>
                    {COUNTRIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>

                {/* Year */}
                <select
                    className="bg-surface-800 border-white/10 text-white h-10 px-3 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={filters.year}
                    onChange={(e) => handleFilterChange('year', e.target.value)}
                >
                    <option value="">Năm phát hành</option>
                    <option value="all">Tất cả năm</option>
                    {YEARS.map(y => (
                        <option key={y} value={y.toString()}>{y}</option>
                    ))}
                </select>

                {/* Status */}
                <select
                    className="bg-surface-800 border-white/10 text-white h-10 px-3 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                    <option value="">Trạng thái</option>
                    <option value="all">Tất cả trạng thái</option>
                    {STATUS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>

                {/* Sort */}
                <select
                    className="bg-surface-800 border-white/10 text-white h-10 px-3 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={filters.sort}
                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                >
                    <option value="updated">Mới cập nhật</option>
                    {SORT_OPTIONS.filter(s => s.value !== 'updated').map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
            </div>

            {hasActiveFilters && (
                <div className="hidden md:flex justify-end mt-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={clearFilters}
                    >
                        <X className="w-4 h-4 mr-1" /> Xóa bộ lọc đang chọn
                    </Button>
                </div>
            )}
        </div>
    );
}
