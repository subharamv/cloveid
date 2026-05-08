import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import AppHeader from '../components/AppHeader';
import { toast } from 'sonner';
import { Search, ChevronDown, ChevronRight, Eye, Download, ChevronLeft, AlertCircle } from 'lucide-react';

const PAGE_SIZES = [10, 20, 50];

const BatchManagement = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [batchCards, setBatchCards] = useState<Record<string, any[]>>({});
  const [batchCardsLoading, setBatchCardsLoading] = useState<Record<string, boolean>>({});
  const [cardSearchQueries, setCardSearchQueries] = useState<Record<string, string>>({});
  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_batches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBatches(data || []);
    } catch (err: any) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchCards = async (batchId: string) => {
    if (batchCards[batchId]) return;
    setBatchCardsLoading(prev => ({ ...prev, [batchId]: true }));
    setBatchErrors(prev => ({ ...prev, [batchId]: '' }));
    try {
      const { data, error } = await supabase
        .from('employee_card_details')
        .select('*')
        .eq('batch_id', batchId);

      if (error) throw error;
      setBatchCards(prev => ({ ...prev, [batchId]: data || [] }));
    } catch (err: any) {
      const msg = err?.message || 'Failed to load cards';
      setBatchErrors(prev => ({ ...prev, [batchId]: msg }));
    } finally {
      setBatchCardsLoading(prev => ({ ...prev, [batchId]: false }));
    }
  };

  const toggleBatch = (batchId: string) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
    } else {
      setExpandedBatchId(batchId);
      fetchBatchCards(batchId);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    switch (dateFilter) {
      case 'today':
        return { start, end: now };
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        const yesterdayEnd = new Date(start);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start, end: yesterdayEnd };
      case '7days':
        start.setDate(start.getDate() - 7);
        return { start, end: now };
      case '30days':
        start.setMonth(start.getMonth() - 1);
        return { start, end: now };
      case 'custom':
        return {
          start: customDateStart ? new Date(customDateStart + 'T00:00:00') : null,
          end: customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null,
        };
      default:
        return { start: null, end: null };
    }
  };

  const dateRange = useMemo(() => getDateRange(), [dateFilter, customDateStart, customDateEnd]);

  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const idMatch = b.batch_id?.toLowerCase().includes(q);
        const nameMatch = b.name?.toLowerCase().includes(q);
        if (!idMatch && !nameMatch) return false;
      }
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (dateRange.start && dateRange.end) {
        const created = new Date(b.created_at);
        if (created < dateRange.start || created > dateRange.end) return false;
      } else if (dateRange.start && new Date(b.created_at) < dateRange.start) return false;
      else if (dateRange.end && new Date(b.created_at) > dateRange.end) return false;
      return true;
    });
  }, [batches, searchQuery, statusFilter, dateRange]);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, dateFilter, customDateStart, customDateEnd]);

  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedBatches = filteredBatches.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const statusConfig: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    in_editing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    awaiting_approval: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    sent_for_printing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const printStatusConfig: Record<string, { color: string; label: string }> = {
    not_printed: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300', label: 'Not Printed' },
    sent_for_printing: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'Sent for Printing' },
    printed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Printed' },
    ready_to_collect: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', label: 'Ready to Collect' },
    collected: { color: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400', label: 'Collected' },
  };

  const Badge = ({ status, map }: { status: string; map: Record<string, string> }) => {
    const s = map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${s}`}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    );
  };

  const handleDownload = (card: any) => {
    const url = card.zip_url;
    if (!url) { toast.error('No download link available'); return; }
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(card.name || 'card').replace(/ /g, '_')}_ID_Card.zip`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''} found
            </p>
          </div>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by batch ID or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_editing">In Editing</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="approved">Approved</option>
              <option value="sent_for_printing">Sent for Printing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'today', 'yesterday', '7days', '30days', 'custom'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  dateFilter === key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {key === 'all' ? 'All' : key === 'today' ? 'Today' : key === 'yesterday' ? 'Yesterday' : key === '7days' ? '7 Days' : key === '30days' ? '1 Month' : 'Custom'}
              </button>
            ))}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customDateStart} onChange={(e) => setCustomDateStart(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={customDateEnd} onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex h-[40vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-orange-500 border-t-transparent" />
          </div>
        ) : filteredBatches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <AlertCircle size={32} className="mb-3" />
            <p className="text-sm font-medium">No batches found</p>
            <p className="text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedBatches.map((batch) => {
              const isExpanded = expandedBatchId === batch.batch_id;
              const cards = batchCards[batch.batch_id] || [];
              const cardsLoading = batchCardsLoading[batch.batch_id];
              const batchError = batchErrors[batch.batch_id];
              const cardQuery = cardSearchQueries[batch.batch_id] || '';
              const filteredCards = cards.filter((c: any) => {
                if (!cardQuery) return true;
                const q = cardQuery.toLowerCase();
                return c.name?.toLowerCase().includes(q) || c.employee_id?.toLowerCase().includes(q);
              });

              return (
                <div key={batch.id} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleBatch(batch.batch_id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
                        {batch.name?.charAt(0) || 'B'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{batch.name || batch.batch_id}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <span className="font-mono">{batch.batch_id}</span>
                          <span className="mx-2">·</span>
                          {new Date(batch.created_at).toLocaleDateString()}
                          <span className="mx-2">·</span>
                          {batch.total_cards} card{batch.total_cards !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge status={batch.status} map={statusConfig} />
                      {isExpanded ? <ChevronDown size={18} className="text-gray-400 shrink-0" /> : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-gray-700">
                      {cardsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                        </div>
                      ) : batchError ? (
                        <div className="px-5 py-8 text-center text-sm text-red-500">{batchError}</div>
                      ) : (
                        <>
                          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/30">
                            <div className="relative max-w-xs">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search cards in this batch..."
                                value={cardQuery}
                                onChange={(e) => setCardSearchQueries(prev => ({ ...prev, [batch.batch_id]: e.target.value }))}
                                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                              />
                            </div>
                          </div>

                          {filteredCards.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-gray-400">
                              {cardQuery ? 'No cards match your search.' : 'No cards found in this batch.'}
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-gray-900/30">
                                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
                                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {filteredCards.map((card: any) => {
                                    const pStatus = printStatusConfig[card.print_status || card.card_status];
                                    return (
                                      <tr key={card.card_id || card.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                        <td className="px-5 py-3 text-sm font-medium text-gray-900 dark:text-white">{card.name}</td>
                                        <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{card.employee_id}</td>
                                        <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{card.branch}</td>
                                        <td className="px-5 py-3">
                                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium ${pStatus?.color || 'bg-gray-100 text-gray-800'}`}>
                                            {pStatus?.label || card.card_status || 'Unknown'}
                                          </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                          <div className="flex items-center justify-end gap-1">
                                            <button
                                              onClick={() => navigate(`/single-card?requestId=${card.card_id}`)}
                                              className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                              title="View Card"
                                            >
                                              <Eye size={15} />
                                            </button>
                                            <button
                                              onClick={() => handleDownload(card)}
                                              className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                              title="Download"
                                            >
                                              <Download size={15} />
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {filteredBatches.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Rows per page:</span>
              <select
                value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
              >
                {PAGE_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
              <span className="ml-2">{filteredBatches.length} total</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={safePage === 1}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{'<<'}</button>
              <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
              <span className="px-3 py-1 text-sm font-medium text-gray-900 dark:text-white">Page {safePage} of {totalPages}</span>
              <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
              <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages}
                className="px-2 py-1 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{'>>'}</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default BatchManagement;
