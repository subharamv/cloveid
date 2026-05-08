import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    CreditCard, ClipboardList, Settings, ChevronRight,     Clock, CheckCircle2,
    Hourglass, ShieldCheck, Truck, Printer, Store, XCircle, AlertCircle,
    FileText, User as UserIcon, Building2, ArrowRight, CalendarDays, Plus,
    Sun, Moon, CloudSun
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import AppHeader from '../components/AppHeader';


const STEPS = [
    { key: 'submitted', label: 'Submitted', icon: CheckCircle2, color: 'green' },
    { key: 'in_review', label: 'In Review', icon: Hourglass, color: 'yellow', desc: 'Processing your details' },
    { key: 'approved', label: 'Approved', icon: ShieldCheck, color: 'blue', desc: 'Verified by Admin' },
    { key: 'sent_for_print', label: 'Sent for Print', icon: Truck, color: 'blue', desc: 'Cards sent to vendor' },
    { key: 'printed', label: 'Printed', icon: Printer, color: 'purple', desc: 'Card is ready' },
    { key: 'ready_to_collect', label: 'Ready to Collect', icon: Store, color: 'green', desc: 'Collect from office' },
] as const;

const STATUS_ORDER: Record<string, number> = {
    'Submitted': 0, 'Pending': 1, 'In Review': 1, 'Approved': 2,
    'Sent for Print': 3, 'Printed': 4,
    'Ready to Collect': 5, 'Ready for Pickup': 5,
};

function getStepIndex(status: string): number {
    return STATUS_ORDER[status] ?? -1;
}

interface Request {
    id: number;
    name: string;
    department: string;
    status: string;
    date: string;
    print_status?: string;
}

interface ProfileData {
    id: string;
    full_name: string;
    employee_id: string;
    branch: string;
    department: string;
    avatar_url?: string;
}

function getGreeting(): { text: string; icon: typeof Sun } {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', icon: Sun };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', icon: CloudSun };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', icon: CloudSun };
    return { text: 'Good Night', icon: Moon };
}

