'use client';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from './ui/button';
import { Film, Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface RequestMovieButtonProps {
    movieName: string;
    movieSlug?: string;
}

export default function RequestMovieButton({ movieName, movieSlug }: RequestMovieButtonProps) {
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
                    movieSlug
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
            className="bg-primary hover:bg-primary/90 text-black font-bold"
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang gửi...
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
