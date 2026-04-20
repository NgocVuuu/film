'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { customFetch, getAuthToken } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { io, Socket } from 'socket.io-client';
import { MessageCircle, Send, User, Search, Circle } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

interface ChatUser {
    _id: string;
    displayName: string;
    avatar: string;
    email: string;
}

interface Conversation {
    _id: string;
    userId: ChatUser;
    lastMessage: string;
    lastMessageAt: string;
    unreadAdmin: number;
    status: string;
}

interface Message {
    _id: string;
    content: string;
    conversationId: string;
    senderRole: 'user' | 'admin';
    senderId: { _id: string; displayName: string; avatar: string };
    createdAt: string;
}

export default function AdminChatPage() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selected, setSelected] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [msgLoading, setMsgLoading] = useState(false);
    const [search, setSearch] = useState('');
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversations = useCallback(async () => {
        try {
            const res = await customFetch(`/api/chat/admin/all`);
            const data = await res.json();
            if (data.success) setConversations(data.data);
        } catch {
            toast.error('Lỗi tải danh sách hội thoại');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMessages = useCallback(async (convId: string) => {
        setMsgLoading(true);
        try {
            const res = await customFetch(`/api/chat/${convId}/messages`);
            const data = await res.json();
            if (data.success) setMessages(data.data);
        } catch {
            toast.error('Lỗi tải tin nhắn');
        } finally {
            setMsgLoading(false);
        }
    }, []);

    // 1. Initialize stable socket connection once
    useEffect(() => {
        if (!user || user.role !== 'admin') return;

        const token = getAuthToken();
        if (!token) return;

        const socket = io(API_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('[Socket] Connected to server');
            // If we have a selected conversation, re-join its room on reconnect
            if (selectedRef.current) {
                socket.emit('join_conversation', selectedRef.current._id);
            }
        });

        socket.on('new_message', (msg: Message) => {
            setMessages(prev => {
                // Ensure we only add messages for the CURRENTLY selected conversation
                // and avoid duplicates
                if (selectedRef.current && msg.conversationId !== selectedRef.current._id) return prev;
                if (prev.find(m => m._id === msg._id)) return prev;
                return [...prev, msg];
            });

            // Update conversation list sidebar
            setConversations(prev => prev.map(c => {
                if (c._id === msg.conversationId) {
                    const isOther = !selectedRef.current || selectedRef.current._id !== c._id;
                    return {
                        ...c,
                        lastMessage: msg.content,
                        lastMessageAt: msg.createdAt,
                        // Only increment unread if it's a user message and NOT in the active conversation
                        unreadAdmin: (msg.senderRole === 'user' && isOther)
                            ? (c.unreadAdmin + 1) : c.unreadAdmin
                    };
                }
                return c;
            }));
        });

        socket.on('conversation_updated', (update: { conversationId: string; lastMessage: string; lastMessageAt: string; senderRole: string }) => {
            setConversations(prev => prev.map(c => {
                if (c._id === update.conversationId) {
                    const isOther = !selectedRef.current || selectedRef.current._id !== c._id;
                    return {
                        ...c,
                        lastMessage: update.lastMessage,
                        lastMessageAt: update.lastMessageAt,
                        unreadAdmin: (update.senderRole === 'user' && isOther)
                            ? (c.unreadAdmin + 1) : c.unreadAdmin
                    };
                }
                return c;
            }));
        });

        fetchConversations();

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [user, fetchConversations]); // Note: No selected dependency here

    // 2. Keep a ref to selected for socket handlers to use without closure issues
    const selectedRef = useRef<Conversation | null>(null);
    useEffect(() => {
        selectedRef.current = selected;
    }, [selected]);

    // 3. Handle Room membership changes
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket || !user) return;

        if (selected) {
            console.log('[Socket] Joining room:', selected._id);
            socket.emit('join_conversation', selected._id);
            socket.emit('mark_read', selected._id);
        }

        return () => {
            if (selected) {
                console.log('[Socket] Leaving room:', selected._id);
                socket.emit('leave_conversation', selected._id);
            }
        };
    }, [selected, user]);

    // Select conversation
    const handleSelect = (conv: Conversation) => {
        if (selected?._id === conv._id) return;

        setSelected(conv);
        setMessages([]);
        fetchMessages(conv._id);

        // Clear unread badge locally
        setConversations(prev => prev.map(c => c._id === conv._id ? { ...c, unreadAdmin: 0 } : c));
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || !selected || !socketRef.current) return;
        socketRef.current.emit('send_message', {
            conversationId: selected._id,
            content: input.trim()
        });
        setInput('');
        inputRef.current?.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const filtered = conversations.filter(c => {
        const q = search.toLowerCase();
        return c.userId?.displayName?.toLowerCase().includes(q) ||
            c.userId?.email?.toLowerCase().includes(q) ||
            c.lastMessage?.toLowerCase().includes(q);
    });

    const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadAdmin || 0), 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <MessageCircle className="w-6 h-6 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold text-white">Chat Hỗ trợ</h1>
                    <p className="text-gray-400 text-sm">
                        {totalUnread > 0 ? <span className="text-yellow-400">{totalUnread} tin nhắn chưa đọc</span> : 'Không có tin nhắn mới'}
                    </p>
                </div>
            </div>

            {/* Main Panel */}
            <div className="flex h-[calc(100vh-180px)] min-h-[500px] bg-surface-900 border border-white/10 rounded-xl overflow-hidden">
                {/* Sidebar – Conversation List */}
                <div className="w-72 flex-shrink-0 border-r border-white/10 flex flex-col">
                    {/* Search */}
                    <div className="p-3 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">Không có hội thoại nào</div>
                        ) : (
                            filtered.map(conv => (
                                <button
                                    key={conv._id}
                                    onClick={() => handleSelect(conv)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-white/5 hover:bg-white/5 ${selected?._id === conv._id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                                >
                                    {conv.userId?.avatar ? (
                                        <img src={conv.userId.avatar} alt={conv.userId.displayName} className="rounded-full w-10 h-10 object-cover flex-shrink-0" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                            <User className="w-4 h-4 text-gray-400" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className={`text-sm font-medium truncate ${conv.unreadAdmin > 0 ? 'text-white' : 'text-gray-300'}`}>
                                                {conv.userId?.displayName || 'Unknown'}
                                            </p>
                                            {conv.unreadAdmin > 0 && (
                                                <span className="w-5 h-5 rounded-full bg-primary text-black text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                                    {conv.unreadAdmin > 9 ? '9+' : conv.unreadAdmin}
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs truncate mt-0.5 ${conv.unreadAdmin > 0 ? 'text-gray-300' : 'text-gray-500'}`}>
                                            {conv.lastMessage || 'Chưa có tin nhắn'}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                    {!selected ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                <MessageCircle className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-500 text-sm">Chọn một hội thoại để bắt đầu</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-black/20">
                                {selected.userId?.avatar ? (
                                    <img src={selected.userId.avatar} alt={selected.userId.displayName} className="rounded-full w-9 h-9 object-cover" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                                        <User className="w-4 h-4 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-sm font-semibold text-white">{selected.userId?.displayName}</p>
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                                        {selected.userId?.email}
                                    </p>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                {msgLoading ? (
                                    <div className="flex justify-center p-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                                        <p className="text-gray-500 text-sm">Chưa có tin nhắn nào</p>
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isAdmin = msg.senderRole === 'admin';
                                        return (
                                            <div key={msg._id} className={`flex items-end gap-2 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                                                {!isAdmin && selected.userId?.avatar && (
                                                    <img src={selected.userId.avatar} alt={selected.userId.displayName} className="rounded-full w-7 h-7 object-cover flex-shrink-0" />
                                                )}
                                                {isAdmin && (
                                                    <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                                        <span className="text-[9px] font-bold text-black">AD</span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-1 max-w-[70%]">
                                                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words
                                                        ${isAdmin
                                                            ? 'bg-primary text-black rounded-br-sm'
                                                            : 'bg-white/10 text-white rounded-bl-sm'
                                                        }`}>
                                                        {msg.content}
                                                    </div>
                                                    <span className={`text-[10px] text-gray-600 ${isAdmin ? 'text-right' : 'text-left'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="px-4 py-3 border-t border-white/10 bg-black/20 flex items-center gap-2">
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Nhập phản hồi..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-primary/50 transition-colors"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim()}
                                    className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-black hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