const UserDashboardPage = () => {
    const navigate = useNavigate();
    const { user, profile, userRole, logout, clearSession, loading: authLoading } = useAuth();
    const [requests, setRequests] = useState<Request[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getRequests = async () => {
            if (!authLoading && user && (userRole === 'user' || userRole === 'admin' || userRole === 'manager')) {
                setLoading(true);
                try {
                    const { data: userRequests, error } = await supabase
                        .from('requests')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('Error fetching requests:', error);
                    } else {
                        const formattedRequests = userRequests.map(req => {
                            let displayStatus = req.status;
                            if (req.print_status === 'ready_to_collect') {
                                displayStatus = 'Ready to Collect';
                            }
                            return {
                                id: req.id,
                                name: req.full_name,
                                department: req.department,
                                status: displayStatus,
                                print_status: req.print_status,
                                date: new Date(req.created_at).toLocaleDateString()
                            };
                        });
                        setRequests(formattedRequests);
                        if (formattedRequests.length > 0) {
                            setSelectedRequest(formattedRequests[0]);
                        }
                    }
                } catch (error) {
                    console.error('Unexpected error:', error);
                } finally {
                    setLoading(false);
                }
            }
        };
        getRequests();
    }, [user, authLoading, userRole]);

    const statusRequest = selectedRequest || (requests.length > 0 ? requests[0] : null);
    const currentStepIndex = statusRequest ? getStepIndex(statusRequest.status) : -1;
    const requestCounts = {
        total: requests.length,
        active: requests.filter(r => !['Ready to Collect', 'Ready for Pickup', 'Rejected'].includes(r.status)).length,
        completed: requests.filter(r => ['Ready to Collect', 'Ready for Pickup'].includes(r.status)).length,
    };

    const statusColors: Record<string, string> = {
        'Ready to Collect': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
        'Ready for Pickup': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
        'Printed': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
        'Sent for Print': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        'Approved': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
        'In Review': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        'Pending': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        'Submitted': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
        'Rejected': 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />

            {loading || authLoading ? (
                <div className="flex h-[60vh] items-center justify-center">
                    <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
                </div>
            ) : requests.length === 0 && !statusRequest ? (
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                    <div className="text-center py-20">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                            <ClipboardList className="w-8 h-8 text-orange-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No requests yet</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Start by requesting your first ID card.</p>
                        <Link
                            to="/employee-page"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all shadow-lg shadow-orange-200 dark:shadow-orange-900/30"
                        >
                            <CreditCard size={18} />
                            Request ID Card
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </main>
            ) : (
                <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                    {/* Welcome + Stats */}
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
                            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                                {profile?.full_name || 'User'}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                Manage your ID card requests and profile
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {profile?.employee_id && (
                                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                                    <UserIcon size={12} />
                                    <span className="font-mono font-medium text-gray-700 dark:text-gray-300">{profile.employee_id}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                                <Building2 size={12} />
                                <span>{profile?.department || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{requestCounts.total}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total Requests</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                            <p className="text-2xl font-bold text-amber-600">{requestCounts.active}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">In Progress</p>
                        </div>
                        <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4 col-span-2 sm:col-span-1">
                            <p className="text-2xl font-bold text-emerald-600">{requestCounts.completed}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Ready to Collect</p>
                        </div>
                    </div>

                    {/* Action Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <Link
                            to="/employee-page"
                            className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-orange-200 dark:hover:border-orange-800 transition-all duration-200"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200 dark:shadow-orange-900/30 shrink-0">
                                    <CreditCard className="w-6 h-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Request ID Card</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Lost your card or need a replacement?</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                            </div>
                        </Link>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-amber-900/30 shrink-0">
                                    <ClipboardList className="w-6 h-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Latest Status</h3>
                                    {statusRequest ? (
                                        <span className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusColors[statusRequest.status] || 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}>
                                            {statusRequest.status === 'Rejected' ? <XCircle size={12} /> :
                                                statusRequest.status === 'Ready to Collect' || statusRequest.status === 'Ready for Pickup' ? <CheckCircle2 size={12} /> :
                                                    <Clock size={12} />}
                                            {statusRequest.status}
                                        </span>
                                    ) : (
                                        <p className="text-sm text-gray-400 mt-1">No requests</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-profile'))}
                            className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 text-left"
                        >
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center shadow-lg dark:shadow-gray-900/30 shrink-0">
                                    <Settings className="w-6 h-6 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">My Profile</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Update your personal details</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                            </div>
                        </button>
                    </div>

                    {/* Main Content: Tracking + Sidebar */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tracking Section */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-7">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Request Progress</h2>
                                {statusRequest && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        #{statusRequest.id} &middot; {statusRequest.date}
                                    </span>
                                )}
                            </div>

                            {!statusRequest ? (
                                <p className="text-gray-400 text-center py-10">No requests to track.</p>
                            ) : statusRequest.status === 'Rejected' ? (
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 mb-6">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-red-800 dark:text-red-300">Request Rejected</h3>
                                        <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                                            Please contact the administrator for details or submit a new request.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Horizontal desktop steps */}
                                    <div className="hidden sm:flex items-start justify-between px-2">
                                        {STEPS.map((step, i) => {
                                            const StepIcon = step.icon;
                                            const isActive = i <= currentStepIndex;
                                            const isCurrent = i === currentStepIndex;
                                            const isLast = i === STEPS.length - 1;
                                            return (
                                                <div key={step.key} className="flex items-center gap-0 flex-1">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${
                                                            isActive
                                                                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                                        } ${isCurrent ? 'ring-4 ring-orange-100 dark:ring-orange-900/40 scale-110' : ''}`}>
                                                            <StepIcon size={16} />
                                                        </div>
                                                        <p className={`mt-2 text-xs font-medium whitespace-nowrap ${
                                                            isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                                                        }`}>
                                                            {step.label}
                                                        </p>
                                                    </div>
                                                    {!isLast && (
                                                        <div className={`flex-1 h-0.5 mx-3 mt-[-1.5rem] rounded-full ${
                                                            i < currentStepIndex ? 'bg-orange-400' : 'bg-gray-200 dark:bg-gray-700'
                                                        }`} />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Vertical mobile steps */}
                                    <div className="flex sm:hidden flex-col gap-0">
                                        {STEPS.map((step, i) => {
                                            const StepIcon = step.icon;
                                            const isActive = i <= currentStepIndex;
                                            const isCurrent = i === currentStepIndex;
                                            const isLast = i === STEPS.length - 1;
                                            return (
                                                <div key={step.key} className="flex gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                                                            isActive
                                                                ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white'
                                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                                                        } ${isCurrent ? 'ring-4 ring-orange-100 dark:ring-orange-900/40' : ''}`}>
                                                            <StepIcon size={14} />
                                                        </div>
                                                        {!isLast && (
                                                            <div className={`w-0.5 flex-1 min-h-[1.5rem] my-1 ${
                                                                i < currentStepIndex ? 'bg-orange-400' : 'bg-gray-200 dark:bg-gray-700'
                                                            }`} />
                                                        )}
                                                    </div>
                                                    <div className={`pb-6 ${isLast ? 'pb-0' : ''}`}>
                                                        <p className={`text-sm font-medium ${
                                                            isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                                                        }`}>
                                                            {step.label}
                                                        </p>
                                                        {isCurrent && step.desc && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Recent Requests Sidebar */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 sm:p-7">
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Requests</h2>
                                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                    {requests.length}
                                </span>
                            </div>

                            {requests.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-8">No requests yet.</p>
                            ) : (
                                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 -mr-1">
                                    {requests.map((req) => (
                                        <button
                                            key={req.id}
                                            onClick={() => setSelectedRequest(req)}
                                            className={`w-full text-left p-3.5 rounded-xl border transition-all duration-150 ${
                                                selectedRequest?.id === req.id
                                                    ? 'border-orange-200 dark:border-orange-800 bg-gradient-to-r from-orange-50 to-white dark:from-orange-900/10 dark:to-gray-800 shadow-sm'
                                                    : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 bg-white dark:bg-gray-800/50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">#{req.id}</span>
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                                    statusColors[req.status] || 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                                <CalendarDays size={11} />
                                                <span>{req.date}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {requests.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <Link
                                        to="/employee-page"
                                        className="flex items-center justify-center gap-1.5 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                                    >
                                        <Plus size={15} />
                                        New Request
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            )}
        </div>
    );
};

export default UserDashboardPage;
