'use client';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { setAuthToken, removeAuthToken, customFetch, getAuthToken } from '@/lib/api';

interface User {
    id: string;
    _id?: string; // Mongoose ID
    email?: string;
    phoneNumber?: string;
    displayName: string;
    avatar: string;
    role: string;
    hasPassword?: boolean;
    isPremium?: boolean; // Computed from subscription
    subscription: {
        tier: string;
        status: string;
        startDate?: Date;
        endDate?: Date;
    };
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (userData: User, token?: string) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            // This API call sends the cookie implicitly if credentials: 'include' is set
            const response = await customFetch('/api/auth/me');

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUser(data.data);
                }
            } else if (response.status === 401) {
                // Token really invalid or expired
                removeAuthToken();
                setUser(null);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setLoading(false);
        }
    };

    // Global listener for 401 Unauthorized API responses
    useEffect(() => {
        const handleAuthExpired = () => {
            removeAuthToken();
            setUser(null);
            toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại.');
            router.push('/login');
        };

        window.addEventListener('auth:expired', handleAuthExpired);
        return () => window.removeEventListener('auth:expired', handleAuthExpired);
    }, [router]);

    const login = (userData: User, token?: string) => {
        if (token) setAuthToken(token);
        setUser(userData);
        toast.success(`Chào mừng, ${userData.displayName}!`);
        // Migrate any localStorage favorites up to the API (fire-and-forget)
        try {
            const localFavs: Array<{ slug?: string }> = JSON.parse(localStorage.getItem('favorites') || '[]');
            if (localFavs.length > 0) {
                const authToken = token || getAuthToken();
                const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
                fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/favorites/sync`, {
                    method: 'POST',
                    credentials: 'include',
                    headers,
                    body: JSON.stringify({ items: localFavs }),
                }).catch(() => { /* silent */ });
            }
        } catch { /* silent */ }
    };

    const logout = async () => {
        try {
            await customFetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            removeAuthToken();
            setUser(null);
            toast.success('Đã đăng xuất thành công');
            // Force a hard reload to login to clear all route history/cache
            // In PWA, redirecting might be smoother than href reload if state is cleared
            router.push('/login');
        }
    };

    const updateUser = (userData: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...userData } : null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, updateUser, refresh: fetchCurrentUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
