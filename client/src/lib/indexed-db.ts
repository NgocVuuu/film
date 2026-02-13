'use client';

const DB_NAME = 'pwa-cache';
const DB_VERSION = 1;

const STORES = {
  WATCH_PROGRESS_QUEUE: 'watch-progress-queue',
  OFFLINE_MOVIES: 'offline-movies',
  OFFLINE_FAVORITES: 'offline-favorites',
};

// Initialize IndexedDB
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Watch progress queue store
      if (!db.objectStoreNames.contains(STORES.WATCH_PROGRESS_QUEUE)) {
        const progressStore = db.createObjectStore(STORES.WATCH_PROGRESS_QUEUE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        progressStore.createIndex('timestamp', 'timestamp', { unique: false });
        progressStore.createIndex('movieId', 'movieId', { unique: false });
      }

      // Offline movies store
      if (!db.objectStoreNames.contains(STORES.OFFLINE_MOVIES)) {
        const moviesStore = db.createObjectStore(STORES.OFFLINE_MOVIES, {
          keyPath: 'slug',
        });
        moviesStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // Offline favorites store
      if (!db.objectStoreNames.contains(STORES.OFFLINE_FAVORITES)) {
        const favoritesStore = db.createObjectStore(STORES.OFFLINE_FAVORITES, {
          keyPath: 'movieId',
        });
        favoritesStore.createIndex('addedAt', 'addedAt', { unique: false });
      }
    };
  });
}

// Generic helper to get object store
async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await initDB();
  const transaction = db.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

// Watch Progress Queue Functions
export async function addToProgressQueue(data: {
  movieId: string;
  episodeId?: string;
  currentTime: number;
  duration: number;
}): Promise<number> {
  const store = await getStore(STORES.WATCH_PROGRESS_QUEUE, 'readwrite');
  const item = {
    ...data,
    timestamp: Date.now(),
    synced: false,
  };
  
  return new Promise((resolve, reject) => {
    const request = store.add(item);
    request.onsuccess = () => resolve(request.result as unknown as number);
    request.onerror = () => reject(request.error);
  });
}

export async function getProgressQueue(): Promise<unknown[]> {
  const store = await getStore(STORES.WATCH_PROGRESS_QUEUE, 'readonly');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromProgressQueue(id: number): Promise<void> {
  const store = await getStore(STORES.WATCH_PROGRESS_QUEUE, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearProgressQueue(): Promise<void> {
  const store = await getStore(STORES.WATCH_PROGRESS_QUEUE, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Offline Movies Functions
export async function cacheMovie(movie: unknown): Promise<void> {
  const store = await getStore(STORES.OFFLINE_MOVIES, 'readwrite');
  const item = {
    ...(movie as object),
    cachedAt: Date.now(),
  };
  
  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedMovie(slug: string): Promise<unknown | null> {
  const store = await getStore(STORES.OFFLINE_MOVIES, 'readonly');
  
  return new Promise((resolve, reject) => {
    const request = store.get(slug);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCachedMovies(): Promise<unknown[]> {
  const store = await getStore(STORES.OFFLINE_MOVIES, 'readonly');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeCachedMovie(slug: string): Promise<void> {
  const store = await getStore(STORES.OFFLINE_MOVIES, 'readwrite');
  
  return new Promise((resolve, reject) => {
    const request = store.delete(slug);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Offline Favorites Functions
export async function cacheFavorite(favorite: { movieId: string; movie: unknown }): Promise<void> {
  const store = await getStore(STORES.OFFLINE_FAVORITES, 'readwrite');
  const item = {
    ...favorite,
    addedAt: Date.now(),
  };
  
  return new Promise((resolve, reject) => {
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedFavorites(): Promise<unknown[]> {
  const store = await getStore(STORES.OFFLINE_FAVORITES, 'readonly');
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeCachedFavorite(movieId: string): Promise<void> {
  const store = await getStore(STORES.OFFLINE_FAVORITES, 'readwrite');
  
  return new Promise((resolve, reject) => {  const request = store.delete(movieId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllOfflineData(): Promise<void> {
  const db = await initDB();
  const transaction = db.transaction(Object.values(STORES), 'readwrite');
  
  return new Promise((resolve, reject) => {
    Object.values(STORES).forEach(storeName => {
      transaction.objectStore(storeName).clear();
    });
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get storage usage estimate
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    
    return { usage, quota, percentage };
  }
  
  return { usage: 0, quota: 0, percentage: 0 };
}
