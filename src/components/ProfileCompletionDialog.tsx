import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { useBranches } from '@/hooks/useBranches';
import { BLOOD_GROUPS, DEPARTMENTS } from '@/types/employee';
import { toast } from 'sonner';
import { X, AlertCircle, Save, Phone, MapPin, Droplet, Briefcase, CheckCircle } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = {
    designation: 'Designation',
    blood_group: 'Blood Group',
    branch: 'Branch',
    department: 'Department',
    phone: 'Phone Number',
};

const ProfileCompletionDialog: React.FC = () => {
    const { profile, missingProfileFields, refreshProfile } = useAuth();
    const { branches } = useBranches();
    const [saving, setSaving] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [dynamicDepartments, setDynamicDepartments] = useState<string[]>([]);

    const [formData, setFormData] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        missingProfileFields.forEach((f) => {
            initial[f] = profile?.[f] || '';
        });
        return initial;
    });

    React.useEffect(() => {
        const fetchDepts = async () => {
            try {
                const { data, error } = await supabase
                    .from('departments')
                    .select('name')
                    .order('name', { ascending: true });
                if (error) throw error;
                if (data) setDynamicDepartments(data.map((d) => d.name));
            } catch {
                setDynamicDepartments(DEPARTMENTS);
            }
        };
        if (missingProfileFields.includes('department')) fetchDepts();
    }, [missingProfileFields]);

    const isOpen = missingProfileFields.length > 0 && !dismissed;
    if (!isOpen) return null;

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const updateData: Record<string, string | null> = { updated_at: new Date().toISOString() };
            missingProfileFields.forEach((f) => {
                updateData[f] = formData[f] || null;
            });

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', profile.id);

            if (error) throw error;

            toast.success('Profile updated successfully');
            setDismissed(true);
            refreshProfile();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const totalFields = missingProfileFields.length;
    const completedCount = Object.values(formData).filter(Boolean).length;

    const renderField = (field: string) => {
        const commonProps = {
            value: formData[field] || '',
            onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
                handleChange(field, e.target.value),
            className:
                'w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all',
        };

        if (field === 'branch') {
            return (
                <select {...commonProps}>
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                        <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                </select>
            );
        }

        if (field === 'department') {
            return (
                <select {...commonProps}>
                    <option value="">Select Department</option>
                    {dynamicDepartments.map((d) => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </select>
            );
        }

        if (field === 'blood_group') {
            return (
                <select {...commonProps}>
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                    ))}
                </select>
            );
        }

        if (field === 'phone') {
            return (
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium select-none pointer-events-none">+91</span>
                    <input
                        type="tel"
                        {...commonProps}
                        className={`${commonProps.className} pl-14`}
                        placeholder="9876543210"
                    />
                </div>
            );
        }

        return <input type="text" {...commonProps} placeholder={`Enter your ${FIELD_LABELS[field]?.toLowerCase() || field}`} />;
    };

    const getIcon = (field: string) => {
        switch (field) {
            case 'designation': return <Briefcase size={16} />;
            case 'blood_group': return <Droplet size={16} />;
            case 'branch': return <MapPin size={16} />;
            case 'department': return <Briefcase size={16} />;
            case 'phone': return <Phone size={16} />;
            default: return <AlertCircle size={16} />;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-8 sm:pt-16 overflow-y-auto">
            <div
                className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl my-8"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={20} className="text-amber-500" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete Your Profile</h2>
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Please fill in the missing fields to complete your profile.
                    </p>
                </div>

                {/* Progress */}
                <div className="mb-5 flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${(completedCount / totalFields) * 100}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                        {completedCount}/{totalFields}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {missingProfileFields.map((field) => (
                        <div key={field} className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                {getIcon(field)}
                                {FIELD_LABELS[field] || field}
                                <span className="text-red-400">*</span>
                            </label>
                            {renderField(field)}
                        </div>
                    ))}

                    <div className="pt-3 flex flex-col gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center gap-2 w-full px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save & Continue'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setDismissed(true)}
                            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-center"
                        >
                            Remind me later
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileCompletionDialog;
