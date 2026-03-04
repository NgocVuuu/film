'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from './ui/button';
import { Film, Loader2, CheckCircle, Crown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface RequestMovieButtonProps {
    movieName: string;
    movieSlug?: string;
    is4kRequest?: boolean;
}

export default function RequestMovieButton({ movieName, movieSlug, is4kRequest }: RequestMovieButtonProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [requested, setRequested] = useState(false);

    const handleRequest = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để yêu cầu phim');
            router.push('/login');
            return;
        }

        try {
            setLoading(true);

            const response = await customFetch(`/api/search/request`, {
                method: 'POST',
                credentials: 'include',
                body: JSON.stringify({
                    movieName,
                    movieSlug,
                    is4kRequest
                })
            });

            const data = await response.json();

            if (data.success) {
                setRequested(true);
                toast.success(data.message || 'Yêu cầu đã được ghi nhận!');
            } else {
                toast.error(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Request movie error:', error);
            toast.error('Lỗi khi gửi yêu cầu');
        } finally {
            setLoading(false);
        }
    };

    if (requested) {
        return (
            <Button
                disabled
                className="bg-green-600/20 text-green-400 border-green-400/30 cursor-not-allowed"
            >
                <CheckCircle className="w-4 h-4 mr-2" />
                Đã yêu cầu
            </Button>
        );
    }

    return (
        <Button
            onClick={handleRequest}
            disabled={loading}
            className={is4kRequest
                ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold shadow-[0_0_15px_rgba(234,179,8,0.4)]"
                : "bg-primary hover:bg-primary/90 text-black font-bold"
            }
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang gửi...
                </>
            ) : is4kRequest ? (
                <>
                    <Crown className="w-4 h-4 mr-2" />
                    Yêu cầu 4K
                </>
            ) : (
                <>
                    <Film className="w-4 h-4 mr-2" />
                    Yêu cầu thêm phim này
                </>
            )}
        </Button>
    );
}
