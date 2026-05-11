import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/AppHeader';
import { toast } from 'sonner';
import {
  Folder, File, Download, Search, RefreshCw, ChevronRight,
  Loader2, CloudUpload, ExternalLink, Home, Trash2, X, AlertTriangle,
} from 'lucide-react';
import { listDriveFiles, searchDriveFiles, deleteDriveFile, DriveFolder, DriveFile } from '@/lib/googleDriveFiles';

interface BreadcrumbEntry {
  id: string;
  name: string;
}

const ROOT_FOLDER_ID = '0AInOeJo8pGboUk9PVA';

const DriveStorageManagement = () => {
  const { userRole } = useAuth();
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>(ROOT_FOLDER_ID);

  // Global search state
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<DriveFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Delete state
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchContents = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const result = await listDriveFiles(folderId === ROOT_FOLDER_ID ? undefined : folderId);
      setFolders(result.folders);
      setFiles(result.files);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load Drive contents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContents(ROOT_FOLDER_ID);
  }, [fetchContents]);

  // Debounced global search whenever query changes
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setIsGlobalSearch(false);
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsGlobalSearch(true);
    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const results = await searchDriveFiles(trimmed);
        setSearchResults(results);
      } catch (err: any) {
        toast.error(err.message || 'Search failed');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 450);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setIsGlobalSearch(false);
    setSearchResults([]);
  };

  const navigateInto = (folder: DriveFolder) => {
    clearSearch();
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolderId(folder.id);
    fetchContents(folder.id);
  };

  const navigateTo = (index: number) => {
    clearSearch();
    if (index < 0) {
      setBreadcrumb([]);
      setCurrentFolderId(ROOT_FOLDER_ID);
      fetchContents(ROOT_FOLDER_ID);
    } else {
      const entry = breadcrumb[index];
      setBreadcrumb(prev => prev.slice(0, index + 1));
      setCurrentFolderId(entry.id);
      fetchContents(entry.id);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    setDeletingFileId(fileId);
    try {
      await deleteDriveFile(fileId);
      toast.success(`Deleted "${fileName}"`);
      // Remove from both views
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setSearchResults(prev => prev.filter(f => f.id !== fileId));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete file');
    } finally {
      setDeletingFileId(null);
      setConfirmDeleteId(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const FileActions = ({ file }: { file: DriveFile }) => {
    const isConfirming = confirmDeleteId === file.id;
    const isDeleting = deletingFileId === file.id;

    if (isConfirming) {
      return (
        <div className="flex items-center justify-end gap-1">
          <span className="text-xs text-red-600 dark:text-red-400 mr-1 whitespace-nowrap flex items-center gap-1">
            <AlertTriangle size={12} /> Delete?
          </span>
          <button
            onClick={() => handleDeleteFile(file.id, file.name)}
            disabled={isDeleting}
            className="px-2 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
          </button>
          <button
            onClick={() => setConfirmDeleteId(null)}
            disabled={isDeleting}
            className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            No
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-end gap-1">
        <a
          href={file.viewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
          title="View in Drive"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={16} />
        </a>
        <a
          href={file.downloadUrl}
          className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
          title="Download"
          onClick={e => e.stopPropagation()}
        >
          <Download size={16} />
        </a>
        <button
          onClick={e => { e.stopPropagation(); setConfirmDeleteId(file.id); }}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
          title="Delete file"
        >
          <Trash2 size={16} />
        </button>
      </div>
    );
  };

  if (userRole !== 'admin') {
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

  const displayFiles = isGlobalSearch ? searchResults : files;
  const displayFolders = isGlobalSearch ? [] : folders;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      <AppHeader />
      <main className="p-4 lg:p-6">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CloudUpload className="h-6 w-6 text-orange-500" />
                Google Drive Storage
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Browse and manage ID card files stored in the Shared Drive.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`https://drive.google.com/drive/folders/${currentFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ExternalLink size={15} />
                Open in Drive
              </a>
              <button
                onClick={() => { clearSearch(); fetchContents(currentFolderId); }}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
            <div className="relative">
              {isSearching
                ? <Loader2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" />
                : <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              }
              <input
                type="text"
                placeholder="Search files across all folders..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {isGlobalSearch && !isSearching && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {searchResults.length} file{searchResults.length !== 1 ? 's' : ''} matching
                <span className="font-medium text-gray-700 dark:text-gray-300"> "{searchQuery}"</span>
                {' '}across all folders
              </p>
            )}
          </div>

          {/* Breadcrumb — hidden during global search */}
          {!isGlobalSearch && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-4">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <button
                  onClick={() => navigateTo(-1)}
                  className="flex items-center gap-1 text-orange-500 hover:text-orange-600 font-medium"
                >
                  <Home size={14} />
                  Root
                </button>
                {breadcrumb.map((entry, index) => (
                  <React.Fragment key={entry.id}>
                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                    <button
                      onClick={() => navigateTo(index)}
                      className={`font-medium transition-colors ${
                        index === breadcrumb.length - 1
                          ? 'text-gray-700 dark:text-gray-200'
                          : 'text-orange-500 hover:text-orange-600'
                      }`}
                    >
                      {entry.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* File List */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {(loading && !isGlobalSearch) || (isSearching) ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              </div>
            ) : displayFolders.length === 0 && displayFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Folder size={48} className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {isGlobalSearch ? `No files found for "${searchQuery}"` : 'This folder is empty'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Size</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Modified</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {displayFolders.map(folder => (
                      <tr
                        key={folder.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                        onClick={() => navigateInto(folder)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Folder size={16} className="text-yellow-500 shrink-0" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white hover:text-orange-500">
                              {folder.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400 hidden sm:table-cell">—</td>
                        <td className="py-3 px-4 text-sm text-gray-400 hidden md:table-cell">—</td>
                        <td className="py-3 px-4 text-right">
                          <ChevronRight size={16} className="text-gray-400 ml-auto" />
                        </td>
                      </tr>
                    ))}
                    {displayFiles.map(file => (
                      <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <File size={16} className="text-gray-400 shrink-0" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 hidden sm:table-cell">
                          {formatSize(file.size)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 hidden md:table-cell">
                          {formatDate(file.modifiedTime)}
                        </td>
                        <td className="py-3 px-4">
                          <FileActions file={file} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer count */}
          {!loading && !isSearching && (
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {isGlobalSearch
                ? `${searchResults.length} file${searchResults.length !== 1 ? 's' : ''} found across all folders`
                : `${folders.length} folder${folders.length !== 1 ? 's' : ''}, ${files.length} file${files.length !== 1 ? 's' : ''} in current folder`
              }
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DriveStorageManagement;
