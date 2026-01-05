import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export interface Branding {
    logo_header: string | null;
    logo_id_front: string | null;
    logo_id_back: string | null;
    logo_login: string | null;
    contact_address: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    contact_website: string | null;
}

const DEFAULT_BRANDING: Branding = {
    logo_header: null,
    logo_id_front: null,
    logo_id_back: null,
    logo_login: null,
    contact_address: null,
    contact_phone: null,
    contact_email: null,
    contact_website: null
};

export const useBranding = () => {
    const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBranding();

        // Subscribe to changes
        const subscription = supabase
            .channel('system_settings_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'system_settings' 
            }, () => {
                fetchBranding();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchBranding = async () => {
        try {
            const { data, error } = await supabase
                .from('system_settings')
                .select('key, value');

            if (error) throw error;

            if (data) {
                const newBranding = { ...DEFAULT_BRANDING };
                data.forEach((item: any) => {
                    if (item.key in newBranding) {
                        (newBranding as any)[item.key] = item.value;
                    }
                });
                setBranding(newBranding);
            }
        } catch (error) {
            console.error('Error fetching branding:', error);
        } finally {
            setLoading(false);
        }
    };

    return { branding, loading, refreshBranding: fetchBranding };
};
