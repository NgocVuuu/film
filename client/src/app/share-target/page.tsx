'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Share2, Film } from 'lucide-react';

function ShareTargetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Đang xử lý...');

  useEffect(() => {
    const processSharedData = async () => {
      try {
        // Get shared data from URL params
        const url = searchParams.get('url');
        const text = searchParams.get('text');

        if (!url && !text) {
          setStatus('error');
          setMessage('Không có dữ liệu được chia sẻ');
          setTimeout(() => router.push('/'), 2000);
          return;
        }

        // Try to extract movie information from URL or text
        const sharedContent = url || text || '';
        
        // Pattern 1: Direct movie slug (e.g., /movie/avatar-2009)
        const slugMatch = sharedContent.match(/\/movie\/([a-z0-9-]+)/i);
        
        // Pattern 2: Movie ID (e.g., movie=123abc)
        const idMatch = sharedContent.match(/movie[=\/]([a-z0-9-]+)/i);
        
        // Pattern 3: Search for movie title in text
        const titleMatch = sharedContent.match(/phim[:\s]+([^,.\n]+)/i);

        if (slugMatch) {
          // Direct movie slug found
          const slug = slugMatch[1];
          setStatus('success');
          setMessage('Đã tìm thấy phim! Đang chuyển hướng...');
          setTimeout(() => router.push(`/movie/${slug}`), 1000);
        } else if (idMatch) {
          // Movie ID found
          const id = idMatch[1];
          setStatus('success');
          setMessage('Đã tìm thấy phim! Đang chuyển hướng...');
          setTimeout(() => router.push(`/movie/${id}`), 1000);
        } else if (titleMatch) {
          // Movie title found in text, search for it
          const title = titleMatch[1].trim();
          setStatus('success');
          setMessage(`Đang tìm kiếm: ${title}...`);
          setTimeout(() => router.push(`/?search=${encodeURIComponent(title)}`), 1000);
        } else if (sharedContent.length > 0) {
          // Fallback: search for the entire text
          const searchQuery = sharedContent.substring(0, 100); // Limit length
          setStatus('success');
          setMessage('Đang tìm kiếm phim...');
          setTimeout(() => router.push(`/?search=${encodeURIComponent(searchQuery)}`), 1000);
        } else {
          // No recognizable data
          setStatus('error');
          setMessage('Không thể xác định phim từ dữ liệu được chia sẻ');
          setTimeout(() => router.push('/'), 2000);
        }
      } catch (error) {
        console.error('Error processing shared data:', error);
        setStatus('error');
        setMessage('Có lỗi xảy ra khi xử lý dữ liệu');
        setTimeout(() => router.push('/'), 2000);
      }
    };

    processSharedData();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-deep-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 mb-6 animate-pulse">
              <Share2 className="w-10 h-10 text-primary" />
            </div>
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-white mb-2">
              Đang xử lý dữ liệu được chia sẻ
            </h1>
            <p className="text-gray-400">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
              <Film className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              Thành công!
            </h1>
            <p className="text-gray-400">{message}</p>
            <div className="mt-6">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 mb-6">
              <Share2 className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">
              Oops!
            </h1>
            <p className="text-gray-400 mb-6">{message}</p>
            <p className="text-sm text-gray-500">
              Đang chuyển về trang chủ...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-deep-black flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }
    >
      <ShareTargetContent />
    </Suspense>
  );
}
