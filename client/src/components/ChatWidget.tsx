'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { getAuthToken } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { MessageCircle, X, Send, ChevronDown } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Image from 'next/image';

interface Message {
    _id: string;
    content: string;
    senderRole: 'user' | 'admin';
    senderId: { _id: string; displayName: string; avatar: string };
    createdAt: string;
}

interface Conversation {
    _id: string;
    unreadUser: number;
}

export default function ChatWidget() {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [unread, setUnread] = useState(0);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversation = useCallback(async () => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_URL}/api/chat/my`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setConversation(data.data);
                setUnread(data.data.unreadUser || 0);
                return data.data;
            }
        } catch (err) {
            console.error('fetchConversation error:', err);
        }
        return null;
    }, []);

    const fetchMessages = useCallback(async (convId: string) => {
        try {
            const token = getAuthToken();
            const res = await fetch(`${API_URL}/api/chat/${convId}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                setMessages(data.data);
            }
        } catch (err) {
            console.error('fetchMessages error:', err);
        }
    }, []);

    // Initialize conversation on mount
    useEffect(() => {
        if (!user || user.role === 'admin') return;
        fetchConversation();
    }, [user, fetchConversation]);

    // Connect socket and load messages when chat opens
    useEffect(() => {
        if (!open || !user || user.role === 'admin') return;

        const token = getAuthToken();
        if (!token) return;

        setLoading(true);

        const initChat = async () => {
            let conv = conversation;
            if (!conv) {
                conv = await fetchConversation();
            }
            if (!conv) { setLoading(false); return; }

            await fetchMessages(conv._id);
            setLoading(false);

            // Connect socket
            const socket = io(API_URL, {
                auth: { token },
                transports: ['websocket', 'polling']
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                socket.emit('join_conversation', conv!._id);
                socket.emit('mark_read', conv!._id);
                setUnread(0);
            });

            socket.on('new_message', (msg: Message) => {
                setMessages(prev => {
                    // Avoid duplicates
                    if (prev.find(m => m._id === msg._id)) return prev;
                    return [...prev, msg];
                });
            });

            socket.on('conversation_updated', () => {
                // Auto-mark read since chat is open
                socket.emit('mark_read', conv!._id);
            });
        };

        initChat();

        return () => {
            socketRef.current?.disconnect();
            socketRef.current = null;
        };
    }, [open, user, conversation, fetchConversation, fetchMessages]);

    useEffect(() => {
        if (open) scrollToBottom();
    }, [messages, open]);

    const handleSend = () => {
        if (!input.trim() || !conversation || !socketRef.current) return;
        socketRef.current.emit('send_message', {
            conversationId: conversation._id,
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

    const handleOpen = () => {
        setOpen(true);
        setUnread(0);
    };

    // Only show for logged-in non-admin users
    if (!user || user.role === 'admin') return null;

    return (
        <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6 flex flex-col items-end gap-3">
            {/* Chat Panel */}
            {open && (
                <div className="w-[340px] h-[460px] flex flex-col bg-[#0e0e0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FFBE00]/20 to-transparent border-b border-white/10">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#FFBE00] flex items-center justify-center">
                                <MessageCircle className="w-4 h-4 text-black" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Hỗ trợ</p>
                                <p className="text-[10px] text-[#FFBE00]">● Trực tuyến</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-gray-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-lg"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FFBE00]" />
                            </div>
                        ) : messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-[#FFBE00]/10 flex items-center justify-center">
                                    <MessageCircle className="w-7 h-7 text-[#FFBE00]" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">Xin chào! 👋</p>
                                    <p className="text-gray-500 text-xs mt-1">Gửi tin nhắn để được hỗ trợ</p>
                                </div>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderRole === 'user';
                                return (
                                    <div key={msg._id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {!isMe && (
                                            <div className="w-6 h-6 rounded-full bg-[#FFBE00] flex items-center justify-center flex-shrink-0">
                                                <span className="text-[9px] font-bold text-black">AD</span>
                                            </div>
                                        )}
                                        {isMe && msg.senderId?.avatar && (
                                            <Image
                                                src={msg.senderId.avatar}
                                                alt={msg.senderId.displayName}
                                                width={24}
                                                height={24}
                                                className="rounded-full w-6 h-6 object-cover flex-shrink-0"
                                            />
                                        )}
                                        <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words
                                            ${isMe
                                                ? 'bg-[#FFBE00] text-black rounded-br-sm'
                                                : 'bg-white/10 text-white rounded-bl-sm'
                                            }`}
                                        >
                                            {msg.content}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 border-t border-white/10 bg-black/30 flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Nhập tin nhắn..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-[#FFBE00]/50 transition-colors"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim()}
                            className="w-9 h-9 rounded-xl bg-[#FFBE00] flex items-center justify-center text-black hover:bg-[#FFBE00]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={handleOpen}
                className="relative w-14 h-14 rounded-full bg-[#FFBE00] text-black shadow-lg shadow-[#FFBE00]/30 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
                title="Chat với Admin"
            >
                {open ? (
                    <X className="w-6 h-6" />
                ) : (
                    <MessageCircle className="w-6 h-6" />
                )}
                {!open && unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>
        </div>
    );
}
