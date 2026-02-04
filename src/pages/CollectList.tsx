import React, { useEffect, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

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
            // Fetch to-collect items (only ready_to_collect status)
            const [reqRes, cardDetailsRes, idCardsRes] = await Promise.all([
                supabase.from('requests').select('*').eq('print_status', 'ready_to_collect'),
                supabase.from('card_details').select('*').eq('print_status', 'ready_to_collect'),
                supabase.from('id_cards').select('*').eq('print_status', 'ready_to_collect')
            ]);

            // Fetch collected items
            const [collReqRes, collCardDetailsRes, collIdCardsRes] = await Promise.all([
                supabase.from('requests').select('*').eq('print_status', 'collected'),
                supabase.from('card_details').select('*').eq('print_status', 'collected'),
                supabase.from('id_cards').select('*').eq('print_status', 'collected')
            ]);

            const toCollect: CollectItem[] = [];
            const collected: CollectItem[] = [];

            // Process to-collect items
            if (reqRes.data) {
                reqRes.data.forEach((r: any) => {
                    toCollect.push({
                        id: r.id,
                        source: 'requests',
                        name: r.full_name || r.name,
                        employeeId: r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status,
                        batch_id: r.batch_id || null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        raw: r
                    });
                });
            }

            if (cardDetailsRes.data) {
                cardDetailsRes.data.forEach((r: any) => {
                    toCollect.push({
                        id: r.id,
                        source: 'card_details',
                        name: r.full_name,
                        employeeId: r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status,
                        batch_id: null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        raw: r
                    });
                });
            }

            if (idCardsRes.data) {
                idCardsRes.data.forEach((r: any) => {
                    // Parse card_data if it's a string
                    const cardData = typeof r.card_data === 'string' ? JSON.parse(r.card_data) : r.card_data;
                    toCollect.push({
                        id: r.id,
                        source: 'id_cards',
                        name: cardData?.['Full Name'] || cardData?.fullName || cardData?.name || 'Bulk Card',
                        employeeId: cardData?.['Employee ID'] || cardData?.employeeId || r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status,
                        batch_id: r.batch_id || null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        raw: r
                    });
                });
            }

            // Process collected items
            if (collReqRes.data) {
                collReqRes.data.forEach((r: any) => {
                    collected.push({
                        id: r.id,
                        source: 'requests',
                        name: r.full_name || r.name,
                        employeeId: r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status,
                        batch_id: r.batch_id || null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        collected_at: r.updated_at ? `${new Date(r.updated_at).toLocaleDateString()} ${new Date(r.updated_at).toLocaleTimeString()}` : '-',
                        raw: r
                    });
                });
            }

            if (collCardDetailsRes.data) {
                collCardDetailsRes.data.forEach((r: any) => {
                    collected.push({
                        id: r.id,
                        source: 'card_details',
                        name: r.full_name,
                        employeeId: r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status,
                        batch_id: null,
                        processed_date: r.updated_at && new Date(r.updated_at).toLocaleDateString(),
                        collected_at: r.updated_at ? `${new Date(r.updated_at).toLocaleDateString()} ${new Date(r.updated_at).toLocaleTimeString()}` : '-',
                        raw: r
                    });
                });
            }

            if (collIdCardsRes.data) {
                collIdCardsRes.data.forEach((r: any) => {
                    // Parse card_data if it's a string
                    const cardData = typeof r.card_data === 'string' ? JSON.parse(r.card_data) : r.card_data;
                    collected.push({
                        id: r.id,
                        source: 'id_cards',
                        name: cardData?.['Full Name'] || cardData?.fullName || cardData?.name || 'Bulk Card',
                        employeeId: cardData?.['Employee ID'] || cardData?.employeeId || r.employee_id,
                        date: r.created_at && new Date(r.created_at).toLocaleDateString(),
                        print_status: r.print_status,
                        batch_id: r.batch_id || null,
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

            // Only update print_status, don't update status field
            // as it may not exist or have different enum values in different tables
            const { error } = await supabase
                .from(table)
                .update({
                    print_status: 'collected',
                    updated_at: new Date().toISOString()
                })
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

    const getSourceLabel = (source: string) => {
        switch (source) {
            case 'requests':
                return 'Single Card';
            case 'card_details':
                return 'Single Card';
            case 'id_cards':
                return 'Bulk Cards';
            default:
                return source;
        }
    };

    // Get the correct items based on active tab
    const items = activeTab === 'to-collect' ? toCollectItems : collectedItems;

    // Filter items based on search term
    const filteredItems = items.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination calculations
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    // Reset to first page when search changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={() => { }} activeTab="manage-requests" />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold">Cards Collection Management</h1>
                        <div className="flex items-center gap-2">
                            <button onClick={() => navigate('/dashboard')} className="px-4 py-2 rounded bg-gray-100">Back</button>
                            <button onClick={bulkMarkCollected} disabled={selected.length === 0 || activeTab === 'collected'} className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">Mark Selected Collected ({selected.length})</button>
                        </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="mb-6 flex border-b">
                        <button
                            onClick={() => { setActiveTab('to-collect'); setCurrentPage(1); setSelected([]); }}
                            className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'to-collect'
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Ready to Collect ({toCollectItems.length})
                        </button>
                        <button
                            onClick={() => { setActiveTab('collected'); setCurrentPage(1); setSelected([]); }}
                            className={`px-6 py-3 font-medium border-b-2 transition-colors ${activeTab === 'collected'
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            Collected ({collectedItems.length})
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        <input
                            type="text"
                            placeholder="Search by name or employee ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                        <div className="flex gap-2 items-center">
                            <label className="text-sm font-medium">Items per page:</label>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                <option value={30}>30</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>

                    {/* Results summary */}
                    <div className="mb-4 text-sm text-gray-600">
                        Showing {paginatedItems.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} cards
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    {activeTab === 'to-collect' && (
                                        <th className="px-4 py-3 text-left">
                                            <input
                                                type="checkbox"
                                                checked={filteredItems.length > 0 && selected.length === filteredItems.length}
                                                onChange={toggleSelectAll}
                                                title="Select All"
                                            />
                                        </th>
                                    )}
                                    <th className="px-4 py-3 text-left">Name</th>
                                    <th className="px-4 py-3 text-left">Employee ID</th>
                                    <th className="px-4 py-3 text-left">Source</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-left">Batch</th>
                                    {activeTab === 'to-collect' && (
                                        <th className="px-4 py-3 text-left">Processed Date</th>
                                    )}
                                    {activeTab === 'collected' && (
                                        <th className="px-4 py-3 text-left">Collection Time</th>
                                    )}
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.map(item => (
                                    <tr key={`${item.source}-${item.id}`} className="border-t">
                                        {activeTab === 'to-collect' && (
                                            <td className="px-4 py-3">
                                                <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} />
                                            </td>
                                        )}
                                        <td className="px-4 py-3">{item.name}</td>
                                        <td className="px-4 py-3">{item.employeeId}</td>
                                        <td className="px-4 py-3">{getSourceLabel(item.source)}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${item.print_status === 'collected' ? 'bg-gray-200 text-gray-800' :
                                                item.print_status === 'ready_to_collect' ? 'bg-green-200 text-green-800' :
                                                    item.print_status === 'printed' ? 'bg-blue-200 text-blue-800' :
                                                        item.print_status === 'sent_for_printing' ? 'bg-yellow-200 text-yellow-800' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                {item.print_status?.replace(/_/g, ' ') || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">{item.batch_id || '-'}</td>
                                        {activeTab === 'to-collect' && (
                                            <td className="px-4 py-3">{item.processed_date || '-'}</td>
                                        )}
                                        {activeTab === 'collected' && (
                                            <td className="px-4 py-3">{item.collected_at || '-'}</td>
                                        )}
                                        <td className="px-4 py-3 text-right">
                                            {activeTab === 'to-collect' && (
                                                <button onClick={() => markCollected(item)} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">Mark Collected</button>
                                            )}
                                            {activeTab === 'collected' && (
                                                <span className="text-gray-600 text-sm">Collected</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {paginatedItems.length === 0 && (
                                    <tr><td colSpan={activeTab === 'to-collect' ? 9 : 8} className="px-4 py-6 text-center text-gray-500">
                                        {searchTerm ? 'No cards match your search' : 'No cards found'}
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex justify-center items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Previous
                            </button>

                            <div className="flex gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-3 py-2 rounded ${currentPage === page
                                            ? 'bg-green-600 text-white'
                                            : 'border hover:bg-gray-100'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default CollectList;
