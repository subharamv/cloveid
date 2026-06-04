import React, { useEffect, useState, useMemo } from 'react';
import AppHeader from '../components/AppHeader';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, User, Hash, Layers, Calendar, Clock, CheckSquare, Square, ArrowLeft, PackageCheck, Package, Eye, Edit3, Trash2 } from 'lucide-react';

interface CollectItem {
    id: number;
    source: 'requests' | 'card_details' | 'id_cards';
    name: string;
    employeeId?: string;
    date?: string;
    print_status?: string;
    batch_id?: string | null;
    processed_date?: string;
    collected_at?: string;
    raw?: any;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
    collected: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', dot: 'bg-gray-500' },
    ready_to_collect: { bg: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
    printed: { bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
    sent_for_printing: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
};

const getStatusConfig = (status?: string) => statusConfig[status || ''] || { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-500', dot: 'bg-gray-400' };

const getSourceLabel = (source: string) => {
    switch (source) {
        case 'requests': return 'Single Card';
        case 'card_details': return 'Single Card';
        case 'id_cards': return 'Bulk Cards';
        default: return source;
    }
};

const CollectList = () => {
    const [toCollectItems, setToCollectItems] = useState<CollectItem[]>([]);
    const [collectedItems, setCollectedItems] = useState<CollectItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [activeTab, setActiveTab] = useState<'to-collect' | 'collected'>('to-collect');
    const navigate = useNavigate();

    const fetchItems = async () => {
        setLoading(true);
        try {
            const [reqRes, cardDetailsRes, idCardsRes] = await Promise.all([
                supabase.from('requests').select('*').eq('print_status', 'ready_to_collect'),
                supabase.from('card_details').select('*').eq('print_status', 'ready_to_collect'),
                supabase.from('id_cards').select('*').eq('print_status', 'ready_to_collect')
            ]);

            const [collReqRes, collCardDetailsRes, collIdCardsRes] = await Promise.all([
                supabase.from('requests').select('*').eq('print_status', 'collected'),
                supabase.from('card_details').select('*').eq('print_status', 'collected'),
                supabase.from('id_cards').select('*').eq('print_status', 'collected')
            ]);

            const toCollect: CollectItem[] = [];
            const collected: CollectItem[] = [];

            if (reqRes.data) {
                reqRes.data.forEach((r: any) => {
                    toCollect.push({
                        id: r.id, source: 'requests', name: r.full_name || r.name,
                        employeeId: r.employee_id, date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status, batch_id: r.batch_id || null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(), raw: r
                    });
                });
            }

            if (cardDetailsRes.data) {
                cardDetailsRes.data.forEach((r: any) => {
                    toCollect.push({
                        id: r.id, source: 'card_details', name: r.full_name,
                        employeeId: r.employee_id, date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status, batch_id: null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(), raw: r
                    });
                });
            }

            if (idCardsRes.data) {
                idCardsRes.data.forEach((r: any) => {
                    const cardData = typeof r.card_data === 'string' ? JSON.parse(r.card_data) : r.card_data;
                    toCollect.push({
                        id: r.id, source: 'id_cards',
                        name: cardData?.['Full Name'] || cardData?.fullName || cardData?.name || 'Bulk Card',
                        employeeId: cardData?.['Employee ID'] || cardData?.employeeId || r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status, batch_id: r.batch_id || null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(), raw: r
                    });
                });
            }

            if (collReqRes.data) {
                collReqRes.data.forEach((r: any) => {
                    collected.push({
                        id: r.id, source: 'requests', name: r.full_name || r.name,
                        employeeId: r.employee_id, date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status, batch_id: r.batch_id || null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        collected_at: r.updated_at ? `${new Date(r.updated_at).toLocaleDateString()} ${new Date(r.updated_at).toLocaleTimeString()}` : '-',
                        raw: r
                    });
                });
            }

            if (collCardDetailsRes.data) {
                collCardDetailsRes.data.forEach((r: any) => {
                    collected.push({
                        id: r.id, source: 'card_details', name: r.full_name,
                        employeeId: r.employee_id, date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status, batch_id: null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        collected_at: r.updated_at ? `${new Date(r.updated_at).toLocaleDateString()} ${new Date(r.updated_at).toLocaleTimeString()}` : '-',
                        raw: r
                    });
                });
            }

            if (collIdCardsRes.data) {
                collIdCardsRes.data.forEach((r: any) => {
                    const cardData = typeof r.card_data === 'string' ? JSON.parse(r.card_data) : r.card_data;
                    collected.push({
                        id: r.id, source: 'id_cards',
                        name: cardData?.['Full Name'] || cardData?.fullName || cardData?.name || 'Bulk Card',
                        employeeId: cardData?.['Employee ID'] || cardData?.employeeId || r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status, batch_id: r.batch_id || null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        collected_at: r.updated_at ? `${new Date(r.updated_at).toLocaleDateString()} ${new Date(r.updated_at).toLocaleTimeString()}` : '-',
                        raw: r
                    });
                });
            }

            setToCollectItems(toCollect);
            setCollectedItems(collected);
        } catch (error) {
            console.error('Error fetching collect list:', error);
            toast.error('Failed to load collect list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
        const handleFocus = () => fetchItems();
        window.addEventListener('focus', handleFocus);
        const interval = setInterval(fetchItems, 20000);
        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, []);

    const toggleSelect = (id: number) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const items = activeTab === 'to-collect' ? toCollectItems : collectedItems;
            const filtered = items.filter(item =>
                item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setSelected(filtered.map(item => item.id));
        } else {
            setSelected([]);
        }
    };

    const markCollected = async (item: CollectItem) => {
        try {
            let table = item.source;
            let id = item.id;
            const { error } = await supabase
                .from(table)
                .update({ print_status: 'collected', updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            toast.success('Marked as collected');
            fetchItems();
        } catch (err: any) {
            console.error('Error marking collected:', err);
            toast.error(`Failed to mark as collected: ${err?.message || 'Unknown error'}`);
        }
    };

    const bulkMarkCollected = async () => {
        const selectedItems = items.filter(i => selected.includes(i.id));
        for (const it of selectedItems) {
            await markCollected(it);
        }
        setSelected([]);
    };

    const handleEditItem = (item: CollectItem) => {
        navigate(`/edit-request/${item.id}?table=${item.source}`);
    };

    const handleDeleteItem = async (item: CollectItem) => {
        if (!window.confirm('Are you sure you want to delete this card?')) return;
        try {
            const { error } = await supabase.from(item.source).delete().eq('id', item.id);
            if (error) throw error;
            toast.success('Card deleted successfully');
            fetchItems();
        } catch (err: any) {
            console.error('Error deleting card:', err);
            toast.error(`Failed to delete card: ${err?.message || 'Unknown error'}`);
        }
    };

    const items = activeTab === 'to-collect' ? toCollectItems : collectedItems;

    const filteredItems = items.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const tabs = [
        { key: 'to-collect' as const, label: 'Ready to Collect', count: toCollectItems.length, icon: PackageCheck },
        { key: 'collected' as const, label: 'Collected', count: collectedItems.length, icon: PackageCheck },
    ];

    const statsData = useMemo(() => [
        { label: 'Ready to Collect', icon: PackageCheck, color: 'from-emerald-400 to-emerald-600', count: toCollectItems.length },
        { label: 'Collected', icon: Package, color: 'from-violet-400 to-violet-600', count: collectedItems.length },
        { label: 'Total Cards', icon: Layers, color: 'from-blue-400 to-blue-600', count: toCollectItems.length + collectedItems.length },
    ], [toCollectItems.length, collectedItems.length]);

    const pageNumbers: (number | '...')[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) pageNumbers.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pageNumbers.push(i);
        if (currentPage < totalPages - 2) pageNumbers.push('...');
        pageNumbers.push(totalPages);
    }

    const renderStatusBadge = (status?: string) => {
        const cfg = getStatusConfig(status);
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {status?.replace(/_/g, ' ') || 'N/A'}
            </span>
        );
    };

    const renderTableHeader = () => (
        <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                {activeTab === 'to-collect' && (
                    <th className="px-5 py-3.5 text-left w-10">
                            <input
                                type="checkbox"
                                onChange={handleSelectAll}
                                checked={filteredItems.length > 0 && selected.length === filteredItems.length}
                                className="rounded border-gray-300 dark:border-gray-600"
                            />
                    </th>
                )}
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee ID</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</th>
                {activeTab === 'to-collect' && (
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Processed</th>
                )}
                {activeTab === 'collected' && (
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collected At</th>
                )}
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
        </thead>
    );

    const renderTableRow = (item: CollectItem) => (
        <tr key={`${item.source}-${item.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
            {activeTab === 'to-collect' && (
                <td className="px-5 py-4">
                    <input
                        type="checkbox"
                        onChange={() => toggleSelect(item.id)}
                        checked={selected.includes(item.id)}
                        className="rounded border-gray-300 dark:border-gray-600"
                        onClick={(e) => e.stopPropagation()}
                    />
                </td>
            )}
            <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {item.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span>{item.name}</span>
                </div>
            </td>
            <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{item.employeeId}</td>
            <td className="px-5 py-4">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    item.source === 'id_cards'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                        : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                }`}>
                    {getSourceLabel(item.source)}
                </span>
            </td>
            <td className="px-5 py-4">{renderStatusBadge(item.print_status)}</td>
            <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{item.batch_id || '—'}</td>
            {activeTab === 'to-collect' && (
                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{item.processed_date || '—'}</td>
            )}
            {activeTab === 'collected' && (
                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{item.collected_at || '—'}</td>
            )}
            <td className="px-5 py-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                    {activeTab === 'to-collect' ? (
                        <button
                            onClick={() => markCollected(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <PackageCheck size={14} />
                            Mark Collected
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => handleEditItem(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                            >
                                <Edit3 size={13} />
                                Edit
                            </button>
                            <button
                                onClick={() => handleDeleteItem(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                            >
                                <Trash2 size={13} />
                                Delete
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </tr>
    );

    const renderMobileCard = (item: CollectItem) => (
        <div key={`${item.source}-${item.id}`} className="p-4">
            <div className="flex items-start gap-3 mb-3">
                {activeTab === 'to-collect' && (
                    <input
                        type="checkbox"
                        onChange={() => toggleSelect(item.id)}
                        checked={selected.includes(item.id)}
                        className="mt-1 rounded border-gray-300 dark:border-gray-600"
                    />
                )}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                    {item.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.employeeId}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                        item.source === 'id_cards'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                            : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                    }`}>
                        {getSourceLabel(item.source)}
                    </span>
                    {renderStatusBadge(item.print_status)}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                {item.batch_id && (
                    <div>
                        <span className="font-medium uppercase text-[10px] text-gray-400 dark:text-gray-500">Batch</span>
                        <p className="text-gray-900 dark:text-gray-200">{item.batch_id}</p>
                    </div>
                )}
                {activeTab === 'to-collect' && item.processed_date && (
                    <div>
                        <span className="font-medium uppercase text-[10px] text-gray-400 dark:text-gray-500">Processed</span>
                        <p className="text-gray-900 dark:text-gray-200">{item.processed_date}</p>
                    </div>
                )}
                {activeTab === 'collected' && item.collected_at && (
                    <div>
                        <span className="font-medium uppercase text-[10px] text-gray-400 dark:text-gray-500">Collected At</span>
                        <p className="text-gray-900 dark:text-gray-200">{item.collected_at}</p>
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                {activeTab === 'to-collect' ? (
                    <>
                        <button
                            onClick={() => markCollected(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <PackageCheck size={14} /> Collect
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => handleEditItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600 transition-colors"
                        >
                            <Edit3 size={13} />
                            Edit
                        </button>
                        <button
                            onClick={() => handleDeleteItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                            <Trash2 size={13} />
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Cards Collection</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage card pickup and collection records
                        </p>
                    </div>
                    {activeTab === 'to-collect' && (
                        <button
                            onClick={bulkMarkCollected}
                            disabled={selected.length === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 hover:bg-emerald-600 transition-colors"
                        >
                            <PackageCheck size={15} />
                            Collect Selected ({selected.length})
                        </button>
                    )}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {statsData.map(stat => {
                        const Icon = stat.icon;
                        return (
                            <button
                                key={stat.label}
                                onClick={() => {
                                    setActiveTab(stat.label === 'Ready to Collect' ? 'to-collect' : 'collected');
                                    setCurrentPage(1);
                                    setSelected([]);
                                }}
                                className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-4 hover:shadow-md transition-all text-left ${
                                    (stat.label === 'Ready to Collect' && activeTab === 'to-collect') ||
                                    (stat.label === 'Collected' && activeTab === 'collected')
                                        ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                                        <Icon size={16} className="text-white" />
                                    </div>
                                    <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                    <div className="p-5 sm:p-6">
                        {/* Tab Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
                            {tabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => { setActiveTab(tab.key); setCurrentPage(1); setSelected([]); }}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                        activeTab === tab.key
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {tab.label}
                                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                                        activeTab === tab.key
                                            ? 'bg-white/20 text-white'
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                    }`}>
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="relative w-full sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or employee ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}

                    {/* Desktop Table */}
                    {!loading && (
                        <>
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    {renderTableHeader()}
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {paginatedItems.length > 0 ? (
                                            paginatedItems.map(renderTableRow)
                                        ) : (
                                            <tr>
                                                <td colSpan={activeTab === 'to-collect' ? 9 : 8} className="px-5 py-12 text-center text-sm text-gray-400">
                                                    {searchTerm ? 'No cards match your search.' : 'No cards found.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                {paginatedItems.length > 0 ? (
                                    paginatedItems.map(renderMobileCard)
                                ) : (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                                            <Search size={20} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {searchTerm ? 'No cards match your search.' : 'No cards found.'}
                                        </p>
                                    </div>
                                )}
                                {filteredItems.length > 0 && (
                                    <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Showing {filteredItems.length} of {toCollectItems.length + collectedItems.length} cards
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                <div className="flex items-center gap-2">
                                    <label className="text-sm text-gray-600 dark:text-gray-400">Rows:</label>
                                    <select
                                        value={itemsPerPage}
                                        onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                        className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={30}>30</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(1)}
                                        disabled={currentPage <= 1}
                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        &#171;
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        &#8249;
                                    </button>
                                    <span className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        &#8250;
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(totalPages)}
                                        disabled={currentPage >= totalPages}
                                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        &#187;
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default CollectList;
