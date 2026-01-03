import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { useAuth } from '../hooks/useAuth';
import AdminHeader from '../components/AdminHeader';

const BulkCardImport = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="selection" />
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
                                        Drag & drop your CSV file here</p>
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
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/dashboard">Dashboard</Link>
                    <Link className="text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="#">Manage Employees</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="#">Settings</Link>
                    <button onClick={logout} className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default BulkCardImport;
