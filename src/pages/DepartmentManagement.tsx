import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import AdminHeader from '../components/AdminHeader';
import { Trash2, Plus, Loader2 } from 'lucide-react';

interface Department {
    id: string;
    name: string;
    created_at: string;
}

const DepartmentManagement = () => {
    const { logout } = useAuth();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [newDeptName, setNewDeptName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setDepartments(data || []);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDeptName.trim()) return;

        setIsAdding(true);
        try {
            const { error } = await supabase
                .from('departments')
                .insert([{ name: newDeptName.trim() }]);

            if (error) throw error;

            toast.success('Department added successfully');
            setNewDeptName('');
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || 'Failed to add department');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteDepartment = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the department "${name}"?`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Department deleted successfully');
            fetchDepartments();
        } catch (error: any) {
            toast.error(error.message || 'Failed to delete department');
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="settings" />

                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="mx-auto max-w-4xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                            <h1 className="text-2xl font-bold">Department Management</h1>

                            <form onSubmit={handleAddDepartment} className="flex w-full md:w-auto gap-2">
                                <input
                                    type="text"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    placeholder="New Department Name"
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                    Add
                                </button>
                            </form>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Created</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                    <span>Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : departments.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No departments found.</td>
                                        </tr>
                                    ) : departments.map((dept) => (
                                        <tr key={dept.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{dept.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(dept.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete Department"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {/* Sidebar for mobile (standard layout) */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}
            <div className={`fixed top-0 left-0 h-full bg-white dark:bg-background-dark w-64 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="font-bold">Menu</h2>
                    <button onClick={() => setIsSidebarOpen(false)}>
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <nav className="flex flex-col p-5 gap-4">
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary text-sm font-medium leading-normal" to="/dashboard">Dashboard</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary text-sm font-medium leading-normal" to="/manage-requests">Manage Requests</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary text-sm font-medium leading-normal" to="/user-management">User Management</Link>
                    <Link className="text-primary text-sm font-medium leading-normal" to="/department-management">Department Management</Link>
                    <button onClick={logout} className="text-red-500 hover:text-red-700 text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default DepartmentManagement;
