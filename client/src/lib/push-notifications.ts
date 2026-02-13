'use client';

import { customFetch } from './api';

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  // Get service worker registration
  const registration = await navigator.serviceWorker.ready;

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    // Already subscribed, just return it
    return subscription;
  }

  // Get VAPID public key from server
  const vapidResponse = await customFetch('/api/notifications/vapid-public-key');
  const vapidData = await vapidResponse.json();
  
  if (!vapidData.success || !vapidData.data) {
    throw new Error('Failed to get VAPID public key');
  }

  const publicKey = vapidData.data;

  // Subscribe to push
  subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
  });

  // Send subscription to server
  const response = await customFetch('/api/notifications/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    // If server rejects (e.g., not premium), unsubscribe
    await subscription.unsubscribe();
    throw { requiresPremium: data.requiresPremium, message: data.message };
  }

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  // Unsubscribe from push manager
  await subscription.unsubscribe();

  // Tell server to remove subscription
  try {
    await customFetch('/api/notifications/push/unsubscribe', {
      method: 'DELETE',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
      }),
    });
  } catch (error) {
    console.error('Failed to notify server about unsubscribe:', error);
  }
}

// Helper function to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Test notification (for testing purposes)
export async function sendTestNotification(): Promise<void> {
  if (!isPushSupported() || Notification.permission !== 'granted') {
    throw new Error('Notifications not permitted');
  }

  // Send request to server to send test notification
  const response = await customFetch('/api/notifications/push/test', {
    method: 'POST',
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to send test notification');
  }
}
