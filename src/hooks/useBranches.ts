import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BRANCHES as STATIC_BRANCHES } from '@/types/employee';

export interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
    updated_at: string;
}

export const useBranches = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBranches();

        const subscription = supabase
            .channel('branches_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'branches' 
            }, () => {
                fetchBranches();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchBranches = async () => {
        try {
            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;
            
            if (data && data.length > 0) {
                setBranches(data);
            } else {
                // Fallback to static branches if DB is empty
                const fallbackBranches: Branch[] = STATIC_BRANCHES.map((name, index) => ({
                    id: `static-${index}`,
                    name,
                    address: '',
                    phone: '',
                    email: '',
                    website: '',
                    updated_at: new Date().toISOString()
                }));
                setBranches(fallbackBranches);
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            // Fallback on error
            const fallbackBranches: Branch[] = STATIC_BRANCHES.map((name, index) => ({
                id: `static-err-${index}`,
                name,
                address: '',
                phone: '',
                email: '',
                website: '',
                updated_at: new Date().toISOString()
            }));
            setBranches(fallbackBranches);
        } finally {
            setLoading(false);
        }
    };

    return { branches, loading, refreshBranches: fetchBranches };
};
