import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Save, Phone, MapPin, CreditCard, Droplet, Briefcase, X } from 'lucide-react';
import { toast } from 'sonner';
import { BLOOD_GROUPS, DEPARTMENTS } from '@/types/employee';
import { useBranches } from '@/hooks/useBranches';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { branches } = useBranches();
    const [saving, setSaving] = useState(false);
    const [dynamicDepartments, setDynamicDepartments] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        full_name: '',
        employee_id: '',
        branch: '',
        department: '',
        blood_group: '',
        phone: '',
        avatar_url: ''
    });

    useEffect(() => {
        if (!isOpen) return;
        const fetchDepartments = async () => {
            try {
                const { data, error } = await supabase
                    .from('departments')
                    .select('name')
                    .order('name', { ascending: true });

                if (error) throw error;
                if (data) {
                    setDynamicDepartments(data.map(d => d.name));
                }
            } catch (err) {
                console.error('Error fetching departments:', err);
                setDynamicDepartments(DEPARTMENTS);
            }
        };
        fetchDepartments();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) return;

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
                        department: data.department || '',
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
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'employee_id') {
            const numericValue = value.replace(/^CLOVE-/, '');
            setFormData(prev => ({ ...prev, [name]: `CLOVE-${numericValue}` }));
        } else if (name === 'phone') {
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
                    department: formData.department || null,
                    blood_group: formData.blood_group || null,
                    phone: formData.phone || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;

            toast.success('Profile updated successfully');
            onClose();
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-8 sm:pt-16 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl my-8"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Manage Profile</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Update your personal information
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">person</span>
                            Full Name
                        </label>
                        <input
                            type="text"
                            name="full_name"
                            value={formData.full_name}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                                className="w-full pl-[4.5rem] pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                            <option value="">Select Branch</option>
                            {branches.map(branch => (
                                <option key={branch.id} value={branch.name}>{branch.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Briefcase className="h-4 w-4" />
                            Department
                        </label>
                        <select
                            name="department"
                            value={formData.department}
                            onChange={handleChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                            <option value="">Select Department</option>
                            {dynamicDepartments.map(dept => (
                                <option key={dept} value={dept}>{dept}</option>
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
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                                className="w-full pl-14 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                placeholder="9876543210"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-2 w-full px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileModal;
