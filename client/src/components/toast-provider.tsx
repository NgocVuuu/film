'use client';
import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
    return (
        <Toaster
            position="top-right"
            containerStyle={{
                top: 'calc(1rem + env(safe-area-inset-top, 0px))',
            }}
            toastOptions={{
                duration: 4000,
                style: {
                    background: '#1a1a1a',
                    color: '#fff',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                },
                success: {
                    iconTheme: {
                        primary: '#D4AF37',
                        secondary: '#000',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444',
                        secondary: '#fff',
                    },
                },
            }}
        />
    );
}
