import React, { useState, useEffect, useRef } from 'react';
import { customFetch } from '@/lib/api';
import { Loader2, Search } from 'lucide-react';

interface SearchResult {
    name: string;
    origin_name: string;
    slug: string;
    year?: number;
    thumb_url: string;
    source: string;
}

interface SearchAutocompleteProps {
    onSelect: (movie: SearchResult, source: string) => void;
    source: string;
    slug: string;
    setSlug: (slug: string) => void;
}

export default function SearchAutocomplete({ onSelect, source, slug, setSlug }: SearchAutocompleteProps) {
    const [query, setQuery] = useState(slug);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync input with external slug changes
    useEffect(() => {
        setQuery(slug);
    }, [slug]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            if (!query.trim() || query === slug) {
                setResults([]);
                setIsOpen(false);
                return;
            }

            setIsSearching(true);
            try {
                const srcParam = source ? `&source=${source}` : '';
                const response = await customFetch(`/api/admin/crawler/search-movie?query=${encodeURIComponent(query)}${srcParam}`, {
                    credentials: 'include'
                });
                const data = await response.json();

                if (data.success && data.data) {
                    setResults(data.data);
                    setIsOpen(true);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const timeoutId = setTimeout(() => {
            fetchResults();
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [query, source, slug]);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setSlug(e.target.value); // Allow free typing of slugs anyway
                    }}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    placeholder="Nhập tên phim hoặc slug..."
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white pr-10 focus:outline-none focus:border-primary transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </div>
            </div>

            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-surface-800 border border-white/10 rounded-lg shadow-xl max-h-[300px] overflow-y-auto">
                    {results.map((movie, index) => (
                        <div
                            key={`${movie.slug}-${index}`}
                            onClick={() => {
                                setQuery(movie.slug);
                                setIsOpen(false);
                                onSelect(movie, movie.source || source);
                            }}
                            className="flex items-center gap-3 p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                        >
                            {movie.thumb_url && (
                                <img src={movie.thumb_url} alt={movie.name} className="w-10 h-14 object-cover rounded bg-white/10" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-white font-medium truncate">{movie.name}</div>
                                <div className="text-gray-400 text-xs truncate">{movie.origin_name} {movie.year ? `(${movie.year})` : ''}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase">{movie.source || source || 'OPHIM'}</span>
                                    <span className="text-xs text-gray-500 truncate">{movie.slug}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isOpen && !isSearching && results.length === 0 && query && query !== slug && (
                <div className="absolute z-50 w-full mt-1 bg-surface-800 border border-white/10 rounded-lg shadow-xl p-4 text-center text-gray-400">
                    Không tìm thấy phim phù hợp
                </div>
            )}
        </div>
    );
}
