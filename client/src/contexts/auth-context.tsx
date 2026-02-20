'use client';
import { useRouter } from 'next/navigation';
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { setAuthToken, removeAuthToken, customFetch } from '@/lib/api';

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
            const response = await customFetch('/api/auth/me');

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUser(data.data);
                }
            } else if (response.status === 401) {
                // Token invalid or expired
                removeAuthToken();
                setUser(null);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        } finally {
            setLoading(false);
        }
    };

    const login = (userData: User, token?: string) => {
        if (token) setAuthToken(token);
        setUser(userData);
        toast.success(`Chào mừng, ${userData.displayName}!`);
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
