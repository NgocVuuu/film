'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { API_URL } from '@/lib/config';

interface CommentUser {
    _id: string;
    displayName: string;
    avatar?: string;
    role: string;
}

interface RecentComment {
    _id: string;
    content: string;
    rating?: number;
    episodeName?: string;
    createdAt: string;
    user: CommentUser;
    movie: {
        slug: string;
        name: string;
        thumb_url?: string;
    };
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    return d < 30 ? `${d} ngày trước` : `${Math.floor(d / 30)} tháng trước`;
}

function CommentChip({ comment }: { comment: RecentComment }) {
    const avatarFallback = comment.user.displayName?.[0]?.toUpperCase() ?? '?';
    const truncated = comment.content.length > 70
        ? comment.content.slice(0, 67) + '…'
        : comment.content;

    return (
        <Link
            href={`/movie/${comment.movie.slug}`}
            className="group flex flex-col gap-2 bg-white/3 hover:bg-white/6 border border-white/8 hover:border-primary/30 rounded-xl p-3 transition-all duration-200 w-44 sm:w-56 md:w-64 shrink-0 cursor-pointer"
        >
            {/* User row */}
            <div className="flex items-center gap-2">
                {comment.user.avatar ? (
                    <img
                        src={comment.user.avatar}
                        alt={comment.user.displayName}
                        className="rounded-full object-cover w-6 h-6 shrink-0"
                    />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {avatarFallback}
                    </div>
                )}
                <span className="text-xs font-semibold text-white/80 truncate flex-1">{comment.user.displayName}</span>
                {comment.rating && (
                    <span className="flex items-center gap-0.5 shrink-0">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-[11px] font-bold text-yellow-400">{comment.rating}</span>
                    </span>
                )}
            </div>

            {/* Comment text */}
            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{truncated}</p>

            {/* Movie + time */}
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-primary/70 truncate font-medium">{comment.movie.name}</span>
                <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(comment.createdAt)}</span>
            </div>
        </Link>
    );
}

function MarqueeRow({ comments, reverse = false, speed = 40 }: { comments: RecentComment[]; reverse?: boolean; speed?: number }) {
    // Duplicate for seamless loop
    const items = [...comments, ...comments];
    const duration = items.length * speed / 2;

    return (
        <div className="flex overflow-hidden mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
            <div
                className="flex gap-3 py-1"
                style={{
                    animation: `marquee${reverse ? '-reverse' : ''} ${duration}s linear infinite`,
                    willChange: 'transform',
                }}
            >
                {items.map((c, i) => (
                    <CommentChip key={`${c._id}-${i}`} comment={c} />
                ))}
            </div>
        </div>
    );
}

export function RecentComments() {
    const [comments, setComments] = useState<RecentComment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_URL}/api/comments/recent?limit=50`)
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    // Fisher-Yates shuffle — phân phối đều, không bị lệch như sort(random)
                    const shuffled = [...d.data];
                    for (let i = shuffled.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                    }
                    setComments(shuffled);
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (!loading && comments.length === 0) return null;

    // Split into 3 rows
    const third = Math.ceil(comments.length / 3);
    const row1 = comments.slice(0, third);
    const row2 = comments.slice(third, third * 2);
    const row3 = comments.slice(third * 2);

    return (
        <section className="w-full overflow-hidden">
            <style>{`
                @keyframes marquee {
                    from { transform: translateX(0); }
                    to   { transform: translateX(-50%); }
                }
                @keyframes marquee-reverse {
                    from { transform: translateX(-50%); }
                    to   { transform: translateX(0); }
                }
            `}</style>

            {/* Header */}
            <div className="flex items-center justify-between mb-5 px-4 md:px-6">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h2 className="text-lg font-bold text-white">Cộng đồng nói gì?</h2>
                </div>
                <span className="text-xs text-gray-500">{comments.length} bình luận gần đây</span>
            </div>

            {/* Skeleton */}
            {loading && (
                <div className="flex flex-col gap-3 px-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex gap-3">
                            {[1, 2, 3, 4].map(j => (
                                <div key={j} className="w-64 h-20 rounded-xl bg-white/3 border border-white/8 animate-pulse shrink-0" />
                            ))}
                        </div>
                    ))}
                </div>
            )}

            {/* Marquee rows */}
            {!loading && comments.length > 0 && (
                <div className="flex flex-col gap-3">
                    {row1.length > 0 && <MarqueeRow comments={row1} speed={26} />}
                    {row2.length > 0 && <MarqueeRow comments={row2} reverse speed={33} />}
                    {row3.length > 0 && <div className="hidden sm:block"><MarqueeRow comments={row3} speed={30} /></div>}
                </div>
            )}
        </section>
    );
}
