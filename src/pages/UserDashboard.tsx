import React, { useState, useEffect } from 'react';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { Link } from 'react-router-dom';
import { CreditCard, List, Settings, Bell, Menu, X, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserDashboardPage = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [requests, setRequests] = useState([
        { id: 1, name: 'John Doe', department: 'Engineering', status: 'Approved', date: '2023-10-28' },
        { id: 2, name: 'Jane Smith', department: 'Marketing', status: 'In Review', date: '2023-10-29' },
    ]);

    const handleLogout = () => {
        navigate('/');
    };

    const latestRequest = requests.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

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
                    <div className="flex items-center justify-end gap-4">
                        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Bell className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDTuk1Iosn49fHWfKjAP9fBJw3pQzsM6YL5zr-Cxka0K6IIkmxhTiisNLHxHNnJ9KANzspNqOKesKX_0x9HyVIotvJDUojrFn2AWhrITYpZtN0xi9T7ugql-9wNJQnqPuWDUZnZIbtnSxLe2Onfl1FMn0BF4vM61YkMxGtaPP6Gq-SqEPQfugyzpPDy7QoNGts7_1Abd7NSO-7z37gh5XlZ1BW6zV02LVXWhiY9TQDiVZOFWYhWBBRvJEJZ7Ys0spYA1NDiqcHthFzB")' }}></div>
                            <span className="font-semibold hidden md:block">User Name</span>
                        </div>
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
                                        <span className="font-bold">Your Request Status:</span> <span className="font-semibold">{latestRequest ? latestRequest.status : 'No Requests'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Card 3: Settings */}
                        <div className="p-6 bg-white rounded-lg shadow-[0_0.5rem_1rem_rgba(0,0,0,.05)] flex flex-col items-center text-center">
                            <Settings className="h-12 w-12 text-[#f48120] mb-4" />
                            <h2 className="text-xl font-bold mb-2">My ID Card Profile</h2>
                            <p className="text-gray-600 mb-4">Review your personal details, photo, and preferences used for the ID card.</p>
                            <Link to="#" className="mt-auto w-full bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">Manage Profile</Link>
                        </div>
                    </div>

                    <div>
                        <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 mt-10">
                            <h2 className="text-slate-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] mb-6">Your Request Status</h2>
                            {/* Horizontal view for larger screens */}
                            <div className="hidden sm:flex justify-between items-start">
                                <div className="flex flex-col items-center text-center">
                                    <span className="flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full ring-4 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-400">check</span>
                                    </span>
                                    <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">Submitted</h3>
                                    <time className="text-sm text-slate-400 dark:text-slate-500">Oct 25, 2023</time>
                                </div>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mx-4 mt-4"></div>
                                <div className="flex flex-col items-center text-center">
                                    <span className="flex items-center justify-center w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-full ring-4 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-yellow-600 dark:text-yellow-400">hourglass_top</span>
                                    </span>
                                    <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">In Review</h3>
                                    <time className="text-sm text-slate-400 dark:text-slate-500">Pending</time>
                                </div>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mx-4 mt-4"></div>
                                <div className="flex flex-col items-center text-center opacity-50">
                                    <span className="flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full ring-4 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">verified</span>
                                    </span>
                                    <h3 className="mt-2 text-base font-semibold text-slate-500 dark:text-slate-400">Approved</h3>
                                </div>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mx-4 mt-4"></div>
                                <div className="flex flex-col items-center text-center opacity-50">
                                    <span className="flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full ring-4 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">print</span>
                                    </span>
                                    <h3 className="mt-2 text-base font-semibold text-slate-500 dark:text-slate-400">Printed</h3>
                                </div>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 mx-4 mt-4"></div>
                                <div className="flex flex-col items-center text-center opacity-50">
                                    <span className="flex items-center justify-center w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-full ring-4 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">storefront</span>
                                    </span>
                                    <h3 className="mt-2 text-base font-semibold text-slate-500 dark:text-slate-400">Ready for Pickup</h3>
                                </div>
                            </div>
                            {/* Vertical view for smaller screens */}
                            <ol className="relative border-l border-slate-200 dark:border-slate-700 space-y-8 sm:hidden">
                                <li className="ml-6">
                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full -left-3 ring-8 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-green-600 dark:text-green-400">check</span>
                                    </span>
                                    <h3 className="flex items-center mb-1 text-base font-semibold text-slate-900 dark:text-white">Submitted</h3>
                                    <time className="block mb-2 text-sm font-normal leading-none text-slate-400 dark:text-slate-500">October 25th, 2023</time>
                                </li>
                                <li className="ml-6">
                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-yellow-100 dark:bg-yellow-900 rounded-full -left-3 ring-8 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-yellow-600 dark:text-yellow-400">hourglass_top</span>
                                    </span>
                                    <h3 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">In Review</h3>
                                    <time className="block mb-2 text-sm font-normal leading-none text-slate-400 dark:text-slate-500">Pending HR Approval</time>
                                </li>
                                <li className="ml-6">
                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full -left-3 ring-8 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">verified</span>
                                    </span>
                                    <h3 className="mb-1 text-base font-semibold text-slate-500 dark:text-slate-400">Approved</h3>
                                </li>
                                <li className="ml-6">
                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full -left-3 ring-8 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">print</span>
                                    </span>
                                    <h3 className="mb-1 text-base font-semibold text-slate-500 dark:text-slate-400">Printed</h3>
                                </li>
                                <li className="ml-6">
                                    <span className="absolute flex items-center justify-center w-6 h-6 bg-slate-100 dark:bg-slate-700 rounded-full -left-3 ring-8 ring-white dark:ring-slate-900/50">
                                        <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-400">storefront</span>
                                    </span>
                                    <h3 className="mb-1 text-base font-semibold text-slate-500 dark:text-slate-400">Ready for Pickup</h3>
                                </li>
                            </ol>
                        </div>
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
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal" to="#" onClick={() => setIsSidebarOpen(false)}>Settings</Link>
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