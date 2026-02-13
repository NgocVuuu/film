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

    // Ensure endpoint doesn't start with / if we are appending to base URL (optional, depending on usage)
    // But usually API_URL doesn't have trailing slash, and endpoint starts with /. 
    // If input endpoint is full URL, we normally wouldn't use this helper or we'd handle it.
    // Assuming this helper is for our API.

    const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;

    const response = await fetch(url, {
        cache: 'no-store', // Always fetch fresh data
        ...options,
        headers
    });

    return response;
};
