import React, { useState, useEffect, useMemo } from 'react';
import { supabase, supabaseAdmin } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

import { toast } from 'sonner';
import AppHeader from '../components/AppHeader';
import {
    UserCheck, UserX, Shield, Trash2, Search, Users, UserPlus, UserCog,
    ChevronDown, ChevronRight, Layers, X, KeyRound, AlertTriangle, CheckCircle
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Profile {
    id: string;
    full_name: string;
    email?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    employee_id: string;
    branch: string;
    department: string;
}

const UserManagement = () => {
    const { session, userRole, isImpersonating, resetImpersonation } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    const [groupByDept, setGroupByDept] = useState(false);
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
    const [cardMap, setCardMap] = useState<Record<string, any>>({});
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeptModal, setShowBulkDeptModal] = useState(false);
    const [bulkDeptValue, setBulkDeptValue] = useState('');
    const [isBulkSaving, setIsBulkSaving] = useState(false);
    const [allDepartmentNames, setAllDepartmentNames] = useState<string[]>([]);
    const [accessUser, setAccessUser] = useState<Profile | null>(null);
    const [impersonating, setImpersonating] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'approve' | 'deactivate';
        profile: Profile;
    } | null>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    useEffect(() => {
        const fetchDepts = async () => {
            try {
                const { data, error } = await (userRole === 'super_admin' ? supabaseAdmin : supabase)
                    .from('departments').select('name').order('name');
                if (!error && data) setAllDepartmentNames(data.map(d => d.name));
            } catch {}
        };
        fetchDepts();
    }, [userRole]);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await (userRole === 'super_admin' ? supabaseAdmin : supabase)
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const profilesData = data || [];
            setProfiles(profilesData);

            const employeeIds = profilesData.map((p: any) => p.employee_id).filter(Boolean);
            if (employeeIds.length > 0) {
                const { data: cardDetails } = await supabase
                    .from('employee_card_details')
                    .select('employee_id, card_id')
                    .in('employee_id', employeeIds);

                const map: Record<string, any> = {};
                (cardDetails || []).forEach((c: any) => {
                    if (c.employee_id) map[c.employee_id] = c.card_id;
                });
                setCardMap(map);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmToggleActive = async () => {
        if (!confirmAction) return;
        const { type, profile } = confirmAction;

        // Prevent modifying super_admin unless current user is super_admin
        if (profile.role === 'super_admin' && userRole !== 'super_admin') {
            toast.error('Only super admins can modify other super admins');
            setConfirmAction(null);
            return;
        }

        const isPrivileged = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
        const client = isPrivileged ? supabaseAdmin : supabase;

        try {
            if (type === 'approve') {
                let emailConfirmed = false;

                // 1. Confirm email via admin API (service_role key, most reliable)
                try {
                    const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(
                        profile.id,
                        { email_confirm: true }
                    );
                    if (adminError) {
                        console.warn('Admin API email confirm failed:', adminError.message);
                    } else {
                        emailConfirmed = true;
                    }
                } catch (adminErr) {
                    console.warn('Admin API email confirm threw:', adminErr);
                }

                // 2. Fallback to RPC if admin API didn't work
                if (!emailConfirmed) {
                    try {
                        const { error: rpcError } = await supabaseAdmin.rpc('confirm_user_email', {
                            user_id: profile.id,
                        });
                        if (rpcError) {
                            console.warn('RPC email confirm also failed:', rpcError.message);
                        } else {
                            emailConfirmed = true;
                        }
                    } catch (rpcErr) {
                        console.warn('RPC email confirm threw:', rpcErr);
                    }
                }

                // 3. Update profile is_active to true
                const { error } = await client
                    .from('profiles')
                    .update({ is_active: true })
                    .eq('id', profile.id);

                if (error) throw error;

                if (emailConfirmed) {
                    toast.success(`${profile.full_name} approved`, {
                        description: 'Email confirmed - user can now sign in immediately.',
                        duration: 5000,
                    });
                } else {
                    toast.success(`${profile.full_name} approved`, {
                        description: 'Profile activated. User can sign in once email is verified.',
                        duration: 5000,
                    });
                }
            } else {
                // Deactivate
                const { error } = await client
                    .from('profiles')
                    .update({ is_active: false })
                    .eq('id', profile.id);

                if (error) throw error;

                toast.warning(`${profile.full_name} deactivated`, {
                    description: 'User can no longer sign in.',
                    duration: 5000,
                });
            }

            setConfirmAction(null);
            fetchProfiles();
        } catch (error: any) {
            toast.error(error.message || `Failed to ${type} user`);
            setConfirmAction(null);
        }
    };

    const handleRoleChange = async (id: string, newRole: string, currentRole: string) => {
        try {
            // Prevent modifying super_admin unless current user is super_admin
            if (currentRole === 'super_admin' && userRole !== 'super_admin') {
                toast.error('Only super admins can change roles of other super admins');
                return;
            }

            const isPrivileged = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
            const client = isPrivileged ? supabaseAdmin : supabase;

            const { error } = await client
                .from('profiles')
                .update({ role: newRole })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Role updated to ${newRole}`);
            fetchProfiles();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteUser = async (id: string, fullName: string, role: string) => {
        // Prevent deleting super_admin unless current user is super_admin
        if (role === 'super_admin' && userRole !== 'super_admin') {
            toast.error('Only super admins can delete other super admins');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete user ${fullName}? This will only delete their profile.`)) {
            return;
        }

        try {
            const isPrivileged = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
            const client = isPrivileged ? supabaseAdmin : supabase;

            const { error } = await client
                .from('profiles')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success(`User ${fullName} deleted successfully`);
            fetchProfiles();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleAccessAsUser = async (profile: Profile) => {
        if (userRole !== 'super_admin') {
            toast.error('Only super admins can access other user accounts');
            return;
        }
        setAccessUser(profile);
        setImpersonating(true);
        localStorage.setItem('impersonating_user', JSON.stringify({
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
        }));
        localStorage.setItem('original_user', JSON.stringify({
            id: session?.user.id,
            email: session?.user.email,
        }));
        window.location.href = '/user-dashboard';
    };

    const handleResetToOriginal = () => {
        const original = localStorage.getItem('original_user');
        if (original) {
            const originalUser = JSON.parse(original);
            localStorage.removeItem('impersonating_user');
            localStorage.removeItem('original_user');
            window.location.href = '/user-management';
        }
    };

    const activeProfiles = profiles.filter(p => p.is_active);
    const pendingProfiles = profiles.filter(p => !p.is_active);

    const filteredProfiles = useMemo(() => {
        return profiles.filter(p => {
            if (departmentFilter && p.department !== departmentFilter) return false;
            if (statusFilter === 'active' && !p.is_active) return false;
            if (statusFilter === 'pending' && p.is_active) return false;
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                if (!p.full_name?.toLowerCase().includes(term) && !p.employee_id?.toLowerCase().includes(term)) return false;
            }
            return true;
        });
    }, [profiles, departmentFilter, statusFilter, searchTerm]);

    const allSelected = filteredProfiles.length > 0 && filteredProfiles.every(p => selectedIds.has(p.id));

    const handleSelectAll = () => {
        if (allSelected) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredProfiles.map(p => p.id)));
    };

    const handleBulkDepartmentUpdate = async () => {
        if (!bulkDeptValue || selectedIds.size === 0) return;
        setIsBulkSaving(true);
        try {
            const ids = Array.from(selectedIds);
            const isPrivileged = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
            const client = isPrivileged ? supabaseAdmin : supabase;

            const { error } = await client.from('profiles').update({ department: bulkDeptValue }).in('id', ids);
            if (error) throw error;
            toast.success(`Updated ${ids.length} user(s) to department "${bulkDeptValue}"`);
            setSelectedIds(new Set());
            setShowBulkDeptModal(false);
            setBulkDeptValue('');
            fetchProfiles();
        } catch (error: any) {
            toast.error(error.message || 'Failed to update departments');
        } finally {
            setIsBulkSaving(false);
        }
    };

    const departments = useMemo(() =>
        Array.from(new Set(profiles.map(p => p.department).filter(Boolean))).sort(),
        [profiles]
    );

    const groupedByDept = useMemo(() => {
        const groups: Record<string, Profile[]> = {};
        filteredProfiles.forEach(p => {
            const dept = p.department || 'No Department';
            if (!groups[dept]) groups[dept] = [];
            groups[dept].push(p);
        });
        return groups;
    }, [filteredProfiles]);

    const toggleDept = (dept: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev);
            if (next.has(dept)) next.delete(dept); else next.add(dept);
            return next;
        });
    };

    const statsData = [
        { label: 'Total Users', icon: Users, color: 'from-blue-400 to-blue-600', count: profiles.length },
        { label: 'Active', icon: UserCheck, color: 'from-emerald-400 to-emerald-600', count: activeProfiles.length },
        { label: 'Pending', icon: UserPlus, color: 'from-amber-400 to-amber-600', count: pendingProfiles.length },
    ];

    const renderTableRow = (profile: Profile) => (
        <tr key={profile.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(profile.id) ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}>
            <td className="px-4 py-4 whitespace-nowrap w-10">
                <input
                    type="checkbox"
                    checked={selectedIds.has(profile.id)}
                    onChange={() => {
                        setSelectedIds(prev => {
                            const next = new Set(prev);
                            if (next.has(profile.id)) next.delete(profile.id); else next.add(profile.id);
                            return next;
                        });
                    }}
                    className="rounded border-gray-300 dark:border-gray-600"
                />
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                        {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{profile.full_name}</div>
                        <div className="text-xs text-gray-400">{profile.email || ''}</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{profile.employee_id || '—'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{profile.department || '—'}</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">{cardMap[profile.employee_id] || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                    <select
                        value={profile.role}
                        onChange={(e) => handleRoleChange(profile.id, e.target.value, profile.role)}
                        className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded-lg focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 p-1.5"
                        disabled={profile.role === 'super_admin' && userRole !== 'super_admin'}
                    >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="vendor">Vendor</option>
                    <option value="super_admin">Super Admin</option>
                </select>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    profile.is_active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${profile.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {profile.is_active ? 'Active' : 'Pending'}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        onClick={() => setConfirmAction({
                            type: profile.is_active ? 'deactivate' : 'approve',
                            profile
                        })}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            profile.role === 'super_admin' && userRole !== 'super_admin'
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                                : profile.is_active
                                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/40'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40'
                        }`}
                        title={
                            profile.role === 'super_admin' && userRole !== 'super_admin'
                                ? 'Only super admins can modify super admins'
                                : profile.is_active ? 'Deactivate' : 'Approve'
                        }
                        disabled={profile.role === 'super_admin' && userRole !== 'super_admin'}
                    >
                        {profile.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        <span>{profile.is_active ? 'Disable' : 'Approve'}</span>
                    </button>
                    <button
                        onClick={() => handleDeleteUser(profile.id, profile.full_name, profile.role)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            profile.role === 'super_admin' && userRole !== 'super_admin'
                                ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                                : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                        }`}
                        title={
                            profile.role === 'super_admin' && userRole !== 'super_admin'
                                ? 'Only super admins can delete super admins'
                                : 'Delete User'
                        }
                        disabled={profile.role === 'super_admin' && userRole !== 'super_admin'}
                    >
                        <Trash2 size={14} />
                        Delete
                    </button>
                    {userRole === 'super_admin' && session?.user.id !== profile.id && (
                        <button
                            onClick={() => handleAccessAsUser(profile)}
                            className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Access as this user"
                        >
                            <KeyRound size={14} />
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );

    const renderTable = () => {
        if (groupByDept) {
            return (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {Object.entries(groupedByDept).map(([dept, members]) => (
                        <div key={dept}>
                            <button
                                onClick={() => toggleDept(dept)}
                                className="w-full flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors text-left"
                            >
                                {expandedDepts.has(dept) ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                                <Layers size={16} className="text-orange-500" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{dept}</span>
                                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{members.length}</span>
                            </button>
                            {expandedDepts.has(dept) && (
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50/50 dark:bg-gray-900/20">
                                        <tr>
                                            <th className="px-4 py-3 w-10"></th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card #</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {members.map(renderTableRow)}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                        <th className="px-4 py-3 w-10">
                            <input type="checkbox" checked={allSelected} onChange={handleSelectAll}
                                className="rounded border-gray-300 dark:border-gray-600" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Card #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {loading ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">Loading...</td>
                        </tr>
                    ) : filteredProfiles.length > 0 ? (
                        filteredProfiles.map(renderTableRow)
                    ) : (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">No users found matching your criteria.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        );
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <div className="layout-container flex h-full grow flex-col">
                <AppHeader />

                

                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10">
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage user accounts, roles, and access permissions</p>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {statsData.map(stat => {
                                const Icon = stat.icon;
                                return (
                                    <button
                                        key={stat.label}
                                        onClick={() => {
                                            if (stat.label === 'Active') setStatusFilter(statusFilter === 'active' ? '' : 'active');
                                            else if (stat.label === 'Pending') setStatusFilter(statusFilter === 'pending' ? '' : 'pending');
                                            else setStatusFilter('');
                                        }}
                                        className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-4 hover:shadow-md transition-all text-left ${
                                            (stat.label === 'Active' && statusFilter === 'active') ||
                                            (stat.label === 'Pending' && statusFilter === 'pending') ||
                                            (stat.label === 'Total Users' && !statusFilter)
                                                ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                                                <Icon size={16} className="text-white" />
                                            </div>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Filters & Search */}
                        <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                            <div className="p-5 sm:p-6 pb-0">
                                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-4">
                                    <div className="relative w-full sm:w-72">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or employee ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={departmentFilter}
                                            onChange={(e) => setDepartmentFilter(e.target.value)}
                                            className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                                        >
                                            <option value="">All Departments</option>
                                            {departments.map(d => (
                                                <option key={d} value={d}>{d}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                                        >
                                            <option value="">All Status</option>
                                            <option value="active">Active</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                        <button
                                            onClick={() => setGroupByDept(!groupByDept)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                                                groupByDept
                                                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                                                    : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <Layers size={14} />
                                            Group by Dept
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-3 px-5 py-2.5 bg-orange-50 dark:bg-orange-900/10 border-b border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                                        {selectedIds.size} selected
                                    </span>
                                    <button
                                        onClick={() => setShowBulkDeptModal(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                                    >
                                        <Layers size={13} />
                                        Set Department
                                    </button>
                                    <button
                                        onClick={() => setSelectedIds(new Set())}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <X size={13} />
                                        Clear
                                    </button>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                {renderTable()}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Showing {filteredProfiles.length} of {profiles.length} users
                                </p>
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            {/* Bulk Department Modal */}
            {showBulkDeptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBulkDeptModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Set Department</h2>
                            <button onClick={() => setShowBulkDeptModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            Assign department to {selectedIds.size} selected user(s)
                        </p>
                        <div className="space-y-4 mt-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">Department</label>
                                <select
                                    value={bulkDeptValue}
                                    onChange={e => setBulkDeptValue(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                >
                                    <option value="">Select department...</option>
                                    {allDepartmentNames.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowBulkDeptModal(false); setBulkDeptValue(''); }}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkDepartmentUpdate}
                                    disabled={!bulkDeptValue || isBulkSaving}
                                    className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isBulkSaving ? (
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                    ) : (
                                        <Layers size={16} />
                                    )}
                                    {isBulkSaving ? 'Saving...' : 'Update'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog for Approve/Deactivate */}
            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            {confirmAction?.type === 'approve' ? (
                                <><CheckCircle size={20} className="text-emerald-500" /> Approve User</>
                            ) : (
                                <><AlertTriangle size={20} className="text-amber-500" /> Deactivate User</>
                            )}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 pt-2">
                            {confirmAction?.type === 'approve' ? (
                                <>
                                    <p>
                                        This will <strong>approve</strong> <span className="font-semibold text-foreground">{confirmAction?.profile?.full_name}</span>
                                        {' '}and confirm their email address.
                                    </p>
                                    <p className="text-xs text-muted-foreground/80 bg-muted p-2 rounded-md">
                                        The user will be able to sign in immediately after approval.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p>
                                        This will <strong>deactivate</strong> <span className="font-semibold text-foreground">{confirmAction?.profile?.full_name}</span>.
                                    </p>
                                    <p className="text-xs text-muted-foreground/80 bg-muted p-2 rounded-md">
                                        The user will no longer be able to sign in. Their data will be preserved.
                                    </p>
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmToggleActive}
                            className={confirmAction?.type === 'deactivate' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                        >
                            {confirmAction?.type === 'approve' ? 'Approve User' : 'Deactivate User'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default UserManagement;