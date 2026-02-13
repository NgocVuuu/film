'use client';

import { addToProgressQueue, getProgressQueue, removeFromProgressQueue } from './indexed-db';
import { customFetch } from './api';

// Extend ServiceWorkerRegistration to include sync
interface SyncManager {
  getTags(): Promise<string[]>;
  register(tag: string): Promise<void>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager;
  }
}

// Register background sync for watch progress
export async function registerProgressSync(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
    console.log('Background sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-watch-progress');
    console.log('Background sync registered for watch progress');
  } catch (error) {
    console.error('Failed to register background sync:', error);
  }
}

// Queue watch progress update (will sync when online)
export async function queueProgressUpdate(data: {
  movieId: string;
  episodeId?: string;
  currentTime: number;
  duration: number;
}): Promise<void> {
  try {
    // Try to send immediately if online
    if (navigator.onLine) {
      await sendProgressUpdate(data);
    } else {
      // Queue for later if offline
      await addToProgressQueue(data);
      await registerProgressSync();
      console.log('Progress update queued for background sync');
    }
  } catch {
    // If immediate send fails, queue it
    await addToProgressQueue(data);
    await registerProgressSync();
    console.log('Progress update queued after failed send');
  }
}

// Send progress update to server
async function sendProgressUpdate(data: {
  movieId: string;
  episodeId?: string;
  currentTime: number;
  duration: number;
}): Promise<void> {
  const endpoint = data.episodeId 
    ? `/api/progress/tv/${data.movieId}/episodes/${data.episodeId}`
    : `/api/progress/movie/${data.movieId}`;

  const response = await customFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      currentTime: data.currentTime,
      duration: data.duration,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to update progress');
  }
}

// Process queued progress updates (called when back online)
export async function processProgressQueue(): Promise<{ success: number; failed: number }> {
  const queue = await getProgressQueue();
  
  if (queue.length === 0) {
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of (queue as any[])) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const itemData = item as any;
      await sendProgressUpdate({
        movieId: itemData.movieId,
        episodeId: itemData.episodeId,
        currentTime: itemData.currentTime,
        duration: itemData.duration,
      });
      
      // Remove from queue after successful sync
      await removeFromProgressQueue(itemData.id);
      successCount++;
    } catch {
      failedCount++;
    }
  }

  console.log(`Background sync complete: ${successCount} success, ${failedCount} failed`);
  return { success: successCount, failed: failedCount };
}

// Listen for online event and process queue
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('Back online, processing queued updates...');
    try {
      await processProgressQueue();
    } catch (error) {
      console.error('Error processing queue on online event:', error);
    }
  });
}

// Hook to use background sync in components
export function useBackgroundSync() {
  const queueUpdate = async (data: {
    movieId: string;
    episodeId?: string;
    currentTime: number;
    duration: number;
  }) => {
    await queueProgressUpdate(data);
  };

  return { queueUpdate };
}
