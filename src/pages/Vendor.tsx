import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { supabaseAdmin } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import AppHeader from '../components/AppHeader';
import {
    Pencil, Trash2, Plus, X, Check, ChevronDown, ChevronRight, Building2,
    Mail, MapPin, Eye, Search, RefreshCw, MoreHorizontal, Filter,
    Send, CheckCircle2, AlertCircle, PackageCheck, Clock, KeyRound, Loader2,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZES = [10, 20, 50];

interface Vendor {
    id: string;
    name: string;
    email: string;
    address: string;
}

interface VendorRequest {
    id: number;
    created_at: string;
    request_id: number | null;
    vendor_id: string | null;
    status: string | null;
    batch_id: string | null;
    id_card_id: number | null;
    vendor_name?: string;
    card_details?: any;
}

const VendorManagement = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
    const { user, userRole, session } = useAuth();
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [changingVendorRequest, setChangingVendorRequest] = useState<VendorRequest | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(PAGE_SIZES[0]);
    const [expandedRowId, setExpandedRowId] = useState<number | null>(null);
    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<number>>(new Set());
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [bulkVendorModalOpen, setBulkVendorModalOpen] = useState(false);
    const [bulkNewVendorId, setBulkNewVendorId] = useState<string | null>(null);

    useEffect(() => {
        fetchVendors();
        fetchVendorRequests();
    }, []);

    const fetchVendorRequests = async () => {
        const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
        const { data, error } = await client
            .from('vendor_requests')
            .select(`
                *,
                vendors (
                    name
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to fetch vendor requests: ' + error.message);
        } else {
            const formatted = data.map((r: any) => ({
                ...r,
                vendor_name: r.vendors?.name || 'Unknown'
            }));
            setVendorRequests(formatted);
        }
    };

    const fetchVendors = async () => {
        const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
        const { data, error } = await client
            .from('vendors')
            .select(`
                id,
                name,
                email,
                address,
                profiles (
                    full_name
                )
            `);

        if (error) {
            toast.error(error.message);
        } else {
            const formattedVendors = data.map((v: any) => ({
                id: v.id,
                name: v.name || v.profiles?.full_name || '',
                email: v.email || '',
                address: v.address || ''
            }));
            setVendors(formattedVendors);
        }
    };

    const handleAddVendor = async (e: React.FormEvent) => {
        e.preventDefault();

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: 'vendor'
                }
            }
        });

        if (authError) {
            toast.error(authError.message);
            return;
        }

        if (authData.user) {
            const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
            const { error: vendorError } = await client
                .from('vendors')
                .insert([
                    { id: authData.user.id, name, email, address }
                ]);

            if (vendorError) {
                toast.error(vendorError.message);
                return;
            }

            const { error: profileError } = await client
                .from('profiles')
                .upsert({
                    id: authData.user.id,
                    role: 'vendor',
                    full_name: name,
                    is_active: true
                });

            if (profileError) {
                toast.error(profileError.message);
                return;
            }

            toast.success('Vendor created successfully!');
            setName('');
            setEmail('');
            setPassword('');
            setAddress('');
            setShowForm(false);
            fetchVendors();
        }
    };

    const handleUpdateVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVendor) return;

        setIsSaving(true);
        const isPrivileged = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
        const client = isPrivileged ? supabaseAdmin : supabase;

        try {
            const { error: vendorError } = await client
                .from('vendors')
                .update({
                    name: editingVendor.name,
                    email: editingVendor.email,
                    address: editingVendor.address
                })
                .eq('id', editingVendor.id);

            if (vendorError) throw vendorError;

            const { error: profileError } = await client
                .from('profiles')
                .update({
                    full_name: editingVendor.name
                })
                .eq('id', editingVendor.id);

            if (profileError) throw profileError;

            toast.success('Vendor updated successfully!');
            setEditingVendor(null);
            fetchVendors();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update vendor');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteVendor = async (vendorId: string) => {
        if (!window.confirm('Are you sure you want to delete this vendor? This will remove their vendor record and profile.')) {
            return;
        }

        const isPrivileged = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
        const client = isPrivileged ? supabaseAdmin : supabase;

        const { error: vendorError } = await client
            .from('vendors')
            .delete()
            .eq('id', vendorId);

        if (vendorError) {
            toast.error('Failed to delete vendor: ' + vendorError.message);
            return;
        }

        const { error: profileError } = await client
            .from('profiles')
            .delete()
            .eq('id', vendorId);

        if (profileError) {
            console.error('Error deleting profile:', profileError);
            toast.error('Vendor record deleted, but profile deletion failed: ' + profileError.message);
        } else {
            toast.success('Vendor and profile deleted successfully!');
        }

        fetchVendors();
    };

    const handleDeleteVendorRequest = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this vendor request?')) return;

        const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
        const { error } = await client
            .from('vendor_requests')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete request: ' + error.message);
        } else {
            toast.success('Request deleted successfully');
            fetchVendorRequests();
        }
    };

    const handleAccessAsVendor = async (vendor: Vendor) => {
        if (userRole !== 'super_admin') {
            toast.error('Only super admins can access vendor accounts');
            return;
        }
        localStorage.setItem('impersonating_user', JSON.stringify({
            id: vendor.id,
            email: vendor.email,
            full_name: vendor.name,
            role: 'vendor',
        }));
        localStorage.setItem('original_user', JSON.stringify({
            id: session?.user.id,
            email: session?.user.email,
        }));
        window.location.href = '/vendor-dashboard';
    };

    const handleChangeVendor = async (requestId: number, newVendorId: string) => {
        setIsSaving(true);
        const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
        try {
            const { error } = await client
                .from('vendor_requests')
                .update({ vendor_id: newVendorId, status: 'sent' })
                .eq('id', requestId);

            if (error) throw error;

            toast.success('Vendor changed successfully');
            setChangingVendorRequest(null);
            fetchVendorRequests();
        } catch (error: any) {
            toast.error('Failed to change vendor: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleSelect = (id: number) => {
        const updated = new Set(selectedRequestIds);
        if (updated.has(id)) updated.delete(id); else updated.add(id);
        setSelectedRequestIds(updated);
    };

    const handleBulkStatusUpdate = async (status: string) => {
        if (selectedRequestIds.size === 0) return;
        setBulkActionLoading(true);
        const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
        try {
            const { error } = await client.from('vendor_requests').update({ status }).in('id', Array.from(selectedRequestIds));
            if (error) throw error;
            toast.success(`${selectedRequestIds.size} request(s) marked as ${status}`);
            setSelectedRequestIds(new Set());
            fetchVendorRequests();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update status');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRequestIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedRequestIds.size} selected request(s)?`)) return;
        setBulkActionLoading(true);
        const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
        try {
            const { error } = await client.from('vendor_requests').delete().in('id', Array.from(selectedRequestIds));
            if (error) throw error;
            toast.success(`${selectedRequestIds.size} request(s) deleted`);
            setSelectedRequestIds(new Set());
            fetchVendorRequests();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkChangeVendor = async () => {
        if (!bulkNewVendorId || selectedRequestIds.size === 0) return;
        setBulkActionLoading(true);
        const client = userRole === 'super_admin' ? supabaseAdmin : supabase;
        try {
            const { error } = await client.from('vendor_requests').update({ vendor_id: bulkNewVendorId, status: 'sent' }).in('id', Array.from(selectedRequestIds));
            if (error) throw error;
            toast.success(`${selectedRequestIds.size} request(s) reassigned`);
            setSelectedRequestIds(new Set());
            setBulkVendorModalOpen(false);
            setBulkNewVendorId(null);
            fetchVendorRequests();
        } catch (error: any) {
            toast.error(error.message || 'Failed to reassign');
        } finally {
            setBulkActionLoading(false);
        }
    };

    const StatusBadge = ({ status }: { status: string | null }) => {
        const styles: Record<string, string> = {
            completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            accepted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
                {status || 'unknown'}
            </span>
        );
    };

    const uniqueDepartments = useMemo(() => {
        const deps = new Set<string>();
        vendorRequests.forEach(r => {
            const branch = r.card_details?.branch;
            if (!branch) return;
            if (typeof branch === 'string') deps.add(branch);
            else if (typeof branch === 'object') {
                const name = branch?.name;
                if (name && typeof name === 'string') deps.add(name);
            }
        });
        return Array.from(deps).sort();
    }, [vendorRequests]);

    const statsData = [
        { label: 'Sent', key: 'sent', icon: Send, color: 'from-blue-400 to-blue-600', count: vendorRequests.filter(r => r.status === 'sent').length },
        { label: 'Accepted', key: 'accepted', icon: CheckCircle2, color: 'from-indigo-400 to-indigo-600', count: vendorRequests.filter(r => r.status === 'accepted').length },
        { label: 'Rejected', key: 'rejected', icon: AlertCircle, color: 'from-red-400 to-red-600', count: vendorRequests.filter(r => r.status === 'rejected').length },
        { label: 'Completed', key: 'completed', icon: PackageCheck, color: 'from-green-400 to-green-600', count: vendorRequests.filter(r => r.status === 'completed').length },
    ];

    useEffect(() => {
        if (!searchQuery.trim()) {
            setExpandedRowId(null);
            return;
        }
        const q = searchQuery.toLowerCase();
        const match = vendorRequests.find(r => {
            if (r.batch_id?.toLowerCase().includes(q) ||
                r.vendor_name?.toLowerCase().includes(q) ||
                r.status?.toLowerCase().includes(q)) return true;
            if (r.card_details) {
                const cd = r.card_details;
                const searchable = [cd.fullName, cd.employeeId, cd.bloodGroup, cd.emergencyContact];
                if (typeof cd.branch === 'string') searchable.push(cd.branch);
                return searchable.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
            }
            return false;
        });
        if (match) setExpandedRowId(match.id);
    }, [searchQuery, vendorRequests]);

    const filteredRequests = useMemo(() => {
        let result = [...vendorRequests];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r => {
                if (r.batch_id?.toLowerCase().includes(q) ||
                    r.vendor_name?.toLowerCase().includes(q) ||
                    r.status?.toLowerCase().includes(q)) return true;
                if (r.card_details) {
                    const cd = r.card_details;
                    const searchable = [cd.fullName, cd.employeeId, cd.bloodGroup, cd.emergencyContact];
                    if (typeof cd.branch === 'string') searchable.push(cd.branch);
                    return searchable.some(f => typeof f === 'string' && f.toLowerCase().includes(q));
                }
                return false;
            });
        }
        if (statusFilter !== 'all') {
            result = result.filter(r => r.status === statusFilter);
        }
        if (departmentFilter !== 'all') {
            result = result.filter(r => {
                const branch = r.card_details?.branch;
                if (!branch) return false;
                if (typeof branch === 'string') return branch === departmentFilter;
                if (typeof branch === 'object') return branch?.name === departmentFilter;
                return false;
            });
        }
        return result;
    }, [vendorRequests, searchQuery, statusFilter, departmentFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / perPage));
    const safePage = Math.min(page, totalPages);
    const paginatedRequests = filteredRequests.slice((safePage - 1) * perPage, safePage * perPage);

    const isAllOnPageSelected = paginatedRequests.length > 0 && paginatedRequests.every(r => selectedRequestIds.has(r.id));

    const handleSelectAllPage = () => {
        const updated = new Set(selectedRequestIds);
        if (isAllOnPageSelected) {
            paginatedRequests.forEach(r => updated.delete(r.id));
        } else {
            paginatedRequests.forEach(r => updated.add(r.id));
        }
        setSelectedRequestIds(updated);
    };

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    return (
        <div className="min-h-screen bg-background">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Vendor Management</h1>
                        <p className="text-sm text-muted-foreground mt-1">Create and manage vendor credentials and requests</p>
                    </div>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm"
                    >
                        {showForm ? <X size={18} /> : <Plus size={18} />}
                        {showForm ? 'Close' : 'New Vendor'}
                    </button>
                </div>

                {/* Create Vendor Form */}
                {showForm && (
                    <div className="mb-8 bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-5 sm:p-6">
                            <h2 className="text-lg font-semibold mb-5 flex items-center gap-2">
                                <Building2 size={20} className="text-primary" />
                                Create Vendor Credentials
                            </h2>
                            <form onSubmit={handleAddVendor} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Vendor Name</label>
                                    <input
                                        type="text"
                                        placeholder="Enter vendor name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        placeholder="vendor@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Password</label>
                                    <input
                                        type="password"
                                        placeholder="Set a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">Address</label>
                                    <textarea
                                        placeholder="Enter vendor address"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        rows={3}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                        required
                                    />
                                </div>
                                <div className="sm:col-span-2 flex justify-end">
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm"
                                    >
                                        <Plus size={18} />
                                        Create Vendor
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Vendor List (Collapsible Accordion) */}
                <div className="mb-8 bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Building2 size={20} className="text-primary" />
                            Vendor Accounts
                            <span className="text-sm font-normal text-muted-foreground ml-1">({vendors.length})</span>
                        </h2>
                    </div>

                    {vendors.length === 0 ? (
                        <div className="py-12 text-center text-sm text-muted-foreground">
                            No vendors yet. Create your first vendor above.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {vendors.map((vendor) => (
                                <div key={vendor.id}>
                                    <button
                                        onClick={() => setExpandedVendorId(expandedVendorId === vendor.id ? null : vendor.id)}
                                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                                                {vendor.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">{vendor.name}</p>
                                                <p className="text-xs text-muted-foreground truncate">{vendor.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditingVendor(vendor); }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Edit vendor"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteVendor(vendor.id); }}
                                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Delete vendor"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            {expandedVendorId === vendor.id ? (
                                                <ChevronDown size={18} className="text-muted-foreground shrink-0" />
                                            ) : (
                                                <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                                            )}
                                        </div>
                                    </button>

                                    {expandedVendorId === vendor.id && (
                                        <div className="px-5 pb-4 pt-2 bg-gray-50/50 dark:bg-gray-900/20">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail size={14} className="shrink-0" />
                                                    <span className="truncate">{vendor.email}</span>
                                                </div>
                                                <div className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2">
                                                    <MapPin size={14} className="shrink-0 mt-0.5" />
                                                    <span>{vendor.address || 'No address'}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setEditingVendor(vendor)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                                >
                                                    <Pencil size={12} />
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteVendor(vendor.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                                >
                                                    <Trash2 size={12} />
                                                    Delete
                                                </button>
                                                {userRole === 'super_admin' && session?.user.id !== vendor.id && (
                                                    <button
                                                        onClick={() => handleAccessAsVendor(vendor)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                                                        title="Access as vendor"
                                                    >
                                                        <KeyRound size={12} />
                                                        Access
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vendor Requests */}
                <div className="bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Eye size={20} className="text-primary" />
                                Vendor Requests
                                <span className="text-sm font-normal text-muted-foreground ml-1">
                                    ({filteredRequests.length})
                                    {vendorRequests.length !== filteredRequests.length && (
                                        <span className="text-xs ml-1">filtered from {vendorRequests.length}</span>
                                    )}
                                </span>
                            </h2>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search by batch, vendor, status..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                                        className="w-full sm:w-56 pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                                <div className="relative">
                                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                                        className="w-full sm:w-40 pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="sent">Sent</option>
                                        <option value="accepted">Accepted</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                {uniqueDepartments.length > 0 && (
                                    <div className="relative">
                                        <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <select
                                            value={departmentFilter}
                                            onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1); }}
                                            className="w-full sm:w-44 pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none"
                                        >
                                            <option value="all">All Departments</option>
                                            {uniqueDepartments.map(dep => (
                                                <option key={dep} value={dep}>{dep}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedRequestIds.size > 0 && (
                        <div className="px-5 py-3 bg-primary/5 border-b border-primary/20 flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-semibold text-primary">{selectedRequestIds.size} selected</span>
                            <button onClick={() => setSelectedRequestIds(new Set())} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline">Clear</button>
                            <div className="flex items-center gap-2 ml-auto flex-wrap">
                                <button
                                    onClick={() => handleBulkStatusUpdate('completed')}
                                    disabled={bulkActionLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-lg hover:bg-green-100 disabled:opacity-50 transition-colors"
                                >
                                    {bulkActionLoading ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />}
                                    Mark Completed
                                </button>
                                <button
                                    onClick={() => { setBulkVendorModalOpen(true); setBulkNewVendorId(null); }}
                                    disabled={bulkActionLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
                                >
                                    <RefreshCw size={12} />
                                    Change Vendor
                                </button>
                                <button
                                    onClick={handleBulkDelete}
                                    disabled={bulkActionLoading}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                    <Trash2 size={12} />
                                    Delete
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                        {statsData.map(stat => {
                            const Icon = stat.icon;
                            return (
                                <button
                                    key={stat.key}
                                    onClick={() => setStatusFilter(stat.key === statusFilter ? 'all' : stat.key)}
                                    className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-4 hover:shadow-md transition-all text-left ${
                                        statusFilter === stat.key
                                            ? 'border-primary dark:border-primary ring-1 ring-primary/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                                            <Icon size={16} className="text-white" />
                                        </div>
                                        <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                    <p className="text-2xl font-bold text-foreground">{stat.count}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                                </button>
                            );
                        })}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/50">
                                    <th className="py-3.5 px-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={isAllOnPageSelected}
                                            onChange={handleSelectAllPage}
                                            className="rounded border-gray-300 dark:border-gray-600 accent-primary"
                                        />
                                    </th>
                                    <th className="py-3.5 px-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8"></th>
                                    <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Batch ID</th>
                                    <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor</th>
                                    <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created</th>
                                    <th className="py-3.5 px-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paginatedRequests.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                                            {searchQuery || statusFilter !== 'all' ? 'No requests match your filters.' : 'No vendor requests found.'}
                                        </td>
                                    </tr>
                                ) : paginatedRequests.map((request) => (
                                    <React.Fragment key={request.id}>
                                    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${selectedRequestIds.has(request.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                        <td className="py-4 px-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRequestIds.has(request.id)}
                                                onChange={() => handleToggleSelect(request.id)}
                                                className="rounded border-gray-300 dark:border-gray-600 accent-primary"
                                            />
                                        </td>
                                        <td className="py-4 px-2 text-sm">
                                            {request.card_details && (
                                                <button
                                                    onClick={() => setExpandedRowId(expandedRowId === request.id ? null : request.id)}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                                >
                                                    {expandedRowId === request.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                                </button>
                                            )}
                                        </td>
                                        <td className="py-4 px-5 text-sm font-mono text-foreground">{request.batch_id || 'N/A'}</td>
                                        <td className="py-4 px-5 text-sm text-foreground">{request.vendor_name}</td>
                                        <td className="py-4 px-5">
                                            <StatusBadge status={request.status} />
                                        </td>
                                        <td className="py-4 px-5 text-sm text-muted-foreground">{new Date(request.created_at).toLocaleDateString()}</td>
                                        <td className="py-4 px-5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setChangingVendorRequest(request)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Change vendor"
                                                >
                                                    <RefreshCw size={15} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteVendorRequest(request.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Delete request"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRowId === request.id && request.card_details && (
                                        <tr className="bg-gray-50/50 dark:bg-gray-900/20">
                                            <td colSpan={7} className="px-5 py-4">
                                                <div className="flex gap-4">
                                                    {request.card_details.photo && (
                                                        <img
                                                            src={request.card_details.photo}
                                                            alt=""
                                                            className="w-16 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shrink-0"
                                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                    )}
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm flex-1">
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">Name</span>
                                                            <p className="font-medium text-foreground">{request.card_details.fullName || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">Employee ID</span>
                                                            <p className="font-medium text-foreground">{request.card_details.employeeId || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">Blood Group</span>
                                                            <p className="font-medium text-foreground">{request.card_details.bloodGroup || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground text-xs">Branch</span>
                                                            <p className="font-medium text-foreground">{typeof request.card_details.branch === 'object' ? request.card_details.branch?.name || '-' : request.card_details.branch || '-'}</p>
                                                        </div>
                                                        <div className="sm:col-span-2">
                                                            <span className="text-muted-foreground text-xs">Emergency Contact</span>
                                                            <p className="font-medium text-foreground">{request.card_details.emergencyContact || '-'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-800">
                        {paginatedRequests.length === 0 ? (
                            <div className="py-12 text-center text-sm text-muted-foreground">
                                {searchQuery || statusFilter !== 'all' ? 'No requests match your filters.' : 'No vendor requests found.'}
                            </div>
                        ) : paginatedRequests.map((request) => (
                            <div key={request.id} className={`p-4 space-y-2 ${selectedRequestIds.has(request.id) ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                <div className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        checked={selectedRequestIds.has(request.id)}
                                        onChange={() => handleToggleSelect(request.id)}
                                        className="mt-1 rounded border-gray-300 dark:border-gray-600 accent-primary shrink-0"
                                    />
                                    <div className="flex-1 flex items-start justify-between min-w-0">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1">
                                            {request.card_details && (
                                                <button
                                                    onClick={() => setExpandedRowId(expandedRowId === request.id ? null : request.id)}
                                                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors shrink-0"
                                                >
                                                    {expandedRowId === request.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                </button>
                                            )}
                                            <p className="text-xs font-mono text-muted-foreground">Batch: {request.batch_id || 'N/A'}</p>
                                        </div>
                                        <p className="text-sm font-medium text-foreground mt-0.5 truncate">{request.vendor_name}</p>
                                    </div>
                                    <StatusBadge status={request.status} />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Created: {new Date(request.created_at).toLocaleDateString()}</p>
                                {expandedRowId === request.id && request.card_details && (
                                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-lg space-y-2">
                                        <div className="flex gap-3">
                                            {request.card_details.photo && (
                                                <img
                                                    src={request.card_details.photo}
                                                    alt=""
                                                    className="w-12 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shrink-0"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            )}
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm flex-1">
                                                <div>
                                                    <span className="text-muted-foreground text-xs">Name</span>
                                                    <p className="font-medium text-foreground">{request.card_details.fullName || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground text-xs">Employee ID</span>
                                                    <p className="font-medium text-foreground">{request.card_details.employeeId || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground text-xs">Blood Group</span>
                                                    <p className="font-medium text-foreground">{request.card_details.bloodGroup || '-'}</p>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground text-xs">Branch</span>
                                                    <p className="font-medium text-foreground">{typeof request.card_details.branch === 'object' ? request.card_details.branch?.name || '-' : request.card_details.branch || '-'}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-muted-foreground text-xs">Emergency Contact</span>
                                                    <p className="font-medium text-foreground">{request.card_details.emergencyContact || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => setChangingVendorRequest(request)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                                    >
                                        <RefreshCw size={12} />
                                        Change
                                    </button>
                                    <button
                                        onClick={() => handleDeleteVendorRequest(request.id)}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    >
                                        <Trash2 size={12} />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {filteredRequests.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Rows per page:</span>
                                <select
                                    value={perPage}
                                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                    className="py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                >
                                    {PAGE_SIZES.map(size => (
                                        <option key={size} value={size}>{size}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={safePage === 1}
                                    className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    {'<<'}
                                </button>
                                <button
                                    onClick={() => setPage(safePage - 1)}
                                    disabled={safePage === 1}
                                    className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    {'<'}
                                </button>
                                <span className="px-3 py-1 text-sm text-foreground font-medium">
                                    Page {safePage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(safePage + 1)}
                                    disabled={safePage === totalPages}
                                    className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    {'>'}
                                </button>
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={safePage === totalPages}
                                    className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    {'>>'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Edit Vendor Modal */}
            {editingVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingVendor(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Pencil size={18} className="text-primary" />
                                Edit Vendor
                            </h2>
                            <button onClick={() => setEditingVendor(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateVendor} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Vendor Name</label>
                                <input
                                    type="text"
                                    value={editingVendor.name}
                                    onChange={(e) => setEditingVendor({...editingVendor, name: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={editingVendor.email}
                                    onChange={(e) => setEditingVendor({...editingVendor, email: e.target.value})}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Address</label>
                                <textarea
                                    value={editingVendor.address}
                                    onChange={(e) => setEditingVendor({...editingVendor, address: e.target.value})}
                                    rows={3}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingVendor(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                                >
                                    {isSaving ? (
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Vendor Modal */}
            {changingVendorRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setChangingVendorRequest(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold">Change Vendor</h2>
                            <button onClick={() => setChangingVendorRequest(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">Batch ID: <span className="font-mono font-medium text-foreground">{changingVendorRequest.batch_id}</span></p>
                        <p className="text-xs text-muted-foreground mb-4">Select a new vendor to assign this request to.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Select New Vendor</label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleChangeVendor(changingVendorRequest.id, e.target.value);
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select a vendor</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setChangingVendorRequest(null)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Change Vendor Modal */}
            {bulkVendorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBulkVendorModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold">Change Vendor for {selectedRequestIds.size} Request(s)</h2>
                            <button onClick={() => setBulkVendorModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4">All selected requests will be reassigned to the chosen vendor with status reset to <span className="font-mono">sent</span>.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Select New Vendor</label>
                                <select
                                    value={bulkNewVendorId || ''}
                                    onChange={(e) => setBulkNewVendorId(e.target.value || null)}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                >
                                    <option value="">Select a vendor</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setBulkVendorModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBulkChangeVendor}
                                    disabled={!bulkNewVendorId || bulkActionLoading}
                                    className="flex-1 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {bulkActionLoading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                                    Reassign
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VendorManagement;
