/// <reference lib="webworker" />

export { };

declare const self: ServiceWorkerGlobalScope;

// Handle messages from the page (Workbox, SKIP_WAITING, etc.)
// Without this, Workbox's MessageChannel requests accumulate and never get a response,
// causing "message channel closed before a response was received" to grow over time.
self.addEventListener('message', (event: MessageEvent) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
        // Respond to close the MessageChannel port cleanly
        // (Workbox's built-in handler calls skipWaiting but doesn't respond to port)
        event.ports?.[0]?.postMessage({ type: 'SKIP_WAITING_DONE' });
        return;
    }
    // For any other message with a reply port, acknowledge to close the channel
    if (event.ports?.[0]) {
        event.ports[0].postMessage({ received: true });
    }
});

self.addEventListener('push', (event: any) => {
    const pushEvent = event as PushEvent;
    if (!pushEvent.data) return;

    try {
        const data = pushEvent.data.json();
        const title = data.title || 'Pchill';
        const options = {
            body: data.body || 'Bạn có thông báo mới!',
            icon: data.icon || '/logo.png',
            badge: data.badge || '/logo.png',
            data: {
                url: data.link || '/'
            },
            timestamp: data.timestamp || Date.now(),
            actions: [
                {
                    action: 'open',
                    title: 'Xem ngay'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (e) {
        console.error('Error handling push event:', e);
    }
});

self.addEventListener('notificationclick', (event: any) => {
    const notificationEvent = event as NotificationEvent;
    notificationEvent.notification.close();

    const urlToOpen = notificationEvent.notification.data.url || '/';

    notificationEvent.waitUntil(
        (self as any).clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((windowClients: any[]) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window/tab matching the URL is open, open a new one
            if ((self as any).clients.openWindow) {
                return (self as any).clients.openWindow(urlToOpen);
            }
        })
    );
});
