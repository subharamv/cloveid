import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'sonner';
import AdminHeader from '../components/AdminHeader';
import { Pencil, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
}

const VendorManagement = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [address, setAddress] = useState('');
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [vendorRequests, setVendorRequests] = useState<VendorRequest[]>([]);
    const { user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [changingVendorRequest, setChangingVendorRequest] = useState<VendorRequest | null>(null);

    useEffect(() => {
        fetchVendors();
        fetchVendorRequests();
    }, []);

    const fetchVendorRequests = async () => {
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
            const formattedVendors = data.map((v: any) => {
                return {
                    id: v.id,
                    name: v.name || v.profiles?.full_name || '',
                    email: v.email || '',
                    address: v.address || ''
                };
            });
            setVendors(formattedVendors);
        }
    };

    const handleAddVendor = async (e: React.FormEvent) => {
        e.preventDefault();

        // Step 1: Create a new user in Supabase Auth
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
            // Step 2: Insert vendor details into the 'vendors' table
            const { error: vendorError } = await supabase
                .from('vendors')
                .insert([
                    { id: authData.user.id, name, email, address }
                ]);

            if (vendorError) {
                toast.error(vendorError.message);
                // Optionally, delete the created user if vendor insertion fails
                // await supabase.auth.api.deleteUser(authData.user.id);
                return;
            }

            // Step 3: Update the user's role in the 'profiles' table
            const { error: profileError } = await supabase
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
            fetchVendors(); // Refresh the vendor list
        }
    };

    const handleUpdateVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingVendor) return;

        setIsSaving(true);
        try {
            const { error: vendorError } = await supabase
                .from('vendors')
                .update({ 
                    name: editingVendor.name, 
                    email: editingVendor.email, 
                    address: editingVendor.address 
                })
                .eq('id', editingVendor.id);

            if (vendorError) throw vendorError;

            const { error: profileError } = await supabase
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

        // First, delete the vendor from the 'vendors' table
        const { error: vendorError } = await supabase
            .from('vendors')
            .delete()
            .eq('id', vendorId);

        if (vendorError) {
            toast.error('Failed to delete vendor: ' + vendorError.message);
            return;
        }

        // Also delete the profile
        const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', vendorId);
        
        if (profileError) {
            console.error('Error deleting profile:', profileError);
            toast.error('Vendor record deleted, but profile deletion failed: ' + profileError.message);
        } else {
            toast.success('Vendor and profile deleted successfully!');
        }

        fetchVendors(); // Refresh the vendor list
    };

    const handleDeleteVendorRequest = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this vendor request?')) return;

        const { error } = await supabase
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

    const handleChangeVendor = async (requestId: number, newVendorId: string) => {
        setIsSaving(true);
        try {
            const { error } = await supabase
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

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="settings" />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="p-4 sm:p-8">
                        <h1 className="text-2xl font-bold mb-4">Create Vendor Credentials</h1>
                        <div className="mb-8">
                            <form onSubmit={handleAddVendor} className="flex flex-col gap-4 w-full max-w-md">
                                <input
                                    type="text"
                                    placeholder="Vendor Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="border p-2 rounded"
                                    required
                                />
                                <input
                                    type="email"
                                    placeholder="Vendor Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="border p-2 rounded"
                                    required
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="border p-2 rounded"
                                    required
                                />
                                <textarea
                                    placeholder="Address"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="border p-2 rounded"
                                    required
                                />
                                <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                                    Create Vendor
                                </button>
                            </form>
                        </div>

                        <h2 className="text-xl font-bold mb-4">Vendor List</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white dark:bg-gray-800">
                                <thead>
                                    <tr>
                                        <th className="py-2 px-4 border-b text-left">Name</th>
                                        <th className="py-2 px-4 border-b text-left">Email</th>
                                        <th className="py-2 px-4 border-b text-left">Address</th>
                                        <th className="py-2 px-4 border-b text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendors.map((vendor) => (
                                        <tr key={vendor.id}>
                                            <td className="py-2 px-4 border-b">{vendor.name}</td>
                                            <td className="py-2 px-4 border-b">{vendor.email}</td>
                                            <td className="py-2 px-4 border-b">{vendor.address}</td>
                                            <td className="py-2 px-4 border-b text-left">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingVendor(vendor)}
                                                        className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVendor(vendor.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h2 className="text-xl font-bold mt-12 mb-4">Vendor Requests</h2>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white dark:bg-gray-800">
                                <thead>
                                    <tr>
                                        <th className="py-2 px-4 border-b text-left">Batch ID</th>
                                        <th className="py-2 px-4 border-b text-left">Vendor</th>
                                        <th className="py-2 px-4 border-b text-left">Status</th>
                                        <th className="py-2 px-4 border-b text-left">Created At</th>
                                        <th className="py-2 px-4 border-b text-left">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendorRequests.map((request) => (
                                        <tr key={request.id}>
                                            <td className="py-2 px-4 border-b">{request.batch_id || 'N/A'}</td>
                                            <td className="py-2 px-4 border-b">{request.vendor_name}</td>
                                            <td className="py-2 px-4 border-b">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    request.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="py-2 px-4 border-b">{new Date(request.created_at).toLocaleDateString()}</td>
                                            <td className="py-2 px-4 border-b text-left">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setChangingVendorRequest(request)}
                                                        className="text-blue-600 hover:underline text-sm"
                                                    >
                                                        Change Vendor
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVendorRequest(request.id)}
                                                        className="text-red-600 hover:underline text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {vendorRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-4 text-center text-gray-500">No vendor requests found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>

            {editingVendor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Edit Vendor</h2>
                        <form onSubmit={handleUpdateVendor} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Vendor Name</label>
                                <input 
                                    type="text" 
                                    value={editingVendor.name}
                                    onChange={(e) => setEditingVendor({...editingVendor, name: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Email</label>
                                <input 
                                    type="email" 
                                    value={editingVendor.email}
                                    onChange={(e) => setEditingVendor({...editingVendor, email: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Address</label>
                                <textarea 
                                    value={editingVendor.address}
                                    onChange={(e) => setEditingVendor({...editingVendor, address: e.target.value})}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 min-h-[80px]"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setEditingVendor(null)}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isSaving ? <span className="animate-spin mr-2 material-symbols-outlined">sync</span> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {changingVendorRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Change Vendor for Request</h2>
                        <p className="text-sm text-gray-500 mb-4">Batch ID: {changingVendorRequest.batch_id}</p>
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Select New Vendor</label>
                                <select 
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
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
                            <div className="flex gap-3 mt-6">
                                <button 
                                    type="button"
                                    onClick={() => setChangingVendorRequest(null)}
                                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/vendor">Vendor Management</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/user-management">User Management</Link>
                    <button onClick={logout} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-600 text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default VendorManagement;