import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AdminHeader from '../components/AdminHeader';

const Selection = () => {
    const navigate = useNavigate();
    const { session, userRole, logout, loading: authLoading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (authLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background-light dark:bg-background-dark">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (!session || (userRole !== 'admin' && userRole !== 'manager')) {
        return null; // ProtectedRoute will handle redirect
    }

    const handleSingleCard = () => {
        navigate('/single-card');
    };

    const handleBulkCard = () => {
        navigate('/bulk-card-import');
    };

    const handleManageRequests = () => {
        navigate('/manage-requests');
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="selection" />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="flex flex-1 justify-center py-5 sm:px-4 md:px-10 lg:px-20 xl:px-40">
                        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                            <div className="flex flex-col flex-grow items-center px-4 py-12 md:py-20">
                                <div className="flex flex-col gap-3 text-center mb-12">
                                    <h1 className="text-gray-900 dark:text-gray-50 text-4xl font-black leading-tight tracking-[-0.033em] md:text-5xl">Start a new creation.</h1>
                                    <p className="text-gray-600 dark:text-gray-400 text-base font-normal leading-normal max-w-lg">How many ID cards do you want to create? Choose an option below to begin the process.</p>
                                </div>
                                <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 max-w-4xl">
                                    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark p-6 text-center transition-all hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50">
                                        <div className="flex justify-center">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>person</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <h2 className="text-gray-900 dark:text-gray-100 text-xl font-bold leading-normal">Create a Single Card</h2>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">Ideal for new hires, replacements, or individual updates.</p>
                                        </div>
                                        <button onClick={handleSingleCard} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] mt-auto">
                                            <span className="truncate">Start Single</span>
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark p-6 text-center transition-all hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50">
                                        <div className="flex justify-center">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>group</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <h2 className="text-gray-900 dark:text-gray-100 text-xl font-bold leading-normal">Create Multiple Cards</h2>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">Use a data file (e.g., .csv) to generate cards for a group or department in bulk.</p>
                                        </div>
                                        <button onClick={handleBulkCard} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] mt-auto">
                                            <span className="truncate">Start Batch</span>
                                        </button>
                                    </div>
                                    <div className="flex flex-col gap-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark p-6 text-center transition-all hover:shadow-lg hover:border-primary/50 dark:hover:border-primary/50">
                                        <div className="flex justify-center">
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>fact_check</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <h2 className="text-gray-900 dark:text-gray-100 text-xl font-bold leading-normal">Manage Employee Requests</h2>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">Review, approve, or reject ID card requests submitted by employees.</p>
                                        </div>
                                        <button onClick={handleManageRequests} className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-5 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] mt-auto">
                                            <span className="truncate">Manage Requests</span>
                                        </button>
                                    </div>
                                </div>
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
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/dashboard">Dashboard</Link>
                    <Link className="text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/manage-requests">Manage Employees</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/track-status">Settings</Link>
                    <a href="#" onClick={(e) => { e.preventDefault(); logout(); }} className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </a>
                </nav>
            </div>
        </div>
    );
};

export default Selection;