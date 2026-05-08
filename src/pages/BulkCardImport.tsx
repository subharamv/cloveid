import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileSpreadsheet, Download, ChevronRight, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { supabase } from '@/lib/supabaseClient';

const BulkCardImport = () => {
    const navigate = useNavigate();
    const [isDragActive, setIsDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [recentBatches, setRecentBatches] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, today: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentData();
    }, []);

    const fetchRecentData = async () => {
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [batchesRes, totalRes, todayRes, pendingRes] = await Promise.all([
                supabase.from('card_batches').select('*').order('created_at', { ascending: false }).limit(5),
                supabase.from('card_batches').select('id', { count: 'exact', head: true }),
                supabase.from('card_batches').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
                supabase.from('card_batches').select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
            ]);

            if (batchesRes.data) setRecentBatches(batchesRes.data);
            setStats({
                total: totalRes.count || 0,
                today: todayRes.count || 0,
                pending: pendingRes.count || 0,
            });
        } catch (err) {
            console.error('Error fetching recent data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && isValidFile(file)) {
            navigate('/map-fields', { state: { file } });
        }
    };

    const isValidFile = (file: File) => {
        const validTypes = ['.csv', '.xlsx', '.xls'];
        const validMimeTypes = [
            'text/csv',
            'application/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        return validTypes.includes(fileExtension) || validMimeTypes.includes(file.type);
    };

    const handleChooseFileClick = () => {
        fileInputRef.current?.click();
    };

    const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file && isValidFile(file)) {
            navigate('/map-fields', { state: { file } });
        } else if (file) {
            alert('Please drop a valid CSV or XLSX file');
        }
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { color: string; dot: string }> = {
            pending: { color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
            processing: { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500' },
            completed: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
        };
        const c = config[status] || { color: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', dot: 'bg-gray-500' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${c.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const statCards = [
        { label: 'Total Imports', value: stats.total, icon: FileSpreadsheet, color: 'from-blue-400 to-blue-600' },
        { label: 'Imported Today', value: stats.today, icon: Clock, color: 'from-amber-400 to-amber-600' },
        { label: 'In Progress', value: stats.pending, icon: AlertCircle, color: 'from-orange-400 to-orange-600' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Bulk ID Card Management</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Upload a spreadsheet to create multiple ID cards at once
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                    {statCards.map(stat => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                                        <Icon size={16} className="text-white" />
                                    </div>
                                </div>
                                {loading ? (
                                    <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                                ) : (
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                                )}
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
                    {/* Upload Section */}
                    <div className="lg:col-span-3">
                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Upload New File</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">CSV or Excel format supported</p>
                            </div>
                            <div className="p-6">
                                <div className="flex gap-2 p-3 flex-wrap mb-6">
                                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 pl-2 pr-4 text-orange-700 dark:text-orange-400">
                                        <span className="text-sm font-medium leading-none">1</span>
                                        <p className="text-sm font-medium leading-normal">Upload</p>
                                    </div>
                                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 dark:bg-gray-700 pl-2 pr-4 text-gray-500 dark:text-gray-400">
                                        <span className="text-sm font-medium leading-none">2</span>
                                        <p className="text-sm font-medium leading-normal">Map Fields</p>
                                    </div>
                                    <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 dark:bg-gray-700 pl-2 pr-4 text-gray-500 dark:text-gray-400">
                                        <span className="text-sm font-medium leading-none">3</span>
                                        <p className="text-sm font-medium leading-normal">Review & Import</p>
                                    </div>
                                </div>

                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={handleChooseFileClick}
                                    className={`flex flex-col items-center gap-5 rounded-xl border-2 border-dashed px-6 py-14 cursor-pointer transition-all ${isDragActive
                                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-orange-400 dark:hover:border-orange-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                        }`}
                                >
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragActive
                                            ? 'bg-orange-100 dark:bg-orange-900/30'
                                            : 'bg-gray-100 dark:bg-gray-700'
                                        }`}>
                                        <Upload size={32} className={isDragActive ? 'text-orange-600' : 'text-gray-400'} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-gray-900 dark:text-white text-lg font-bold leading-tight">
                                            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                                        </p>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                            or click to browse &mdash; .csv, .xlsx, .xls up to 5MB
                                        </p>
                                    </div>
                                    <input type="file" accept=".csv,.xlsx,.xls" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleChooseFileClick(); }}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 dark:shadow-orange-900/30"
                                    >
                                        <Upload size={16} />
                                        Choose File
                                    </button>
                                </div>

                                <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                                    <a
                                        className="text-orange-600 dark:text-orange-400 font-medium hover:underline inline-flex items-center gap-1"
                                        href="/template.csv"
                                        download
                                    >
                                        <Download size={14} />
                                        Download CSV Template
                                    </a>
                                    <p className="text-gray-400 text-xs">Accepted formats: .csv, .xlsx, .xls &bull; Max 5MB</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Imports */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent Imports</h2>
                                <button
                                    onClick={() => navigate('/import-management')}
                                    className="text-xs font-medium text-orange-600 dark:text-orange-400 hover:underline inline-flex items-center gap-1"
                                >
                                    View All <ChevronRight size={12} />
                                </button>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className="p-4">
                                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2" />
                                            <div className="h-3 w-32 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                                        </div>
                                    ))
                                ) : recentBatches.length > 0 ? (
                                    recentBatches.map(batch => (
                                        <div
                                            key={batch.id}
                                            className="p-4 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors cursor-pointer"
                                            onClick={() => navigate('/import-management', { state: { batchId: batch.batch_id } })}
                                        >
                                            <div className="flex items-start justify-between mb-1.5">
                                                <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white truncate max-w-[140px]">
                                                    {batch.batch_id}
                                                </p>
                                                {getStatusBadge(batch.status)}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                                                <span>{batch.total_cards || 0} cards</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 text-center">
                                        <FileSpreadsheet size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                        <p className="text-sm text-gray-400">No imports yet</p>
                                        <p className="text-xs text-gray-400 mt-1">Upload a file to get started</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Actions</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                            onClick={() => navigate('/single-card')}
                            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                                <span className="text-white text-lg font-bold">1</span>
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Single Card</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Create one ID card</p>
                            </div>
                            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-orange-500 transition-colors" />
                        </button>
                        <button
                            onClick={handleChooseFileClick}
                            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-sm">
                                <Upload size={18} className="text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Bulk Import</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Upload CSV/Excel file</p>
                            </div>
                            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                        </button>
                        <button
                            onClick={() => navigate('/import-management')}
                            className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                                <FileSpreadsheet size={18} className="text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Manage Imports</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Review existing batches</p>
                            </div>
                            <ArrowRight size={16} className="text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 transition-colors" />
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default BulkCardImport;
