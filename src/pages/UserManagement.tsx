import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';

import logo from '../assets/CLOVE LOGO BLACK.png';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AppHeader from '../components/AppHeader';
import { UserCheck, UserX, Shield, Trash2, Menu } from 'lucide-react';

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
    const { session } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [departmentFilter, setDepartmentFilter] = useState<string>('');
    const [cardMap, setCardMap] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            const profilesData = data || [];
            setProfiles(profilesData);

            // Fetch card mapping for these profiles by employee_id
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

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            toast.success(`User ${!currentStatus ? 'approved' : 'deactivated'} successfully`);
            fetchProfiles();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleRoleChange = async (id: string, newRole: string) => {
        try {
            const { error } = await supabase
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

    const handleDeleteUser = async (id: string, fullName: string) => {
        if (!window.confirm(`Are you sure you want to delete user ${fullName}? This will only delete their profile.`)) {
            return;
        }

        try {
            const { error } = await supabase
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

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
            <div className="layout-container flex h-full grow flex-col">
                <AppHeader />

                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="mx-auto max-w-7xl">
                        <h1 className="text-2xl font-bold mb-6">User Management</h1>

                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <label className="text-sm">Department:</label>
                                <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                                    <option value="">All</option>
                                    {Array.from(new Set(profiles.map(p => p.department).filter(Boolean))).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
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
                                            <td colSpan={7} className="px-6 py-4 text-center">Loading...</td>
                                        </tr>
                                    ) : (
                                        profiles
                                            .filter(p => !departmentFilter || p.department === departmentFilter)
                                            .map((profile) => (
                                                <tr key={profile.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{profile.full_name}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{profile.employee_id || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{profile.department || 'N/A'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">{cardMap[profile.employee_id] || '-'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <select
                                                            value={profile.role}
                                                            onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                                                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="admin">Admin</option>
                                                            <option value="manager">Manager</option>
                                                            <option value="vendor">Vendor</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${profile.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                            {profile.is_active ? 'Active' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleToggleActive(profile.id, profile.is_active)}
                                                                className={`${profile.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                                                                title={profile.is_active ? 'Deactivate' : 'Approve'}
                                                            >
                                                                {profile.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(profile.id, profile.full_name)}
                                                                className="text-red-600 hover:text-red-900"
                                                                title="Delete User"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div >
                </main >
            </div >

        </div >
    );
};

export default UserManagement;