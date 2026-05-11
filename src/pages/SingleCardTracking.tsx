import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import AppHeader from '../components/AppHeader';
import { IDCardFront } from '../components/IDCardFront';
import { IDCardBack } from '../components/IDCardBack';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { imageToDataUrl } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Eye, Download, ChevronRight, ChevronLeft, Loader2, Trash2, AlertCircle, Edit3, Clock, CheckCircle2, Printer, Package, X, Send, Box, Plus } from 'lucide-react';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

const PAGE_SIZES = [10, 20, 50];

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
    pending: { color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', dot: 'bg-gray-500', label: 'Pending' },
    not_printed: { color: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', dot: 'bg-gray-500', label: 'Pending' },
    sent_for_printing: { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500', label: 'Sent for Print' },
    printed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Printed' },
    ready_to_collect: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Ready to Collect' },
    collected: { color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800', dot: 'bg-violet-500', label: 'Collected' },
    approved: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Approved' },
    rejected: { color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500', label: 'Rejected' },
};

const getStatusConfig = (status: string, printStatus: string) => {
    if (printStatus && statusConfig[printStatus]) return statusConfig[printStatus];
    const key = status?.toLowerCase().replace(/\s+/g, '_');
    return statusConfig[key] || statusConfig.pending;
};

const getDisplayStatus = (card: any) => {
    if (card.print_status === 'collected') return 'Collected';
    if (card.print_status === 'ready_to_collect') return 'Ready to Collect';
    if (card.print_status === 'printed' || card.print_status === 'completed') return 'Printed';
    if (card.print_status === 'sent_for_printing') return 'Sent for Print';
    if (card.print_status === 'not_printed' || !card.print_status) return 'Pending';
    return 'Pending';
};

const SingleCardTracking = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState(() => {
        const params = new URLSearchParams(location.search);
        return params.get('status') || 'all';
    });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(PAGE_SIZES[0]);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [previewCard, setPreviewCard] = useState<any | null>(null);
    const [isCardFlipped, setIsCardFlipped] = useState(false);
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');

    // Print flow state
    const [vendors, setVendors] = useState<any[]>([]);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [processingCard, setProcessingCard] = useState<any | null>(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('status');
        if (status) setStatusFilter(status);
    }, [location.search]);

    useEffect(() => {
        fetchCards();
        fetchVendors();
        loadLogos();
    }, []);

    const loadLogos = async () => {
        try {
            const [front, back] = await Promise.all([
                imageToDataUrl(cloveLogo),
                imageToDataUrl(backLogoSvg),
            ]);
            setFrontLogoDataUrl(front);
            setBackLogoDataUrl(back);
        } catch (error) {
            console.error('Error loading logo images:', error);
        }
    };

    const fetchVendors = async () => {
        const { data, error } = await supabase.from('vendors').select('id,name');
        if (error) console.error('Error fetching vendors:', error);
        else setVendors(data || []);
    };

    const openPreview = (card: any) => {
        setPreviewCard(card);
        setIsCardFlipped(false);
    };

    const closePreview = () => {
        setPreviewCard(null);
        setIsCardFlipped(false);
    };

    const fetchCards = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('card_details')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCards(data || []);
        } catch (err: any) {
            toast.error('Failed to load cards');
        } finally {
            setLoading(false);
        }
    };

    const cardToEmployee = (card: any) => ({
        id: card.id,
        fullName: card.full_name,
        employeeId: card.employee_id,
        bloodGroup: card.blood_group,
        branch: card.branch,
        address: card.branch,
        photo: card.photo_url,
        photo_url: card.photo_url,
        emergencyContact: card.emergency_contact,
        countryCode: '+91',
        frontLogoDataUrl,
        backLogoDataUrl,
    });

    const filteredCards = cards.filter(c => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const nameMatch = c.full_name?.toLowerCase().includes(q);
            const idMatch = c.employee_id?.toLowerCase().includes(q);
            const branchMatch = c.branch?.toLowerCase().includes(q);
            if (!nameMatch && !idMatch && !branchMatch) return false;
        }
        if (statusFilter !== 'all') {
            const displayStatus = getDisplayStatus(c);
            if (displayStatus !== statusFilter) return false;
        }
        return true;
    });

    useEffect(() => { setPage(1); }, [searchQuery, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredCards.length / perPage));
    const safePage = Math.min(page, totalPages);
    const paginatedCards = filteredCards.slice((safePage - 1) * perPage, safePage * perPage);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const handleSelectAll = (checked: boolean) => {
        if (checked) setSelectedRows(new Set(paginatedCards.map(c => c.id)));
        else setSelectedRows(new Set());
    };

    const handleSelectOne = (id: number) => {
        const next = new Set(selectedRows);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedRows(next);
    };

    const handleDownload = (card: any) => {
        if (!card.zip_url) {
            toast.error('No ZIP file available');
            return;
        }
        const link = document.createElement('a');
        link.href = card.zip_url;
        link.download = `${(card.full_name || 'card').replace(/ /g, '_')}_ID_Card.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this card?')) return;
        try {
            const { error } = await supabase.from('card_details').delete().eq('id', id);
            if (error) throw error;
            toast.success('Card deleted');
            setCards(prev => prev.filter(c => c.id !== id));
        } catch (err: any) {
            toast.error('Failed to delete card');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return;
        if (!window.confirm(`Delete ${selectedRows.size} selected card(s)?`)) return;
        const ids = Array.from(selectedRows);
        const { error } = await supabase.from('card_details').delete().in('id', ids);
        if (error) { toast.error('Failed to delete cards'); return; }
        toast.success(`${ids.length} card(s) deleted`);
        setCards(prev => prev.filter(c => !ids.includes(c.id)));
        setSelectedRows(new Set());
    };

    const handleBulkDownload = async () => {
        if (selectedRows.size === 0) return;
        const cardsToDownload = cards.filter(c => selectedRows.has(c.id) && c.zip_url);
        if (cardsToDownload.length === 0) { toast.error('No ZIP files available for selected cards'); return; }
        const master = new JSZip();
        let hasFiles = false;
        for (const card of cardsToDownload) {
            try {
                const resp = await fetch(card.zip_url);
                if (!resp.ok) continue;
                const blob = await resp.blob();
                const inner = await new JSZip().loadAsync(blob);
                inner.forEach((path, file) => {
                    if (!file.dir) master.file(`${(card.full_name || 'card').replace(/ /g, '_')}/${path}`, file.async('blob'));
                });
                hasFiles = true;
            } catch { toast.error(`Failed to fetch ZIP for ${card.full_name}`); }
        }
        if (!hasFiles) { toast.error('No ZIP files could be downloaded'); return; }
        const blob = await master.generateAsync({ type: 'blob' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `Selected_Cards_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(a.href);
        toast.success('Download started');
    };

    const handleMarkAsDone = async (id: number) => {
        const { error } = await supabase
            .from('card_details')
            .update({ print_status: 'ready_to_collect', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) {
            toast.error('Failed to mark card as ready to collect');
        } else {
            toast.success('Card marked as ready to collect!');
            setCards(prev => prev.map(c => c.id === id ? { ...c, print_status: 'ready_to_collect' } : c));
        }
    };

    const handleMarkAsCollected = async (id: number) => {
        const { error } = await supabase
            .from('card_details')
            .update({ print_status: 'collected', updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) {
            toast.error('Failed to mark card as collected');
        } else {
            toast.success('Card marked as collected!');
            setCards(prev => prev.map(c => c.id === id ? { ...c, print_status: 'collected' } : c));
        }
    };

    const confirmSendToPrint = async () => {
        if (!selectedVendorId) { toast.error('Please select a vendor.'); return; }
        setIsDownloading(true);

        const recordsToInsert: any[] = [];
        const cardsToUpdate: number[] = [];

        for (const cardId of Array.from(selectedRows)) {
            const card = cards.find(c => c.id === cardId);
            if (!card) continue;
            setProcessingCard(card);
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                const cardElement = document.getElementById(`id-card-${card.id}`);
                if (cardElement) {
                    const frontCanvas = await html2canvas(cardElement.querySelector('.id-card-front') as HTMLElement, { scale: 12 });
                    const backCanvas = await html2canvas(cardElement.querySelector('.id-card-back') as HTMLElement, { scale: 12 });
                    const frontImage = frontCanvas.toDataURL('image/png');
                    const backImage = backCanvas.toDataURL('image/png');

                    const frontImagePath = `public/${card.id}-${card.employee_id}-front.png`;
                    const backImagePath = `public/${card.id}-${card.employee_id}-back.png`;

                    const uploadImage = async (path: string, dataUrl: string) => {
                        const blob = await (await fetch(dataUrl)).blob();
                        const { error } = await supabase.storage.from('id-card-images').upload(path, blob, { upsert: true });
                        if (error) throw error;
                        return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
                    };

                    let front_image_url = '';
                    let back_image_url = '';
                    try {
                        [front_image_url, back_image_url] = await Promise.all([
                            uploadImage(frontImagePath, frontImage),
                            uploadImage(backImagePath, backImage),
                        ]);
                    } catch (uploadErr) {
                        console.error('Storage upload failed:', uploadErr);
                    }

                    recordsToInsert.push({
                        vendor_id: selectedVendorId,
                        front_image_url: front_image_url || null,
                        back_image_url: back_image_url || null,
                        card_details: cardToEmployee(card),
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        card_details_id: card.id,
                        source_table: 'card_details',
                    });
                    cardsToUpdate.push(card.id);
                }
            } catch (error) {
                console.error(`Error processing card ${card.id}:`, error);
                toast.error(`Failed to process card for ${card.full_name}.`);
            }
        }

        if (recordsToInsert.length > 0) {
            const { error: sendError } = await supabase.from('vendor_requests').insert(recordsToInsert);
            if (sendError) {
                toast.error('Failed to send cards to vendor.');
            } else {
                for (const id of cardsToUpdate) {
                    await supabase.from('card_details').update({ print_status: 'sent_for_printing' }).eq('id', id);
                }
                toast.success('Cards sent to vendor successfully!');
                setCards(prev => prev.map(c =>
                    cardsToUpdate.includes(c.id) ? { ...c, print_status: 'sent_for_printing' } : c
                ));
                setSelectedRows(new Set());
                setIsVendorModalOpen(false);
                setSelectedVendorId(null);
            }
        }

        setIsDownloading(false);
        setProcessingCard(null);
    };

    const renderRowActions = (card: any) => {
        if (card.print_status === 'printed') {
            return (
                <button
                    onClick={() => handleMarkAsDone(card.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors"
                    title="Mark as Ready to Collect"
                >
                    <Box size={13} /> Done
                </button>
            );
        }
        if (card.print_status === 'ready_to_collect') {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                        <Box size={12} /> Ready
                    </span>
                    <button
                        onClick={() => handleMarkAsCollected(card.id)}
                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                    >
                        Collected
                    </button>
                </div>
            );
        }
        if (card.print_status === 'collected') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800">
                    Collected
                </span>
            );
        }
        return null;
    };

    const statsData = [
        { label: 'Pending', key: 'Pending', icon: Clock, color: 'from-gray-400 to-gray-600', count: cards.filter(c => getDisplayStatus(c) === 'Pending').length },
        { label: 'Sent for Print', key: 'Sent for Print', icon: Printer, color: 'from-blue-400 to-blue-600', count: cards.filter(c => getDisplayStatus(c) === 'Sent for Print').length },
        { label: 'Printed', key: 'Printed', icon: CheckCircle2, color: 'from-emerald-400 to-emerald-600', count: cards.filter(c => getDisplayStatus(c) === 'Printed').length },
        { label: 'Ready to Collect', key: 'Ready to Collect', icon: Package, color: 'from-emerald-400 to-emerald-600', count: cards.filter(c => getDisplayStatus(c) === 'Ready to Collect').length },
        { label: 'Collected', key: 'Collected', icon: Package, color: 'from-violet-400 to-violet-600', count: cards.filter(c => getDisplayStatus(c) === 'Collected').length },
    ];

    const displayStatuses = ['all', 'Pending', 'Sent for Print', 'Printed', 'Ready to Collect', 'Collected'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            <ChevronLeft size={18} />
                            <span className="hidden md:inline">Back</span>
                        </button>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Single Card Details</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''} found
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/single-card')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                    >
                        <Plus size={15} /> Create Card
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    {statsData.map(stat => {
                        const Icon = stat.icon;
                        return (
                            <button
                                key={stat.label}
                                onClick={() => setStatusFilter(stat.key === statusFilter ? 'all' : stat.key)}
                                className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-4 hover:shadow-md transition-all text-left ${
                                    statusFilter === stat.key
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

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                    <div className="p-5 sm:p-6">
                        {/* Desktop: pill buttons */}
                        <div className="hidden md:flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
                            {displayStatuses.map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                        statusFilter === status
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {status === 'all' ? 'All Statuses' : status}
                                </button>
                            ))}
                        </div>

                        {/* Mobile: dropdown */}
                        <div className="md:hidden mb-4">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                            >
                                {displayStatuses.map(status => (
                                    <option key={status} value={status}>
                                        {status === 'all' ? 'All Statuses' : status}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="relative w-full sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, ID, or branch..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {selectedRows.size > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={handleBulkDownload}
                                        disabled={isDownloading}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 hover:bg-emerald-600 transition-colors"
                                    >
                                        <Download size={15} />
                                        Download ({selectedRows.size})
                                    </button>
                                    <button
                                        onClick={handleBulkDelete}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors"
                                    >
                                        <Trash2 size={15} />
                                        Delete ({selectedRows.size})
                                    </button>
                                    <button
                                        onClick={() => setIsVendorModalOpen(true)}
                                        disabled={isDownloading}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 hover:bg-blue-600 transition-colors"
                                    >
                                        <Send size={15} />
                                        Send to Print ({selectedRows.size})
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                                    <th className="px-5 py-3.5 text-left w-10">
                                        <input
                                            type="checkbox"
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            checked={paginatedCards.length > 0 && selectedRows.size === paginatedCards.length}
                                            className="rounded border-gray-300 dark:border-gray-600"
                                        />
                                    </th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Full Name</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee ID</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center">
                                            <Loader2 size={24} className="animate-spin mx-auto text-orange-500" />
                                        </td>
                                    </tr>
                                ) : paginatedCards.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-sm text-gray-400">
                                            {searchQuery ? 'No cards match your search.' : 'No cards found.'}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedCards.map(card => {
                                        const displayStatus = getDisplayStatus(card);
                                        const sc = getStatusConfig(displayStatus, card.print_status);
                                        return (
                                            <tr key={card.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                                <td className="px-5 py-4">
                                                    <input
                                                        type="checkbox"
                                                        onChange={() => handleSelectOne(card.id)}
                                                        checked={selectedRows.has(card.id)}
                                                        className="rounded border-gray-300 dark:border-gray-600"
                                                    />
                                                </td>
                                                <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{card.full_name}</td>
                                                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{card.employee_id}</td>
                                                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{card.branch || '-'}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                        card.source_type === 'single_card_editor' || !card.source_type
                                                            ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                                                            : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                                    }`}>
                                                        {card.source_type === 'single_card_editor' || !card.source_type ? 'Single Card Editor' : 'Bulk Import'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${sc.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                        {displayStatus}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {new Date(card.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => openPreview(card)}
                                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                            title="Preview Card"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/single-card?requestId=${card.id}`)}
                                                            className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                            title="Edit Card"
                                                        >
                                                            <Edit3 size={16} />
                                                        </button>
                                                        {card.zip_url && (
                                                            <button
                                                                onClick={() => handleDownload(card)}
                                                                className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                                title="Download"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(card.id)}
                                                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                        {renderRowActions(card)}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                        {loading ? (
                            <div className="p-8 text-center">
                                <Loader2 size={24} className="animate-spin mx-auto text-orange-500" />
                            </div>
                        ) : paginatedCards.length === 0 ? (
                            <div className="p-8 text-center">
                                <AlertCircle size={24} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {searchQuery ? 'No cards match your search.' : 'No cards found.'}
                                </p>
                            </div>
                        ) : (
                            paginatedCards.map(card => {
                                const displayStatus = getDisplayStatus(card);
                                const sc = getStatusConfig(displayStatus, card.print_status);
                                return (
                                    <div key={card.id} className="p-4">
                                        <div className="flex items-start gap-3 mb-2">
                                            <input
                                                type="checkbox"
                                                onChange={() => handleSelectOne(card.id)}
                                                checked={selectedRows.has(card.id)}
                                                className="mt-1 rounded border-gray-300 dark:border-gray-600"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.full_name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.employee_id}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                                    card.source_type === 'single_card_editor' || !card.source_type
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                                }`}>
                                                    {card.source_type === 'single_card_editor' || !card.source_type ? 'Single Card' : 'Bulk Import'}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${sc.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {displayStatus}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-3 ml-7">{card.branch || '-'} · {new Date(card.created_at).toLocaleDateString()}</p>
                                        <div className="flex items-center gap-2 ml-7">
                                            <button onClick={() => openPreview(card)}
                                                className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors">
                                                <Eye size={13} /> Preview
                                            </button>
                                            <button onClick={() => navigate(`/single-card?requestId=${card.id}`)}
                                                className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/10 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                                                <Edit3 size={13} /> Edit
                                            </button>
                                            {card.zip_url && (
                                                <button onClick={() => handleDownload(card)}
                                                    className="p-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors">
                                                    <Download size={14} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(card.id)}
                                                className="p-2 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                                <Trash2 size={14} />
                                            </button>
                                            {card.print_status === 'printed' && (
                                                <button onClick={() => handleMarkAsDone(card.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors">
                                                    <Box size={13} /> Done
                                                </button>
                                            )}
                                            {card.print_status === 'ready_to_collect' && (
                                                <button onClick={() => handleMarkAsCollected(card.id)}
                                                    className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                                                    Collected
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredCards.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>Rows per page:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                >
                                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <span className="ml-2">{filteredCards.length} total</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(1)} disabled={safePage === 1}
                                    className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{'<<'}</button>
                                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1}
                                    className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                                <span className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-white">Page {safePage} of {totalPages}</span>
                                <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}
                                    className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                                    className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{'>>'}</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Card Preview Modal */}
                {previewCard && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closePreview}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{previewCard.full_name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{previewCard.employee_id}</p>
                                </div>
                                <button onClick={closePreview}
                                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-5">
                                <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">Click the card to see the back</p>
                                <div className="relative h-[400px] w-full perspective-1000 flex items-center justify-center">
                                    <div
                                        className={`relative w-full h-full max-w-sm transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${isCardFlipped ? 'rotate-y-180' : ''}`}
                                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                                    >
                                        <div className="absolute w-full h-full backface-hidden">
                                            <div className="w-full h-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg flex items-center justify-center">
                                                <IDCardFront
                                                    employee={{
                                                        fullName: previewCard.full_name,
                                                        employeeId: previewCard.employee_id,
                                                        bloodGroup: previewCard.blood_group,
                                                        branch: previewCard.branch,
                                                        emergencyContact: previewCard.emergency_contact,
                                                        countryCode: previewCard.country_code || '+91',
                                                        photo: previewCard.photo_url || null,
                                                    }}
                                                    logoSrc={frontLogoDataUrl}
                                                />
                                            </div>
                                        </div>
                                        <div className="absolute w-full h-full backface-hidden rotate-y-180">
                                            <div className="w-full h-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg flex items-center justify-center">
                                                <IDCardBack
                                                    employee={{
                                                        fullName: previewCard.full_name,
                                                        employeeId: previewCard.employee_id,
                                                        bloodGroup: previewCard.blood_group,
                                                        branch: previewCard.branch,
                                                        emergencyContact: previewCard.emergency_contact,
                                                        countryCode: previewCard.country_code || '+91',
                                                    }}
                                                    logoSrc={backLogoDataUrl}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                                <button onClick={closePreview}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    Close
                                </button>
                                <button onClick={() => { closePreview(); navigate(`/single-card?requestId=${previewCard.id}`); }}
                                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors">
                                    Edit Card
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Vendor Modal */}
            {isVendorModalOpen && (
                <div className="fixed inset-0 bg-gray-800/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Send to Print</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                Select a vendor to send {selectedRows.size} ID card{selectedRows.size !== 1 ? 's' : ''} to for printing.
                            </p>
                            <select
                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none mb-5"
                                onChange={(e) => setSelectedVendorId(e.target.value)}
                                value={selectedVendorId || ''}
                            >
                                <option value="" disabled>Select a vendor</option>
                                {vendors.map(vendor => (
                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-3">
                                <button
                                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => { setIsVendorModalOpen(false); setSelectedVendorId(null); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 transition-colors"
                                    onClick={confirmSendToPrint}
                                    disabled={!selectedVendorId || isDownloading}
                                >
                                    {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                    {isDownloading ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <HiddenCardRenderer
                id={processingCard ? `id-card-${processingCard.id}` : undefined}
                employee={processingCard ? cardToEmployee(processingCard) : null}
                frontLogoSrc={frontLogoDataUrl}
                backLogoSrc={backLogoDataUrl}
            />
        </div>
    );
};

export default SingleCardTracking;
