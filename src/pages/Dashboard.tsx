import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/CLOVE LOGO BLACK.png';

const Dashboard = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleNewBatch = () => {
        navigate('/selection');
    };

    const handleLogout = () => {
        navigate('/');
    };
    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-gray-700 px-2.5 py-3 bg-white dark:bg-background-dark">
                    <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                        <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>
                        <img src={logo} alt="Logo" className="h-8 w-auto" />
                    </div>
                    <div className="hidden lg:flex flex-1 justify-center gap-8">
                        <div className="flex items-center gap-9">
                            <a className="text-primary text-sm font-medium leading-normal" href="/dashboard">Dashboard</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Manage Employees</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Settings</a>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                        </button>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" data-alt="User avatar image" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDTuk1Iosn49fHWfKjAP9fBJw3pQzsM6YL5zr-Cxka0K6IIkmxhTiisNLHxHNnJ9KANzspNqOKesKX_0x9HyVIotvJDUojrFn2AWhrITYpZtN0xi9T7ugql-9wNJQnqPuWDUZnZIbtnSxLe2Onfl1FMn0BF4vM61YkMxGtaPP6Gq-SqEPQfugyzpPDy7QoNGts7_1Abd7NSO-7z37gh5XlZ1BW6zV02LVXWhiY9TQDiVZOFWYhWBBRvJEJZ7Ys0spYA1NDiqcHthFzB")' }}></div>
                        <button onClick={handleLogout} className="hidden lg:flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="material-symbols-outlined text-xl">logout</span>
                        </button>
                    </div>
                </header>
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="mx-auto max-w-7xl">
                        <div className="flex flex-wrap justify-between gap-4 items-center mb-8">
                            <div className="flex flex-col gap-1">
                                <p className="text-3xl font-bold leading-tight tracking-[-0.033em] text-gray-900 dark:text-white">Dashboard</p>
                                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">Welcome back! Here's an overview of your ID card batches.</p>
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
                                <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">15</p>
                                <a className="text-sm font-medium text-primary hover:underline" href="#">View Details</a>
                            </div>
                            <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Awaiting Approval</p>
                                    <span className="material-symbols-outlined text-yellow-500">pending_actions</span>
                                </div>
                                <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">8</p>
                                <a className="text-sm font-medium text-primary hover:underline" href="#">View Details</a>
                            </div>
                            <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Approved</p>
                                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                                </div>
                                <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">24</p>
                                <a className="text-sm font-medium text-primary hover:underline" href="#">View Details</a>
                            </div>
                            <div className="flex flex-col gap-4 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <p className="text-base font-medium leading-normal text-gray-600 dark:text-gray-300">Sent for Printing</p>
                                    <span className="material-symbols-outlined text-blue-500">print</span>
                                </div>
                                <p className="text-3xl font-bold leading-tight tracking-tight text-gray-900 dark:text-white">120</p>
                                <a className="text-sm font-medium text-primary hover:underline" href="#">View Details</a>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold leading-tight tracking-[-0.015em] text-gray-900 dark:text-white px-1 pb-3 pt-5">Recent Batches</h2>
                        <div className="py-3 @container">
                            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-900/50">
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Batch ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date Created</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Number of Cards</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">B-74563</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">2023-10-26</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/50 px-3 py-1 text-xs font-medium text-green-800 dark:text-green-300">
                                                    <span className="w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
                                                    Approved
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">50</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <a className="text-primary hover:underline" href="#">View</a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">B-74562</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">2023-10-25</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-300">
                                                    <span className="w-2 h-2 mr-2 bg-blue-500 rounded-full"></span>
                                                    Sent for Printing
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">32</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <a className="text-primary hover:underline" href="#">View</a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">B-74561</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">2023-10-25</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/50 px-3 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-300">
                                                    <span className="w-2 h-2 mr-2 bg-yellow-500 rounded-full"></span>
                                                    Awaiting Approval
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">15</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <a className="text-primary hover:underline" href="#">Edit</a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">B-74560</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">2023-10-24</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/50 px-3 py-1 text-xs font-medium text-orange-800 dark:text-orange-300">
                                                    <span className="w-2 h-2 mr-2 bg-orange-500 rounded-full"></span>
                                                    In Editing
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">25</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <a className="text-primary hover:underline" href="#">Edit</a>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">B-74559</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">2023-10-22</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-300">
                                                    <span className="w-2 h-2 mr-2 bg-blue-500 rounded-full"></span>
                                                    Sent for Printing
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">78</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <a className="text-primary hover:underline" href="#">View</a>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
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
                    <a className="text-primary text-sm font-medium leading-normal" href="/dashboard">Dashboard</a>
                    <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
                    <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Manage Employees</a>
                    <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Settings</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </a>
                </nav>
            </div>
        </div>
    );
};

export default Dashboard;