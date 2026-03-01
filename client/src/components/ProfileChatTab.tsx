'use client';
import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { MessageCircle, Send, Loader2, ArrowLeft } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Image from 'next/image';
import { customFetch, getAuthToken } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { toast } from 'react-hot-toast';

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

export default function ProfileChatTab({ onBack }: { onBack?: () => void }) {
    const { user } = useAuth();
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchConversation = useCallback(async () => {
        try {
            const res = await customFetch('/api/chat/my');
            const data = await res.json();
            if (data.success) {
                setConversation(data.data);
                return data.data;
            } else {
                toast.error('Không thể tải thông tin hội thoại');
            }
        } catch (err) {
            console.error('fetchConversation error:', err);
            toast.error('Lỗi kết nối máy chủ chat');
        }
        return null;
    }, []);

    const fetchMessages = useCallback(async (convId: string) => {
        try {
            const res = await customFetch(`/api/chat/${convId}/messages`);
            const data = await res.json();
            if (data.success) {
                setMessages(data.data);
            }
        } catch (err) {
            console.error('fetchMessages error:', err);
        }
    }, []);

    useEffect(() => {
        if (!user || user.role === 'admin') {
            setLoading(false);
            return;
        }

        const token = getAuthToken();
        // Don't return if token is missing, customFetch and Socket handshake fallback to cookies on server
        if (!token) {
            console.log('[Chat] No token found in localStorage, relying on cookies.');
        }

        let mounted = true;

        const initChat = async () => {
            setLoading(true);
            try {
                let conv = await fetchConversation();

                if (!conv) {
                    if (mounted) setLoading(false);
                    return;
                }

                await fetchMessages(conv._id);
                if (mounted) setLoading(false);

                // Connect socket
                const socket = io(API_URL, {
                    auth: { token: token || '' },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 10,
                    withCredentials: true
                });
                socketRef.current = socket;

                socket.on('connect', () => {
                    console.log('[Socket] Connected, joining room:', conv!._id);
                    socket.emit('join_conversation', conv!._id);
                    socket.emit('mark_read', conv!._id);
                    // toast.success('Đã kết nối máy chủ chat');
                });

                socket.on('connect_error', (err) => {
                    console.error('[Socket] Connection error:', err);
                    toast.error('Lỗi kết nối Socket: ' + err.message);
                });

                socket.on('new_message', (msg: Message) => {
                    setMessages(prev => {
                        if (prev.find(m => m._id === msg._id)) return prev;
                        return [...prev, msg];
                    });
                });

                socket.on('conversation_updated', (update: { conversationId: string; senderRole: string }) => {
                    // Auto-mark read since chat is open
                    if (update.conversationId === conv?._id) {
                        socket.emit('mark_read', conv._id);
                    }
                });
            } catch (err) {
                console.error('[Chat] initChat error:', err);
                if (mounted) setLoading(false);
            }
        };

        initChat();

        return () => {
            mounted = false;
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [user, fetchConversation, fetchMessages]);

    useEffect(() => {
        if (!loading) scrollToBottom();
    }, [messages, loading]);

    const handleSend = () => {
        if (!input.trim() || !conversation) return;
        if (!socketRef.current?.connected) {
            toast.error('Chưa kết nối máy chủ chat. Vui lòng đợi trong giây lát.');
            return;
        }
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

    if (!user || user.role === 'admin') {
        return (
            <div className="flex flex-col items-center justify-center h-[500px] text-gray-500 bg-surface-900/30 rounded-xl border border-white/10">
                <MessageCircle className="w-12 h-12 mb-4 opacity-50" />
                <p>Không khả dụng cho admin hoặc khách.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-[100dvh] fixed inset-0 z-[100] md:static md:z-auto md:w-auto md:h-full bg-surface-900 border-t md:border-t-0 border-b-0 md:border border-white/10 rounded-none md:rounded-xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300 shadow-xl">
            {/* Header - Added pt-[env(safe-area-inset-top)] for notches */}
            <div className="flex items-center gap-3 px-4 md:px-6 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] md:pt-3 bg-gradient-to-r from-primary/20 to-transparent border-b border-white/10 shrink-0">
                {onBack && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onBack();
                        }}
                        className="md:hidden -ml-2 p-2 text-gray-400 hover:text-white transition-colors active:scale-90"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                )}
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                    <MessageCircle className="w-5 h-5 text-black" />
                </div>
                <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-white text-base md:text-lg truncate">Trò chuyện với Admin</h2>
                    <p className="text-[10px] md:text-xs text-primary font-medium flex items-center gap-1.5 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" /> Trực tuyến
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20 relative">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm z-10">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <MessageCircle className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <p className="text-white text-base font-medium mb-1">Bắt đầu trò chuyện! 👋</p>
                            <p className="text-sm">Gửi tin nhắn nếu bạn cần hỗ trợ hoặc góp ý.</p>
                        </div>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isMe = msg.senderRole === 'user';
                        const showAvatar = index === messages.length - 1 || messages[index + 1].senderRole !== msg.senderRole;

                        return (
                            <div key={msg._id} className={`flex items-end gap-2.5 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
                                <div className="w-8 shrink-0 flex flex-col justify-end">
                                    {!isMe && showAvatar && (
                                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                                            <span className="text-[10px] font-bold text-black tracking-tighter">AD</span>
                                        </div>
                                    )}
                                    {isMe && showAvatar && msg.senderId?.avatar && (
                                        <Image
                                            src={msg.senderId.avatar}
                                            alt={msg.senderId.displayName}
                                            width={32}
                                            height={32}
                                            className="rounded-full w-8 h-8 object-cover shadow-md"
                                        />
                                    )}
                                </div>
                                <div className={`px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed break-words shadow-sm
                                    ${isMe
                                        ? 'bg-primary text-black rounded-br-[4px]'
                                        : 'bg-surface-800 text-gray-100 rounded-bl-[4px] border border-white/5'
                                    }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Area - Added pb-[env(safe-area-inset-bottom)] and raised for home indicator */}
            <div className="p-3 md:p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 border-t border-white/10 bg-surface-900 shrink-0">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    className="flex items-center gap-2 md:gap-3"
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 md:px-5 py-2.5 md:py-3 text-[15px] text-white placeholder-gray-500 outline-none focus:border-primary/50 focus:bg-black/60 transition-all shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim()}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center text-black hover:bg-gold-500 hover:scale-105 active:scale-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shrink-0"
                    >
                        <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5 md:ml-1" />
                    </button>
                </form>
            </div>
        </div>
    );
}
