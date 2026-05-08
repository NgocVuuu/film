'use client';
import { useState, useEffect, useRef } from 'react';
import { Send, Users, Crown, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuth } from '@/contexts/auth-context';

interface Message {
    sender: { displayName: string, avatar?: string };
    message: string;
    time: Date;
}

interface RoomState {
    host: string;
    hostUser: { displayName: string, avatar?: string };
    users: { id: string, displayName: string, avatar?: string }[];
}

export default function WatchPartyChat({ socket, roomId, onClose }: { socket: any, roomId: string, onClose?: () => void }) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket || !user) return;

        socket.on('wp_room_update', (state: RoomState) => {
            setRoomState(state);
        });

        socket.on('wp_chat_message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        // Join the room
        socket.emit('wp_join_room', { roomId, user: { displayName: user.displayName, avatar: user.avatar } });

        return () => {
            socket.off('wp_room_update');
            socket.off('wp_chat_message');
        };
    }, [socket, roomId, user]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || !socket || !user) return;

        socket.emit('wp_chat', { roomId, message: input, sender: { displayName: user.displayName, avatar: user.avatar } });
        setInput('');
    };

    return (
        <div className="flex flex-col h-full w-full bg-black/60 rounded-xl border border-white/10 shadow-2xl overflow-hidden shrink-0 pointer-events-auto backdrop-blur-md">
            {/* Header */}
            <div className="p-3 border-b border-white/5 bg-surface-900/80 backdrop-blur-sm flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        Phòng Xem Chung
                    </h3>
                    {roomState && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm font-bold">
                            {roomState.users.length} người
                        </span>
                    )}
                </div>
                {onClose && (
                    <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} 
                        className="text-gray-400 hover:text-white p-1 ml-2 transition-colors cursor-pointer z-50 relative"
                    >
                        <X className="w-5 h-5 pointer-events-none" />
                    </button>
                )}
            </div>

            {/* User List Info (Host) */}
            {roomState?.hostUser && (
                <div className="px-3 py-1.5 bg-black/40 border-b border-white/5 flex items-center gap-1.5 shrink-0">
                    <Crown className="w-3 h-3 text-yellow-500" />
                    <span className="text-[10px] text-gray-400">Chủ phòng: <b className="text-white">{roomState.hostUser.displayName}</b></span>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 relative bg-black/20">
                {messages.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 text-[11px] text-center px-4">
                        Chưa có tin nhắn nào.<br />Hãy gửi tin đầu tiên!
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className="text-[13px] leading-relaxed">
                        <span className="font-bold text-primary mr-1.5">{msg.sender.displayName}:</span>
                        <span className="text-gray-200">{msg.message}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-2 bg-black/60 border-t border-white/10 shrink-0">
                <form onSubmit={handleSend} className="flex gap-1.5">
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="bg-black/40 border-white/10 text-[13px] h-8 w-full focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0 text-white"
                        onKeyDown={(e) => e.stopPropagation()} /* Prevent triggering video shortcuts */
                        onFocus={() => {
                            // Focus state is handled by Tailwind
                        }}
                        onBlur={() => {
                            // Blur state is handled by Tailwind
                        }}
                    />
                    <Button type="submit" size="icon" className="h-8 w-8 shrink-0 bg-primary/20 text-primary hover:bg-primary hover:text-black border border-primary/50" disabled={!input.trim()}>
                        <Send className="w-3.5 h-3.5" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
