import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface DashboardStats {
    inEditing: number;
    awaitingApproval: number;
    approved: number;
    sentForPrinting: number;
}

export interface BatchCardStats {
    printed: number;
    readyToCollect: number;
    sentForPrinting: number;
    pending: number;
}

export const useDashboardStats = () => {
    const [stats, setStats] = useState<DashboardStats>({
        inEditing: 0,
        awaitingApproval: 0,
        approved: 0,
        sentForPrinting: 0
    });

    const [batchCardStats, setBatchCardStats] = useState<BatchCardStats>({
        printed: 0,
        readyToCollect: 0,
        sentForPrinting: 0,
        pending: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Fetch all requests data
            const { data: requestsData, error: requestsError } = await supabase
                .from('requests')
                .select('status, is_edited, print_status');

            // Fetch card_details data
            const { data: cardDetailsData, error: cardDetailsError } = await supabase
                .from('card_details')
                .select('print_status');

            if (requestsError) {
                throw new Error(`Failed to fetch requests: ${requestsError.message}`);
            }

            if (cardDetailsError) {
                throw new Error(`Failed to fetch card details: ${cardDetailsError.message}`);
            }

            // Calculate request stats
            const initialStats = {
                inEditing: 0,
                awaitingApproval: 0,
                approved: 0,
                sentForPrinting: 0
            };

            const calculatedStats = (requestsData || []).reduce((acc, req) => {
                if (req.status === 'Pending' && req.is_edited === false) {
                    acc.inEditing++;
                } else if (req.status === 'Pending' && req.is_edited === true) {
                    acc.awaitingApproval++;
                } else if (req.status === 'Approved') {
                    acc.approved++;
                } else if (req.status === 'Printed' && req.print_status === 'sent_for_printing') {
                    acc.sentForPrinting++;
                }
                return acc;
            }, { ...initialStats });

            setStats(calculatedStats);

            // Calculate batch card statistics based on print_status from both requests and card_details
            const allCards = [
                ...(requestsData || []).filter(req => req.status === 'Approved' || req.status === 'Printed'),
                ...(cardDetailsData || [])
            ];

            const batchCardStatistics = allCards.reduce((acc, card) => {
                if (card.print_status === 'ready_to_collect') {
                    acc.readyToCollect++;
                } else if (card.print_status === 'completed' || card.print_status === 'printed') {
                    acc.printed++;
                } else if (card.print_status === 'sent_for_printing') {
                    acc.sentForPrinting++;
                } else {
                    acc.pending++;
                }
                return acc;
            }, { printed: 0, readyToCollect: 0, sentForPrinting: 0, pending: 0 });

            setBatchCardStats(batchCardStatistics);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard stats';
            setError(errorMessage);
            console.error('Error fetching dashboard stats:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Subscribe to real-time changes
    useEffect(() => {
        const subscription = supabase
            .channel('requests:*')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'requests' },
                () => {
                    console.log('Dashboard stats: Requests table changed, refreshing stats');
                    fetchStats();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [fetchStats]);

    return {
        stats,
        batchCardStats,
        loading,
        error,
        refetch: fetchStats
    };
};
