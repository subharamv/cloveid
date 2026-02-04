import React, { useEffect, useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

const IssuedCards = () => {
    const [items, setItems] = useState<any[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);
    const [deptFilter, setDeptFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch issued cards from the view
            const { data: cards, error: cardsError } = await supabase
                .from('employee_card_details')
                .select('*')
                .not('card_id', 'is', null)
                .order('card_created_at', { ascending: false });

            if (cardsError) throw cardsError;

            // Fetch departments from profiles (if available)
            const { data: profs } = await supabase.from('profiles').select('department').not('department', 'is', null);

            const deptList = Array.from(new Set((profs || []).map((p: any) => p.department))).filter(Boolean) as string[];

            setDepartments(deptList);
            setItems(cards || []);
        } catch (err: any) {
            console.error('Error fetching issued cards:', err);
            toast.error('Failed to load issued cards');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const filtered = items
        .filter(i => !deptFilter || (i.branch || '').toLowerCase() === deptFilter.toLowerCase())
        .filter(i => !searchQuery ||
            (i.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (i.employee_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (i.card_id || '').toString().toLowerCase().includes(searchQuery.toLowerCase())
        );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
            case 'sent_for_printing': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
            case 'ready_to_collect': return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300';
            case 'printed': return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
            case 'collected': return 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300';
            default: return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300';
        }
    };

    const formatStatus = (status: string) => {
        if (!status) return 'Pending';
        return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="issued-cards" />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
                            <div className="flex flex-col gap-1">
                                <h1 className="text-3xl font-bold leading-tight tracking-[-0.033em] text-gray-900 dark:text-white">Issued ID Cards</h1>
                                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">View all issued ID cards with department filters</p>
                            </div>
                            <button onClick={fetchData} className="flex min-w-[40px] h-10 px-3 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors" title="Refresh">
                                <span className="material-symbols-outlined text-lg">refresh</span>
                            </button>
                        </div>

                        <div className="mb-6 flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Department:</label>
                                <select
                                    value={deptFilter}
                                    onChange={(e) => setDeptFilter(e.target.value)}
                                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="flex max-w-md w-full items-center px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <span className="material-symbols-outlined text-gray-400 mr-2">search</span>
                                <input
                                    type="text"
                                    placeholder="Search by name, employee ID, or card ID..."
                                    className="bg-transparent border-none focus:ring-0 text-sm w-full dark:text-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="py-3">
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/50">
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Card ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Branch</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Batch ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Issued Date</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center">
                                                    <div className="flex justify-center">
                                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filtered.length > 0 ? (
                                            filtered.map(item => (
                                                <tr key={item.card_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.card_id || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.name}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.employee_id}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.branch || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{item.batch_id || '-'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.card_status)}`}>
                                                            {formatStatus(item.card_status)}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                        {item.card_created_at ? new Date(item.card_created_at).toLocaleDateString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => navigate('/employee-page', { state: { employeeId: item.employee_db_id } })}
                                                            className="text-primary hover:underline"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                                                    No issued cards found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                                    </div>
                                ) : filtered.length > 0 ? (
                                    filtered.map((item) => (
                                        <div key={item.card_id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Card ID</p>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.card_id || '-'}</p>
                                                </div>
                                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(item.card_status)}`}>
                                                    {formatStatus(item.card_status)}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee Name</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{item.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee ID</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{item.employee_id}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Branch</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">{item.branch || '-'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Issued Date</p>
                                                    <p className="text-sm text-gray-900 dark:text-white">
                                                        {item.card_created_at ? new Date(item.card_created_at).toLocaleDateString() : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate('/employee-page', { state: { employeeId: item.employee_db_id } })}
                                                className="w-full text-center text-primary hover:underline text-sm font-medium"
                                            >
                                                View Details
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No issued cards found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Sidebar */}
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
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/dashboard">Dashboard</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/manage-requests">Manage Employees</Link>
                    <Link className="text-primary text-sm font-medium leading-normal" to="/issued-cards">Issued Cards</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/user-management">User Management</Link>
                </nav>
            </div>
        </div>
    );
};

export default IssuedCards;
