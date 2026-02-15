'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';
import { setAuthToken, getAuthToken, removeAuthToken } from '@/lib/api';

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
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const token = getAuthToken();
            const headers: Record<string, string> = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers,
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUser(data.data);
                }
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
            await fetch(`${API_URL}/api/auth/logout`, { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            removeAuthToken();
            setUser(null);
            toast.success('Đã đăng xuất thành công');
            // Force a hard reload to login to clear all route history/cache
            window.location.href = '/login';
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
