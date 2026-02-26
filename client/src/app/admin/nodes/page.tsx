'use client';
import { useState, useEffect } from 'react';
import { customFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Edit, Trash2, Server, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface ServerNode {
    _id: string;
    name: string;
    domain: string;
    status: string;
    apiKeys: string[];
    createdAt: string;
}

export default function AdminNodesPage() {
    const [nodes, setNodes] = useState<ServerNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [currentNode, setCurrentNode] = useState<Partial<ServerNode>>({});

    const fetchNodes = async () => {
        try {
            setLoading(true);
            const res = await customFetch('/api/admin/nodes', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setNodes(data.data);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Lỗi khi tải danh sách Node');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNodes();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCurrentNode({ ...currentNode, [e.target.name]: e.target.value });
    };

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const keys = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
        setCurrentNode({ ...currentNode, apiKeys: keys });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editMode ? `/api/admin/nodes/${currentNode._id}` : '/api/admin/nodes';
            const method = editMode ? 'PUT' : 'POST';

            const res = await customFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentNode),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success(editMode ? 'Cập nhật thành công' : 'Thêm Node thành công');
                setIsModalOpen(false);
                fetchNodes();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi khi lưu dữ liệu');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa Server Node "${name}"? Khách hàng đang xem phim trên Node này sẽ bị rớt mạng!`)) return;
        try {
            const res = await customFetch(`/api/admin/nodes/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Xóa Node thành công');
                fetchNodes();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi khi xóa');
        }
    };

    const handleToggleStatus = async (node: ServerNode) => {
        const newStatus = node.status === 'active' ? 'maintenance' : 'active';
        try {
            const res = await customFetch(`/api/admin/nodes/${node._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
                credentials: 'include'
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Đã chuyển trạng thái sang ${newStatus}`);
                fetchNodes();
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Lỗi chuyển trạng thái');
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Server className="text-primary" />
                        Trạm Thu Phát (Dynamic Nodes)
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Quản lý mạng lưới Nginx chống DPI Nhà mạng</p>
                </div>
                <Button onClick={() => { setEditMode(false); setCurrentNode({ status: 'active', apiKeys: [] }); setIsModalOpen(true); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Thêm Node Mới
                </Button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nodes.map(node => (
                        <div key={node._id} className="bg-surface-800 rounded-xl p-5 border border-white/5 relative group">
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button className="text-gray-400 hover:text-white" onClick={() => { setEditMode(true); setCurrentNode(node); setIsModalOpen(true); }}>
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button className="text-gray-400 hover:text-red-500" onClick={() => handleDelete(node._id, node.name)}>
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-3 h-3 rounded-full ${node.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'}`} />
                                <h3 className="font-bold text-lg text-white">{node.name}</h3>
                            </div>

                            <div className="space-y-2 mb-6 text-sm text-gray-300">
                                <p><span className="text-gray-500">Domain:</span> <a href={node.domain} target="_blank" rel="noreferrer" className="text-primary hover:underline">{node.domain}</a></p>
                                <p><span className="text-gray-500">API Keys ({node.apiKeys.length}):</span> {node.apiKeys.join(', ') || 'Chưa gán'}</p>
                            </div>

                            <Button
                                variant={node.status === 'active' ? "destructive" : "default"}
                                className="w-full gap-2"
                                onClick={() => handleToggleStatus(node)}
                            >
                                {node.status === 'active' ? (
                                    <><PowerOff className="w-4 h-4" /> Đưa vào Bảo trì</>
                                ) : (
                                    <><Power className="w-4 h-4" /> Bật Hoạt Động (Online)</>
                                )}
                            </Button>
                        </div>
                    ))}
                    {nodes.length === 0 && (
                        <div className="col-span-full text-center p-12 text-gray-400 bg-surface-900 rounded-xl border-dashed border-2 border-white/10">
                            Không có Trạm Thu Phát nào. Bạn hãy Thêm Node Mới ngay nhé!
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-surface-800 p-6 rounded-xl w-full max-w-md border border-white/10 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">{editMode ? 'Chỉnh sửa Node' : 'Thêm Node Mới'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tên Node (định danh nội bộ)</label>
                                <Input required name="name" value={currentNode.name || ''} onChange={handleChange} placeholder="Ví dụ: Node FPT Hà Nội" className="bg-surface-900 border-white/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tên miền Proxy (HTTPS URL)</label>
                                <Input required name="domain" type="url" value={currentNode.domain || ''} onChange={handleChange} placeholder="Ví dụ: https://s1-backup.pchill.net" className="bg-surface-900 border-white/10" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Cụm API Keys (Cách nhau dấu phẩy)</label>
                                <Input name="apiKeys" value={currentNode.apiKeys?.join(', ') || ''} onChange={handleApiKeyChange} placeholder="Ví dụ: rd_key_0, rd_key_1" className="bg-surface-900 border-white/10" />
                                <p className="text-xs text-gray-500 mt-1">Khớp với ID ở file Nginx rd_keys.json để chống trùng IP</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Trạng thái Khởi tạo</label>
                                <select name="status" value={currentNode.status || 'active'} onChange={handleChange} className="w-full h-10 px-3 rounded-md bg-surface-900 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary">
                                    <option value="active">Active (Sẵn sàng phục vụ stream)</option>
                                    <option value="maintenance">Maintenance (Bảo trì / Chặn mạng)</option>
                                    <option value="offline">Offline (Tắt máy)</option>
                                </select>
                            </div>

                            <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/10">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                                <Button type="submit">{editMode ? 'Cập nhật' : 'Thêm mới'}</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
