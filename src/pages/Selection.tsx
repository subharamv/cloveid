import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';

const Selection = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = () => {
        navigate('/');
    };

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
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-gray-700 px-2.5 py-3 bg-white dark:bg-background-dark">
                    <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                        <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>
                        <img src={logo} alt="Logo" className="h-8 w-auto" />
                    </div>
                    <div className="hidden lg:flex flex-1 justify-center gap-8">
                        <div className="flex items-center gap-9">
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/dashboard">Dashboard</a>
                            <a className="text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
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
                    <div className="flex flex-1 justify-center py-5 sm:px-4 md:px-10 lg:px-20 xl:px-40">
                        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                            <main className="flex flex-col flex-grow items-center px-4 py-12 md:py-20">
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
                            </main>
                            <footer className="flex flex-col items-center justify-center gap-4 pt-8">
                                <div className="flex items-center gap-6">
                                    <a className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal min-w-40 hover:text-primary dark:hover:text-primary/80" href="#">Support</a>
                                    <a className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal min-w-40 hover:text-primary dark:hover:text-primary/80" href="#">Help Center</a>
                                    <a className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal min-w-40 hover:text-primary dark:hover:text-primary/80" href="#">Terms of Service</a>
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal">© 2024 Clove ID Maker. All rights reserved.</p>
                            </footer>
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
                    <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/dashboard">Dashboard</a>
                    <a className="text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
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

export default Selection;