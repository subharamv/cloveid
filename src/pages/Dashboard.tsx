import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { useAuth } from '../hooks/useAuth';
import { useDashboardStats } from '../hooks/useDashboardStats';
import AdminHeader from '../components/AdminHeader';
import { handleApiError } from '../lib/apiErrorHandler';
import { toast } from 'sonner';

interface Request {
    id: number;
    full_name: string;
    created_at: string;
    status: string;
    employee_id: string;
}

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

const Dashboard = () => {
    const navigate = useNavigate();
    const { session, userRole, logout, profile, clearSession, loading: authLoading } = useAuth();
    const { stats, batchCardStats, loading: statsLoading, refetch: refetchStats } = useDashboardStats();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [cardDetails, setCardDetails] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentBatches, setRecentBatches] = useState<any[]>([]);
    const [batchStats, setBatchStats] = useState<any[]>([]);
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

    useEffect(() => {
        // Only fetch when auth is not loading AND user is authenticated AND has proper role
        if (!authLoading && session && (userRole === 'admin' || userRole === 'manager')) {
            console.log('Dashboard: Auth ready, initiating data fetch');
            fetchDashboardData();

            // Add window focus listener for real-time updates
            const handleFocus = () => {
                console.log('Dashboard: Window focused, refreshing data');
                fetchDashboardData();
            };
            window.addEventListener('focus', handleFocus);

            // Add interval for periodic refresh (every 15 seconds)
            const refreshInterval = setInterval(() => {
                console.log('Dashboard: Periodic refresh triggered');
                fetchDashboardData();
            }, 15000);

            return () => {
                window.removeEventListener('focus', handleFocus);
                clearInterval(refreshInterval);
            };
        } else if (!authLoading && (!session || !userRole)) {
            console.log('Dashboard: Auth not ready or no session, skipping fetch');
            setLoading(false);
        }
    }, [session, authLoading, userRole]);

    const isFetching = useRef(false);

    const fetchDashboardData = async () => {
        if (isFetching.current) {
            console.log('Dashboard: Fetch already in progress, skipping');
            return;
        }
        isFetching.current = true;

        console.log('Dashboard: fetchDashboardData started');
        setLoading(true);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn('Dashboard: Data fetching timed out after 20s, aborting...');
            controller.abort();
        }, 20000); // Increased from 15s to 20s

        try {
            console.log('Dashboard: Initiating parallel queries...');
            const queries = [
                supabase.from('requests').select('*').order('created_at', { ascending: false }).range(0, requestsPageSize - 1).abortSignal(controller.signal),
                supabase.from('card_batches').select('*').order('created_at', { ascending: false }).range(0, batchesPageSize - 1).abortSignal(controller.signal),
                supabase.from('requests').select('*').abortSignal(controller.signal),
                supabase.from('id_cards').select('*').abortSignal(controller.signal),
                supabase.from('card_details').select('*').order('created_at', { ascending: false }).range(0, cardsPageSize - 1).abortSignal(controller.signal)
            ];

            const results = await Promise.all(queries.map(q => q.then(res => {
                console.log(`Dashboard: Query finished: ${res.error ? 'Error' : 'Success'}`);
                return res;
            }).catch(err => {
                console.error('Dashboard: Query caught error:', err.name);
                return { data: null, error: err };
            })));

            const [
                { data: recentRequests, error: requestsError },
                { data: recentBatches, error: batchesError },
                { data: requests, error: requestsError2 },
                { data: bulkCards, error: bulkCardsError },
                { data: cards, error: cardsError }
            ] = results;

            clearTimeout(timeoutId);
            console.log('Dashboard: All queries processed');

            if (requestsError) {
                console.error('Error fetching recent requests:', requestsError);
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

            if (requestsError2) {
                console.error('Error fetching requests stats:', requestsError2);
            }

            if (bulkCardsError) {
                console.error('Error fetching bulk cards stats:', bulkCardsError);
            }

            // Trigger stats refetch from the hook
            refetchStats();

            // Calculate batch card statistics based on print_status from ALL sources (requests, card_details, id_cards)
            let readyToCollectCount = 0;
            let printedCount = 0;
            let sentForPrintingCount = 0;
            let pendingCount = 0;

            // Count from requests
            if (requestsData) {
                requestsData.forEach((req: any) => {
                    if (req.print_status === 'collected') {
                        // Skip collected cards - they're done
                    } else if (req.print_status === 'ready_to_collect') {
                        readyToCollectCount++;
                    } else if (req.print_status === 'printed') {
                        printedCount++;
                    } else if (req.print_status === 'sent_for_printing') {
                        sentForPrintingCount++;
                    } else {
                        pendingCount++;
                    }
                });
            }

            // Count from card_details
            if (cardDetails) {
                cardDetails.forEach((card: any) => {
                    if (card.print_status === 'collected') {
                        // Skip collected cards - they're done
                    } else if (card.print_status === 'ready_to_collect') {
                        readyToCollectCount++;
                    } else if (card.print_status === 'printed') {
                        printedCount++;
                    } else if (card.print_status === 'sent_for_printing') {
                        sentForPrintingCount++;
                    } else {
                        pendingCount++;
                    }
                });
            }

            // Count from bulk cards (id_cards)
            if (bulkCards) {
                bulkCards.forEach((card: any) => {
                    if (card.print_status === 'collected') {
                        // Skip collected cards - they're done
                    } else if (card.print_status === 'ready_to_collect') {
                        readyToCollectCount++;
                    } else if (card.print_status === 'printed') {
                        printedCount++;
                    } else if (card.print_status === 'sent_for_printing') {
                        sentForPrintingCount++;
                    } else {
                        pendingCount++;
                    }
                });
            }

            const batchCardStatistics = {
                printed: printedCount,
                readyToCollect: readyToCollectCount,
                sentForPrinting: sentForPrintingCount,
                pending: pendingCount
            };

            if (batchCardStatistics) setBatchStats([batchCardStatistics]);

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
                console.error('Error loading more batches:', error);
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
                console.error('Error loading more cards:', error);
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
                console.error('Error loading more requests:', error);
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
            toast.error('No download link available for this card');
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

    const handleNewBatch = () => {
        navigate('/selection');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
            case 'Printed': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
            case 'Pending': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
            case 'In Editing': return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300';
            case 'sent_for_printing': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
            case 'Ready to Collect': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300';
            case 'completed': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300';
            case 'ready_to_collect': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300';
            default: return 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300';
        }
    };

    const getStatusDotColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-500';
            case 'Printed': return 'bg-blue-500';
            case 'Pending': return 'bg-yellow-500';
            case 'In Editing': return 'bg-orange-500';
            case 'sent_for_printing': return 'bg-blue-500';
            case 'Ready to Collect': return 'bg-emerald-500';
            case 'completed': return 'bg-emerald-500';
            case 'ready_to_collect': return 'bg-emerald-500';
            default: return 'bg-gray-500';
        }
    };

    const formatStatus = (status: string) => {
        if (status === 'In Editing') return 'In Editing';
        if (status === 'ready_to_collect') return 'Ready to Collect';
        if (status === 'sent_for_printing') return 'Sent for Printing';
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    // Get display status - use print_status if available, otherwise use status
    const getDisplayStatus = (card: any) => {
        if (card.print_status && card.print_status !== 'not_printed') {
            return card.print_status;
        }
        return card.status || 'Pending';
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="dashboard" />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    {loading || statsLoading ? (
                        <div className="flex h-[60vh] items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="mx-auto max-w-7xl">
                            <div className="flex flex-wrap justify-between gap-4 items-center mb-8">
                                <div className="flex flex-col gap-1">
                                    <p className="text-3xl font-bold leading-tight tracking-[-0.033em] text-gray-900 dark:text-white">Dashboard</p>
                                    <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">Welcome back, {profile?.full_name || session?.user?.user_metadata?.full_name || 'User'}! Here's an overview of your ID card batches.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleNewBatch} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2">
                                        <span className="material-symbols-outlined text-lg">add_circle</span>
                                        <span className="truncate">Create New Batch</span>
                                    </button>
                                    <button onClick={() => navigate('/collect')} className="flex items-center gap-2 rounded-lg h-10 px-4 bg-green-600 text-white text-sm font-medium">
                                        <span>Collect ({batchCardStats.readyToCollect})</span>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">In Editing</p>
                                        <span className="material-symbols-outlined text-orange-500">edit_document</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{stats.inEditing}</p>
                                    <Link className="text-sm font-medium text-primary hover:underline" to="/manage-requests?status=In+Editing">View Details</Link>
                                </div>
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Awaiting Approval</p>
                                        <span className="material-symbols-outlined text-yellow-500">pending_actions</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{stats.awaitingApproval}</p>
                                    <Link className="text-sm font-medium text-primary hover:underline" to="/manage-requests?status=Pending">View Details</Link>
                                </div>
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Approved</p>
                                        <span className="material-symbols-outlined text-green-500">check_circle</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{stats.approved}</p>
                                    <Link className="text-sm font-medium text-primary hover:underline" to="/manage-requests?status=Approved">View Details</Link>
                                </div>
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Sent for Printing</p>
                                        <span className="material-symbols-outlined text-blue-500">print</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{stats.sentForPrinting}</p>
                                    <Link className="text-sm font-medium text-primary hover:underline" to="/manage-requests?status=Printed">View Details</Link>
                                </div>
                            </div>

                            <div className="flex justify-end mt-3">
                                {requestsHasMore ? (
                                    <button onClick={loadMoreRequests} disabled={requestsLoading} className="text-sm font-medium text-primary hover:underline">
                                        {requestsLoading ? 'Loading...' : 'View more'}
                                    </button>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No more requests</p>
                                )}
                            </div>

                            <h3 className="text-lg font-semibold leading-tight tracking-[-0.015em] text-gray-900 dark:text-white px-1 pb-2 pt-5">Batch Card Statistics</h3>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Pending</p>
                                        <span className="material-symbols-outlined text-gray-500">pending</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{batchCardStats.pending}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Cards not yet sent to print</p>
                                </div>
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Sent for Printing</p>
                                        <span className="material-symbols-outlined text-yellow-500">print</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{batchCardStats.sentForPrinting}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Cards with vendor</p>
                                </div>
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Printed</p>
                                        <span className="material-symbols-outlined text-blue-500">local_printshop</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{batchCardStats.printed}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Cards printed by vendor</p>
                                </div>
                                <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Ready to Collect</p>
                                        <span className="material-symbols-outlined text-green-500">task_alt</span>
                                    </div>
                                    <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">{batchCardStats.readyToCollect}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Cards ready for pickup</p>
                                </div>
                            </div>

                            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] text-gray-900 dark:text-white px-1 pb-3 pt-5">Recent Batches</h2>
                            <div className="py-3 @container">
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Batch ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date Created</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Cards</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {recentBatches.length > 0 ? (
                                                recentBatches.map((batch) => (
                                                    <tr key={batch.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{batch.batch_id}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(batch.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(batch.status)}`}>
                                                                <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(batch.status)}`}></span>
                                                                {formatStatus(batch.status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{batch.total_cards}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <button
                                                                onClick={() => navigate('/import-management', { state: { batchId: batch.batch_id } })}
                                                                className="text-primary hover:underline"
                                                            >
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        No batches found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-4">
                                    {recentBatches.length > 0 ? (
                                        recentBatches.map((batch) => (
                                            <div key={batch.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Batch ID</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{batch.batch_id}</p>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(batch.status)}`}>
                                                        <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(batch.status)}`}></span>
                                                        {formatStatus(batch.status)}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date Created</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{new Date(batch.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Total Cards</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{batch.total_cards}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/import-management', { state: { batchId: batch.batch_id } })}
                                                    className="w-full text-center text-primary hover:underline text-sm font-medium"
                                                >
                                                    View Details
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No batches found</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end mt-3">
                                {batchesHasMore ? (
                                    <button onClick={loadMoreBatches} disabled={batchesLoading} className="text-sm font-medium text-primary hover:underline">
                                        {batchesLoading ? 'Loading...' : 'View more'}
                                    </button>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No more batches</p>
                                )}
                            </div>

                            <div className="flex flex-wrap justify-between gap-4 items-center mb-4 pt-5">
                                <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] text-gray-900 dark:text-white px-1">Single Card Details</h2>
                                <div className="flex max-w-sm w-full items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
                                    <input
                                        type="text"
                                        placeholder="Search by name or ID..."
                                        className="bg-transparent border-none focus:ring-0 text-sm w-full dark:text-white"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="py-3 @container">
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date Submitted</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee ID</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredCards.length > 0 ? (
                                                filteredCards.map((card) => (
                                                    <tr key={card.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{card.full_name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(card.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(getDisplayStatus(card))}`}>
                                                                <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(getDisplayStatus(card))}`}></span>
                                                                {formatStatus(getDisplayStatus(card))}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{card.employee_id}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                                                            <button
                                                                onClick={() => navigate(`/single-card?requestId=${card.id}`)}
                                                                className="text-primary hover:text-primary-dark transition-colors"
                                                                title="View Details"
                                                            >
                                                                <span className="material-symbols-outlined text-xl">visibility</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDownloadCard(card.zip_url, card.full_name)}
                                                                className="text-green-600 hover:text-green-700 transition-colors"
                                                                title="Download ZIP"
                                                            >
                                                                <span className="material-symbols-outlined text-xl">download</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCard(card.id)}
                                                                className="text-red-500 hover:text-red-600 transition-colors"
                                                                title="Delete Card"
                                                            >
                                                                <span className="material-symbols-outlined text-xl">delete</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        No cards found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-4">
                                    {filteredCards.length > 0 ? (
                                        filteredCards.map((card) => (
                                            <div key={card.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee Name</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{card.full_name}</p>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(getDisplayStatus(card))}`}>
                                                        <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(getDisplayStatus(card))}`}></span>
                                                        {formatStatus(getDisplayStatus(card))}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee ID</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{card.employee_id}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date Submitted</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{new Date(card.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-700">
                                                    <button
                                                        onClick={() => navigate(`/single-card?requestId=${card.id}`)}
                                                        className="text-primary font-medium text-sm flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">visibility</span>
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadCard(card.zip_url, card.full_name)}
                                                        className="text-green-600 font-medium text-sm flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">download</span>
                                                        Download
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCard(card.id)}
                                                        className="text-red-500 font-medium text-sm flex items-center gap-1"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No cards found</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end mt-3 px-2">
                                    {cardsHasMore ? (
                                        <button onClick={loadMoreCards} disabled={cardsLoading} className="text-sm font-medium text-primary hover:underline">
                                            {cardsLoading ? 'Loading...' : 'View more'}
                                        </button>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No more cards</p>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] text-gray-900 dark:text-white px-1 pb-3 pt-5">Recent Requests</h2>
                            <div className="py-3 @container">
                                {/* Desktop Table */}
                                <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee Name</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date Submitted</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee ID</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {recentRequests.length > 0 ? (
                                                recentRequests.map((request) => (
                                                    <tr key={request.id}>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{request.full_name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                            {new Date(request.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(getDisplayStatus(request))}`}>
                                                                <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(getDisplayStatus(request))}`}></span>
                                                                {formatStatus(getDisplayStatus(request))}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{request.employee_id}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <Link className="text-primary hover:underline" to={`/single-card?requestId=${request.id}`}>View</Link>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                                        No requests found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile Cards */}
                                <div className="md:hidden space-y-4">
                                    {recentRequests.length > 0 ? (
                                        recentRequests.map((request) => (
                                            <div key={request.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee Name</p>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{request.full_name}</p>
                                                    </div>
                                                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(getDisplayStatus(request))}`}>
                                                        <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(getDisplayStatus(request))}`}></span>
                                                        {formatStatus(getDisplayStatus(request))}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 mb-3">
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee ID</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{request.employee_id}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date Submitted</p>
                                                        <p className="text-sm text-gray-900 dark:text-white">{new Date(request.created_at).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <Link
                                                    to={`/single-card?requestId=${request.id}`}
                                                    className="block w-full text-center text-primary hover:underline text-sm font-medium"
                                                >
                                                    View Details
                                                </Link>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No requests found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                    )}
                </main>
            </div>
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}
            <div className={`fixed top-0 left-0 h-full bg-white dark:bg-background-dark w-64 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setIsSidebarOpen(false)}>
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
                <nav className="flex flex-col p-5 gap-4">
                    <Link className="text-primary text-sm font-medium leading-normal" to="/dashboard">Dashboard</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/manage-requests">Manage Requests</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/user-management">User Management</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/department-management">Department Management</Link>
                    {/* Settings with submenu */}
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                            className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center justify-between"
                        >
                            <span>Settings</span>
                            <span className="material-symbols-outlined text-lg">
                                {isSettingsExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {isSettingsExpanded && (
                            <div className="flex flex-col gap-2 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                                <Link className="text-gray-700 dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-normal leading-normal" to="/vendor">
                                    Vendor Management
                                </Link>
                                <Link className="text-gray-700 dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-normal leading-normal" to="/user-management">
                                    User Management
                                </Link>
                                <Link className="text-gray-700 dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-normal leading-normal" to="/user-dashboard">
                                    User Dashboard
                                </Link>
                            </div>
                        )}
                    </div>

                    <button onClick={clearSession} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-500 text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined">delete_forever</span>
                        Clear Session
                    </button>
                    <button onClick={logout} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default Dashboard;