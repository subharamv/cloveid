import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import ViewRequestModal from '../components/ViewRequestModal';
import { toast } from 'sonner';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { Download, XCircle, Eye, Check, Inbox, Archive, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { imageToDataUrl } from '@/lib/utils';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import { jsPDF } from 'jspdf';
import AppHeader from '../components/AppHeader';
import { useSearchParams } from 'react-router-dom';

const VendorDashboard = () => {
    const { user, userRole, loading: authLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');
    const activeTab: 'active' | 'completed' = tabParam === 'completed' ? 'completed' : 'active';
    const [requests, setRequests] = useState<any[]>([]);
    const [viewingRequest, setViewingRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [processingRequest, setProcessingRequest] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom'>('all');
    const [customDateStart, setCustomDateStart] = useState('');
    const [customDateEnd, setCustomDateEnd] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const PAGE_SIZES = [10, 20, 50];

    useEffect(() => {
        const loadLogos = async () => {
            try {
                const frontLogoUrl = await imageToDataUrl(cloveLogo);
                setFrontLogoDataUrl(frontLogoUrl);
                const backLogoUrl = await imageToDataUrl(backLogoSvg);
                setBackLogoDataUrl(backLogoUrl);
            } catch (error) {
                console.error('Error loading logos:', error);
            }
        };
        loadLogos();
    }, []);

    useEffect(() => {
        if (!authLoading && user && userRole === 'vendor') {
            fetchVendorRequests();
            const interval = setInterval(fetchVendorRequests, 30000);
            return () => clearInterval(interval);
        }
    }, [user, authLoading, userRole]);

    const fetchVendorRequests = async () => {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const { data: vendorRequestsData, error: vendorRequestsError } = await supabase
                .from('vendor_requests')
                .select('*')
                .eq('vendor_id', user.id)
                .order('sent_at', { ascending: false })
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);

            if (vendorRequestsError) throw vendorRequestsError;

            if (!vendorRequestsData || vendorRequestsData.length === 0) {
                setRequests([]);
                setLoading(false);
                return;
            }

            const combinedData = vendorRequestsData.map(vr => {
                const details = vr.card_details;
                if (!details) return null;

                return {
                    id: vr.request_id || vr.id,
                    name: details.fullName || details.name,
                    employeeId: details.employeeId,
                    date: new Date(vr.sent_at).toLocaleDateString(),
                    photo: details.photo || details.photo_url,
                    bloodGroup: details.bloodGroup,
                    branch: details.branch,
                    emergencyContact: details.emergencyContact,
                    vendor_request_id: vr.id,
                    vendor_status: vr.status,
                    sent_at: vr.sent_at,
                    zip_url: vr.zip_url,
                    batch_id: vr.batch_id,
                    id_card_id: vr.id_card_id,
                    card_details_id: vr.card_details_id,
                    request_id: vr.request_id,
                    source_table: vr.source_table || (vr.card_details_id ? 'card_details' : 'requests'),
                    card_details: details
                };
            }).filter(Boolean);

            setRequests(combinedData);
        } catch (error) {
            console.error('Error fetching vendor requests:', error);
            toast.error('Failed to fetch requests');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (vendorRequestId: number) => {
        try {
            const { error: vendorError } = await supabase
                .from('vendor_requests')
                .update({ status: 'accepted' })
                .eq('id', vendorRequestId);

            if (vendorError) {
                toast.error(vendorError.message);
                return;
            }

            toast.success('Request accepted! Download is now available.');
            fetchVendorRequests();
        } catch (error) {
            console.error('Error accepting request:', error);
            toast.error('Failed to accept request');
        }
    };

    const handleReject = async (vendorRequestId: number) => {
        try {
            const { error: vendorError } = await supabase
                .from('vendor_requests')
                .update({ status: 'rejected' })
                .eq('id', vendorRequestId);

            if (vendorError) {
                toast.error(vendorError.message);
                return;
            }

            toast.success('Request rejected.');
            fetchVendorRequests();
        } catch (error) {
            console.error('Error rejecting request:', error);
            toast.error('Failed to reject request');
        }
    };

    const handleDownload = async (request: any) => {
        if (request.zip_url) {
            try {
                const link = document.createElement('a');
                link.href = request.zip_url;
                link.download = `${request.name.replace(/ /g, '_')}_ID_Card.zip`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                await updateRequestStatus(request);
                toast.success('ID card downloaded!');
                fetchVendorRequests();
                return;
            } catch (error) {
                console.error('Error downloading ZIP:', error);
                toast.error('Failed to download ZIP file');
            }
        }

        setProcessingRequest(request);
        await supabase
            .from('card_batches')
            .update({ status: 'completed' })
            .eq('batch_id', request.batch_id);
        try {
            const cardElement = document.getElementById(`id-card-${request.id}`);
            if (cardElement) {
                const zip = new JSZip();
                const frontImage = await html2canvas(cardElement.querySelector('.id-card-front') as HTMLElement, {
                    useCORS: true,
                    allowTaint: true,
                    scale: 12
                });
                const backImage = await html2canvas(cardElement.querySelector('.id-card-back') as HTMLElement, {
                    useCORS: true,
                    allowTaint: true,
                    scale: 12
                });
                zip.file(`${request.name}-front.png`, frontImage.toDataURL().split(',')[1], { base64: true });
                zip.file(`${request.name}-back.png`, backImage.toDataURL().split(',')[1], { base64: true });

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'in',
                    format: [2.125, 3.375],
                    compress: false,
                });

                const frontImgData = frontImage.toDataURL('image/png', 1.0);
                const backImgData = backImage.toDataURL('image/png', 1.0);

                pdf.addImage(frontImgData, 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');
                pdf.addPage();
                pdf.addImage(backImgData, 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');

                const pdfBlob = pdf.output('blob');
                zip.file(`${request.name}-id-card.pdf`, pdfBlob);

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `${request.name}-id-card.zip`;
                link.click();

                await updateRequestStatus(request);

                toast.success('ID card downloaded!');
                fetchVendorRequests();
            } else {
                toast.error('Could not find card element to download.');
            }
        } catch (error) {
            console.error('Error generating download:', error);
            toast.error('Failed to download ID card');
        } finally {
            setProcessingRequest(null);
        }
    };

    const updateRequestStatus = async (request: any) => {
        const { error: updateError } = await supabase
            .from('vendor_requests')
            .update({ status: 'completed' })
            .eq('id', request.vendor_request_id);

        if (updateError) console.error('Error updating vendor_requests status:', updateError);

        let sourceTable = request.source_table || 'requests';
        let updateId = request.request_id;

        if (sourceTable === 'card_details' && request.card_details_id) {
            updateId = request.card_details_id;
        } else if (!updateId && request.card_details && request.card_details.id) {
            sourceTable = 'card_details';
            updateId = request.card_details.id;
        }

        if (!request.batch_id && updateId) {
            const { error: recordUpdateError } = await supabase
                .from(sourceTable)
                .update({ status: 'Printed', print_status: 'printed' })
                .eq('id', updateId);
            if (recordUpdateError) console.error(`Error updating ${sourceTable} status:`, recordUpdateError);
        } else if (request.batch_id) {
            const { error: batchUpdateError } = await supabase
                .from(sourceTable)
                .update({ status: 'Printed', print_status: 'printed' })
                .eq('batch_id', request.batch_id);
            if (batchUpdateError) console.error(`Error updating ${sourceTable} batch status:`, batchUpdateError);
        }

        if (request.batch_id) {
            if (request.id_card_id) {
                const { error: bulkUpdateError } = await supabase
                    .from('id_cards')
                    .update({ print_status: 'printed' })
                    .eq('id', request.id_card_id);
                if (bulkUpdateError) console.error('Error updating id_cards print_status:', bulkUpdateError);
            } else {
                const { data: employeeData } = await supabase
                    .from('employees')
                    .select('id')
                    .eq('employee_id', request.employeeId)
                    .single();

                if (employeeData) {
                    const { error: bulkUpdateError } = await supabase
                        .from('id_cards')
                        .update({ print_status: 'printed' })
                        .eq('employee_id', employeeData.id)
                        .eq('batch_id', request.batch_id);

                    if (bulkUpdateError) console.error('Error updating id_cards print_status:', bulkUpdateError);
                }
            }

            const { data: remainingCards } = await supabase
                .from('id_cards')
                .select('id')
                .eq('batch_id', request.batch_id)
                .neq('print_status', 'printed');

            if (!remainingCards || remainingCards.length === 0) {
                await supabase
                    .from('card_batches')
                    .update({ status: 'completed' })
                    .eq('batch_id', request.batch_id);
            }
        }
    };

    useEffect(() => {
        setPage(1);
    }, [searchQuery, dateFilter, customDateStart, customDateEnd, activeTab]);

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
                    end: customDateEnd ? new Date(customDateEnd + 'T23:59:59') : null
                };
            default:
                return { start: null, end: null };
        }
    };

    const dateRange = getDateRange();
    const searchedAndFiltered = requests.filter(r => {
        const tabMatch = activeTab === 'active' ? r.vendor_status !== 'completed' : r.vendor_status === 'completed';
        if (!tabMatch) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const nameMatch = r.name?.toLowerCase().includes(q);
            const idMatch = r.employeeId?.toLowerCase().includes(q);
            const branchMatch = r.branch?.toLowerCase().includes(q);
            if (!nameMatch && !idMatch && !branchMatch) return false;
        }
        if (dateRange.start && dateRange.end) {
            const sentDate = new Date(r.sent_at);
            if (sentDate < dateRange.start || sentDate > dateRange.end) return false;
        } else if (dateRange.start) {
            if (new Date(r.sent_at) < dateRange.start) return false;
        } else if (dateRange.end) {
            if (new Date(r.sent_at) > dateRange.end) return false;
        }
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(searchedAndFiltered.length / perPage));
    const safePage = Math.min(page, totalPages);
    const paginatedRequests = searchedAndFiltered.slice((safePage - 1) * perPage, safePage * perPage);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const StatusBadge = ({ status }: { status: string }) => {
        const config: Record<string, { bg: string; text: string; dot: string }> = {
            sent: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', dot: 'bg-yellow-500' },
            accepted: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', dot: 'bg-green-500' },
            rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', dot: 'bg-red-500' },
            completed: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-400', dot: 'bg-blue-500' },
        };
        const c = config[status] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-800 dark:text-gray-300', dot: 'bg-gray-500' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {status}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
            <AppHeader />
            <main className="p-4 lg:p-6">
                {loading ? (
                        <div className="flex flex-col items-center justify-center h-full py-20">
                            <svg className="animate-spin w-8 h-8 text-primary mb-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-sm text-muted-foreground">Loading requests...</p>
                        </div>
                    ) : (
                        <>
                            {/* Filters */}
                            <div className="mb-4 space-y-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search by name, ID, branch..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {(['all', 'today', 'yesterday', '7days', '30days', 'custom'] as const).map((key) => (
                                        <button
                                            key={key}
                                            onClick={() => setDateFilter(key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                dateFilter === key
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'bg-white dark:bg-gray-900 text-muted-foreground border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            {key === 'all' ? 'All' : key === 'today' ? 'Today' : key === 'yesterday' ? 'Yesterday' : key === '7days' ? '7 Days' : key === '30days' ? '1 Month' : 'Custom'}
                                        </button>
                                    ))}
                                    {dateFilter === 'custom' && (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={customDateStart}
                                                onChange={(e) => setCustomDateStart(e.target.value)}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            />
                                            <span className="text-xs text-muted-foreground">to</span>
                                            <input
                                                type="date"
                                                value={customDateEnd}
                                                onChange={(e) => setCustomDateEnd(e.target.value)}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {searchedAndFiltered.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                        {activeTab === 'active' ? <Inbox size={28} className="text-muted-foreground" /> : <Archive size={28} className="text-muted-foreground" />}
                                    </div>
                                    <p className="text-sm font-medium text-foreground">No {activeTab} requests</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {searchQuery || dateFilter !== 'all' ? 'No results match your filters.' : (activeTab === 'active' ? 'New requests will appear here when sent by admin.' : 'Completed requests will appear here.')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                                                        <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                                                        <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                                                        <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee ID</th>
                                                        <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch</th>
                                                        <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                                                        <th className="py-3.5 px-5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sent At</th>
                                                        <th className="py-3.5 px-5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                                    {paginatedRequests.map((request) => (
                                                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                                            <td className="py-4 px-5 text-sm font-mono text-muted-foreground">{request.id}</td>
                                                            <td className="py-4 px-5 text-sm font-medium text-foreground">{request.name}</td>
                                                            <td className="py-4 px-5 text-sm text-muted-foreground">{request.employeeId}</td>
                                                            <td className="py-4 px-5 text-sm text-muted-foreground">{request.branch}</td>
                                                            <td className="py-4 px-5"><StatusBadge status={request.vendor_status} /></td>
                                                            <td className="py-4 px-5 text-sm text-muted-foreground">{new Date(request.sent_at).toLocaleString()}</td>
                                                            <td className="py-4 px-5 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button
                                                                        onClick={() => setViewingRequest(request)}
                                                                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                                                        title="View"
                                                                    >
                                                                        <Eye size={16} />
                                                                    </button>

                                                                    {request.vendor_status === 'sent' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleAccept(request.vendor_request_id)}
                                                                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                                                            >
                                                                                <Check size={14} />
                                                                                Accept
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleReject(request.vendor_request_id)}
                                                                                className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                                                            >
                                                                                <XCircle size={14} />
                                                                                Reject
                                                                            </button>
                                                                        </>
                                                                    )}

                                                                    {(request.vendor_status === 'accepted' || request.vendor_status === 'completed') && (
                                                                        <button
                                                                            onClick={() => handleDownload(request)}
                                                                            className="p-2 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                                            title="Download"
                                                                        >
                                                                            <Download size={16} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Pagination */}
                                        {searchedAndFiltered.length > 0 && (
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-800">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span>Rows per page:</span>
                                                    <select
                                                        value={perPage}
                                                        onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                                        className="py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                    >
                                                        {PAGE_SIZES.map(size => (
                                                            <option key={size} value={size}>{size}</option>
                                                        ))}
                                                    </select>
                                                    <span className="ml-2">{searchedAndFiltered.length} total</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setPage(1)}
                                                        disabled={safePage === 1}
                                                        className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {'<<'}
                                                    </button>
                                                    <button
                                                        onClick={() => setPage(safePage - 1)}
                                                        disabled={safePage === 1}
                                                        className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                    <span className="px-3 py-1 text-sm text-foreground font-medium">
                                                        Page {safePage} of {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setPage(safePage + 1)}
                                                        disabled={safePage === totalPages}
                                                        className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setPage(totalPages)}
                                                        disabled={safePage === totalPages}
                                                        className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        {'>>'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Mobile Cards */}
                                    <div className="md:hidden space-y-3">
                                        {paginatedRequests.map((request) => (
                                            <div key={request.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 space-y-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-0.5">
                                                        <p className="text-sm font-medium text-foreground">{request.name}</p>
                                                        <p className="text-xs text-muted-foreground">ID: {request.employeeId}</p>
                                                        <p className="text-xs text-muted-foreground">{request.branch}</p>
                                                    </div>
                                                    <StatusBadge status={request.vendor_status} />
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>#{request.id}</span>
                                                    <span>{new Date(request.sent_at).toLocaleString()}</span>
                                                </div>
                                                <div className="flex gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                    <button
                                                        onClick={() => setViewingRequest(request)}
                                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                    >
                                                        <Eye size={14} />
                                                        View
                                                    </button>
                                                    {request.vendor_status === 'sent' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleAccept(request.vendor_request_id)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors"
                                                            >
                                                                <Check size={14} />
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleReject(request.vendor_request_id)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                                                            >
                                                                <XCircle size={14} />
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {(request.vendor_status === 'accepted' || request.vendor_status === 'completed') && (
                                                        <button
                                                            onClick={() => handleDownload(request)}
                                                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
                                                        >
                                                            <Download size={14} />
                                                            Download
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Mobile Pagination */}
                                    {searchedAndFiltered.length > 0 && (
                                        <div className="md:hidden flex flex-col items-center gap-3 mt-4 px-2">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>Rows:</span>
                                                <select
                                                    value={perPage}
                                                    onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                                                    className="py-1 px-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                                >
                                                    {PAGE_SIZES.map(size => (
                                                        <option key={size} value={size}>{size}</option>
                                                    ))}
                                                </select>
                                                <span>{searchedAndFiltered.length} total</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setPage(1)} disabled={safePage === 1} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{'<<'}</button>
                                                <button onClick={() => setPage(safePage - 1)} disabled={safePage === 1} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                                                <span className="px-3 py-1 text-sm text-foreground font-medium">Page {safePage} of {totalPages}</span>
                                                <button onClick={() => setPage(safePage + 1)} disabled={safePage === totalPages} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                                                <button onClick={() => setPage(totalPages)} disabled={safePage === totalPages} className="px-2 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{'>>'}</button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </main>

            {/* View Request Modal */}
            {viewingRequest && (
                <ViewRequestModal
                    request={{
                        id: viewingRequest.id,
                        name: viewingRequest.name,
                        employeeId: viewingRequest.employeeId,
                        date: viewingRequest.date,
                        status: viewingRequest.status || 'Approved',
                        photo: viewingRequest.photo,
                        bloodGroup: viewingRequest.bloodGroup,
                        branch: viewingRequest.branch,
                        emergencyContact: viewingRequest.emergencyContact,
                        vendor_status: viewingRequest.vendor_status,
                        sent_at: viewingRequest.sent_at
                    }}
                    onClose={() => setViewingRequest(null)}
                    onApprove={() => handleAccept(viewingRequest.id)}
                    onReject={() => handleReject(viewingRequest.id)}
                    isVendorView={true}
                    frontLogoSrc={frontLogoDataUrl}
                    backLogoSrc={backLogoDataUrl}
                />
            )}

            {processingRequest && (
                <HiddenCardRenderer
                    id={`id-card-${processingRequest.id}`}
                    employee={{
                        fullName: processingRequest.name,
                        employeeId: processingRequest.employeeId,
                        bloodGroup: processingRequest.bloodGroup,
                        branch: processingRequest.branch,
                        emergencyContact: processingRequest.emergencyContact,
                        photo: processingRequest.photo,
                        countryCode: '+91'
                    }}
                    frontLogoSrc={frontLogoDataUrl}
                    backLogoSrc={backLogoDataUrl}
                />
            )}
        </div>
    );
};

export default VendorDashboard;
