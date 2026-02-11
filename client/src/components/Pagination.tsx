'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePageChange = (page: number) => {
        if (page < 1 || page > totalPages) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());

        router.push(`/search?${params.toString()}`);
    };

    if (totalPages <= 1) return null;

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + maxVisible - 1);

        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const pages = getPageNumbers();

    return (
        <div className="flex items-center justify-center gap-2 mt-12">
            <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-surface-800 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {pages[0] > 1 && (
                <>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        className={`bg-surface-800 border-white/10 text-white hover:bg-white/10`}
                    >
                        1
                    </Button>
                    {pages[0] > 2 && <span className="text-gray-500">...</span>}
                </>
            )}

            {pages.map((page) => (
                <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={`
                        ${currentPage === page
                            ? 'bg-primary text-black hover:bg-primary/90 border-primary'
                            : 'bg-surface-800 border-white/10 text-white hover:bg-white/10'}
                        min-w-[40px]
                    `}
                >
                    {page}
                </Button>
            ))}

            {pages[pages.length - 1] < totalPages && (
                <>
                    {pages[pages.length - 1] < totalPages - 1 && <span className="text-gray-500">...</span>}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        className={`bg-surface-800 border-white/10 text-white hover:bg-white/10`}
                    >
                        {totalPages}
                    </Button>
                </>
            )}

            <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-surface-800 border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    );
}
