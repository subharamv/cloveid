import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AdminHeader from '../components/AdminHeader';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, Image as ImageIcon, MapPin, Phone, Mail, Globe, Save, Building2, Plus, Pencil } from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { useBranches, Branch } from '@/hooks/useBranches';
import { useDepartments, Department } from '@/hooks/useDepartments';

const BrandingSettings = () => {
    const { userRole, logout } = useAuth();
    const { branding, loading: brandingLoading, refreshBranding } = useBranding();
    const { branches, loading: branchesLoading, refreshBranches } = useBranches();
    const { departments, loading: departmentsLoading, refreshDepartments } = useDepartments();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);
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
        if (!editingDepartment?.name) {
            toast.error('Department name is required');
            return;
        }

        setSaving('department');
        try {
            const { error } = await supabase
                .from('departments')
                .upsert({
                    ...editingDepartment,
                    created_at: editingDepartment.created_at || new Date().toISOString()
                });

            if (error) throw error;
            toast.success('Department saved successfully');
            setEditingDepartment(null);
            refreshDepartments();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save department');
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteDepartment = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this department?')) return;

        setSaving('delete_department');
        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Department deleted successfully');
            refreshDepartments();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete department');
        } finally {
            setSaving(null);
        }
    };

    const handleSaveBranch = async () => {
        if (!editingBranch?.name) {
            toast.error('Branch name is required');
            return;
        }

        setSaving('branch');
        try {
            const { error } = await supabase
                .from('branches')
                .upsert({
                    ...editingBranch,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success('Branch saved successfully');
            setEditingBranch(null);
            refreshBranches();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save branch');
        } finally {
            setSaving(null);
        }
    };

    const handleDeleteBranch = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this branch?')) return;

        setSaving('delete_branch');
        try {
            const { error } = await supabase
                .from('branches')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Branch deleted successfully');
            refreshBranches();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete branch');
        } finally {
            setSaving(null);
        }
    };

    const handleSaveSetting = async (key: string, value: string) => {
        setSaving(key);
        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({ key, value, updated_at: new Date().toISOString() });

            if (error) throw error;
            toast.success('Setting saved successfully');
            refreshBranding();
        } catch (error: any) {
            toast.error(error.message || 'Failed to save setting');
        } finally {
            setSaving(null);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file.');
            return;
        }

        setUploading(key);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${key}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `logos/${fileName}`;

            // 1. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from('id-card-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('id-card-images')
                .getPublicUrl(filePath);

            // 3. Update system_settings table
            const { error: dbError } = await supabase
                .from('system_settings')
                .upsert({ key, value: publicUrl, updated_at: new Date().toISOString() });

            if (dbError) throw dbError;

            toast.success('Logo updated successfully');
            refreshBranding();
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Failed to upload logo');
        } finally {
            setUploading(null);
        }
    };

    const handleDelete = async (key: string) => {
        if (!window.confirm('Are you sure you want to remove this logo?')) return;

        try {
            const { error } = await supabase
                .from('system_settings')
                .upsert({ key, value: null, updated_at: new Date().toISOString() });

            if (error) throw error;

            toast.success('Logo removed successfully');
            refreshBranding();
        } catch (error: any) {
            toast.error(error.message || 'Failed to remove logo');
        }
    };

    if (userRole !== 'admin' && userRole !== 'manager') {
        return (
            <div className="flex h-screen items-center justify-center">
                <p className="text-xl font-semibold">Unauthorized access</p>
            </div>
        );
    }

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="settings" />

                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="mx-auto max-w-4xl">
                        <div className="mb-8">
                            <h1 className="text-2xl font-bold">Branding Settings</h1>
                            <p className="text-gray-500 dark:text-gray-400">Manage logos for different parts of the application.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Header Logo */}
                            <LogoCard 
                                title="Header Logo" 
                                description="Displayed in the top navigation bar and sidebar."
                                logoUrl={branding.logo_header}
                                onUpload={(e) => handleUpload(e, 'logo_header')}
                                onDelete={() => handleDelete('logo_header')}
                                isUploading={uploading === 'logo_header'}
                            />

                            {/* Login Page Logo */}
                            <LogoCard 
                                title="Login Page Logo" 
                                description="Displayed on the main login screen."
                                logoUrl={branding.logo_login}
                                onUpload={(e) => handleUpload(e, 'logo_login')}
                                onDelete={() => handleDelete('logo_login')}
                                isUploading={uploading === 'logo_login'}
                            />

                            {/* ID Card Front Logo */}
                            <LogoCard 
                                title="ID Card Front Logo" 
                                description="Logo printed on the front side of the ID card."
                                logoUrl={branding.logo_id_front}
                                onUpload={(e) => handleUpload(e, 'logo_id_front')}
                                onDelete={() => handleDelete('logo_id_front')}
                                isUploading={uploading === 'logo_id_front'}
                            />

                            {/* ID Card Back Logo */}
                            <LogoCard 
                                title="ID Card Back Logo" 
                                description="Logo printed on the back side of the ID card."
                                logoUrl={branding.logo_id_back}
                                onUpload={(e) => handleUpload(e, 'logo_id_back')}
                                onDelete={() => handleDelete('logo_id_back')}
                                isUploading={uploading === 'logo_id_back'}
                            />
                        </div>

                        <div className="mt-12 mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Branch Management</h2>
                                <p className="text-gray-500 dark:text-gray-400">Manage branch-specific contact details for ID cards.</p>
                            </div>
                            <button 
                                onClick={() => setEditingBranch({ name: '', address: '', phone: '', email: '', website: '' })}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Plus size={18} />
                                <span>Add Branch</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {branchesLoading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                branches.map(branch => (
                                    <div key={branch.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                                    <Building2 size={20} />
                                                </div>
                                                <h3 className="text-lg font-bold">{branch.name}</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setEditingBranch(branch)}
                                                    className="p-2 text-gray-500 hover:text-primary transition-colors"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteBranch(branch.id)}
                                                    className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-start gap-2">
                                                <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                <span className="whitespace-pre-line">{branch.address || 'No address set'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Phone size={16} className="text-gray-400 shrink-0" />
                                                <span>{branch.phone || 'No phone set'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} className="text-gray-400 shrink-0" />
                                                <span>{branch.email || 'No email set'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Globe size={16} className="text-gray-400 shrink-0" />
                                                <span>{branch.website || 'No website set'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {editingBranch && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl">
                                    <h2 className="text-xl font-bold mb-4">{editingBranch.id ? 'Edit Branch' : 'Add New Branch'}</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Branch Name (e.g. HYD, VIZAG)</label>
                                            <input 
                                                type="text" 
                                                value={editingBranch.name}
                                                onChange={(e) => setEditingBranch({...editingBranch, name: e.target.value.toUpperCase()})}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                                placeholder="HYD"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Address</label>
                                            <textarea 
                                                value={editingBranch.address}
                                                onChange={(e) => setEditingBranch({...editingBranch, address: e.target.value})}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 min-h-[80px]"
                                                placeholder="Full address for ID card..."
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">Phone</label>
                                                <input 
                                                    type="text" 
                                                    value={editingBranch.phone}
                                                    onChange={(e) => setEditingBranch({...editingBranch, phone: e.target.value})}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">Email</label>
                                                <input 
                                                    type="email" 
                                                    value={editingBranch.email}
                                                    onChange={(e) => setEditingBranch({...editingBranch, email: e.target.value})}
                                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Website</label>
                                            <input 
                                                type="text" 
                                                value={editingBranch.website}
                                                onChange={(e) => setEditingBranch({...editingBranch, website: e.target.value})}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button 
                                            onClick={() => setEditingBranch(null)}
                                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveBranch}
                                            disabled={saving === 'branch'}
                                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {saving === 'branch' ? <Loader2 size={18} className="animate-spin" /> : 'Save Branch'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-12 mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">Departments Management</h2>
                                <p className="text-gray-500 dark:text-gray-400">Manage departments available for employee selection.</p>
                            </div>
                            <button 
                                onClick={() => setEditingDepartment({ name: '' })}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                <Plus size={18} />
                                <span>Add Department</span>
                            </button>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                            {departmentsLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {departments.map(dept => (
                                        <div key={dept.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg group">
                                            <span className="text-sm font-medium">{dept.name}</span>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => setEditingDepartment(dept)}
                                                    className="p-1 text-gray-500 hover:text-primary transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteDepartment(dept.id)}
                                                    className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {departments.length === 0 && (
                                        <p className="col-span-full text-center text-gray-500 py-4">No departments found.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {editingDepartment && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                                <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
                                    <h2 className="text-xl font-bold mb-4">{editingDepartment.id ? 'Edit Department' : 'Add New Department'}</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium mb-1 block">Department Name</label>
                                            <input 
                                                type="text" 
                                                value={editingDepartment.name}
                                                onChange={(e) => setEditingDepartment({...editingDepartment, name: e.target.value})}
                                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                                placeholder="e.g. Solution Engineering Hub"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button 
                                            onClick={() => setEditingDepartment(null)}
                                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveDepartment}
                                            disabled={saving === 'department'}
                                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center"
                                        >
                                            {saving === 'department' ? <Loader2 size={18} className="animate-spin" /> : 'Save Department'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-12 mb-8">
                            <h2 className="text-xl font-bold">Global Contact Information</h2>
                            <p className="text-gray-500 dark:text-gray-400">Manage default company contact details.</p>
                        </div>

                        <div className="space-y-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
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
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/manage-requests">Manage Employees</Link>
                    
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                            className="text-primary text-sm font-medium leading-normal flex items-center justify-between"
                        >
                            <span>Settings</span>
                            <span className="material-symbols-outlined text-lg">
                                {isSettingsExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                        </button>
                        {isSettingsExpanded && (
                            <div className="flex flex-col gap-2 ml-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                                <Link className="text-gray-700 dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-normal leading-normal" to="/vendor">
                                    Vendor Management
                                </Link>
                                <Link className="text-gray-700 dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-normal leading-normal" to="/user-management">
                                    User Management
                                </Link>
                                <Link className="text-gray-700 dark:text-gray-400 hover:text-primary dark:hover:text-primary text-sm font-normal leading-normal" to="/department-management">
                                    Department Management
                                </Link>
                                <Link className="text-primary text-sm font-normal leading-normal" to="/settings/branding">
                                    Branding Settings
                                </Link>
                            </div>
                        )}
                    </div>

                    <button onClick={logout} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 text-sm font-medium leading-normal flex items-center gap-2 mt-4">
                        <span className="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
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
        <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {icon}
                    </div>
                    <input 
                        type="text" 
                        value={value} 
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <button 
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 min-w-[100px]"
                >
                    {isSaving ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Save size={18} />
                            <span>Save</span>
                        </div>
                    )}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
            
            <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 mb-4 relative min-h-[160px]">
                {logoUrl ? (
                    <div className="relative group">
                        <img src={logoUrl} alt={title} className="max-h-24 object-contain" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center">
                            <button onClick={onDelete} className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-gray-400">
                        <ImageIcon size={48} className="mb-2" />
                        <span className="text-xs">No logo set</span>
                    </div>
                )}
                
                {isUploading && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex flex-col items-center justify-center rounded-lg">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <span className="text-sm font-medium">Uploading...</span>
                    </div>
                )}
            </div>

            <label className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50">
                <Upload size={18} />
                <span>{logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                <input type="file" className="hidden" onChange={onUpload} accept="image/png, image/jpeg, image/jpg, image/svg+xml" disabled={isUploading} />
            </label>
        </div>
    );
};

export default BrandingSettings;
