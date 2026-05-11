import React, { useEffect, useState, useMemo, useRef } from 'react';
import AppHeader from '../components/AppHeader';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
    Search, ChevronLeft, ChevronRight, Loader2, RefreshCw,
    Clock, Printer, CheckCircle2, Package, Archive, Download,
    Layers, User, FileText, Eye, ExternalLink, X, HardDriveUpload,
} from 'lucide-react';
import { IDCardFront } from '@/components/IDCardFront';
import { IDCardBack } from '@/components/IDCardBack';
import { Employee } from '@/types/employee';
import html2canvas from 'html2canvas';
import { uploadCardImageToDrive } from '@/lib/googleDriveUpload';

const PAGE_SIZES = [10, 25, 50];

type Source = 'bulk' | 'single' | 'request';

interface UnifiedCard {
    id: string | number;
    name: string;
    employeeId: string;
    branch: string;
    batchId: string;
    rawStatus: string;
    printStatus: string;
    createdAt: string;
    source: Source;
    zipUrl?: string | null;
}

const getUnifiedStatus = (item: UnifiedCard): string => {
    const ps = (item.printStatus || '').toLowerCase();
    if (ps === 'collected') return 'Collected';
    if (ps === 'ready_to_collect') return 'Ready to Collect';
    if (ps === 'printed') return 'Printed';
    if (ps === 'sent_for_printing') return 'Sent for Print';
    if (item.source === 'request') {
        const s = item.rawStatus;
        if (s === 'Approved') return 'Approved';
        if (s === 'Rejected') return 'Rejected';
        if (s === 'Sent for Print') return 'Sent for Print';
        if (s === 'Printed') return 'Printed';
    }
    return 'Pending';
};

