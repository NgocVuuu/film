import { API_URL } from './config';

export const getAuthToken = () => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

export const setAuthToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
    }
};

export const removeAuthToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
    }
};

interface FetchOptions extends RequestInit {
    headers?: Record<string, string>;
}

export const customFetch = async (endpoint: string, options: FetchOptions = {}) => {
    const token = getAuthToken();

    // Create headers object
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const response = await fetch(url, {
        cache: 'no-store', // Always fetch fresh data
        credentials: 'include', // Important for PWA cookies
        ...options,
        headers
    });

    // Intercept 401 (Unauthorized) & 403 (Forbidden) for global PWA handling
    if (response.status === 401 || response.status === 403) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:expired'));
        }
    }

    return response;
};
