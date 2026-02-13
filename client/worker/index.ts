/// <reference lib="webworker" />

export { };

declare const self: ServiceWorkerGlobalScope;

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
