
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';

const BulkCardImport = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogout = () => {
        navigate('/');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            navigate('/map-fields', { state: { file } });
        }
    };

    const handleChooseFileClick = () => {
        fileInputRef.current?.click();
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
                <main className="flex-1 p-8">
                    <div className="max-w-4xl mx-auto flex flex-col gap-8">
                        <div className="flex flex-wrap justify-between items-start gap-3">
                            <div className="flex min-w-72 flex-col gap-2">
                                <p className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                                    Bulk Card Import</p>
                                <p className="text-[#617289] dark:text-gray-400 text-base font-normal leading-normal">Upload a CSV
                                    file to create multiple ID cards at once.</p>
                            </div>
                        </div>
                        <div
                            className="flex gap-2 p-3 flex-wrap bg-white dark:bg-[#18212b] rounded-xl border border-gray-200 dark:border-gray-800">
                            <div
                                className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary/10 dark:bg-primary/20 pl-2 pr-4 text-primary">
                                <span className="material-symbols-outlined !fill-1" style={{ fontSize: '20px' }}>check_circle</span>
                                <p className="text-sm font-medium leading-normal">1. Upload</p>
                            </div>
                            <div
                                className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] dark:bg-[#2c3746] pl-2 pr-4 text-[#617289] dark:text-gray-400">
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>circle</span>
                                <p className="text-sm font-medium leading-normal">2. Map Fields</p>
                            </div>

                        </div>
                        <div
                            className="flex flex-col p-4 bg-white dark:bg-[#18212b] rounded-xl border border-gray-200 dark:border-gray-800">
                            <div
                                className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-[#dbe0e6] dark:border-gray-700 px-6 py-14 bg-background-light dark:bg-background-dark">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="material-symbols-outlined text-primary"
                                        style={{ fontSize: '48px' }}>cloud_upload</span>
                                    <p
                                        className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                                        Drag &amp; drop your CSV file here</p>
                                    <p className="text-[#617289] dark:text-gray-400 text-sm font-normal leading-normal text-center">
                                        or click to browse</p>
                                </div>
                                <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                                <button
                                    onClick={handleChooseFileClick}
                                    className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
                                    <span className="truncate">Choose File</span>
                                </button>
                            </div>
                        </div>
                        <div className="text-center">
                            <a className="text-[#617289] dark:text-gray-400 text-sm font-normal leading-normal underline hover:text-primary dark:hover:text-primary"
                                href="/template.csv" download>Don't have a template? Download our CSV template</a>
                            <p className="text-[#617289] dark:text-gray-500 text-xs mt-2">Accepted format: .csv. Max file size: 5MB.
                            </p>
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

export default BulkCardImport;