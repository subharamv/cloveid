import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { useAuth } from '../hooks/useAuth';
import AdminHeader from '../components/AdminHeader';
import { handleApiError } from '../lib/apiErrorHandler';

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
    const { session, logout, profile, clearSession } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
    const [recentRequests, setRecentRequests] = useState<any[]>([]);
    const [recentBatches, setRecentBatches] = useState<any[]>([]);
    const [batchStats, setBatchStats] = useState<any[]>([]);
    const [stats, setStats] = useState<DashboardStats>({
        inEditing: 0,
        awaitingApproval: 0,
        approved: 0,
        sentForPrinting: 0
    });
    const [batchCardStats, setBatchCardStats] = useState<BatchStats>({
        printed: 0,
        readyToCollect: 0,
        sentForPrinting: 0,
        pending: 0
    });

    useEffect(() => {
        if (session) {
            fetchDashboardData();
        }
    }, [session]);

    const fetchDashboardData = async () => {
        try {
            const { data: recentRequests, error: requestsError } = await supabase
                .from('requests')
                .select('*, print_status')
                .order('created_at', { ascending: false })
                .limit(5);

            if (requestsError) {
                handleApiError(requestsError, logout);
                if (requestsError.message?.includes('JWT') || requestsError.message?.includes('session')) {
                    return; // Stop execution if auth error
                }
                throw requestsError;
            }
            setRecentRequests(recentRequests || []);

            const { data: recentBatches, error: batchesError } = await supabase
                .from('card_batches')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (batchesError) throw batchesError;
            setRecentBatches(recentBatches || []);

            // Fetch Individual Requests Stats (only from ManageRequests page - exclude batch requests)
            const { data: requests, error: requestsError2 } = await supabase
                .from('requests')
                .select('status, is_edited, batch_id')
                .is('batch_id', null);

            if (requestsError2) throw requestsError2;

            // Fetch Bulk ID Cards Stats
            const { data: bulkCards, error: bulkCardsError } = await supabase
                .from('id_cards')
                .select('status, print_status');

            if (bulkCardsError) throw bulkCardsError;

            const initialStats = {
                inEditing: 0,
                awaitingApproval: 0,
                approved: 0,
                sentForPrinting: 0
            };

            // Only count individual employee requests (from ManageRequests page)
            const individualStats = requests?.reduce((acc, req) => {
                if (req.status === 'Pending' && req.is_edited === false) {
                    acc.inEditing++;
                } else if (req.status === 'Pending' && req.is_edited === true) {
                    acc.awaitingApproval++;
                } else if (req.status === 'Approved') {
                    acc.approved++;
                } else if (req.status === 'Printed') {
                    acc.sentForPrinting++;
                }
                return acc;
            }, { ...initialStats });

            if (individualStats) setStats(individualStats);

            // Calculate batch card statistics based on print_status
            const batchCardStatistics = bulkCards?.reduce((acc, card) => {
                if (card.print_status === 'ready_to_collect') {
                    acc.readyToCollect++;
                } else if (card.print_status === 'printed') {
                    acc.printed++;
                } else if (card.status === 'sent_for_printing' || card.print_status === 'sent_for_printing') {
                    acc.sentForPrinting++;
                } else {
                    acc.pending++;
                }
                return acc;
            }, { printed: 0, readyToCollect: 0, sentForPrinting: 0, pending: 0 });

            if (batchCardStatistics) setBatchCardStats(batchCardStatistics);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const handleNewBatch = () => {
        navigate('/selection');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
            case 'Printed': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
            case 'Pending': return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
            case 'In Editing': return 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300';
            case 'Ready to Collect': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300';
            default: return 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300';
        }
    };

    const getStatusDotColor = (status: string) => {
        switch (status) {
            case 'Approved': return 'bg-green-500';
            case 'Printed': return 'bg-blue-500';
            case 'Pending': return 'bg-yellow-500';
            case 'In Editing': return 'bg-orange-500';
            case 'Ready to Collect': return 'bg-emerald-500';
            default: return 'bg-gray-500';
        }
    };

    const formatStatus = (status: string) => {
        if (status === 'In Editing') return 'In Editing';
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="dashboard" />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-wrap justify-between gap-4 items-center mb-8">
                            <div className="flex flex-col gap-1">
                                <p className="text-3xl font-bold leading-tight tracking-[-0.033em] text-gray-900 dark:text-white">Dashboard</p>
                                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">Welcome back, {profile?.full_name || session?.user?.user_metadata?.full_name || 'User'}! Here's an overview of your ID card batches.</p>
                            </div>
                            <button onClick={handleNewBatch} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2">
                                <span className="material-symbols-outlined text-lg">add_circle</span>
                                <span className="truncate">Create New Batch</span>
                            </button>
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
                                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(request.print_status === 'ready_to_collect' ? 'Ready to Collect' : request.status)}`}>
                                                            <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(request.print_status === 'ready_to_collect' ? 'Ready to Collect' : request.status)}`}></span>
                                                            {request.print_status === 'ready_to_collect' ? 'Ready to Collect' : formatStatus(request.status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{request.employee_id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <Link className="text-primary hover:underline" to={`/manage-requests?view=${request.id}`}>View</Link>
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
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(request.print_status === 'ready_to_collect' ? 'Ready to Collect' : request.status)}`}>
                                                    <span className={`w-2 h-2 mr-2 rounded-full ${getStatusDotColor(request.print_status === 'ready_to_collect' ? 'Ready to Collect' : request.status)}`}></span>
                                                    {request.print_status === 'ready_to_collect' ? 'Ready to Collect' : formatStatus(request.status)}
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
                                                to={`/manage-requests?view=${request.id}`}
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