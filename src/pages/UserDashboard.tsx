import React, { useState, useEffect } from 'react';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { Link } from 'react-router-dom';
import { CreditCard, List, Settings, Bell, Menu, X, LogOut, XCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { User } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';

interface Request {
    id: number;
    name: string;
    department: string;
    status: string;
    date: string;
    print_status?: string;
}

const UserDashboardPage = () => {
    const navigate = useNavigate();
    const { logout, clearSession } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);

    useEffect(() => {
        const getUserAndRequests = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
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
                        // If print_status is ready_to_collect, override the status
                        if (req.print_status === 'ready_to_collect') {
                            displayStatus = 'Ready to Collect';
                        }
                        return {
                            id: req.id,
                            name: req.full_name,
                            department: req.branch,
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
            }
        };
        getUserAndRequests();
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    const statusRequest = selectedRequest || (requests.length > 0 ? requests[0] : null);

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#F8F9FA] dark:bg-gray-900 group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-gray-700 px-4 py-3 bg-white dark:bg-gray-800 shadow-md">
                    <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                        <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu className="h-6 w-6" />
                        </button>
                        <img src={logo} alt="Logo" className="h-8 w-auto" />
                        
                    </div>
                    <div className="hidden lg:flex flex-1 justify-center gap-8">
                        {/* Desktop nav links can be placed here if needed in future */}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Bell className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDTuk1Iosn49fHWfKjAP9fBJw3pQzsM6YL5zr-Cxka0K6IIkmxhTiisNLHxHNnJ9KANzspNqOKesKX_0x9HyVIotvJDUojrFn2AWhrITYpZtN0xi9T7ugql-9wNJQnqPuWDUZnZIbtnSxLe2Onfl1FMn0BF4vM61YkMxGtaPP6Gq-SqEPQfugyzpPDy7QoNGts7_1Abd7NSO-7z37gh5XlZ1BW6zV02LVXWhiY9TQDiVZOFWYhWBBRvJEJZ7Ys0spYA1NDiqcHthFzB")' }}></div>
                            <span className="font-semibold hidden md:block">{user ? user.user_metadata.full_name : 'User'}</span>
                        </div>
                        <button onClick={clearSession} className="hidden lg:flex px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium" title="Clear Session & Logout">
                            Clear Session
                        </button>
                        <button onClick={handleLogout} className="hidden lg:flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <LogOut className="h-6 w-6" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <h1 className="text-xl font-bold lg:block mb-8">Employee Dashboard</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* Card 1: Raise New Card Request */}
                        <div className="p-6 bg-white rounded-lg shadow-[0_0.5rem_1rem_rgba(0,0,0,.05)] flex flex-col items-center text-center">
                            <CreditCard className="h-12 w-12 text-[#f48120] mb-4" />
                            <h2 className="text-xl font-bold mb-2">Request an ID Card</h2>
                            <p className="text-gray-600 mb-4">Lost your current card or need a replacement? Start a new request here.</p>
                            <Link to="/employee-page" className="mt-auto w-full bg-[#f48120] text-white font-bold py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors">Start New Request</Link>
                        </div>

                        {/* Card 2: Track Status */}
                        <div className="p-6 bg-white rounded-lg shadow-[0_0.5rem_1rem_rgba(0,0,0,.05)] flex flex-col items-center text-center">
                            <List className="h-12 w-12 text-[#f48120] mb-4" />
                            <h2 className="text-xl font-bold mb-2">View My Requests</h2>
                            <p className="text-gray-600 mb-4">Track the live status, history, and details of all your ID card submissions.</p>
                            <div className="mt-auto w-full">
                                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md shadow-md">
                                    <p>
                                        <span className="font-bold">Latest Request Status:</span> <span className="font-semibold">{statusRequest ? statusRequest.status : 'No Requests'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Settings */}
                        <div className="p-6 bg-white rounded-lg shadow-[0_0.5rem_1rem_rgba(0,0,0,.05)] flex flex-col items-center text-center">
                            <Settings className="h-12 w-12 text-[#f48120] mb-4" />
                            <h2 className="text-xl font-bold mb-2">My ID Card Profile</h2>
                            <p className="text-gray-600 mb-4">Review your personal details, photo, and preferences used for the ID card.</p>
                            <Link to="/profile" className="mt-auto w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Manage Profile</Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
                                <h2 className="text-slate-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] mb-6">Track Your Request</h2>
                                {statusRequest ? (
                                    <>
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Tracking status for Request ID: <span className="font-bold text-[#f48120]">#{statusRequest.id}</span> ({statusRequest.name})
                                            </p>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                statusRequest.status === 'Ready to Collect' ? 'bg-green-100 text-green-700' :
                                                statusRequest.status === 'Ready for Pickup' ? 'bg-green-100 text-green-700' :
                                                statusRequest.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                statusRequest.status === 'Printed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {statusRequest.status}
                                            </span>
                                        </div>

                                        {statusRequest.status === 'Rejected' ? (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-4 mb-6">
                                                <div className="bg-red-100 p-2 rounded-full">
                                                    <XCircle className="h-6 w-6 text-red-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-red-800">Request Rejected</h3>
                                                    <p className="text-sm text-red-700">Your request has been rejected. Please contact the administrator for more details or raise a new request with corrected information.</p>
                                                </div>
                                            </div>
                                        ) : null}

                                        {/* Horizontal view for larger screens */}
                                        <div className="hidden sm:flex justify-between items-start pt-4">
                                            <div className={`flex flex-col items-center text-center`}>
                                                <span className={`flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white dark:ring-slate-900/50 bg-green-100 dark:bg-green-900`}>
                                                    <span className={`material-symbols-outlined text-sm text-green-600 dark:text-green-400`}>check</span>
                                                </span>
                                                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">Submitted</h3>
                                                <time className="text-sm text-slate-400 dark:text-slate-500">{statusRequest.date}</time>
                                            </div>
                                            
                                            <div className={`flex-1 h-px mt-4 ${['In Review', 'Approved', 'Printed', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'} mx-4`}></div>
                                            
                                            <div className={`flex flex-col items-center text-center ${['Pending', 'In Review', 'Approved', 'Printed', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <span className={`flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white dark:ring-slate-900/50 ${['Pending', 'In Review'].includes(statusRequest.status) ? 'bg-yellow-100 dark:bg-yellow-900' : (['Approved', 'Printed', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-100 dark:bg-slate-700')}`}>
                                                    <span className={`material-symbols-outlined text-sm ${['Pending', 'In Review'].includes(statusRequest.status) ? 'text-yellow-600 dark:text-yellow-400' : (['Approved', 'Printed', 'Ready for Pickup'].includes(statusRequest.status) ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400')}`}>
                                                        {['Approved', 'Printed', 'Ready for Pickup'].includes(statusRequest.status) ? 'check' : 'hourglass_top'}
                                                    </span>
                                                </span>
                                                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">In Review</h3>
                                            </div>

                                            <div className={`flex-1 h-px mt-4 ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'} mx-4`}></div>

                                            <div className={`flex flex-col items-center text-center ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <span className={`flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white dark:ring-slate-900/50 ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                    <span className={`material-symbols-outlined text-sm ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'check' : 'verified'}
                                                    </span>
                                                </span>
                                                <h3 className={`mt-2 text-base font-semibold ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Approved</h3>
                                            </div>

                                            <div className={`flex-1 h-px mt-4 ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'} mx-4`}></div>

                                            <div className={`flex flex-col items-center text-center ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <span className={`flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white dark:ring-slate-900/50 ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                    <span className={`material-symbols-outlined text-sm ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'check' : 'print'}
                                                    </span>
                                                </span>
                                                <h3 className={`mt-2 text-base font-semibold ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Printed</h3>
                                            </div>

                                            <div className={`flex-1 h-px mt-4 ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'} mx-4`}></div>

                                            <div className={`flex flex-col items-center text-center ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <span className={`flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white dark:ring-slate-900/50 ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 dark:bg-green-900' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                                    <span className={`material-symbols-outlined text-sm ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>storefront</span>
                                                </span>
                                                <h3 className={`mt-2 text-base font-semibold ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Ready to Collect</h3>
                                            </div>
                                        </div>

                                        {/* Vertical view for mobile screens */}
                                        <div className="flex sm:hidden flex-col gap-6 pt-4">
                                            <div className="flex items-start gap-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600">
                                                        <span className="material-symbols-outlined text-sm">check</span>
                                                    </span>
                                                    <div className="w-0.5 h-10 bg-green-500 my-1"></div>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Submitted</h3>
                                                    <p className="text-sm text-slate-500">{statusRequest.date}</p>
                                                </div>
                                            </div>

                                            <div className={`flex items-start gap-4 ${['Pending', 'In Review', 'Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full ${['Pending', 'In Review'].includes(statusRequest.status) ? 'bg-yellow-100 text-yellow-600' : (['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500')}`}>
                                                        <span className="material-symbols-outlined text-sm">
                                                            {['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'check' : 'hourglass_top'}
                                                        </span>
                                                    </span>
                                                    <div className={`w-0.5 h-10 my-1 ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">In Review</h3>
                                                    <p className="text-sm text-slate-500">Processing your details</p>
                                                </div>
                                            </div>

                                            <div className={`flex items-start gap-4 ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full ${['Approved', 'Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? (['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600') : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className="material-symbols-outlined text-sm">
                                                            {['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'check' : 'verified'}
                                                        </span>
                                                    </span>
                                                    <div className={`w-0.5 h-10 my-1 ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Approved</h3>
                                                    <p className="text-sm text-slate-500">Verified by Admin</p>
                                                </div>
                                            </div>

                                            <div className={`flex items-start gap-4 ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full ${['Printed', 'Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? (['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600') : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className="material-symbols-outlined text-sm">
                                                            {['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'check' : 'print'}
                                                        </span>
                                                    </span>
                                                    <div className={`w-0.5 h-10 my-1 ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Printed</h3>
                                                    <p className="text-sm text-slate-500">Card is ready</p>
                                                </div>
                                            </div>

                                            <div className={`flex items-start gap-4 ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? '' : 'opacity-50'}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full ${['Ready to Collect', 'Ready for Pickup'].includes(statusRequest.status) ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className="material-symbols-outlined text-sm">storefront</span>
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-slate-900">Ready to Collect</h3>
                                                    <p className="text-sm text-slate-500">Collect from office</p>
                                                </div>
                                            </div>
                                        </div>

                                    </>

                                ) : (
                                    <p className="text-gray-500 text-center py-10">No requests to track. Start by requesting a new ID card.</p>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm h-full">
                                <h2 className="text-slate-900 dark:text-white text-[20px] font-bold mb-4">Your Recent Requests</h2>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {requests.length === 0 ? (
                                        <p className="text-gray-500 text-sm">No requests found.</p>
                                    ) : (
                                        requests.map((req) => (
                                            <div 
                                                key={req.id} 
                                                onClick={() => setSelectedRequest(req)}
                                                className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedRequest?.id === req.id ? 'border-[#f48120] bg-orange-50 dark:bg-orange-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'}`}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-sm text-gray-900 dark:text-white">Request #{req.id}</span>
                                                    <span className="text-[10px] text-gray-500">{req.date}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-600 dark:text-gray-400">{req.name}</span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                        req.status === 'Ready to Collect' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'Ready for Pickup' ? 'bg-green-100 text-green-700' :
                                                        req.status === 'Printed' ? 'bg-blue-100 text-blue-700' :
                                                        req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-10">
                        {/* Hidden parts or mobile view could go here */}
                    </div>
                </main>
            </div>

            {/* Sidebar for mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}
            <div className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 w-64 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="font-bold">Menu</h2>
                    <button onClick={() => setIsSidebarOpen(false)}>
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <nav className="flex flex-col p-5 gap-4">
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal" to="/employee-page" onClick={() => setIsSidebarOpen(false)}>Raise New Card</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal" to="/track-status" onClick={() => setIsSidebarOpen(false)}>Track Status</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal" to="/profile" onClick={() => setIsSidebarOpen(false)}>Settings</Link>
                    <button onClick={clearSession} className="text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-500 text-sm font-medium leading-normal">
                        <XCircle className="h-5 w-5" />
                        Clear Session
                    </button>
                    <button onClick={handleLogout} className="text-left flex items-center gap-2 text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal">
                        <LogOut className="h-5 w-5" />
                        Logout
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default UserDashboardPage;