const statusBadgeConfig: Record<string, { color: string; dot: string }> = {
    'Pending':          { color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', dot: 'bg-gray-500' },
    'Sent for Print':   { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500' },
    'Printed':          { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
    'Ready to Collect': { color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
    'Collected':        { color: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800', dot: 'bg-violet-500' },
    'Approved':         { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
    'Rejected':         { color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500' },
};

const sourceConfig: Record<Source, { label: string; color: string }> = {
    bulk:    { label: 'Bulk Import',       color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
    single:  { label: 'Single Card',       color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800' },
    request: { label: 'Employee Request',  color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
};

const IssuedCards = () => {
    const navigate = useNavigate();
    const frontCardRef = useRef<HTMLDivElement>(null);
    const backCardRef = useRef<HTMLDivElement>(null);

    const [items, setItems] = useState<UnifiedCard[]>([]);
    const [branches, setBranches] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | Source>('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [branchFilter, setBranchFilter] = useState('');
    const [batchIdFilter, setBatchIdFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const [sortField, setSortField] = useState<keyof UnifiedCard>('createdAt');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(PAGE_SIZES[0]);

    // Preview modal state
    const [previewCard, setPreviewCard] = useState<UnifiedCard | null>(null);
    const [previewEmployee, setPreviewEmployee] = useState<Employee | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [driveFrontUrl, setDriveFrontUrl] = useState<string | null>(null);
    const [driveBackUrl, setDriveBackUrl] = useState<string | null>(null);
    const [savingToDrive, setSavingToDrive] = useState(false);
    const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [bulkRes, singleRes, requestsRes] = await Promise.all([
                supabase.from('employee_card_details').select('*').not('card_id', 'is', null).order('card_created_at', { ascending: false }),
                supabase.from('card_details').select('*').order('created_at', { ascending: false }),
                supabase.from('requests').select('*').is('batch_id', null).order('created_at', { ascending: false }),
            ]);

            const bulkCards: UnifiedCard[] = (bulkRes.data || []).map(c => ({
                id: c.card_id,
                name: c.name || '',
                employeeId: c.employee_id || '',
                branch: c.branch || '',
                batchId: c.batch_id || '',
                rawStatus: c.card_status || '',
                printStatus: c.print_status || 'not_printed',
                createdAt: c.card_created_at || '',
                source: 'bulk',
                zipUrl: c.zip_url,
            }));

            const singleCards: UnifiedCard[] = (singleRes.data || []).map(c => ({
                id: c.id,
                name: c.full_name || '',
                employeeId: c.employee_id || '',
                branch: c.branch || '',
                batchId: '',
                rawStatus: c.print_status || '',
                printStatus: c.print_status || 'not_printed',
                createdAt: c.created_at || '',
                source: 'single',
                zipUrl: c.zip_url,
            }));

            const requestCards: UnifiedCard[] = (requestsRes.data || []).map(c => ({
                id: c.id,
                name: c.full_name || '',
                employeeId: c.employee_id || '',
                branch: c.branch || '',
                batchId: '',
                rawStatus: c.status || 'Pending',
                printStatus: c.print_status || 'not_printed',
                createdAt: c.created_at || '',
                source: 'request',
                zipUrl: null,
            }));

            const all = [...bulkCards, ...singleCards, ...requestCards];
            setItems(all);

            const branchList = Array.from(new Set(all.map(c => c.branch).filter(Boolean))).sort() as string[];
            setBranches(branchList);
        } catch (err: any) {
            console.error('Error fetching cards:', err);
            toast.error('Failed to load cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Fetch full employee data + stored Drive URLs for preview
    const fetchFullEmployee = async (card: UnifiedCard): Promise<{ employee: Employee; driveFrontUrl: string | null; driveBackUrl: string | null }> => {
        if (card.source === 'single') {
            const { data, error } = await supabase.from('card_details').select('*').eq('id', card.id).single();
            if (error || !data) throw new Error('Card not found');
            return {
                employee: {
                    fullName: data.full_name || '',
                    employeeId: data.employee_id || '',
                    bloodGroup: data.blood_group || '',
                    branch: data.branch || '',
                    emergencyContact: data.emergency_contact || '',
                    countryCode: data.country_code || '',
                    photo_url: data.photo_url || null,
                },
                driveFrontUrl: data.drive_front_url || null,
                driveBackUrl: data.drive_back_url || null,
            };
        } else if (card.source === 'bulk') {
            const [viewRes, cardRes] = await Promise.all([
                supabase.from('employee_card_details').select('*').eq('card_id', card.id).single(),
                supabase.from('id_cards').select('drive_front_url, drive_back_url').eq('id', card.id).single(),
            ]);
            const data = viewRes.data;
            if (!data) throw new Error('Card not found');
            return {
                employee: {
                    fullName: data.name || '',
                    employeeId: data.employee_id || '',
                    bloodGroup: data.blood_group || '',
                    branch: data.branch || '',
                    emergencyContact: data.emergency_contact || '',
                    countryCode: data.country_code || '',
                    photo_url: data.photo || null,
                },
                driveFrontUrl: cardRes.data?.drive_front_url || null,
                driveBackUrl: cardRes.data?.drive_back_url || null,
            };
        } else {
            const { data, error } = await supabase.from('requests').select('*').eq('id', card.id).single();
            if (error || !data) throw new Error('Request not found');
            return {
                employee: {
                    fullName: data.full_name || '',
                    employeeId: data.employee_id || '',
                    bloodGroup: data.blood_group || '',
                    branch: data.branch || '',
                    emergencyContact: data.emergency_contact || '',
                    countryCode: data.country_code || '',
                    photo_url: data.photo_url || null,
                },
                driveFrontUrl: data.drive_front_url || null,
                driveBackUrl: data.drive_back_url || null,
            };
        }
    };

    const saveDriveUrls = async (card: UnifiedCard, frontUrl: string, backUrl: string) => {
        if (card.source === 'single') {
            await supabase.from('card_details').update({ drive_front_url: frontUrl, drive_back_url: backUrl }).eq('id', card.id);
        } else if (card.source === 'bulk') {
            await supabase.from('id_cards').update({ drive_front_url: frontUrl, drive_back_url: backUrl }).eq('id', card.id);
        } else {
            await supabase.from('requests').update({ drive_front_url: frontUrl, drive_back_url: backUrl }).eq('id', card.id);
        }
    };

    const handleOpenPreview = async (card: UnifiedCard) => {
        setPreviewCard(card);
        setPreviewEmployee(null);
        setDriveFrontUrl(null);
        setDriveBackUrl(null);
        setPreviewSide('front');
        setPreviewLoading(true);
        try {
            const result = await fetchFullEmployee(card);
            setPreviewEmployee(result.employee);
            setDriveFrontUrl(result.driveFrontUrl);
            setDriveBackUrl(result.driveBackUrl);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to load card data');
            setPreviewCard(null);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSaveToDrive = async () => {
        if (!previewCard || !previewEmployee || !frontCardRef.current || !backCardRef.current) return;
        setSavingToDrive(true);
        try {
            const [frontCanvas, backCanvas] = await Promise.all([
                html2canvas(frontCardRef.current, { useCORS: true, scale: 2, backgroundColor: '#ffffff' }),
                html2canvas(backCardRef.current, { useCORS: true, scale: 2, backgroundColor: '#ffffff' }),
            ]);

            const [frontBlob, backBlob] = await Promise.all([
                new Promise<Blob>((resolve, reject) =>
                    frontCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to capture front')), 'image/png')
                ),
                new Promise<Blob>((resolve, reject) =>
                    backCanvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to capture back')), 'image/png')
                ),
            ]);

            const empId = previewEmployee.employeeId || String(previewCard.id);
            const [frontResult, backResult] = await Promise.all([
                uploadCardImageToDrive(frontBlob, `${empId}_front.png`, empId),
                uploadCardImageToDrive(backBlob, `${empId}_back.png`, empId),
            ]);

            setDriveFrontUrl(frontResult.fileUrl);
            setDriveBackUrl(backResult.fileUrl);
            await saveDriveUrls(previewCard, frontResult.fileUrl, backResult.fileUrl);
            toast.success('Card images saved to Google Drive');
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save to Drive');
        } finally {
            setSavingToDrive(false);
        }
    };

    const handleDownloadCard = (card: UnifiedCard) => {
        if (!card.zipUrl) { toast.error('No download link available'); return; }
        const a = document.createElement('a');
        a.href = card.zipUrl;
        a.download = `${(card.name || 'card').replace(/ /g, '_')}_ID_Card.zip`;
        a.click();
    };

    const filtered = useMemo(() => {
        let result = [...items];

        if (sourceFilter !== 'all') result = result.filter(i => i.source === sourceFilter);
        if (branchFilter) result = result.filter(i => i.branch.toLowerCase() === branchFilter.toLowerCase());
        if (batchIdFilter) result = result.filter(i => i.batchId.toLowerCase().includes(batchIdFilter.toLowerCase()));
        if (statusFilter !== 'all') result = result.filter(i => getUnifiedStatus(i) === statusFilter);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(q) ||
                i.employeeId.toLowerCase().includes(q) ||
                String(i.id).toLowerCase().includes(q)
            );
        }
        if (dateFrom) {
            const from = new Date(dateFrom);
            result = result.filter(i => new Date(i.createdAt) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            result = result.filter(i => new Date(i.createdAt) <= to);
        }

        result.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (!aVal) return 1;
            if (!bVal) return -1;
            const cmp = typeof aVal === 'string' ? aVal.localeCompare(String(bVal)) : Number(aVal) - Number(bVal);
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [items, sourceFilter, branchFilter, batchIdFilter, statusFilter, searchQuery, dateFrom, dateTo, sortField, sortDir]);

    useEffect(() => { setPage(1); }, [searchQuery, sourceFilter, statusFilter, branchFilter, batchIdFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const safePage = Math.min(page, totalPages);
    const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);
    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

    const toggleSort = (field: keyof UnifiedCard) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
        setPage(1);
    };

    const SortArrow = ({ field }: { field: keyof UnifiedCard }) => (
        sortField === field
            ? <span className="ml-1 text-orange-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
            : <span className="ml-1 text-gray-300 dark:text-gray-600">↕</span>
    );

    // Stats
    const bulkCount = items.filter(i => i.source === 'bulk').length;
    const singleCount = items.filter(i => i.source === 'single').length;
    const requestCount = items.filter(i => i.source === 'request').length;

    const statusCounts = useMemo(() => ({
        'Pending':          items.filter(i => getUnifiedStatus(i) === 'Pending').length,
        'Sent for Print':   items.filter(i => getUnifiedStatus(i) === 'Sent for Print').length,
        'Printed':          items.filter(i => getUnifiedStatus(i) === 'Printed').length,
        'Ready to Collect': items.filter(i => getUnifiedStatus(i) === 'Ready to Collect').length,
        'Collected':        items.filter(i => getUnifiedStatus(i) === 'Collected').length,
    }), [items]);

    const displayStatuses = ['all', 'Pending', 'Sent for Print', 'Printed', 'Ready to Collect', 'Collected'];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                            <ChevronLeft size={18} /> <span className="hidden md:inline">Back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Issued ID Cards</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{items.length} total across all sources</p>
                        </div>
                    </div>
                    <button onClick={fetchData} disabled={loading}
                        className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all disabled:opacity-40"
                        title="Refresh">
                        <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Source Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    {[
                        { label: 'Total Cards', count: items.length, icon: Archive, color: 'from-gray-400 to-gray-600', filter: 'all' as const },
                        { label: 'Bulk Import', count: bulkCount, icon: Layers, color: 'from-blue-400 to-blue-600', filter: 'bulk' as const },
                        { label: 'Single Card', count: singleCount, icon: User, color: 'from-purple-400 to-purple-600', filter: 'single' as const },
                        { label: 'Employee Requests', count: requestCount, icon: FileText, color: 'from-orange-400 to-orange-600', filter: 'request' as const },
                    ].map(stat => {
                        const Icon = stat.icon;
                        const active = sourceFilter === stat.filter;
                        return (
                            <button key={stat.label}
                                onClick={() => setSourceFilter(sourceFilter === stat.filter && stat.filter !== 'all' ? 'all' : stat.filter)}
                                className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-4 hover:shadow-md transition-all text-left ${
                                    active
                                        ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}>
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

                {/* Status Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                    {[
                        { label: 'Pending', icon: Clock, color: 'from-gray-400 to-gray-600' },
                        { label: 'Sent for Print', icon: Printer, color: 'from-blue-400 to-blue-600' },
                        { label: 'Printed', icon: CheckCircle2, color: 'from-emerald-400 to-emerald-600' },
                        { label: 'Ready to Collect', icon: Package, color: 'from-amber-400 to-amber-600' },
                        { label: 'Collected', icon: Archive, color: 'from-violet-400 to-violet-600' },
                    ].map(stat => {
                        const Icon = stat.icon;
                        const active = statusFilter === stat.label;
                        return (
                            <button key={stat.label}
                                onClick={() => setStatusFilter(statusFilter === stat.label ? 'all' : stat.label)}
                                className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-3 hover:shadow-md transition-all text-left ${
                                    active
                                        ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                                        <Icon size={13} className="text-white" />
                                    </div>
                                    <ChevronRight size={12} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                                </div>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">{statusCounts[stat.label as keyof typeof statusCounts]}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{stat.label}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Filters */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-0">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-4">
                        {/* Status pills */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {displayStatuses.map(s => (
                                <button key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                                        statusFilter === s
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}>
                                    {s === 'all' ? 'All Statuses' : s}
                                    {s !== 'all' && (
                                        <span className="ml-1.5 opacity-70">
                                            {statusCounts[s as keyof typeof statusCounts]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Source pills */}
                        <div className="flex gap-2 flex-wrap">
                            {([
                                { key: 'all', label: 'All Sources' },
                                { key: 'bulk', label: 'Bulk Import' },
                                { key: 'single', label: 'Single Card' },
                                { key: 'request', label: 'Employee Request' },
                            ] as const).map(s => (
                                <button key={s.key}
                                    onClick={() => setSourceFilter(s.key)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                                        sourceFilter === s.key
                                            ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}>
                                    {s.label}
                                    {s.key !== 'all' && (
                                        <span className="ml-1.5 opacity-60">
                                            {s.key === 'bulk' ? bulkCount : s.key === 'single' ? singleCount : requestCount}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Search + narrow filters */}
                        <div className="flex flex-wrap gap-3 items-end">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" placeholder="Search name, employee ID, or card ID..."
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all" />
                            </div>
                            <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none">
                                <option value="">All Branches</option>
                                {branches.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <input type="text" placeholder="Filter by batch ID..."
                                value={batchIdFilter} onChange={e => setBatchIdFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none w-40" />
                            <div className="flex items-center gap-2">
                                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                                <span className="text-xs text-gray-400">to</span>
                                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                            </div>
                            {(sourceFilter !== 'all' || statusFilter !== 'all' || branchFilter || batchIdFilter || searchQuery || dateFrom || dateTo) && (
                                <button
                                    onClick={() => { setSourceFilter('all'); setStatusFilter('all'); setBranchFilter(''); setBatchIdFilter(''); setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
                                    className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results info + sort */}
                    <div className="px-5 py-2.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                        <span>{filtered.length} result{filtered.length !== 1 ? 's' : ''}{filtered.length !== items.length ? ` of ${items.length}` : ''}</span>
                        <div className="flex items-center gap-2">
                            <span>Sort by</span>
                            <select value={sortField}
                                onChange={e => { setSortField(e.target.value as keyof UnifiedCard); setPage(1); }}
                                className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none">
                                <option value="createdAt">Date</option>
                                <option value="name">Name</option>
                                <option value="employeeId">Employee ID</option>
                                <option value="source">Source</option>
                            </select>
                            <button onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }}
                                className="px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
                            </button>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/30">
                                    {[
                                        { field: 'id' as keyof UnifiedCard, label: 'Card ID' },
                                        { field: 'name' as keyof UnifiedCard, label: 'Employee Name' },
                                        { field: 'employeeId' as keyof UnifiedCard, label: 'Employee ID' },
                                        { field: 'branch' as keyof UnifiedCard, label: 'Branch' },
                                        { field: 'batchId' as keyof UnifiedCard, label: 'Batch ID' },
                                    ].map(col => (
                                        <th key={col.field} onClick={() => toggleSort(col.field)}
                                            className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                            {col.label}<SortArrow field={col.field} />
                                        </th>
                                    ))}
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th onClick={() => toggleSort('createdAt')}
                                        className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                                        Date<SortArrow field="createdAt" />
                                    </th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Preview</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-12 text-center">
                                            <Loader2 size={24} className="animate-spin mx-auto text-orange-500" />
                                        </td>
                                    </tr>
                                ) : paginated.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-5 py-12 text-center text-sm text-gray-400">
                                            No cards found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    paginated.map((item, idx) => {
                                        const status = getUnifiedStatus(item);
                                        const sc = statusBadgeConfig[status] || statusBadgeConfig['Pending'];
                                        const src = sourceConfig[item.source];
                                        return (
                                            <tr key={`${item.source}-${item.id}-${idx}`}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                                <td className="px-5 py-4 text-sm font-mono text-gray-700 dark:text-gray-300">{item.id || '-'}</td>
                                                <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{item.name || '-'}</td>
                                                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{item.employeeId || '-'}</td>
                                                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{item.branch || '-'}</td>
                                                <td className="px-5 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">{item.batchId || '-'}</td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium border ${src.color}`}>
                                                        {src.label}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${sc.color}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                        {status}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button onClick={() => handleOpenPreview(item)}
                                                        title="Preview card"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 dark:hover:border-orange-800 transition-colors">
                                                        <Eye size={13} /> View
                                                    </button>
                                                    {item.zipUrl && (
                                                        <button onClick={() => handleDownloadCard(item)}
                                                            title="Download ZIP"
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 dark:hover:border-emerald-800 transition-colors">
                                                            <Download size={13} /> Download
                                                        </button>
                                                    )}
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
                        ) : paginated.length === 0 ? (
                            <div className="p-8 text-center text-sm text-gray-400">No cards found.</div>
                        ) : (
                            paginated.map((item, idx) => {
                                const status = getUnifiedStatus(item);
                                const sc = statusBadgeConfig[status] || statusBadgeConfig['Pending'];
                                const src = sourceConfig[item.source];
                                return (
                                    <div key={`${item.source}-${item.id}-${idx}`} className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name || '-'}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.employeeId || '-'}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-medium border ${src.color}`}>
                                                    {src.label}
                                                </span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${sc.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                                                    {status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                            <div><span className="font-medium text-[10px] uppercase text-gray-400">Branch</span><p className="text-gray-700 dark:text-gray-300">{item.branch || '-'}</p></div>
                                            <div><span className="font-medium text-[10px] uppercase text-gray-400">Batch</span><p className="font-mono text-gray-700 dark:text-gray-300">{item.batchId || '-'}</p></div>
                                            <div><span className="font-medium text-[10px] uppercase text-gray-400">Date</span><p className="text-gray-700 dark:text-gray-300">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}</p></div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenPreview(item)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 transition-colors">
                                                <Eye size={12} /> Preview
                                            </button>
                                            {item.zipUrl && (
                                                <button onClick={() => handleDownloadCard(item)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors">
                                                    <Download size={12} /> Download
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {filtered.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>Rows per page:</span>
                                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none">
                                    {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <span className="ml-2">{filtered.length} total</span>
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
            </main>

            {/* Card Preview Modal */}
            {previewCard && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={e => { if (e.target === e.currentTarget) setPreviewCard(null); }}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Card Preview</h2>
                                {previewEmployee && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                        {previewEmployee.fullName} · {previewEmployee.employeeId}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setPreviewCard(null)}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6">
                            {previewLoading ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-3">
                                    <Loader2 size={32} className="animate-spin text-orange-500" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading card data...</p>
                                </div>
                            ) : previewEmployee ? (
                                <>
                                    {/* Mobile side toggle */}
                                    <div className="flex sm:hidden gap-2 mb-4">
                                        {(['front', 'back'] as const).map(side => (
                                            <button key={side} onClick={() => setPreviewSide(side)}
                                                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                                                    previewSide === side
                                                        ? 'bg-orange-500 text-white'
                                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                                }`}>
                                                {side === 'front' ? 'Front' : 'Back'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Cards side by side (desktop) / single (mobile) */}
                                    <div className="flex flex-col sm:flex-row gap-6 items-center justify-center mb-6">
                                        <div className={`flex flex-col items-center gap-2 ${previewSide === 'back' ? 'hidden sm:flex' : ''}`}>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Front</p>
                                            <div className="shadow-xl rounded-lg overflow-hidden">
                                                <IDCardFront ref={frontCardRef} employee={previewEmployee} />
                                            </div>
                                        </div>
                                        <div className={`flex flex-col items-center gap-2 ${previewSide === 'front' ? 'hidden sm:flex' : ''}`}>
                                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Back</p>
                                            <div className="shadow-xl rounded-lg overflow-hidden">
                                                <IDCardBack ref={backCardRef} employee={previewEmployee} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Drive actions */}
                                    {(driveFrontUrl || driveBackUrl) ? (
                                        <div className="space-y-3">
                                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Saved to Google Drive</p>
                                            <div className="flex flex-wrap gap-3">
                                                {driveFrontUrl && (
                                                    <a href={driveFrontUrl} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                                                        <ExternalLink size={14} /> Front Card
                                                    </a>
                                                )}
                                                {driveBackUrl && (
                                                    <a href={driveBackUrl} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                                        <ExternalLink size={14} /> Back Card
                                                    </a>
                                                )}
                                                <button onClick={handleSaveToDrive} disabled={savingToDrive}
                                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50">
                                                    {savingToDrive
                                                        ? <Loader2 size={14} className="animate-spin" />
                                                        : <HardDriveUpload size={14} />}
                                                    Re-save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <div>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Save to Google Drive</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                    Saves front &amp; back as PNG in Processed Photos/{previewEmployee.employeeId || previewCard.id}/
                                                </p>
                                            </div>
                                            <button onClick={handleSaveToDrive} disabled={savingToDrive}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap ml-4">
                                                {savingToDrive ? (
                                                    <><Loader2 size={15} className="animate-spin" /> Saving...</>
                                                ) : (
                                                    <><HardDriveUpload size={15} /> Save to Drive</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-sm text-gray-400">Failed to load card data.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IssuedCards;
