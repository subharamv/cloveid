import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface DashboardStats {
    inEditing: number;
    awaitingApproval: number;
    approved: number;
    sentForPrinting: number;
    collected: number;
}

export interface BatchCardStats {
    printed: number;
    readyToCollect: number;
    sentForPrinting: number;
    pending: number;
    collected: number;
}

export const useDashboardStats = () => {
    const [stats, setStats] = useState<DashboardStats>({
        inEditing: 0,
        awaitingApproval: 0,
        approved: 0,
        sentForPrinting: 0,
        collected: 0
    });

    const [batchCardStats, setBatchCardStats] = useState<BatchCardStats>({
        printed: 0,
        readyToCollect: 0,
        sentForPrinting: 0,
        pending: 0,
        collected: 0
    });

    const [singleCardStats, setSingleCardStats] = useState<BatchCardStats>({
        printed: 0,
        readyToCollect: 0,
        sentForPrinting: 0,
        pending: 0,
        collected: 0
    });

    const [bulkCardStats, setBulkCardStats] = useState<BatchCardStats>({
        printed: 0,
        readyToCollect: 0,
        sentForPrinting: 0,
        pending: 0,
        collected: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async (silent = false) => {
        if (!silent) {
            setLoading(true);
        }
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

            // Fetch id_cards data
            const { data: idCardsData, error: idCardsError } = await supabase
                .from('id_cards')
                .select('print_status');

            if (requestsError) {
                throw new Error(`Failed to fetch requests: ${requestsError.message}`);
            }

            if (cardDetailsError) {
                throw new Error(`Failed to fetch card details: ${cardDetailsError.message}`);
            }

            if (idCardsError) {
                throw new Error(`Failed to fetch id_cards: ${idCardsError.message}`);
            }

            // Log fetched data for debugging
            console.log('Dashboard stats - Fetched data:', {
                requestsCount: (requestsData || []).length,
                requestsSample: (requestsData || []).slice(0, 2),
                cardDetailsCount: (cardDetailsData || []).length,
                idCardsCount: (idCardsData || []).length
            });

            // Calculate request stats from requests table only (employee card requests)
            const initialStats = {
                inEditing: 0,
                awaitingApproval: 0,
                approved: 0,
                sentForPrinting: 0,
                collected: 0
            };

            const calculatedStats = (requestsData || []).reduce((acc, req) => {
                if (req.print_status === 'collected') {
                    acc.collected++;
                    return acc;
                }

                // Categorize by status and edited flag
                if (req.status === 'Pending' && req.is_edited === false) {
                    acc.inEditing++;
                } else if (req.status === 'Pending' && req.is_edited === true) {
                    acc.awaitingApproval++;
                } else if (req.status === 'Approved') {
                    acc.approved++;
                } else if (req.status === 'Printed') {
                    acc.sentForPrinting++;
                } else if (req.print_status === 'sent_for_printing') {
                    acc.sentForPrinting++;
                } else if (req.print_status === 'ready_to_collect' || req.print_status === 'printed' || req.print_status === 'completed') {
                    acc.sentForPrinting++;
                } else if (!req.status || req.status === '' || req.status === 'Draft') {
                    acc.inEditing++;
                }
                return acc;
            }, { ...initialStats });

            setStats(calculatedStats);

            console.log('Dashboard stats - Calculated request stats:', calculatedStats);

            // Calculate per-table card statistics
            try {
                const queryTable = async (table: string) => {
                    try {
                        const totalRes = await supabase.from(table).select('id', { count: 'exact' }).not('print_status', 'eq', 'collected');
                        const readyRes = await supabase.from(table).select('id', { count: 'exact' }).eq('print_status', 'ready_to_collect');
                        const printedRes = await supabase.from(table).select('id', { count: 'exact' }).in('print_status', ['completed', 'printed']);
                        const sentRes = await supabase.from(table).select('id', { count: 'exact' }).eq('print_status', 'sent_for_printing');
                        const collectedRes = await supabase.from(table).select('id', { count: 'exact' }).eq('print_status', 'collected');

                        if (totalRes.error) console.warn(`counts: failed total for ${table}:`, totalRes.error.message);
                        if (readyRes.error) console.warn(`counts: failed ready for ${table}:`, readyRes.error.message);
                        if (printedRes.error) console.warn(`counts: failed printed for ${table}:`, printedRes.error.message);
                        if (sentRes.error) console.warn(`counts: failed sent for ${table}:`, sentRes.error.message);
                        if (collectedRes.error) console.warn(`counts: failed collected for ${table}:`, collectedRes.error.message);

                        const total = totalRes.count || 0;
                        const ready = readyRes.count || 0;
                        const printed = printedRes.count || 0;
                        const sent = sentRes.count || 0;
                        const collected = collectedRes.count || 0;
                        const pending = Math.max(0, total - (ready + printed + sent));

                        return { printed, readyToCollect: ready, sentForPrinting: sent, pending, collected };
                    } catch (e) {
                        console.error('Error counting table', table, e);
                        return { printed: 0, readyToCollect: 0, sentForPrinting: 0, pending: 0, collected: 0 };
                    }
                };

                const [cardDetailsStats, idCardsStats] = await Promise.all([
                    queryTable('card_details'),
                    queryTable('id_cards'),
                ]);

                setSingleCardStats(cardDetailsStats);
                setBulkCardStats(idCardsStats);
                setBatchCardStats({
                    printed: cardDetailsStats.printed + idCardsStats.printed,
                    readyToCollect: cardDetailsStats.readyToCollect + idCardsStats.readyToCollect,
                    sentForPrinting: cardDetailsStats.sentForPrinting + idCardsStats.sentForPrinting,
                    pending: cardDetailsStats.pending + idCardsStats.pending,
                    collected: cardDetailsStats.collected + idCardsStats.collected,
                });
            } catch (e) {
                console.error('Error computing batch card statistics:', e);
            }

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
            .channel('dashboard-stats')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'requests' },
                () => {
                    console.log('Dashboard stats: Requests table changed, refreshing stats');
                    fetchStats();
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'card_details' },
                () => {
                    console.log('Dashboard stats: Card details table changed, refreshing stats');
                    fetchStats();
                }
            )
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'id_cards' },
                () => {
                    console.log('Dashboard stats: ID cards table changed, refreshing stats');
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
        singleCardStats,
        bulkCardStats,
        loading,
        error,
        refetch: fetchStats
    };
};
