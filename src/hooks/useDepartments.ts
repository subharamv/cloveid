import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Department {
    id: string;
    name: string;
    created_at: string;
}

export const useDepartments = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();

        const subscription = supabase
            .channel('departments_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'departments' 
            }, () => {
                fetchDepartments();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            setDepartments(data || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        } finally {
            setLoading(false);
        }
    };

    return { departments, loading, refreshDepartments: fetchDepartments };
};
