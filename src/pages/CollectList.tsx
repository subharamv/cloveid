import React, { useEffect, useState } from 'react';
import AppHeader from '../components/AppHeader';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight, User, Hash, Layers, Calendar, Clock, CheckSquare, Square, ArrowLeft, PackageCheck } from 'lucide-react';

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
    const [itemsPerPage, setItemsPerPage] = useState(30);
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

    const toggleSelectAll = () => {
        const items = activeTab === 'to-collect' ? toCollectItems : collectedItems;
        const filteredItems = items.filter(item =>
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        if (selected.length === filteredItems.length) {
            setSelected([]);
        } else {
            setSelected(filteredItems.map(item => item.id));
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
            <tr className="border-b border-gray-100 dark:border-gray-800">
                {activeTab === 'to-collect' && (
                    <th className="px-4 py-3.5 text-left w-10">
                        <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                            {filteredItems.length > 0 && selected.length === filteredItems.length
                                ? <CheckSquare size={16} className="text-orange-500" />
                                : <Square size={16} />}
                        </button>
                    </th>
                )}
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch</th>
                {activeTab === 'to-collect' && (
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Processed</th>
                )}
                {activeTab === 'collected' && (
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Collected At</th>
                )}
                <th className="px-4 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
        </thead>
    );

    const renderTableRow = (item: CollectItem) => (
        <tr key={`${item.source}-${item.id}`} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
            {activeTab === 'to-collect' && (
                <td className="px-4 py-3.5">
                    <button onClick={() => toggleSelect(item.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        {selected.includes(item.id)
                            ? <CheckSquare size={16} className="text-orange-500" />
                            : <Square size={16} />}
                    </button>
                </td>
            )}
            <td className="px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {item.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</span>
                </div>
            </td>
            <td className="px-4 py-3.5 text-sm text-gray-600 dark:text-gray-400 font-mono">{item.employeeId}</td>
            <td className="px-4 py-3.5">
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded-md">{getSourceLabel(item.source)}</span>
            </td>
            <td className="px-4 py-3.5">{renderStatusBadge(item.print_status)}</td>
            <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{item.batch_id || '—'}</td>
            {activeTab === 'to-collect' && (
                <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{item.processed_date || '—'}</td>
            )}
            {activeTab === 'collected' && (
                <td className="px-4 py-3.5 text-sm text-gray-500 dark:text-gray-400">{item.collected_at || '—'}</td>
            )}
            <td className="px-4 py-3.5 text-right">
                {activeTab === 'to-collect' ? (
                    <button
                        onClick={() => markCollected(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold hover:from-emerald-600 hover:to-emerald-700 shadow-sm shadow-emerald-200 dark:shadow-emerald-900/30 transition-all"
                    >
                        <PackageCheck size={14} />
                        Mark Collected
                    </button>
                ) : (
                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Collected</span>
                )}
            </td>
        </tr>
    );

    const renderMobileCard = (item: CollectItem) => (
        <div key={`${item.source}-${item.id}`} className="bg-white dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {item.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.employeeId}</p>
                    </div>
                </div>
                {renderStatusBadge(item.print_status)}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1"><Layers size={12} />{getSourceLabel(item.source)}</span>
                <span className="flex items-center gap-1"><Hash size={12} />{item.batch_id || '—'}</span>
                {activeTab === 'to-collect' && item.processed_date && (
                    <span className="flex items-center gap-1"><Calendar size={12} />{item.processed_date}</span>
                )}
                {activeTab === 'collected' && item.collected_at && (
                    <span className="flex items-center gap-1"><Clock size={12} />{item.collected_at}</span>
                )}
            </div>
            {activeTab === 'to-collect' && (
                <div className="flex gap-2">
                    <button
                        onClick={() => toggleSelect(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            selected.includes(item.id)
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                        {selected.includes(item.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                        {selected.includes(item.id) ? 'Selected' : 'Select'}
                    </button>
                    <button
                        onClick={() => markCollected(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all"
                    >
                        <PackageCheck size={14} /> Collect
                    </button>
                </div>
            )}
            {activeTab === 'collected' && (
                <p className="text-xs text-gray-400 italic">Already collected</p>
            )}
        </div>
    );

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AppHeader />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Cards Collection</h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage card pickup and collection records</p>
                            </div>
                        </div>
                        {activeTab === 'to-collect' && (
                            <button
                                onClick={bulkMarkCollected}
                                disabled={selected.length === 0}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 transition-all"
                            >
                                <PackageCheck size={18} />
                                Collect Selected ({selected.length})
                            </button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1.5 mb-6 bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl w-fit">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setActiveTab(tab.key); setCurrentPage(1); setSelected([]); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab.key
                                        ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    activeTab === tab.key
                                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                                }`}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search & Per Page */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or employee ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Per page:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                            >
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Results count */}
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                        Showing {paginatedItems.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} cards
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
                            <div className="hidden md:block bg-white dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                                <table className="w-full">
                                    {renderTableHeader()}
                                    <tbody>
                                        {paginatedItems.map(renderTableRow)}
                                        {paginatedItems.length === 0 && (
                                            <tr>
                                                <td colSpan={activeTab === 'to-collect' ? 9 : 8} className="px-4 py-12 text-center">
                                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                                        <PackageCheck size={32} className="text-gray-300 dark:text-gray-600" />
                                                        <p className="text-sm">{searchTerm ? 'No cards match your search' : 'No cards found'}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-3">
                                {paginatedItems.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
                                        <PackageCheck size={32} className="text-gray-300 dark:text-gray-600" />
                                        <p className="text-sm">{searchTerm ? 'No cards match your search' : 'No cards found'}</p>
                                    </div>
                                ) : (
                                    paginatedItems.map(renderMobileCard)
                                )}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <p className="text-xs text-gray-400">
                                        Page {currentPage} of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white dark:bg-gray-800"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        {pageNumbers.map((page, i) =>
                                            page === '...' ? (
                                                <span key={`ellipsis-${i}`} className="px-2 text-gray-400 text-sm">...</span>
                                            ) : (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-all ${
                                                        currentPage === page
                                                            ? 'bg-gradient-to-r from-orange-400 to-orange-600 text-white shadow-sm shadow-orange-200 dark:shadow-orange-900/30'
                                                            : 'border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-800'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        )}
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all bg-white dark:bg-gray-800"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CollectList;
