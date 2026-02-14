'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, Ban, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { customFetch } from '@/lib/api';

interface User {
    _id: string;
    displayName: string;
    email?: string;
    phoneNumber?: string;
    role: string;
    isBanned?: boolean;
    isVerified?: boolean;
    subscription: {
        tier: string;
        status: string;
    };
    createdAt: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const response = await customFetch(
                `/api/admin/users?page=${page}&limit=20&search=${search}`,
                {
                    credentials: 'include'
                }
            );

            const data = await response.json();
            if (data.success) {
                setUsers(data.data);
                setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Fetch users error:', error);
            toast.error('Lỗi khi tải danh sách');
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleBanUser = async (userId: string, isBanned: boolean) => {
        if (!confirm(isBanned ? 'Cấm người dùng này?' : 'Bỏ cấm người dùng này?')) return;

        try {
            const response = await customFetch(`/api/admin/users/${userId}/ban`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ isBanned })
            });

            const data = await response.json();
            if (data.success) {
                toast.success(data.message);
                fetchUsers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Ban user error:', error);
            toast.error('Lỗi khi cập nhật');
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Xóa người dùng này? Hành động không thể hoàn tác!')) return;

        try {
            const response = await customFetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const data = await response.json();
            if (data.success) {
                toast.success('Đã xóa người dùng');
                fetchUsers();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Delete user error:', error);
            toast.error('Lỗi khi xóa');
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-white">User Management</h1>
            </div>

            {/* Search */}
            <div className="mb-8">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, email, số điện thoại..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        className="w-full pl-12 pr-4 py-3.5 bg-surface-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-lg"
                    />
                </div>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
            ) : (
                <div className="bg-surface-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
                        <table className="w-full min-w-[1000px]">
                            <thead className="bg-surface-800">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Subscription</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Verified</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {users.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                                    <span className="text-primary font-bold">{user.displayName?.[0] || 'U'}</span>
                                                </div>
                                                <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">{user.displayName}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500 font-mono italic">{user.email || user.phoneNumber || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-tighter ${user.role === 'admin'
                                                ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`text-xs px-2 py-1 rounded-full border ${user.subscription?.tier === 'premium'
                                                ? 'border-primary/20 text-primary bg-primary/5'
                                                : 'border-gray-500/20 text-gray-400 bg-gray-500/5'
                                                }`}>
                                                {user.subscription?.tier || 'free'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isVerified ? (
                                                <span className="flex items-center gap-1.5 text-green-500 text-xs font-medium">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Verified
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-yellow-500/70 text-xs font-medium">
                                                    <XCircle className="w-4 h-4" />
                                                    Not Verified
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isBanned ? (
                                                <div className="flex items-center gap-1.5 text-red-500 text-xs font-bold uppercase tracking-widest">
                                                    <XCircle className="w-4 h-4" />
                                                    Banned
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-green-500 text-xs font-bold uppercase tracking-widest">
                                                    <CheckCircle className="w-4 h-4" />
                                                    Active
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {user.role !== 'admin' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleBanUser(user._id, !user.isBanned)}
                                                            className={`h-9 w-9 p-0 hover:bg-yellow-500/20 ${user.isBanned ? 'text-green-500' : 'text-yellow-500'}`}
                                                            title={user.isBanned ? 'Unban User' : 'Ban User'}
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            className="h-9 w-9 p-0 text-gray-500 hover:bg-red-500/20 hover:text-red-500"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                        <p className="text-sm text-gray-400">
                            Page {page} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="border-white/10"
                            >
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setPage(p => p + 1)}
                                disabled={page === totalPages}
                                className="border-white/10"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
