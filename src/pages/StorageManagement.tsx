import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/AppHeader';
import { toast } from 'sonner';
import { Folder, File, Trash2, Download, Search, RefreshCw, ChevronRight, ChevronDown, CheckSquare, Square, Loader2, HardDrive, ArrowLeft } from 'lucide-react';

interface StorageFile {
    name: string;
    path: string;
    id: string;
    updated_at: string;
    size: number;
    content_type: string;
}

interface FolderItem {
    name: string;
    path: string;
}

const StorageManagement = () => {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const [files, setFiles] = useState<StorageFile[]>([]);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);
    const [currentPath, setCurrentPath] = useState('');
    const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
    const [breadcrumb, setBreadcrumb] = useState<string[]>([]);
    const [deleting, setDeleting] = useState(false);
    const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

    const BUCKET_NAME = 'id-card-images';

    useEffect(() => {
        fetchStorageContents('');
    }, []);

const fetchStorageContents = async (targetPath: string) => {
        setLoading(true);
        try {
            const { data: listData, error: listError } = await supabase.storage
                .from(BUCKET_NAME)
                .list(targetPath || undefined, {
                    limit: 100,
                    offset: 0,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (listError) throw listError;

            const folderList: FolderItem[] = [];
            const fileList: StorageFile[] = [];

            if (listData) {
                for (const item of listData) {
                    if (!item.id) {
                        folderList.push({
                            name: item.name,
                            path: targetPath ? `${targetPath}/${item.name}` : item.name
                        });
                    } else {
                        const filePath = targetPath ? `${targetPath}/${item.name}` : item.name;
                        fileList.push({
                            name: item.name,
                            path: filePath,
                            id: item.id,
                            updated_at: item.updated_at || '',
                            size: (item.metadata as any)?.size || 0,
                            content_type: (item.metadata as any)?.mimetype || 'application/octet-stream'
                        });
                    }
                }
            }

            if (folderList.length > 0 && targetPath === '') {
                const allFiles: StorageFile[] = [];
                for (const folder of folderList) {
                    const { data: folderFiles, error: folderErr } = await supabase.storage
                        .from(BUCKET_NAME)
                        .list(folder.name, { limit: 100 });
                    
                    if (!folderErr && folderFiles) {
                        for (const f of folderFiles) {
                            if (f.id) {
                                allFiles.push({
                                    name: f.name,
                                    path: `${folder.name}/${f.name}`,
                                    id: f.id,
                                    updated_at: f.updated_at || '',
                                    size: (f.metadata as any)?.size || 0,
                                    content_type: (f.metadata as any)?.mimetype || 'application/octet-stream'
                                });
                            }
                        }
                    }
                }
                setFiles(allFiles.sort((a, b) => a.name.localeCompare(b.name)));
            } else {
                setFiles(fileList.sort((a, b) => a.name.localeCompare(b.name)));
            }

            setFolders(folderList.sort((a, b) => a.name.localeCompare(b.name)));
            setCurrentPath(targetPath);
            setSelectedFiles([]);
            setSelectedFolders([]);
            setSelectAll(false);
        } catch (error) {
            console.error('Error fetching storage:', error);
            toast.error('Failed to load storage contents');
        } finally {
            setLoading(false);
        }
    };

    const navigateToFolder = (folderPath: string) => {
        const pathParts = folderPath.split('/').filter(Boolean);
        setBreadcrumb(pathParts);
        setExpandedFolders([]);
        fetchStorageContents(folderPath);
    };

    const navigateUp = () => {
        if (breadcrumb.length > 0) {
            const newBreadcrumb = breadcrumb.slice(0, -1);
            const newPath = newBreadcrumb.join('/');
            setBreadcrumb(newBreadcrumb);
            fetchStorageContents(newPath);
        } else {
            fetchStorageContents('');
        }
    };

    const toggleFolder = (folderPath: string) => {
        if (expandedFolders.includes(folderPath)) {
            setExpandedFolders(expandedFolders.filter(f => f !== folderPath));
        } else {
            setExpandedFolders([...expandedFolders, folderPath]);
        }
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedFiles([]);
            setSelectedFolders([]);
            setSelectAll(false);
        } else {
            setSelectedFiles(files.map(f => f.path));
            setSelectedFolders(folders.map(f => f.path));
            setSelectAll(true);
        }
    };

    const toggleSelectFile = (filePath: string) => {
        if (selectedFiles.includes(filePath)) {
            setSelectedFiles(selectedFiles.filter(f => f !== filePath));
            setSelectAll(false);
        } else {
            setSelectedFiles([...selectedFiles, filePath]);
        }
    };

    const toggleSelectFolder = (folderPath: string) => {
        if (selectedFolders.includes(folderPath)) {
            setSelectedFolders(selectedFolders.filter(f => f !== folderPath));
            setSelectAll(false);
        } else {
            setSelectedFolders([...selectedFolders, folderPath]);
        }
    };

    const handleDownload = async (filePath: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_NAME)
                .download(filePath);

            if (error) throw error;

            const url = URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success(`Downloaded ${fileName}`);
        } catch (error) {
            console.error('Error downloading:', error);
            toast.error('Failed to download file');
        }
    };

    const handleBatchDownload = async () => {
        if (selectedFiles.length === 0) return;
        
        toast.info(`Downloading ${selectedFiles.length} files...`);
        
        for (const filePath of selectedFiles) {
            const fileName = filePath.split('/').pop() || 'download';
            try {
                const { data, error } = await supabase.storage
                    .from(BUCKET_NAME)
                    .download(filePath);

                if (error) throw error;

                const url = URL.createObjectURL(data);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err) {
                console.error('Error downloading:', filePath, err);
            }
        }
        
        toast.success(`Downloaded ${selectedFiles.length} files`);
    };

    const handleDelete = async (filePath: string) => {
        if (!window.confirm('Are you sure you want to delete this file?')) return;
        
        setDeleting(true);
        try {
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([filePath]);

            if (error) throw error;

            toast.success('File deleted successfully');
            fetchStorageContents(currentPath);
        } catch (error) {
            console.error('Error deleting:', error);
            toast.error('Failed to delete file');
        } finally {
            setDeleting(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedFiles.length === 0 && selectedFolders.length === 0) return;
        
        const fileCount = selectedFiles.length;
        const folderCount = selectedFolders.length;
        const msg = folderCount > 0 
            ? `Are you sure you want delete ${fileCount} file${fileCount !== 1 ? 's' : ''} and ${folderCount} folder${folderCount !== 1 ? 's' : ''}?`
            : `Are you sure you want to delete ${fileCount} files?`;
            
        if (!window.confirm(msg)) return;
        
        setDeleting(true);
        try {
            const itemsToDelete = [...selectedFiles, ...selectedFolders];
            const { error } = await supabase.storage
                .from(BUCKET_NAME)
                .remove(itemsToDelete);

            if (error) throw error;

            toast.success(`Deleted ${fileCount} file${fileCount !== 1 ? 's' : ''} and ${folderCount} folder${folderCount !== 1 ? 's' : ''}`);
            setSelectedFiles([]);
            setSelectedFolders([]);
            setSelectAll(false);
            fetchStorageContents(currentPath);
        } catch (error) {
            console.error('Error batch deleting:', error);
            toast.error('Failed to delete items');
        } finally {
            setDeleting(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredFiles = files.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (userRole !== 'admin' && userRole !== 'super_admin') {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
                <AppHeader />
                <div className="flex items-center justify-center h-[calc(100vh-64px)]">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Access Denied</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">You don't have permission to access this page.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
            <AppHeader />
            <main className="p-4 lg:p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-all shadow-sm"
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <HardDrive className="h-6 w-6" />
                                    Storage Management
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Manage files in id-card-images bucket
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchStorageContents(currentPath)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>

                    {/* Search and Actions Bar */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search files..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                            </div>
                            {(selectedFiles.length > 0 || selectedFolders.length > 0) && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBatchDownload}
                                        disabled={selectedFolders.length > 0}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title={selectedFolders.length > 0 ? 'Folders cannot be downloaded directly' : ''}
                                    >
                                        <Download size={16} />
                                        Download ({selectedFiles.length})
                                    </button>
                                    <button
                                        onClick={handleBatchDelete}
                                        disabled={deleting}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 size={16} />
                                        {deleting ? 'Deleting...' : `Delete (${selectedFiles.length + selectedFolders.length})`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Breadcrumb Navigation */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => { setBreadcrumb([]); fetchStorageContents(''); }}
                                className="text-orange-500 hover:text-orange-600 font-medium"
                            >
                                root
                            </button>
                            {breadcrumb.map((part, index) => (
                                <React.Fragment key={index}>
                                    <ChevronRight size={14} className="text-gray-400" />
                                    <button
                                        onClick={() => navigateToFolder(breadcrumb.slice(0, index + 1).join('/'))}
                                        className="text-orange-500 hover:text-orange-600 font-medium"
                                    >
                                        {part}
                                    </button>
                                </React.Fragment>
                            ))}
                            {currentPath && (
                                <>
                                    <ChevronRight size={14} className="text-gray-400" />
                                    <button
                                        onClick={navigateUp}
                                        className="text-gray-500 hover:text-gray-600"
                                    >
                                        ..
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* File List */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            </div>
                        ) : folders.length === 0 && filteredFiles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <Folder size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400">No files or folders found</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                                            <th className="py-3 px-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={toggleSelectAll}
                                                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                                />
                                            </th>
                                            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                                            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Size</th>
                                            <th className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modified</th>
                                            <th className="py-3 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {/* Folders */}
                                        {folders.map((folder) => (
                                            <tr key={folder.path} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFolders.includes(folder.path)}
                                                        onChange={() => toggleSelectFolder(folder.path)}
                                                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                                    />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => navigateToFolder(folder.path)}
                                                        className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white hover:text-orange-500"
                                                    >
                                                        <Folder size={16} className="text-yellow-500" />
                                                        {folder.name}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">-</td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">-</td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => navigateToFolder(folder.path)}
                                                        className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Files */}
                                        {filteredFiles.map((file) => (
                                            <tr key={file.path} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFiles.includes(file.path)}
                                                        onChange={() => toggleSelectFile(file.path)}
                                                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                                    />
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <File size={16} className="text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">{formatFileSize(file.size)}</td>
                                                <td className="py-3 px-4 text-sm text-muted-foreground">{formatDate(file.updated_at)}</td>
                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => handleDownload(file.path, file.name)}
                                                            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
                                                            title="Download"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(file.path)}
                                                            disabled={deleting}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Storage Info */}
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        {files.length} file{files.length !== 1 ? 's' : ''}, {folders.length} folder{folders.length !== 1 ? 's' : ''} in current folder
                        {(selectedFiles.length + selectedFolders.length) > 0 && ` • ${selectedFiles.length + selectedFolders.length} selected`}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default StorageManagement;