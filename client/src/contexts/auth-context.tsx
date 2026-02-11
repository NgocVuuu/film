'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';

interface User {
    id: string;
    _id?: string; // Mongoose ID
    email?: string;
    phoneNumber?: string;
    displayName: string;
    avatar: string;
    role: string;
    hasPassword?: boolean;
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
    login: (userData: User) => void;
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
            const response = await fetch(`${API_URL}/api/auth/me`, {
                headers: {
                    // No token header needed, cookie sent automatically with credentials: 'include'
                },
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

    const login = (userData: User) => {
        setUser(userData);
        toast.success(`Chào mừng, ${userData.displayName}!`);
    };

    const logout = async () => {
        try {
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            setUser(null);
            toast.success('Đã đăng xuất thành công');
        } catch (error) {
            console.error('Logout error:', error);
            // Force client-side logout anyway
            setUser(null);
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
