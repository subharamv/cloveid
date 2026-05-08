import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useDashboardStats } from '../hooks/useDashboardStats';
import AppHeader from '../components/AppHeader';
import { handleApiError } from '../lib/apiErrorHandler';
import { toast } from 'sonner';
import {
    RefreshCw, Plus, Eye, Download, Trash2, Search, ChevronRight,
    Edit3, Clock, CheckCircle2, Printer, Warehouse, FileText,
    TrendingUp, Users, Layers, Inbox, Package, ArrowRight,
    Loader2, AlertCircle, Sun, Moon, CloudSun
} from 'lucide-react';


interface DashboardStats {
    inEditing: number;
    awaitingApproval: number;
    approved: number;
    sentForPrinting: number;
}

interface BatchStats {
    printed: number;
    readyToCollect: number;
    sentForPrinting: number;
    pending: number;
}

function getGreeting(): { text: string; icon: typeof Sun } {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', icon: Sun };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', icon: CloudSun };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', icon: CloudSun };
    return { text: 'Good Night', icon: Moon };
}

const Dashboard = () => {
    const navigate = useNavigate();
    const { session, userRole, logout, profile, loading: authLoading } = useAuth();
    const { stats, batchCardStats, loading: statsLoading, refetch: refetchStats } = useDashboardStats();

    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [cardDetails, setCardDetails] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentBatches, setRecentBatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [batchesPage, setBatchesPage] = useState(0);
    const [batchesPageSize] = useState(5);
    const [batchesHasMore, setBatchesHasMore] = useState(true);

    const [cardsPage, setCardsPage] = useState(0);
    const [cardsPageSize] = useState(10);
    const [cardsHasMore, setCardsHasMore] = useState(true);

    const [requestsPage, setRequestsPage] = useState(0);
    const [requestsPageSize] = useState(5);
    const [requestsHasMore, setRequestsHasMore] = useState(true);

    const [batchesLoading, setBatchesLoading] = useState(false);
    const [cardsLoading, setCardsLoading] = useState(false);
    const [requestsLoading, setRequestsLoading] = useState(false);

    const lastFetchTime = useRef<number>(0);
    const FETCH_DEBOUNCE_MS = 3000;
    const isFetching = useRef(false);

    const shouldFetch = (): boolean => {
        const now = Date.now();
        if (now - lastFetchTime.current > FETCH_DEBOUNCE_MS) {
            lastFetchTime.current = now;
            return true;
        }
        return false;
    };

    useEffect(() => {
        if (!authLoading && session && (userRole === 'admin' || userRole === 'manager')) {
            fetchDashboardData();
            const handleFocus = () => { if (shouldFetch()) fetchDashboardData(); };
            window.addEventListener('focus', handleFocus);
            const refreshInterval = setInterval(() => { if (shouldFetch()) fetchDashboardData(); }, 30000);
            return () => {
                window.removeEventListener('focus', handleFocus);
                clearInterval(refreshInterval);
            };
        } else if (!authLoading && (!session || !userRole)) {
            setLoading(false);
        }
    }, [session, authLoading, userRole]);

    const fetchDashboardData = async () => {
        if (isFetching.current) return;
        isFetching.current = true;
        setLoading(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        try {
            const queries = [
                supabase.from('requests').select('*').order('created_at', { ascending: false }).range(0, requestsPageSize - 1).abortSignal(controller.signal),
                supabase.from('card_batches').select('*').order('created_at', { ascending: false }).range(0, batchesPageSize - 1).abortSignal(controller.signal),
                supabase.from('requests').select('*').eq('print_status', 'collected').abortSignal(controller.signal),
                supabase.from('id_cards').select('*').eq('print_status', 'collected').abortSignal(controller.signal),
                supabase.from('card_details').select('*').order('created_at', { ascending: false }).range(0, cardsPageSize - 1).abortSignal(controller.signal)
            ];

            const results = await Promise.all(queries.map(async (q) => {
                try { return await q; } catch (err) { return { data: null, error: err }; }
            }));

            const [
                { data: recentRequests, error: requestsError },
                { data: recentBatches, error: batchesError },
                { data: collectedRequests },
                { data: collectedIdCards },
                { data: cards, error: cardsError }
            ] = results;

            clearTimeout(timeoutId);

            if (requestsError) {
                handleApiError(requestsError, logout);
            } else {
                setRecentRequests(recentRequests || []);
                setRequestsPage(0);
                setRequestsHasMore((recentRequests || []).length === requestsPageSize);
            }

            if (cardsError) {
                console.error('Error fetching card details:', cardsError);
            } else {
                setCardDetails(cards || []);
                setCardsPage(0);
                setCardsHasMore((cards || []).length === cardsPageSize);
            }

            if (batchesError) {
                console.error('Error fetching recent batches:', batchesError);
            } else {
                setRecentBatches(recentBatches || []);
                setBatchesPage(0);
                setBatchesHasMore((recentBatches || []).length === batchesPageSize);
            }

            refetchStats();
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            clearTimeout(timeoutId);
            setLoading(false);
            isFetching.current = false;
        }
    };

    const loadMoreBatches = async () => {
        if (batchesLoading || !batchesHasMore) return;
        setBatchesLoading(true);
        try {
            const nextPage = batchesPage + 1;
            const from = nextPage * batchesPageSize;
            const to = from + batchesPageSize - 1;
            const { data, error } = await supabase
                .from('card_batches')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);
            if (error) {
                toast.error('Failed to load more batches');
            } else if (data) {
                setRecentBatches(prev => [...prev, ...data]);
                setBatchesPage(nextPage);
                setBatchesHasMore(data.length === batchesPageSize);
            }
        } catch (err) {
            console.error('loadMoreBatches error', err);
        } finally {
            setBatchesLoading(false);
        }
    };

    const loadMoreCards = async () => {
        if (cardsLoading || !cardsHasMore) return;
        setCardsLoading(true);
        try {
            const nextPage = cardsPage + 1;
            const from = nextPage * cardsPageSize;
            const to = from + cardsPageSize - 1;
            const { data, error } = await supabase
                .from('card_details')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);
            if (error) {
                toast.error('Failed to load more cards');
            } else if (data) {
                setCardDetails(prev => [...prev, ...data]);
                setCardsPage(nextPage);
                setCardsHasMore(data.length === cardsPageSize);
            }
        } catch (err) {
            console.error('loadMoreCards error', err);
        } finally {
            setCardsLoading(false);
        }
    };

    const loadMoreRequests = async () => {
        if (requestsLoading || !requestsHasMore) return;
        setRequestsLoading(true);
        try {
            const nextPage = requestsPage + 1;
            const from = nextPage * requestsPageSize;
            const to = from + requestsPageSize - 1;
            const { data, error } = await supabase
                .from('requests')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);
            if (error) {
                toast.error('Failed to load more requests');
            } else if (data) {
                setRecentRequests(prev => [...prev, ...data]);
                setRequestsPage(nextPage);
                setRequestsHasMore(data.length === requestsPageSize);
            }
        } catch (err) {
            console.error('loadMoreRequests error', err);
        } finally {
            setRequestsLoading(false);
        }
    };

    const handleDeleteCard = async (id: number) => {
        if (!confirm('Are you sure you want to delete this card?')) return;
        try {
            const { error } = await supabase.from('card_details').delete().eq('id', id);
            if (error) throw error;
            toast.success('Card deleted successfully');
            fetchDashboardData();
        } catch (error) {
            console.error('Error deleting card:', error);
            toast.error('Failed to delete card');
        }
    };

    const handleDownloadCard = (zipUrl: string, fullName: string) => {
        if (!zipUrl) {
            toast.error('No download link available');
            return;
        }
        const link = document.createElement('a');
        link.href = zipUrl;
        link.download = `${fullName.replace(/ /g, '_')}_ID_Card.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredCards = cardDetails.filter(card =>
        card.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.employee_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleNewBatch = () => window.dispatchEvent(new CustomEvent('open-new-batch'));

    const getDisplayStatus = (card: any) => {
        if (card.print_status && card.print_status !== 'not_printed') return card.print_status;
        return card.status || 'Pending';
    };

    const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
        'Approved': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Approved' },
        'Printed': { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500', label: 'Printed' },
        'Pending': { color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500', label: 'Pending' },
        'In Editing': { color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800', dot: 'bg-orange-500', label: 'In Editing' },
        'sent_for_printing': { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500', label: 'Sent for Printing' },
        'Ready to Collect': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Ready to Collect' },
        'ready_to_collect': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Ready to Collect' },
        'completed': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500', label: 'Completed' },
    };

    const getStatus = (status: string) => statusConfig[status] || { color: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', dot: 'bg-gray-500', label: status };

    const grades = [
        { label: 'In Editing', value: stats.inEditing, icon: Edit3, color: 'orange', link: '/manage-requests?status=In+Editing' },
        { label: 'Awaiting Approval', value: stats.awaitingApproval, icon: Clock, color: 'amber', link: '/manage-requests?status=Pending' },
        { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'emerald', link: '/manage-requests?status=Approved' },
        { label: 'Sent for Printing', value: stats.sentForPrinting, icon: Printer, color: 'blue', link: '/manage-requests?status=Printed' },
        { label: 'Collected', value: batchCardStats.collected, icon: Package, color: 'violet', link: '/collect' },
    ];

    const stages = [
        { label: 'Not Printed', value: batchCardStats.pending, icon: FileText, color: 'gray', desc: 'Not yet sent to vendor' },
        { label: 'Sent to Vendor', value: batchCardStats.sentForPrinting, icon: Printer, color: 'amber', desc: 'Being processed by vendor' },
        { label: 'Printed', value: batchCardStats.printed, icon: CheckCircle2, color: 'blue', desc: 'Completed by vendor' },
        { label: 'Ready to Collect', value: batchCardStats.readyToCollect, icon: Warehouse, color: 'emerald', desc: 'Available for pickup' },
        { label: 'Collected', value: batchCardStats.collected, icon: Package, color: 'violet', desc: 'Successfully collected' },
    ];

    const iconGradients: Record<string, string> = {
        orange: 'from-orange-400 to-orange-600',
        amber: 'from-amber-400 to-amber-600',
        emerald: 'from-emerald-400 to-emerald-600',
        blue: 'from-blue-400 to-blue-600',
        violet: 'from-violet-400 to-violet-600',
        gray: 'from-gray-400 to-gray-600',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            {loading || statsLoading ? (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <div className="flex h-[60vh] items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
                    </div>
                </main>
            ) : (
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                        <div>
                            <div className="flex items-center gap-1.5 mb-1">
                                {(() => {
                                    const { text, icon: GreetIcon } = getGreeting();
                                    return (
                                        <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2.5 py-0.5 rounded-full">
                                            <GreetIcon size={12} />
                                            {text}
                                        </span>
                                    );
                                })()}
                            </div>
                            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Welcome back, {profile?.full_name || session?.user?.user_metadata?.full_name || 'Admin'}!
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { if (shouldFetch()) { refetchStats(); fetchDashboardData(); } }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={15} />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                            <button
                                onClick={() => navigate('/collect')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors shadow-sm"
                            >
                                <Inbox size={15} />
                                <span className="hidden sm:inline">Collect ({batchCardStats.readyToCollect})</span>
                                <span className="sm:hidden">{batchCardStats.readyToCollect}</span>
                            </button>
                            <button
                                onClick={handleNewBatch}
                                className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 dark:shadow-orange-900/30"
                            >
                                <Plus size={16} />
                                <span>New Batch</span>
                            </button>
                        </div>
                    </div>

                    {/* Request Stage Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                        {grades.map(stat => {
                            const Icon = stat.icon;
                            return (
                                <Link
                                    key={stat.label}
                                    to={stat.link}
                                    className="group bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${iconGradients[stat.color]} flex items-center justify-center shadow-sm`}>
                                            <Icon size={16} className="text-white" />
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Card Progress Tracking */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Card Progress Tracking</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track cards through each stage</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                            {stages.map(stage => {
                                const Icon = stage.icon;
                                return (
                                    <div key={stage.label} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${iconGradients[stage.color]} flex items-center justify-center shadow-sm`}>
                                                <Icon size={16} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stage.value}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stage.label}</p>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{stage.desc}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Recent Batches */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Batches</h2>
                            <button onClick={() => navigate('/batches')}
                                className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                                View All <ChevronRight size={12} />
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/30">
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Batch ID</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Created</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Cards</th>
                                            <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {recentBatches.length > 0 ? recentBatches.map(batch => {
                                            const s = getStatus(batch.status);
                                            return (
                                                <tr key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                                    <td className="px-5 py-4 text-sm font-mono font-medium text-gray-900 dark:text-white">{batch.batch_id}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(batch.created_at).toLocaleDateString()}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${s.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                            {s.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{batch.total_cards}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <button
                                                            onClick={() => navigate('/import-management', { state: { batchId: batch.batch_id } })}
                                                            className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                                                        >
                                                            View <ChevronRight size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No batches found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                {recentBatches.length > 0 ? recentBatches.map(batch => {
                                    const s = getStatus(batch.status);
                                    return (
                                        <div key={batch.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                            <div className="flex items-start justify-between mb-2">
                                                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white">{batch.batch_id}</p>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${s.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                    {s.label}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                                                <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                                <span>{batch.total_cards} cards</span>
                                            </div>
                                            <button
                                                onClick={() => navigate('/import-management', { state: { batchId: batch.batch_id } })}
                                                className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/10 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
                                            >
                                                View Details <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    );
                                }) : (
                                    <div className="p-6 text-center text-sm text-gray-400">No batches found</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Single Card Details */}
                    <div className="mb-8">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Single Card Details</h2>
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or ID..."
                                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/30">
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee Name</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Submitted</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {filteredCards.length > 0 ? filteredCards.map(card => {
                                            const displayStatus = getDisplayStatus(card);
                                            const s = getStatus(displayStatus);
                                            return (
                                                <tr key={card.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{card.full_name}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(card.created_at).toLocaleDateString()}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${s.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                            {s.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{card.employee_id}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => navigate(`/single-card?requestId=${card.id}`)}
                                                                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadCard(card.zip_url, card.full_name)}
                                                                className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                                                title="Download ZIP"
                                                            >
                                                                <Download size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCard(card.id)}
                                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">
                                                    {searchQuery ? 'No cards match your search.' : 'No cards found.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredCards.length > 0 ? filteredCards.map(card => {
                                    const displayStatus = getDisplayStatus(card);
                                    const s = getStatus(displayStatus);
                                    return (
                                        <div key={card.id} className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.full_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{card.employee_id}</p>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${s.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                    {s.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-3">{new Date(card.created_at).toLocaleDateString()}</p>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => navigate(`/single-card?requestId=${card.id}`)}
                                                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/10 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors">
                                                    <Eye size={13} /> View
                                                </button>
                                                <button onClick={() => handleDownloadCard(card.zip_url, card.full_name)}
                                                    className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors">
                                                    <Download size={13} /> Download
                                                </button>
                                                <button onClick={() => handleDeleteCard(card.id)}
                                                    className="p-2 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="p-6 text-center text-sm text-gray-400">
                                        {searchQuery ? 'No cards match your search.' : 'No cards found.'}
                                    </div>
                                )}
                            </div>

                            {cardsHasMore && (
                                <div className="flex justify-center px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                                    <button onClick={loadMoreCards} disabled={cardsLoading}
                                        className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                                        {cardsLoading ? 'Loading...' : 'View more cards'} <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Recent Requests */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Requests</h2>
                            {requestsHasMore && (
                                <button onClick={loadMoreRequests} disabled={requestsLoading}
                                    className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1">
                                    {requestsLoading ? 'Loading...' : 'View All'} <ChevronRight size={12} />
                                </button>
                            )}
                        </div>

                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/30">
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee Name</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Submitted</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {recentRequests.length > 0 ? recentRequests.map(request => {
                                            const s = getStatus(getDisplayStatus(request));
                                            return (
                                                <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{request.full_name}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(request.created_at).toLocaleDateString()}</td>
                                                    <td className="px-5 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${s.color}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                            {s.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{request.employee_id}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <Link
                                                            to={`/single-card?requestId=${request.id}`}
                                                            className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                                                        >
                                                            View <ChevronRight size={14} />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={5} className="px-5 py-12 text-center text-sm text-gray-400">No requests found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                {recentRequests.length > 0 ? recentRequests.map(request => {
                                    const s = getStatus(getDisplayStatus(request));
                                    return (
                                        <div key={request.id} className="p-4">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{request.full_name}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{request.employee_id}</p>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border ${s.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                    {s.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mb-3">{new Date(request.created_at).toLocaleDateString()}</p>
                                            <Link
                                                to={`/single-card?requestId=${request.id}`}
                                                className="flex items-center justify-center gap-1 py-2 text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/10 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/20 transition-colors"
                                            >
                                                View Details <ChevronRight size={12} />
                                            </Link>
                                        </div>
                                    );
                                }) : (
                                    <div className="p-6 text-center text-sm text-gray-400">No requests found</div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default Dashboard;
