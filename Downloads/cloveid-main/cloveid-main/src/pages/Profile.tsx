import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import logo from '@/assets/CLOVE LOGO BLACK.png';
import { Bell, Menu, X, LogOut, Save, User, Phone, MapPin, CreditCard, Droplet } from 'lucide-react';
import { toast } from 'sonner';
import { BRANCHES, BLOOD_GROUPS } from '@/types/employee';

const DEFAULT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuDTuk1Iosn49fHWfKjAP9fBJw3pQzsM6YL5zr-Cxka0K6IIkmxhTiisNLHxHNnJ9KANzspNqOKesKX_0x9HyVIotvJDUojrFn2AWhrITYpZtN0xi9T7ugql-9wNJQnqPuWDUZnZIbtnSxLe2Onfl1FMn0BF4vM61YkMxGtaPP6Gq-SqEPQfugyzpPDy7QoNGts7_1Abd7NSO-7z37gh5XlZ1BW6zV02LVXWhiY9TQDiVZOFWYhWBBRvJEJZ7Ys0spYA1NDiqcHthFzB";

const Profile = () => {
    const navigate = useNavigate();
    const { userRole, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: '',
        employee_id: '',
        branch: '',
        blood_group: '',
        phone: '',
        avatar_url: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                
                if (!user) {
                    navigate('/');
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    let empId = data.employee_id || '';
                    if (empId && !empId.startsWith('CLOVE-')) {
                        empId = `CLOVE-${empId}`;
                    }
                    
                    setFormData({
                        full_name: data.full_name || '',
                        employee_id: empId,
                        branch: data.branch || '',
                        blood_group: data.blood_group || '',
                        phone: data.phone || '',
                        avatar_url: data.avatar_url || ''
                    });
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Failed to load profile');
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'employee_id') {
            // Ensure CLOVE- prefix is maintained in state
            // The input value will be the part AFTER "CLOVE-"
            // So we prepend "CLOVE-" to whatever the user typed
            const numericValue = value.replace(/^CLOVE-/, '');
            setFormData(prev => ({ ...prev, [name]: `CLOVE-${numericValue}` }));
        } else if (name === 'phone') {
            // Strip +91 prefix if user tries to type it
            const phoneValue = value.replace(/^\+91\s*/, '');
            setFormData(prev => ({ ...prev, [name]: phoneValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) throw new Error('No user found');

            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    employee_id: formData.employee_id || null,
                    branch: formData.branch || null,
                    blood_group: formData.blood_group || null,
                    phone: formData.phone || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#F8F9FA] dark:bg-gray-900 group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-gray-700 px-4 py-3 bg-white dark:bg-gray-800 shadow-md">
                    <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                        <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <Menu className="h-6 w-6" />
                        </button>
                        <img src={logo} alt="Logo" className="h-8 w-auto" />
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Bell className="h-6 w-6" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" style={{ backgroundImage: `url("${formData.avatar_url || DEFAULT_AVATAR}")` }}></div>
                            <span className="font-semibold hidden md:block">{formData.full_name || 'User'}</span>
                        </div>
                        <button onClick={logout} className="hidden lg:flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <LogOut className="h-6 w-6" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Profile</h1>
                            <Link 
                                to={userRole === 'admin' || userRole === 'manager' ? "/dashboard" : "/user-dashboard"}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Back
                            </Link>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sm:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <User className="h-4 w-4" />
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <CreditCard className="h-4 w-4" />
                                        Employee ID
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium select-none">
                                            CLOVE-
                                        </span>
                                        <input
                                            type="text"
                                            name="employee_id"
                                            value={formData.employee_id.replace(/^CLOVE-/, '')}
                                            onChange={handleChange}
                                            className="w-full pl-[4.5rem] pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="XXXX"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <MapPin className="h-4 w-4" />
                                        Branch
                                    </label>
                                    <select
                                        name="branch"
                                        value={formData.branch}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Select Branch</option>
                                        {BRANCHES.map(branch => (
                                            <option key={branch} value={branch}>{branch}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Droplet className="h-4 w-4" />
                                        Blood Group
                                    </label>
                                    <select
                                        name="blood_group"
                                        value={formData.blood_group}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Select Blood Group</option>
                                        {BLOOD_GROUPS.map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Phone className="h-4 w-4" />
                                        Phone Number
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium select-none pointer-events-none">
                                            +91
                                        </span>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            className="w-full pl-14 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                            placeholder="9876543210"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="h-4 w-4" />
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </main>
            </div>

            {/* Sidebar for mobile */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}
            <div className={`fixed top-0 left-0 h-full bg-white dark:bg-gray-800 w-64 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="font-bold">Menu</h2>
                    <button onClick={() => setIsSidebarOpen(false)}>
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <nav className="flex flex-col p-5 gap-4">
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal" to="/user-dashboard" onClick={() => setIsSidebarOpen(false)}>Dashboard</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal" to="/employee-page" onClick={() => setIsSidebarOpen(false)}>Raise New Card</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal" to="/track-status" onClick={() => setIsSidebarOpen(false)}>Track Status</Link>
                    <Link className="text-[#f48120] text-sm font-medium leading-normal" to="/profile" onClick={() => setIsSidebarOpen(false)}>Settings</Link>
                    <button onClick={logout} className="text-left flex items-center gap-2 text-gray-800 dark:text-gray-300 hover:text-[#f48120] dark:hover:text-[#f48120] text-sm font-medium leading-normal">
                        <LogOut className="h-5 w-5" />
                        Logout
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default Profile;