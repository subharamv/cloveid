import React, { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '../components/AppHeader';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, Image as ImageIcon, MapPin, Phone, Mail, Globe, Save, Building2, Plus, Pencil, Layout, Layers, FileDigit, Info, Palette, HardDrive, FolderOpen, ExternalLink, CheckCircle2, CloudUpload } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useBranches, Branch } from '@/hooks/useBranches';
import { useDepartments, Department } from '@/hooks/useDepartments';
import { useStorageProvider } from '@/hooks/useStorageProvider';
import { useNavigate } from 'react-router-dom';

type Tab = 'branding' | 'branches' | 'departments' | 'contact' | 'cardEditor' | 'storage';

const BrandingSettings = () => {
    const { userRole } = useAuth();
    const navigate = useNavigate();
    const { branding, loading: brandingLoading, refreshBranding } = useBranding();
    const { branches, loading: branchesLoading, refreshBranches } = useBranches();
    const { departments, loading: departmentsLoading, refreshDepartments } = useDepartments();
    const { provider: storageProvider, loading: storageLoading, updateProvider: updateStorageProvider, driveFolderId, driveFolderUrl, updateDriveFolder } = useStorageProvider();
    const [savingStorage, setSavingStorage] = useState(false);
    const [folderUrlInput, setFolderUrlInput] = useState('');
    const [savingFolder, setSavingFolder] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('branding');
    const [uploading, setUploading] = useState<string | null>(null);
    const [saving, setSaving] = useState<string | null>(null);
    const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
    const [editingDepartment, setEditingDepartment] = useState<Partial<Department> | null>(null);
    const [contactInfo, setContactInfo] = useState({
        contact_address: '',
        contact_phone: '',
        contact_email: '',
        contact_website: ''
    });

    useEffect(() => {
        if (!brandingLoading) {
            setContactInfo({
                contact_address: branding.contact_address || '',
                contact_phone: branding.contact_phone || '',
                contact_email: branding.contact_email || '',
                contact_website: branding.contact_website || ''
            });
        }
    }, [branding, brandingLoading]);

    const handleSaveDepartment = async () => {
        if (!editingDepartment?.name) { toast.error('Department name is required'); return; }
        setSaving('department');
        try {
            const { error } = await supabase.from('departments').upsert({ ...editingDepartment, created_at: editingDepartment.created_at || new Date().toISOString() });
            if (error) throw error;
            toast.success('Department saved successfully');
            setEditingDepartment(null);
            refreshDepartments();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save department');
        } finally { setSaving(null); }
    };

    const handleDeleteDepartment = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this department?')) return;
        setSaving('delete_department');
        try {
            const { error } = await supabase.from('departments').delete().eq('id', id);
            if (error) throw error;
            toast.success('Department deleted successfully');
            refreshDepartments();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete department');
        } finally { setSaving(null); }
    };

    const handleSaveBranch = async () => {
        if (!editingBranch?.name) { toast.error('Branch name is required'); return; }
        setSaving('branch');
        try {
            const { error } = await supabase.from('branches').upsert({ ...editingBranch, updated_at: new Date().toISOString() });
            if (error) throw error;
            toast.success('Branch saved successfully');
            setEditingBranch(null);
            refreshBranches();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save branch');
        } finally { setSaving(null); }
    };

    const handleDeleteBranch = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this branch?')) return;
        setSaving('delete_branch');
        try {
            const { error } = await supabase.from('branches').delete().eq('id', id);
            if (error) throw error;
            toast.success('Branch deleted successfully');
            refreshBranches();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete branch');
        } finally { setSaving(null); }
    };

    const handleSaveSetting = async (key: string, value: string) => {
        setSaving(key);
        try {
            const { error } = await supabase.from('system_settings').upsert({ key, value, updated_at: new Date().toISOString() });
            if (error) throw error;
            toast.success('Setting saved successfully');
            refreshBranding();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save setting');
        } finally { setSaving(null); }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please upload an image file.'); return; }

        setUploading(key);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${key}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('id-card-images').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('id-card-images').getPublicUrl(filePath);

            const { error: dbError } = await supabase.from('system_settings').upsert({ key, value: publicUrl, updated_at: new Date().toISOString() });
            if (dbError) throw dbError;

            toast.success('Logo updated successfully');
            refreshBranding();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload logo');
        } finally { setUploading(null); }
    };

    const handleDelete = async (key: string) => {
        if (!window.confirm('Are you sure you want to remove this logo?')) return;
        try {
            const { error } = await supabase.from('system_settings').upsert({ key, value: null, updated_at: new Date().toISOString() });
            if (error) throw error;
            toast.success('Logo removed successfully');
            refreshBranding();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove logo');
        }
    };

    const isAdmin = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';

    if (userRole !== 'admin' && userRole !== 'manager' && userRole !== 'super_admin') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
                <p className="text-xl font-semibold text-gray-900 dark:text-white">Unauthorized access</p>
            </div>
        );
    }

    const allTabs = [
        { id: 'branding' as Tab, label: 'Branding', icon: Layout },
        { id: 'branches' as Tab, label: 'Branches', icon: Building2 },
        { id: 'departments' as Tab, label: 'Departments', icon: Layers },
        { id: 'contact' as Tab, label: 'Contact Info', icon: Info },
        { id: 'cardEditor' as Tab, label: 'Card Editor', icon: Palette },
    ];

    if (userRole === 'admin' || userRole === 'super_admin') {
        allTabs.push({ id: 'storage' as Tab, label: 'Storage', icon: HardDrive });
    }

    const tabs = allTabs;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage branding, branches, departments, and contact information.</p>
                    </div>
                </div>

                {/* Section Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === 'cardEditor') {
                                        navigate('/settings/card-editor');
                                    } else {
                                        setActiveTab(tab.id);
                                    }
                                }}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 dark:shadow-orange-900/30'
                                        : 'bg-white dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Branding Section */}
                {activeTab === 'branding' && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Logo Management</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage logos displayed across the application and ID cards.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <LogoCard
                                title="Header Logo"
                                description="Displayed in the top navigation bar and sidebar."
                                logoUrl={branding.logo_header}
                                onUpload={(e) => handleUpload(e, 'logo_header')}
                                onDelete={() => handleDelete('logo_header')}
                                isUploading={uploading === 'logo_header'}
                            />
                            <LogoCard
                                title="Login Page Logo"
                                description="Displayed on the main login screen."
                                logoUrl={branding.logo_login}
                                onUpload={(e) => handleUpload(e, 'logo_login')}
                                onDelete={() => handleDelete('logo_login')}
                                isUploading={uploading === 'logo_login'}
                            />
                            <LogoCard
                                title="ID Card Front Logo"
                                description="Logo printed on the front side of the ID card."
                                logoUrl={branding.logo_id_front}
                                onUpload={(e) => handleUpload(e, 'logo_id_front')}
                                onDelete={() => handleDelete('logo_id_front')}
                                isUploading={uploading === 'logo_id_front'}
                            />
                            <LogoCard
                                title="ID Card Back Logo"
                                description="Logo printed on the back side of the ID card."
                                logoUrl={branding.logo_id_back}
                                onUpload={(e) => handleUpload(e, 'logo_id_back')}
                                onDelete={() => handleDelete('logo_id_back')}
                                isUploading={uploading === 'logo_id_back'}
                            />
                        </div>
                    </div>
                )}

                {/* Branches Section */}
                {activeTab === 'branches' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Branch Management</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage branch-specific contact details for ID cards.</p>
                            </div>
                            <button
                                onClick={() => setEditingBranch({ name: '', address: '', phone: '', email: '', website: '' })}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 dark:shadow-orange-900/30"
                            >
                                <Plus size={16} />
                                Add Branch
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {branchesLoading ? (
                                <div className="flex justify-center p-12">
                                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
                                </div>
                            ) : branches.length > 0 ? (
                                branches.map(branch => (
                                    <div key={branch.id} className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-sm transition-shadow">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                                                    <Building2 size={18} className="text-white" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">{branch.name}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Branch</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingBranch(branch)} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Edit">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteBranch(branch.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                                                <span className="text-gray-600 dark:text-gray-300">{branch.address || <span className="text-gray-400 italic">No address set</span>}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone size={15} className="text-gray-400 shrink-0" />
                                                <span className="text-gray-600 dark:text-gray-300">{branch.phone || <span className="text-gray-400 italic">No phone set</span>}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail size={15} className="text-gray-400 shrink-0" />
                                                <span className="text-gray-600 dark:text-gray-300">{branch.email || <span className="text-gray-400 italic">No email set</span>}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Globe size={15} className="text-gray-400 shrink-0" />
                                                <span className="text-gray-600 dark:text-gray-300">{branch.website || <span className="text-gray-400 italic">No website set</span>}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                                        <Building2 size={22} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No branches found.</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add your first branch to get started.</p>
                                </div>
                            )}
                        </div>

                        {editingBranch && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{editingBranch.id ? 'Edit Branch' : 'Add New Branch'}</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Branch Name (e.g. HYD, VIZAG)</label>
                                            <input type="text" value={editingBranch.name} onChange={(e) => setEditingBranch({...editingBranch, name: e.target.value.toUpperCase()})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                                placeholder="HYD" />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Address</label>
                                            <textarea value={editingBranch.address} onChange={(e) => setEditingBranch({...editingBranch, address: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none min-h-[80px]"
                                                placeholder="Full address for ID card..." />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Phone</label>
                                                <input type="text" value={editingBranch.phone} onChange={(e) => setEditingBranch({...editingBranch, phone: e.target.value})}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Email</label>
                                                <input type="email" value={editingBranch.email} onChange={(e) => setEditingBranch({...editingBranch, email: e.target.value})}
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Website</label>
                                            <input type="text" value={editingBranch.website} onChange={(e) => setEditingBranch({...editingBranch, website: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button onClick={() => setEditingBranch(null)}
                                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                                        <button onClick={handleSaveBranch} disabled={saving === 'branch'}
                                            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                            {saving === 'branch' ? <Loader2 size={16} className="animate-spin" /> : null}
                                            {saving === 'branch' ? 'Saving...' : 'Save Branch'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Departments Section */}
                {activeTab === 'departments' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Department Management</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage departments available for employee selection.</p>
                            </div>
                            <button
                                onClick={() => setEditingDepartment({ name: '' })}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-lg shadow-orange-200 dark:shadow-orange-900/30"
                            >
                                <Plus size={16} />
                                Add Department
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                            {departmentsLoading ? (
                                <div className="flex justify-center p-8">
                                    <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
                                </div>
                            ) : departments.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {departments.map(dept => (
                                        <div key={dept.id} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700 group hover:border-orange-200 dark:hover:border-orange-800 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-sm">
                                                    <Layers size={14} className="text-white" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">{dept.name}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingDepartment(dept)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => handleDeleteDepartment(dept.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                                        <Layers size={22} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No departments found.</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Add your first department to get started.</p>
                                </div>
                            )}
                        </div>

                        {editingDepartment && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{editingDepartment.id ? 'Edit Department' : 'Add New Department'}</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Department Name</label>
                                            <input type="text" value={editingDepartment.name} onChange={(e) => setEditingDepartment({...editingDepartment, name: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                                placeholder="e.g. Solution Engineering Hub" autoFocus />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button onClick={() => setEditingDepartment(null)}
                                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                                        <button onClick={handleSaveDepartment} disabled={saving === 'department'}
                                            className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                                            {saving === 'department' ? <Loader2 size={16} className="animate-spin" /> : null}
                                            {saving === 'department' ? 'Saving...' : 'Save Department'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Storage Section */}
                {activeTab === 'storage' && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Storage Settings</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose where generated ID card ZIP files are stored.</p>
                        </div>

                        {/* Provider Toggle Card */}
                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Storage Provider</h3>
                            {storageLoading ? (
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-sm">Loading...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Supabase Option */}
                                    <button
                                        onClick={async () => {
                                            if (storageProvider === 'supabase') return;
                                            setSavingStorage(true);
                                            const { error } = await updateStorageProvider('supabase');
                                            setSavingStorage(false);
                                            if (error) toast.error('Failed to update storage provider');
                                            else toast.success('Storage set to Supabase');
                                        }}
                                        className={`relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                            storageProvider === 'supabase'
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                            storageProvider === 'supabase'
                                                ? 'bg-orange-500'
                                                : 'bg-gray-100 dark:bg-gray-700'
                                        }`}>
                                            <HardDrive size={18} className={storageProvider === 'supabase' ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Supabase Storage</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Store ZIPs in your Supabase bucket (default).</p>
                                        </div>
                                        {storageProvider === 'supabase' && (
                                            <CheckCircle2 size={18} className="absolute top-3 right-3 text-orange-500" />
                                        )}
                                    </button>

                                    {/* Google Drive Option */}
                                    <button
                                        onClick={async () => {
                                            if (storageProvider === 'google_drive') return;
                                            setSavingStorage(true);
                                            const { error } = await updateStorageProvider('google_drive');
                                            setSavingStorage(false);
                                            if (error) toast.error('Failed to update storage provider');
                                            else toast.success('Storage set to Google Drive');
                                        }}
                                        className={`relative flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                            storageProvider === 'google_drive'
                                                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                            storageProvider === 'google_drive'
                                                ? 'bg-orange-500'
                                                : 'bg-gray-100 dark:bg-gray-700'
                                        }`}>
                                            <CloudUpload size={18} className={storageProvider === 'google_drive' ? 'text-white' : 'text-gray-500 dark:text-gray-400'} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Google Drive</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Store ZIPs in a shared Google Drive folder, organised by month and batch.</p>
                                        </div>
                                        {storageProvider === 'google_drive' && (
                                            <CheckCircle2 size={18} className="absolute top-3 right-3 text-orange-500" />
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Google Drive Configuration (always visible, required before switching) */}
                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Google Drive Folder</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Paste a Google Drive shared folder URL to set where uploads are stored. The service account must have edit access to that folder.</p>

                            {/* Current connected folder */}
                            {driveFolderId && (
                                <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                                    <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-green-700 dark:text-green-400">Connected folder</p>
                                        <p className="text-xs text-green-600 dark:text-green-500 font-mono truncate mt-0.5">{driveFolderId}</p>
                                    </div>
                                    <a href={driveFolderUrl} target="_blank" rel="noopener noreferrer"
                                        className="shrink-0 text-green-600 dark:text-green-400 hover:text-green-700 transition-colors">
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                            )}

                            {/* Editable input */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={folderUrlInput}
                                    onChange={e => setFolderUrlInput(e.target.value)}
                                    placeholder="https://drive.google.com/drive/folders/..."
                                    className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                                <button
                                    disabled={!folderUrlInput.trim() || savingFolder}
                                    onClick={async () => {
                                        setSavingFolder(true);
                                        const { error } = await updateDriveFolder(folderUrlInput.trim());
                                        setSavingFolder(false);
                                        if (error) toast.error(error.message || 'Failed to save folder');
                                        else { toast.success('Drive folder updated'); setFolderUrlInput(''); }
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-40 transition-colors shrink-0"
                                >
                                    {savingFolder ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Connect
                                </button>
                            </div>

                            {/* Folder structure info + browse */}
                            <div className="mt-4 space-y-3 text-sm">
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <FolderOpen size={16} className="text-orange-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">Folder structure</p>
                                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">Root → <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">YYYY-MM</span> → <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">Batches / Single Cards</span></p>
                                        <p className="text-gray-500 dark:text-gray-400 mt-0.5">Root → <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">Photos</span> (raw photo backups)</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                                    <CloudUpload size={16} className="text-orange-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-medium text-gray-700 dark:text-gray-300">Service account</p>
                                        <p className="text-gray-500 dark:text-gray-400 mt-0.5 font-mono text-xs break-all">drive-storage-service@clove-id.iam.gserviceaccount.com</p>
                                    </div>
                                </div>
                                {storageProvider === 'google_drive' && (
                                    <button
                                        onClick={() => navigate('/settings/drive-storage')}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
                                    >
                                        <HardDrive size={15} />
                                        Browse Drive Files
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Browse Supabase Storage */}
                        {storageProvider === 'supabase' && (
                            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Supabase Storage</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Browse and manage files stored in your Supabase bucket.</p>
                                <button
                                    onClick={() => navigate('/settings/storage')}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm"
                                >
                                    <FolderOpen size={15} />
                                    Browse Storage Files
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Contact Info Section */}
                {activeTab === 'contact' && (
                    <div>
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Global Contact Information</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage default company contact details used across the application.</p>
                        </div>

                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                <SettingInput
                                    label="Company Address"
                                    icon={<MapPin size={18} />}
                                    value={contactInfo.contact_address}
                                    onChange={(val) => setContactInfo({...contactInfo, contact_address: val})}
                                    onSave={() => handleSaveSetting('contact_address', contactInfo.contact_address)}
                                    isSaving={saving === 'contact_address'}
                                    placeholder="123 Business St, City, Country"
                                />
                                <SettingInput
                                    label="Phone Number"
                                    icon={<Phone size={18} />}
                                    value={contactInfo.contact_phone}
                                    onChange={(val) => setContactInfo({...contactInfo, contact_phone: val})}
                                    onSave={() => handleSaveSetting('contact_phone', contactInfo.contact_phone)}
                                    isSaving={saving === 'contact_phone'}
                                    placeholder="+1 (555) 000-0000"
                                />
                                <SettingInput
                                    label="Email Address"
                                    icon={<Mail size={18} />}
                                    value={contactInfo.contact_email}
                                    onChange={(val) => setContactInfo({...contactInfo, contact_email: val})}
                                    onSave={() => handleSaveSetting('contact_email', contactInfo.contact_email)}
                                    isSaving={saving === 'contact_email'}
                                    placeholder="contact@company.com"
                                />
                                <SettingInput
                                    label="Website"
                                    icon={<Globe size={18} />}
                                    value={contactInfo.contact_website}
                                    onChange={(val) => setContactInfo({...contactInfo, contact_website: val})}
                                    onSave={() => handleSaveSetting('contact_website', contactInfo.contact_website)}
                                    isSaving={saving === 'contact_website'}
                                    placeholder="https://www.company.com"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

interface SettingInputProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    onChange: (val: string) => void;
    onSave: () => void;
    isSaving: boolean;
    placeholder?: string;
}

const SettingInput = ({ label, icon, value, onChange, onSave, isSaving, placeholder }: SettingInputProps) => {
    return (
        <div className="px-6 py-5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">{label}</label>
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
                    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all" />
                </div>
                <button onClick={onSave} disabled={isSaving}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 min-w-[90px]">
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save</>}
                </button>
            </div>
        </div>
    );
};

interface LogoCardProps {
    title: string;
    description: string;
    logoUrl: string | null;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDelete: () => void;
    isUploading: boolean;
}

const LogoCard = ({ title, description, logoUrl, onUpload, onDelete, isUploading }: LogoCardProps) => {
    return (
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{description}</p>

            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 mb-5 relative min-h-[170px]">
                {logoUrl ? (
                    <div className="relative group">
                        <img src={logoUrl} alt={title} className="max-h-24 object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                            <button onClick={onDelete} className="p-2.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-gray-400">
                        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-3">
                            <ImageIcon size={28} className="text-gray-300 dark:text-gray-500" />
                        </div>
                        <span className="text-xs font-medium">No logo set</span>
                    </div>
                )}
                {isUploading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex flex-col items-center justify-center rounded-xl">
                        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent mb-2" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Uploading...</span>
                    </div>
                )}
            </div>

            <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors cursor-pointer disabled:opacity-50 shadow-sm">
                <Upload size={16} />
                <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                <input type="file" className="hidden" onChange={onUpload} accept="image/png, image/jpeg, image/jpg, image/svg+xml" disabled={isUploading} />
            </label>
        </div>
    );
};

export default BrandingSettings;
