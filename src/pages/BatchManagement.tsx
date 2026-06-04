import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { deleteDriveFile, extractDriveFileId } from '@/lib/googleDriveFiles';
import AppHeader from '../components/AppHeader';
import { toast } from 'sonner';
import {
  Search, ChevronDown, ChevronRight, Eye, Download, ChevronLeft,
  AlertCircle, Pencil, Box, PackageCheck, Loader2, Send, Trash2,
  Edit3, Clock, CheckCircle2, Printer, Plus,
} from 'lucide-react';
import ViewRequestModal from '../components/ViewRequestModal';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { imageToDataUrl } from '@/lib/utils';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';

const PAGE_SIZES = [10, 20, 50];

const BatchManagement = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('status') || 'all';
  });
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [expandedBatchIds, setExpandedBatchIds] = useState<Set<string>>(new Set());
  const [batchCards, setBatchCards] = useState<Record<string, any[]>>({});
  const [batchCardsLoading, setBatchCardsLoading] = useState<Record<string, boolean>>({});
  const [cardSearchQueries, setCardSearchQueries] = useState<Record<string, string>>({});
  const [batchErrors, setBatchErrors] = useState<Record<string, string>>({});
  const [cardPages, setCardPages] = useState<Record<string, number>>({});
  const [cardPerPage, setCardPerPage] = useState(10);

  const [viewingCard, setViewingCard] = useState<any>(null);
  const [frontLogoDataUrl, setFrontLogoDataUrl] = useState('');
  const [backLogoDataUrl, setBackLogoDataUrl] = useState('');

  // Selection: batchId → Set of card_id strings
  const [selectedCards, setSelectedCards] = useState<Record<string, Set<string>>>({});

  // Vendor / send to print
  const [vendors, setVendors] = useState<any[]>([]);
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [processingCard, setProcessingCard] = useState<any | null>(null);
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);

  useEffect(() => {
    const loadLogos = async () => {
      try {
        const [front, back] = await Promise.all([imageToDataUrl(cloveLogo), imageToDataUrl(backLogoSvg)]);
        setFrontLogoDataUrl(front);
        setBackLogoDataUrl(back);
      } catch (e) { console.error('Error loading logos:', e); }
    };
    loadLogos();
    fetchVendors();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('status');
    if (s) setStatusFilter(s);
  }, [location.search]);

  useEffect(() => { fetchBatches(); }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('card_batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBatches(data || []);
    } catch {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!searchQuery) {
      setCardSearchQueries({});
      setExpandedBatchIds(new Set());
      return;
    }
    const q = searchQuery.toLowerCase();
    batches.forEach(b => {
      const cards = batchCards[b.batch_id];
      if (!cards || cards.length === 0) return;
      const hasMatch = cards.some((c: any) =>
        c.name?.toLowerCase().includes(q) ||
        c.employee_id?.toLowerCase().includes(q) ||
        c.branch?.toLowerCase().includes(q)
      );
      if (hasMatch) {
        setExpandedBatchIds(prev => { if (prev.has(b.batch_id)) return prev; const next = new Set(prev); next.add(b.batch_id); return next; });
        setCardSearchQueries(prev => { if (prev[b.batch_id]) return prev; return { ...prev, [b.batch_id]: searchQuery }; });
      }
    });
  }, [searchQuery, batchCards]);

  const fetchVendors = async () => {
    const { data, error } = await supabase.from('vendors').select('id,name');
    if (!error) setVendors(data || []);
  };

  const fetchBatchCards = async (batchId: string, force = false) => {
    if (batchCards[batchId] && !force) return;
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
      setBatchErrors(prev => ({ ...prev, [batchId]: err?.message || 'Failed to load cards' }));
    } finally {
      setBatchCardsLoading(prev => ({ ...prev, [batchId]: false }));
    }
  };

  const toggleBatch = (batchId: string) => {
    setExpandedBatchIds(prev => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId); else next.add(batchId);
      return next;
    });
    fetchBatchCards(batchId);
  };

  const getDateRange = () => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    switch (dateFilter) {
      case 'today': return { start, end: now };
      case 'yesterday': {
        start.setDate(start.getDate() - 1);
        const end = new Date(start); end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case '7days': start.setDate(start.getDate() - 7); return { start, end: now };
      case '30days': start.setMonth(start.getMonth() - 1); return { start, end: now };
      case 'custom': return {
        start: customDateStart ? new Date(customDateStart + 'T00:00:00') : null,
        end: customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null,
      };
      default: return { start: null, end: null };
    }
  };

  const dateRange = useMemo(() => getDateRange(), [dateFilter, customDateStart, customDateEnd]);

  const filteredBatches = useMemo(() => batches.filter(b => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const batchMatch = b.batch_id?.toLowerCase().includes(q) || b.name?.toLowerCase().includes(q);
      if (batchMatch) return true;
      const cards = batchCards[b.batch_id] || [];
      if (cards.length > 0) {
        return cards.some((c: any) =>
          c.name?.toLowerCase().includes(q) ||
          c.employee_id?.toLowerCase().includes(q) ||
          c.branch?.toLowerCase().includes(q)
        );
      }
      return false;
    }
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (dateRange.start && dateRange.end) {
      const c = new Date(b.created_at);
      if (c < dateRange.start || c > dateRange.end) return false;
    } else if (dateRange.start && new Date(b.created_at) < dateRange.start) return false;
    else if (dateRange.end && new Date(b.created_at) > dateRange.end) return false;
    return true;
  }), [batches, searchQuery, statusFilter, dateRange, batchCards]);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter, dateFilter, customDateStart, customDateEnd]);

  const totalPages = Math.max(1, Math.ceil(filteredBatches.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginatedBatches = filteredBatches.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  // Selection helpers
  const getSelected = (batchId: string): Set<string> => selectedCards[batchId] || new Set();

  const setSelected = (batchId: string, set: Set<string>) =>
    setSelectedCards(prev => ({ ...prev, [batchId]: set }));

  const handleSelectAll = (batchId: string, cards: any[], checked: boolean) => {
    const next = new Set<string>();
    if (checked) cards.forEach(c => next.add(String(c.card_id)));
    setSelected(batchId, next);
  };

  const handleSelectCard = (batchId: string, cardId: string) => {
    const set = new Set(getSelected(batchId));
    if (set.has(cardId)) set.delete(cardId); else set.add(cardId);
    setSelected(batchId, set);
  };

  // Status configs
  const batchStatusConfig: Record<string, string> = {
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

  const Badge = ({ status, map }: { status: string; map: Record<string, string> }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
    </span>
  );

  const statsData = [
    { label: 'Pending', key: 'pending', icon: Clock, color: 'from-amber-400 to-amber-600', count: batches.filter(b => b.status === 'pending').length },
    { label: 'In Editing', key: 'in_editing', icon: Edit3, color: 'from-orange-400 to-orange-600', count: batches.filter(b => b.status === 'in_editing').length },
    { label: 'Awaiting Approval', key: 'awaiting_approval', icon: AlertCircle, color: 'from-amber-400 to-amber-600', count: batches.filter(b => b.status === 'awaiting_approval').length },
    { label: 'Approved', key: 'approved', icon: CheckCircle2, color: 'from-emerald-400 to-emerald-600', count: batches.filter(b => b.status === 'approved').length },
    { label: 'Sent for Printing', key: 'sent_for_printing', icon: Printer, color: 'from-blue-400 to-blue-600', count: batches.filter(b => b.status === 'sent_for_printing').length },
    { label: 'Completed', key: 'completed', icon: PackageCheck, color: 'from-green-400 to-green-600', count: batches.filter(b => b.status === 'completed').length },
  ];

  const getCardPhoto = (card: any) => {
    if (card.photo_url && typeof card.photo_url === 'string' && !card.photo_url.startsWith('blob:') && !card.photo_url.includes('image/fetch/') && (card.photo_url.startsWith('http') || card.photo_url.startsWith('data:'))) return card.photo_url;
    const d = card.card_data || {};
    const photoKey = Object.keys(d).find(k => {
      const lk = k.toLowerCase();
      return lk === 'photo' || lk === 'photo (upload)' || lk === 'image' || lk === 'photo_url';
    });
    if (photoKey) {
      const val = d[photoKey];
      if (typeof val === 'string' && !val.startsWith('blob:') && !val.includes('image/fetch/') && (val.startsWith('http') || val.startsWith('data:'))) return val;
    }
    return '';
  };

  // Card actions
  const handleDownload = (card: any) => {
    if (!card.zip_url) { toast.error('No download link available'); return; }
    const a = document.createElement('a');
    a.href = card.zip_url;
    a.download = `${(card.name || 'card').replace(/ /g, '_')}_ID_Card.zip`;
    a.click();
  };

  const handleMarkAsDone = async (card: any) => {
    try {
      const { error } = await supabase.from('id_cards')
        .update({ print_status: 'ready_to_collect', status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', card.card_id);
      if (error) throw error;
      toast.success('Card marked as ready to collect');
      fetchBatchCards(card.batch_id, true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark as done');
    }
  };

  const handleMarkAsCollected = async (card: any) => {
    try {
      const { error } = await supabase.from('id_cards')
        .update({ print_status: 'collected', updated_at: new Date().toISOString() })
        .eq('id', card.card_id);
      if (error) throw error;
      toast.success('Card marked as collected');
      fetchBatchCards(card.batch_id, true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark as collected');
    }
  };

  const handleDeleteCard = async (card: any) => {
    if (!window.confirm('Delete this card?')) return;
    try {
      const fileId = extractDriveFileId(card.zip_url);
      if (fileId) deleteDriveFile(fileId).catch(err => console.warn('Drive delete failed:', err));
      const { error } = await supabase.from('id_cards').delete().eq('id', card.card_id);
      if (error) throw error;
      toast.success('Card deleted');
      setBatchCards(prev => ({
        ...prev,
        [card.batch_id]: (prev[card.batch_id] || []).filter(c => c.card_id !== card.card_id),
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete card');
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm('Delete this entire batch? This cannot be undone.')) return;
    try {
      const cards = batchCards[batchId] || [];
      cards.forEach(card => {
        const fileId = extractDriveFileId(card.zip_url);
        if (fileId) deleteDriveFile(fileId).catch(err => console.warn('Drive delete failed:', err));
      });
      const { error: cardsErr } = await supabase.from('id_cards').delete().eq('batch_id', batchId);
      if (cardsErr) throw cardsErr;
      const { error: batchErr } = await supabase.from('card_batches').delete().eq('batch_id', batchId);
      if (batchErr) throw batchErr;
      toast.success('Batch deleted');
      setBatches(prev => prev.filter(b => b.batch_id !== batchId));
      setExpandedBatchIds(prev => { const next = new Set(prev); next.delete(batchId); return next; });
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete batch');
    }
  };

  const handlePrintCompleted = async (batchId: string) => {
    const sel = getSelected(batchId);
    if (sel.size === 0) { toast.error('No cards selected'); return; }
    const ids = Array.from(sel).map(Number);
    try {
      await Promise.all(ids.map(id =>
        supabase.from('id_cards').update({ status: 'printed', print_status: 'printed', updated_at: new Date().toISOString() }).eq('id', id)
      ));
      const allCards = batchCards[batchId] || [];
      const remaining = allCards.filter(c =>
        !sel.has(String(c.card_id)) &&
        !['printed', 'ready_to_collect', 'collected'].includes(c.print_status)
      );
      if (remaining.length === 0) {
        await supabase.from('card_batches').update({ status: 'completed' }).eq('batch_id', batchId);
        setBatches(prev => prev.map(b => b.batch_id === batchId ? { ...b, status: 'completed' } : b));
      }
      toast.success(`${sel.size} card(s) marked as printed`);
      setSelected(batchId, new Set());
      fetchBatchCards(batchId, true);
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark as printed');
    }
  };

  const handleDeleteSelected = async (batchId: string) => {
    const sel = getSelected(batchId);
    if (sel.size === 0) { toast.error('No cards selected'); return; }
    if (!window.confirm(`Delete ${sel.size} selected card(s)?`)) return;
    try {
      const ids = Array.from(sel).map(Number);
      const cards = batchCards[batchId] || [];
      cards.forEach(card => {
        if (sel.has(String(card.card_id))) {
          const fileId = extractDriveFileId(card.zip_url);
          if (fileId) deleteDriveFile(fileId).catch(err => console.warn('Drive delete failed:', err));
        }
      });
      const { error } = await supabase.from('id_cards').delete().in('id', ids);
      if (error) throw error;
      toast.success(`Deleted ${sel.size} card(s)`);
      setBatchCards(prev => ({
        ...prev,
        [batchId]: (prev[batchId] || []).filter(c => !sel.has(String(c.card_id))),
      }));
      setSelected(batchId, new Set());
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete cards');
    }
  };

  const handleBulkDownload = async (batchId: string) => {
    const sel = getSelected(batchId);
    if (sel.size === 0) { toast.error('No cards selected'); return; }
    const cards = (batchCards[batchId] || []).filter(c => sel.has(String(c.card_id)));
    const master = new JSZip();
    let hasFiles = false;
    for (const card of cards) {
      if (card.zip_url) {
        try {
          const resp = await fetch(card.zip_url);
          if (!resp.ok) continue;
          const blob = await resp.blob();
          const inner = await new JSZip().loadAsync(blob);
          inner.forEach((path, file) => {
            if (!file.dir) master.file(`${card.name}/${path}`, file.async('blob'));
          });
          hasFiles = true;
        } catch { toast.error(`Failed to fetch ZIP for ${card.name}`); }
      }
    }
    if (!hasFiles) { toast.error('No ZIP files available for selected cards'); return; }
    const blob = await master.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Batch_${batchId}_Cards.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Download started');
  };

  // Send to print
  const handleOpenSendToPrint = (batchId: string, singleCard?: any) => {
    if (singleCard) {
      setSelected(batchId, new Set([String(singleCard.card_id)]));
    } else if (getSelected(batchId).size === 0) {
      toast.error('Select at least one card');
      return;
    }
    setPendingBatchId(batchId);
    setIsVendorModalOpen(true);
  };

  const confirmSendToPrint = async () => {
    if (!selectedVendorId || !pendingBatchId) { toast.error('Select a vendor'); return; }
    const sel = getSelected(pendingBatchId);
    const cards = (batchCards[pendingBatchId] || []).filter(c => sel.has(String(c.card_id)));
    if (cards.length === 0) return;

    setIsDownloading(true);
    const recordsToInsert: any[] = [];

    for (const card of cards) {
      setProcessingCard(card);
      await new Promise(r => setTimeout(r, 400));

      let front_image_url = '';
      let back_image_url = '';

      if (!card.zip_url) {
        const el = document.getElementById(`id-card-${card.card_id}`);
        if (el) {
          try {
            const fc = await html2canvas(el.querySelector('.id-card-front') as HTMLElement, { scale: 12, useCORS: true, allowTaint: true });
            const bc = await html2canvas(el.querySelector('.id-card-back') as HTMLElement, { scale: 12, useCORS: true, allowTaint: true });
            const upload = async (path: string, dataUrl: string) => {
              const blob = await (await fetch(dataUrl)).blob();
              const { error } = await supabase.storage.from('id-card-images').upload(path, blob, { upsert: true });
              if (error) throw error;
              return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
            };
            [front_image_url, back_image_url] = await Promise.all([
              upload(`public/batch-${pendingBatchId}-${card.card_id}-front.png`, fc.toDataURL('image/png')),
              upload(`public/batch-${pendingBatchId}-${card.card_id}-back.png`, bc.toDataURL('image/png')),
            ]);
          } catch (e) { console.error('Image generation error:', e); }
        }
      }

      recordsToInsert.push({
        vendor_id: selectedVendorId,
        id_card_id: card.card_id,
        front_image_url: front_image_url || null,
        back_image_url: back_image_url || null,
        zip_url: card.zip_url || null,
        card_details: {
          fullName: card.name,
          employeeId: card.employee_id,
          bloodGroup: card.blood_group || '',
          branch: card.branch || '',
          emergencyContact: card.emergency_contact || '',
          photo: getCardPhoto(card),
          countryCode: '+91',
        },
        status: 'sent',
        sent_at: new Date().toISOString(),
        batch_id: pendingBatchId,
      });

      await supabase.from('id_cards')
        .update({ status: 'sent_for_printing', print_status: 'sent_for_printing' })
        .eq('id', card.card_id);
    }

    const { error } = await supabase.from('vendor_requests').insert(recordsToInsert);
    if (error) {
      toast.error('Failed to send to vendor');
    } else {
      const allCards = batchCards[pendingBatchId] || [];
      const remaining = allCards.filter(c =>
        !sel.has(String(c.card_id)) &&
        !['sent_for_printing', 'printed', 'ready_to_collect', 'collected'].includes(c.print_status)
      );
      if (remaining.length === 0) {
        await supabase.from('card_batches')
          .update({ status: 'sent_for_printing', sent_for_printing_at: new Date().toISOString() })
          .eq('batch_id', pendingBatchId);
        setBatches(prev => prev.map(b => b.batch_id === pendingBatchId ? { ...b, status: 'sent_for_printing' } : b));
      }
      toast.success('Sent to vendor successfully!');
      setSelected(pendingBatchId, new Set());
      fetchBatchCards(pendingBatchId, true);
    }

    setIsDownloading(false);
    setProcessingCard(null);
    setIsVendorModalOpen(false);
    setSelectedVendorId(null);
    setPendingBatchId(null);
  };

  const handleEditCard = (card: any) => {
    const cardData = card.card_data || {};
    const cardHeaders = Object.keys(cardData).filter((h: string) => h !== 'zip_url' && h.toLowerCase() !== 'photo_url');
    const rowData = cardHeaders.map((h: string) => cardData[h]);
    navigate('/bulk-card-editor', {
      state: {
        rowData, headers: cardHeaders, rowIndex: 0, csvData: [rowData],
        zipUrls: card.zip_url ? { 0: card.zip_url } : {},
        cardIds: { 0: card.card_id }, cardId: card.card_id,
        batchId: card.batch_id,
        cardPrintStatuses: { 0: card.print_status || card.card_status || 'pending' },
      },
    });
  };

  const getCardField = (card: any, field: string) => {
    if (card[field]) return card[field];
    const d = card.card_data || {};
    const lk = field.toLowerCase().replace(/_/g, ' ');
    const key = Object.keys(d).find(k => k.toLowerCase().trim() === lk || k.toLowerCase().trim().replace(/\s+/g, '_') === field.toLowerCase());
    return key ? d[key] : '';
  };

  const handleViewCard = (card: any) => {
    setViewingCard({
      id: card.card_id,
      name: card.name,
      employeeId: card.employee_id,
      date: new Date(card.card_created_at).toLocaleDateString(),
      status: card.card_status || 'Pending',
      photo: getCardPhoto(card),
      bloodGroup: getCardField(card, 'blood_group') || getCardField(card, 'blood group') || '',
      branch: getCardField(card, 'branch') || '',
      emergencyContact: getCardField(card, 'emergency_contact') || getCardField(card, 'emergency contact') || '',
      batchId: card.batch_id,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
              <ChevronLeft size={18} /> <span className="hidden md:inline">Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Batch Management</h1>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <button
            onClick={() => navigate('/bulk-card-import')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
          >
            <Plus size={15} /> New Batch
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {statsData.map(stat => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={() => setStatusFilter(statusFilter === stat.key ? 'all' : stat.key)}
                className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-4 hover:shadow-md transition-all text-left ${
                  statusFilter === stat.key
                    ? 'border-orange-300 dark:border-orange-700 ring-1 ring-orange-200 dark:ring-orange-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-sm`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search by batch ID or name..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['all', 'today', 'yesterday', '7days', '30days', 'custom'] as const).map(key => (
              <button key={key} onClick={() => setDateFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  dateFilter === key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}>
                {key === 'all' ? 'All' : key === 'today' ? 'Today' : key === 'yesterday' ? 'Yesterday' : key === '7days' ? '7 Days' : key === '30days' ? '1 Month' : 'Custom'}
              </button>
            ))}
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2">
                <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
              </div>
            )}
          </div>
        </div>

        {/* Batch list */}
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
            {paginatedBatches.map(batch => {
              const isExpanded = expandedBatchIds.has(batch.batch_id);
              const cards = batchCards[batch.batch_id] || [];
              const cardsLoading = batchCardsLoading[batch.batch_id];
              const batchError = batchErrors[batch.batch_id];
              const cardQuery = cardSearchQueries[batch.batch_id] || '';
              const filteredCards = cards.filter((c: any) => {
                if (!cardQuery) return true;
                const q = cardQuery.toLowerCase();
                const nameMatch = c.name?.toLowerCase().includes(q);
                const idMatch = c.employee_id?.toLowerCase().includes(q);
                const branchMatch = c.branch?.toLowerCase().includes(q);
                if (nameMatch || idMatch || branchMatch) return true;
                const d = c.card_data || {};
                return Object.values(d).some((v: any) =>
                  typeof v === 'string' && v.toLowerCase().includes(q)
                );
              });
              const sel = getSelected(batch.batch_id);

              return (
                <div key={batch.id} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                  {/* Batch header row */}
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                    <button onClick={() => toggleBatch(batch.batch_id)} className="flex items-center gap-4 min-w-0 flex-1 text-left">
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
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge status={batch.status} map={batchStatusConfig} />
                      <button onClick={() => handleDeleteBatch(batch.batch_id)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete Batch">
                        <Trash2 size={15} />
                      </button>
                      <button onClick={() => toggleBatch(batch.batch_id)} className="p-1">
                        {isExpanded
                          ? <ChevronDown size={18} className="text-gray-400 shrink-0" />
                          : <ChevronRight size={18} className="text-gray-400 shrink-0" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded cards */}
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
                          {/* Card toolbar */}
                          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/30 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
                            <div className="relative w-full sm:max-w-xs">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input type="text" placeholder="Search cards..." value={cardQuery}
                                onChange={e => {
                                  setCardSearchQueries(prev => ({ ...prev, [batch.batch_id]: e.target.value }));
                                  setCardPages(p => ({ ...p, [batch.batch_id]: 1 }));
                                }}
                                className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none" />
                            </div>
                            {sel.size > 0 && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{sel.size} selected</span>
                                <button onClick={() => handleBulkDownload(batch.batch_id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                                  <Download size={13} /> Download
                                </button>
                                <button onClick={() => handleOpenSendToPrint(batch.batch_id)} disabled={isDownloading}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50">
                                  {isDownloading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                                  Send to Print
                                </button>
                                <button onClick={() => handlePrintCompleted(batch.batch_id)} disabled={isDownloading}
                                  title="Mark as printed without sending to vendor (offline/out-of-network)"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-50">
                                  <CheckCircle2 size={13} />
                                  Print Completed
                                </button>
                                <button onClick={() => handleDeleteSelected(batch.batch_id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>

                          {filteredCards.length === 0 ? (
                            <div className="px-5 py-8 text-center text-sm text-gray-400">
                              {cardQuery ? 'No cards match your search.' : 'No cards found in this batch.'}
                            </div>
                          ) : (
                            (() => {
                              const cp = cardPages[batch.batch_id] || 1;
                              const totalCp = Math.max(1, Math.ceil(filteredCards.length / cardPerPage));
                              const safeCp = Math.min(cp, totalCp);
                              const paginatedCards = filteredCards.slice((safeCp - 1) * cardPerPage, safeCp * cardPerPage);
                              const allSelected = filteredCards.length > 0 && filteredCards.every((c: any) => sel.has(String(c.card_id)));
                              return (
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="bg-gray-50 dark:bg-gray-900/30">
                                        <th className="px-4 py-2.5 w-10">
                                          <input type="checkbox" checked={allSelected}
                                            onChange={e => handleSelectAll(batch.batch_id, filteredCards, e.target.checked)}
                                            className="rounded border-gray-300 dark:border-gray-600" />
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Branch</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Photo</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                      {paginatedCards.map((card: any) => {
                                        const pStatus = printStatusConfig[card.print_status || card.card_status];
                                        const photo = getCardPhoto(card);
                                        const isSelected = sel.has(String(card.card_id));
                                        return (
                                          <tr key={card.card_id || card.id}
                                            className={`transition-colors ${isSelected ? 'bg-orange-50 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'}`}>
                                            <td className="px-4 py-3">
                                              <input type="checkbox" checked={isSelected}
                                                onChange={() => handleSelectCard(batch.batch_id, String(card.card_id))}
                                                className="rounded border-gray-300 dark:border-gray-600" />
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{card.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{card.employee_id}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{card.branch}</td>
                                            <td className="px-4 py-3">
                                              {photo ? (
                                                <img src={photo} alt="" className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 object-cover" onError={e => e.currentTarget.classList.add('hidden')} />
                                              ) : (
                                                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">-</div>
                                              )}
                                            </td>
                                            <td className="px-4 py-3">
                                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-medium ${pStatus?.color || 'bg-gray-100 text-gray-800'}`}>
                                                {pStatus?.label || card.card_status || 'Unknown'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                              <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleViewCard(card)} title="View"
                                                  className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                                                  <Eye size={14} />
                                                </button>
                                                <button onClick={() => handleEditCard(card)} title="Edit"
                                                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                  <Pencil size={14} />
                                                </button>
                                                {card.zip_url && (
                                                  <button onClick={() => handleDownload(card)} title="Download"
                                                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors">
                                                    <Download size={14} />
                                                  </button>
                                                )}
                                                {!['sent_for_printing', 'printed', 'ready_to_collect', 'collected'].includes(card.print_status) && (
                                                  <button onClick={() => handleOpenSendToPrint(batch.batch_id, card)} title="Send to Print"
                                                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                                    <Send size={14} />
                                                  </button>
                                                )}
                                                {card.print_status === 'printed' && (
                                                  <button onClick={() => handleMarkAsDone(card)} title="Mark as Ready to Collect"
                                                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors">
                                                    <Box size={14} />
                                                  </button>
                                                )}
                                                {card.print_status === 'ready_to_collect' && (
                                                  <button onClick={() => handleMarkAsCollected(card)} title="Mark as Collected"
                                                    className="p-1.5 text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors">
                                                    <PackageCheck size={14} />
                                                  </button>
                                                )}
                                                <button onClick={() => handleDeleteCard(card)} title="Delete"
                                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                                  <Trash2 size={14} />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  {totalCp > 1 && (
                                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                      <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>Rows:</span>
                                        <select value={cardPerPage}
                                          onChange={e => { setCardPerPage(Number(e.target.value)); setCardPages(p => ({ ...p, [batch.batch_id]: 1 })); }}
                                          className="py-1 px-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs">
                                          {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                        <span>{filteredCards.length} total</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs">
                                        <button onClick={() => setCardPages(p => ({ ...p, [batch.batch_id]: 1 }))} disabled={safeCp <= 1}
                                          className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700">&#171;</button>
                                        <button onClick={() => setCardPages(p => ({ ...p, [batch.batch_id]: safeCp - 1 }))} disabled={safeCp <= 1}
                                          className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700">&#8249;</button>
                                        <span className="px-2 text-gray-700 dark:text-gray-300">Page {safeCp} of {totalCp}</span>
                                        <button onClick={() => setCardPages(p => ({ ...p, [batch.batch_id]: safeCp + 1 }))} disabled={safeCp >= totalCp}
                                          className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700">&#8250;</button>
                                        <button onClick={() => setCardPages(p => ({ ...p, [batch.batch_id]: totalCp }))} disabled={safeCp >= totalCp}
                                          className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-gray-700">&#187;</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()
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

        {/* Batch pagination */}
        {filteredBatches.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span>Rows per page:</span>
              <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                className="py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none">
                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
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

      {/* View Card Modal */}
      {viewingCard && (
        <ViewRequestModal
          request={viewingCard}
          onClose={() => setViewingCard(null)}
          onEdit={() => {
            const card = Object.values(batchCards).flat().find((c: any) => c.card_id === viewingCard.id);
            if (card) handleEditCard(card as any);
            setViewingCard(null);
          }}
          frontLogoSrc={frontLogoDataUrl}
          backLogoSrc={backLogoDataUrl}
        />
      )}

      {/* Vendor Modal */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 bg-gray-800/50 z-40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Send to Print</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Select a vendor to send {pendingBatchId ? getSelected(pendingBatchId).size : 0} card(s) for printing.
              </p>
              <select value={selectedVendorId || ''} onChange={e => setSelectedVendorId(e.target.value)}
                className="w-full p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none mb-5">
                <option value="" disabled>Select a vendor</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setIsVendorModalOpen(false); setSelectedVendorId(null); setPendingBatchId(null); }}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancel
                </button>
                <button onClick={confirmSendToPrint} disabled={!selectedVendorId || isDownloading}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors">
                  {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  {isDownloading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden card renderer for image generation when no zip_url */}
      {processingCard && (
        <HiddenCardRenderer
          id={`id-card-${processingCard.card_id}`}
          employee={{
            fullName: processingCard.name,
            employeeId: processingCard.employee_id,
            bloodGroup: processingCard.blood_group || '',
            branch: processingCard.branch || '',
            emergencyContact: processingCard.emergency_contact || '',
            photo: getCardPhoto(processingCard),
            countryCode: '+91',
          }}
          frontLogoSrc={frontLogoDataUrl}
          backLogoSrc={backLogoDataUrl}
        />
      )}
    </div>
  );
};

export default BatchManagement;
