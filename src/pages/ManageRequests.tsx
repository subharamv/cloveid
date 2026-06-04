import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';
import ViewRequestModal from '../components/ViewRequestModal';
import { useBranches } from '../hooks/useBranches';
import { supabase } from '@/lib/supabaseClient';
import { deleteDriveFile, extractDriveFileId } from '@/lib/googleDriveFiles';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { useDownloadZip } from '../hooks/useDownloadZip';
import { imageToDataUrl } from '@/lib/utils';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { Eye, Pencil, Download, Box, Search, ChevronLeft, ChevronRight, Edit3, Clock, CheckCircle2, Printer, Package, XCircle, Trash2, Send, Loader2 } from 'lucide-react';

import AppHeader from '../components/AppHeader';

import html2canvas from 'html2canvas';

interface Request {
    id: number;
    name: string;
    employeeId: string;
    date: string;
    status: string;
    photo: string;
    photo_url?: string;
    bloodGroup: string;
    branch: string;
    emergencyContact: string;
    created_at: string;
    updated_at?: string;
    batch_id?: string;
    is_edited?: boolean;
    print_status?: string;
    type?: 'individual' | 'bulk';
    sourceTable?: 'requests' | 'card_details';
}

const ManageRequests = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { branches } = useBranches();
    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
    const [viewingRequest, setViewingRequest] = useState<Request | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [vendors, setVendors] = useState<any[]>([]);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

    const { downloadZip } = useDownloadZip();
    const [processingRequest, setProcessingRequest] = useState<Request | null>(null);
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);
    const cardContainerRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const PAGE_SIZES = [10, 20, 50];
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(PAGE_SIZES[0]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('status');
        if (status) {
            setStatusFilter(status);
        }
    }, [location.search]);

    useEffect(() => {
        const loadLogos = async () => {
            try {
                const frontLogoUrl = await imageToDataUrl(cloveLogo);
                setFrontLogoDataUrl(frontLogoUrl);
                const backLogoUrl = await imageToDataUrl(backLogoSvg);
                setBackLogoDataUrl(backLogoUrl);
            } catch (error) {
                console.error('Error loading logo images:', error);
            }
        };
        loadLogos();
    }, []);

    useEffect(() => {
        fetchRequests();
        fetchVendors();

        const handleWindowFocus = () => { fetchRequests(); };
        window.addEventListener('focus', handleWindowFocus);

        const refreshInterval = setInterval(fetchRequests, 20000);

        return () => {
            window.removeEventListener('focus', handleWindowFocus);
            clearInterval(refreshInterval);
        };
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const viewId = params.get('view');
        if (viewId && requests.length > 0) {
            const requestToView = requests.find(r => r.id === parseInt(viewId, 10));
            if (requestToView) setViewingRequest(requestToView);
        }
    }, [requests]);

    const fetchVendors = async () => {
        const { data, error } = await supabase.from('vendors').select('id,name');
        if (error) console.error('Error fetching vendors:', error);
        else setVendors(data);
    };

    const fetchRequests = async () => {
        const { data: requestsData, error: requestsError } = await supabase
            .from('requests')
            .select('*, is_edited, batch_id')
            .is('batch_id', null)
            .order('created_at', { ascending: false });

        if (requestsError) console.error('Error fetching requests:', requestsError);

        const individualRequests = requestsData || [];

        const formattedIndividual = individualRequests.map(req => ({
            id: req.id,
            name: req.full_name,
            employeeId: req.employee_id,
            date: new Date(req.created_at).toLocaleDateString(),
            status: req.status,
            is_edited: req.is_edited,
            batch_id: req.batch_id,
            photo: req.photo_url,
            photo_url: req.photo_url,
            bloodGroup: req.blood_group,
            branch: req.branch,
            emergencyContact: req.emergency_contact,
            created_at: req.created_at,
            print_status: req.print_status || 'not_printed',
            type: 'individual' as const,
            sourceTable: 'requests' as const
        }));

        setRequests(formattedIndividual.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('status');
        setStatusFilter(status || 'All');
    }, [location.search]);

    useEffect(() => {
        let filtered = requests;

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.name.toLowerCase().includes(q) ||
                r.employeeId.toLowerCase().includes(q) ||
                r.branch?.toLowerCase().includes(q)
            );
        }

        if (statusFilter !== 'All') {
            if (statusFilter === 'In Editing') {
                filtered = filtered.filter(r => r.status === 'Pending' && r.is_edited === false);
            } else if (statusFilter === 'Awaiting Approval') {
                filtered = filtered.filter(r => r.status === 'Pending' && r.is_edited === true);
            } else if (statusFilter === 'Collected') {
                filtered = filtered.filter(r => r.print_status === 'collected');
            } else {
                filtered = filtered.filter(r => r.status === statusFilter);
            }
        }
        setFilteredRequests(filtered);
    }, [statusFilter, requests, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredRequests.length / perPage));
    const safePage = Math.min(page, totalPages);
    const paginatedRequests = filteredRequests.slice((safePage - 1) * perPage, safePage * perPage);

    useEffect(() => {
        if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const getDisplayStatus = (request: Request) => {
        if (request.print_status === 'collected') return 'Collected';
        if (request.status === 'Pending') {
            return request.is_edited ? 'Awaiting Approval' : 'In Editing';
        }
        return request.status;
    };

    const statusConfig: Record<string, { color: string; dot: string }> = {
        'In Editing': { color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800', dot: 'bg-orange-500' },
        'Awaiting Approval': { color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
        'Approved': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
        'Sent for Print': { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500' },
        'Pending': { color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', dot: 'bg-amber-500' },
        'Printed': { color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800', dot: 'bg-blue-500' },
        'ready_to_collect': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
        'Ready to Collect': { color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800', dot: 'bg-emerald-500' },
        'Collected': { color: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', dot: 'bg-gray-500' },
        'Rejected': { color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800', dot: 'bg-red-500' },
    };

    const getStatusBadge = (request: Request) => {
        const displayStatus = getDisplayStatus(request);
        const c = statusConfig[displayStatus] || { color: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600', dot: 'bg-gray-500' };
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${c.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                {displayStatus}
            </span>
        );
    };

    const displayStatuses = ['All', 'In Editing', 'Awaiting Approval', 'Approved', 'Sent for Print', 'Printed', 'Collected'];

    const getStatusCount = (status: string) => {
        if (status === 'All') return requests.length;
        return filteredRequests.length;
    };

    const handleDownload = async (request: Request) => {
        setIsDownloading(true);
        setProcessingRequest(request);

        await new Promise(resolve => setTimeout(resolve, 300));

        const waitForImages = async (root: HTMLElement, timeoutMs = 5000) => {
            const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
            if (imgs.length === 0) return;
            await Promise.race([
                Promise.all(imgs.map(img => new Promise<void>((res) => {
                    if (img.complete && img.naturalWidth > 0) return res();
                    const onLoad = () => { cleanup(); res(); };
                    const onError = () => { cleanup(); res(); };
                    const cleanup = () => { img.removeEventListener('load', onLoad); img.removeEventListener('error', onError); };
                    img.addEventListener('load', onLoad);
                    img.addEventListener('error', onError);
                }))),
                new Promise(res => setTimeout(res, timeoutMs))
            ]);
        };

        try {
            const cardElement = document.getElementById(`id-card-${request.id}`);
            if (cardElement) {
                await waitForImages(cardElement, 3000);
                const zip = new JSZip();
                const frontImage = await html2canvas(cardElement.querySelector('.id-card-front') as HTMLElement, { useCORS: true, allowTaint: true, scale: 12 });
                const backImage = await html2canvas(cardElement.querySelector('.id-card-back') as HTMLElement, { useCORS: true, allowTaint: true, scale: 12 });
                zip.file(`${request.name}-front.png`, frontImage.toDataURL().split(',')[1], { base64: true });
                zip.file(`${request.name}-back.png`, backImage.toDataURL().split(',')[1], { base64: true });

                const { jsPDF } = await import('jspdf');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [2.125, 3.375], compress: false });
                pdf.addImage(frontImage.toDataURL('image/png', 1.0), 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');
                pdf.addPage();
                pdf.addImage(backImage.toDataURL('image/png', 1.0), 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');
                zip.file(`${request.name}-id-card.pdf`, pdf.output('blob'));

                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = `${request.name}-id-card.zip`;
                link.click();

                const table = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
                const { error: updateError } = await supabase
                    .from(table)
                    .update({ status: 'Printed', print_status: 'printed' })
                    .eq('id', request.id);

                if (updateError) {
                    console.error('Error updating request status to Printed:', updateError);
                    toast.error('Card downloaded but failed to update status.');
                } else {
                    setRequests(requests.map(req =>
                        req.id === request.id ? { ...req, status: 'Printed', print_status: 'printed' } : req
                    ));
                    toast.success('Card downloaded and status updated to Printed.');
                }
            } else {
                toast.error('Could not find card element to download.');
            }
        } catch (error) {
            console.error('Error generating zip file:', error);
            toast.error('Failed to download ID card.');
        } finally {
            setIsDownloading(false);
            setProcessingRequest(null);
        }
    };

    const handleBulkDownload = async () => {
        setIsDownloading(true);
        const zip = new JSZip();
        const { jsPDF } = await import('jspdf');

        const requestsToDownload = requests.filter(r => selectedRequests.includes(r.id));
        const requestsToUpdate: Request[] = [];

        for (const request of requestsToDownload) {
            setProcessingRequest(request);
            await new Promise(resolve => setTimeout(resolve, 300));

            const waitForImages = async (root: HTMLElement, timeoutMs = 5000) => {
                const imgs = Array.from(root.querySelectorAll('img')) as HTMLImageElement[];
                if (imgs.length === 0) return;
                await Promise.race([
                    Promise.all(imgs.map(img => new Promise<void>((res) => {
                        if (img.complete && img.naturalWidth > 0) return res();
                        const onLoad = () => { cleanup(); res(); };
                        const onError = () => { cleanup(); res(); };
                        const cleanup = () => { img.removeEventListener('load', onLoad); img.removeEventListener('error', onError); };
                        img.addEventListener('load', onLoad);
                        img.addEventListener('error', onError);
                    }))),
                    new Promise(res => setTimeout(res, timeoutMs))
                ]);
            };

            try {
                const cardElement = document.getElementById(`id-card-${request.id}`);
                if (cardElement) {
                    await waitForImages(cardElement, 3000);
                    const frontImage = await html2canvas(cardElement.querySelector('.id-card-front') as HTMLElement, { useCORS: true, allowTaint: true, scale: 12 });
                    const backImage = await html2canvas(cardElement.querySelector('.id-card-back') as HTMLElement, { useCORS: true, allowTaint: true, scale: 12 });
                    const folder = zip.folder(request.name);
                    if (folder) {
                        folder.file(`${request.name}-front.png`, frontImage.toDataURL().split(',')[1], { base64: true });
                        folder.file(`${request.name}-back.png`, backImage.toDataURL().split(',')[1], { base64: true });

                        const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [2.125, 3.375], compress: false });
                        pdf.addImage(frontImage.toDataURL('image/png', 1.0), 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');
                        pdf.addPage();
                        pdf.addImage(backImage.toDataURL('image/png', 1.0), 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');
                        folder.file(`${request.name}-id-card.pdf`, pdf.output('blob'));
                        requestsToUpdate.push(request);
                    }
                }
            } catch (error) {
                console.error(`Error processing request ${request.id}:`, error);
                toast.error(`Failed to process ID card for ${request.name}.`);
            }
        }

        try {
            if (Object.keys(zip.files).length > 0) {
                const zipBlob = await zip.generateAsync({ type: 'blob' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(zipBlob);
                link.download = 'id-cards-batch.zip';
                link.click();

                if (requestsToUpdate.length > 0) {
                    for (const request of requestsToUpdate) {
                        const table = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
                        await supabase.from(table).update({ status: 'Printed', print_status: 'printed' }).eq('id', request.id);
                    }
                    setRequests(requests.map(req =>
                        requestsToUpdate.some(u => u.id === req.id) ? { ...req, status: 'Printed', print_status: 'printed' } : req
                    ));
                    toast.success(`Batch downloaded and ${requestsToUpdate.length} card(s) status updated to Printed.`);
                } else {
                    toast.success('Batch download started.');
                }
            } else {
                toast.warning('No ID cards were processed for download.');
            }
        } catch (error) {
            console.error('Error generating bulk zip file:', error);
            toast.error('Failed to generate zip for batch download.');
        } finally {
            setIsDownloading(false);
            setProcessingRequest(null);
            setSelectedRequests([]);
        }
    };

    const confirmSendToPrint = async () => {
        if (!selectedVendorId) { toast.error('Please select a vendor.'); return; }
        setIsDownloading(true);

        const recordsToInsert = [];
        const requestsToUpdate = [];

        for (const reqId of selectedRequests) {
            const request = requests.find(r => r.id === reqId);
            if (!request) continue;
            setProcessingRequest(request);
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                const cardElement = document.getElementById(`id-card-${request.id}`);
                if (cardElement) {
                    const frontCanvas = await html2canvas(cardElement.querySelector('.id-card-front') as HTMLElement, { scale: 12 });
                    const backCanvas = await html2canvas(cardElement.querySelector('.id-card-back') as HTMLElement, { scale: 12 });
                    const frontImage = frontCanvas.toDataURL('image/png');
                    const backImage = backCanvas.toDataURL('image/png');

                    const frontImagePath = `public/${request.id}-${request.employeeId}-front.png`;
                    const backImagePath = `public/${request.id}-${request.employeeId}-back.png`;

                    const uploadImage = async (path: string, dataUrl: string) => {
                        const blob = await (await fetch(dataUrl)).blob();
                        const { data, error } = await supabase.storage.from('id-card-images').upload(path, blob, { upsert: true });
                        if (error) { console.error('Upload error:', error); throw error; }
                        return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
                    };

                    let front_image_url = '';
                    let back_image_url = '';
                    try {
                        [front_image_url, back_image_url] = await Promise.all([uploadImage(frontImagePath, frontImage), uploadImage(backImagePath, backImage)]);
                    } catch (uploadErr) {
                        console.error('Storage upload failed, using local generation fallback in dashboard', uploadErr);
                    }

                    const sourceTable = request.sourceTable || 'requests';
                    const vendorRequestRecord: any = {
                        vendor_id: selectedVendorId,
                        front_image_url: front_image_url || null,
                        back_image_url: back_image_url || null,
                        card_details: requestToEmployee(request),
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        batch_id: request.batch_id || null,
                        source_table: sourceTable,
                    };
                    if (sourceTable === 'card_details') vendorRequestRecord.card_details_id = reqId;
                    else vendorRequestRecord.request_id = reqId;

                    recordsToInsert.push(vendorRequestRecord);
                    requestsToUpdate.push({ id: reqId, sourceTable });
                }
            } catch (error) {
                console.error(`Error processing request ${request.id}:`, error);
                toast.error(`Failed to process ID card for ${request.name}.`);
            }
        }

        if (recordsToInsert.length > 0) {
            const { error: sendError } = await supabase.from('vendor_requests').insert(recordsToInsert);
            if (sendError) {
                console.error('Error creating vendor send records:', sendError);
                toast.error('Failed to send requests to vendor.');
            } else {
                for (const update of requestsToUpdate) {
                    const table = update.sourceTable === 'card_details' ? 'card_details' : 'requests';
                    await supabase.from(table).update({ status: 'Sent for Print', print_status: 'sent_for_printing' }).eq('id', update.id);
                }
                toast.success('Requests sent to vendor successfully!');
                setRequests(requests.map(req =>
                    requestsToUpdate.some(u => u.id === req.id) ? { ...req, status: 'Sent for Print', print_status: 'sent_for_printing' } : req
                ));
                setSelectedRequests([]);
                setIsVendorModalOpen(false);
                setSelectedVendorId(null);
            }
        }

        setIsDownloading(false);
        setProcessingRequest(null);
    };

    const handlePrintCompleted = async () => {
        if (selectedRequests.length === 0) { toast.error('Please select at least one request.'); return; }
        setIsDownloading(true);
        try {
            for (const reqId of selectedRequests) {
                const request = requests.find(r => r.id === reqId);
                if (!request) continue;
                const table = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
                await supabase.from(table).update({ status: 'Printed', print_status: 'printed' }).eq('id', reqId);
            }
            setRequests(prev => prev.map(req =>
                selectedRequests.includes(req.id) ? { ...req, status: 'Printed', print_status: 'printed' } : req
            ));
            toast.success(`${selectedRequests.length} card(s) marked as printed`);
            setSelectedRequests([]);
        } catch {
            toast.error('Failed to mark as printed');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedRequests.length === 0) { toast.error('No requests selected to delete.'); return; }

        const requestIds = selectedRequests.filter(id => { const req = requests.find(r => r.id === id); return req && req.sourceTable !== 'card_details'; });
        const cardDetailsIds = selectedRequests.filter(id => { const req = requests.find(r => r.id === id); return req && req.sourceTable === 'card_details'; });

        // Fire Drive deletions in background before removing from DB
        selectedRequests.forEach(id => {
            const req = requests.find(r => r.id === id);
            const fileId = extractDriveFileId(req?.zip_url);
            if (fileId) deleteDriveFile(fileId).catch(err => console.warn('Drive delete failed:', err));
        });

        let hasError = false;
        if (requestIds.length > 0) {
            const { error } = await supabase.from('requests').delete().in('id', requestIds);
            if (error) { console.error('Error deleting from requests:', error); hasError = true; }
        }
        if (cardDetailsIds.length > 0) {
            const { error } = await supabase.from('card_details').delete().in('id', cardDetailsIds);
            if (error) { console.error('Error deleting from card_details:', error); hasError = true; }
        }

        if (hasError) toast.error('Error deleting some requests.');
        else {
            toast.success('Selected requests have been deleted.');
            setRequests(requests.filter(req => !selectedRequests.includes(req.id)));
            setSelectedRequests([]);
        }
    };

    const handleApprove = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) { console.error('Request not found'); return; }
        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase.from(tableName).update({ status: 'Approved', updated_at: new Date().toISOString() }).eq('id', id).select('*');
        if (error) { console.error('Error approving request:', error); toast.error('Failed to approve request'); }
        else if (data && data.length > 0) { toast.success('Request approved successfully'); fetchRequests(); setViewingRequest(null); }
    };

    const handleReject = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) { console.error('Request not found'); return; }
        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase.from(tableName).update({ status: 'Rejected', updated_at: new Date().toISOString() }).eq('id', id).select('*');
        if (error) { console.error('Error rejecting request:', error); toast.error('Failed to reject request'); }
        else if (data && data.length > 0) { toast.success('Request rejected successfully'); fetchRequests(); setViewingRequest(null); }
    };

    const handleMarkAsDone = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) { toast.error('Request not found'); return; }
        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase.from(tableName).update({ print_status: 'ready_to_collect', updated_at: new Date().toISOString() }).eq('id', id).select('*');
        if (error) { console.error('Error marking as done:', error); toast.error('Failed to mark card as ready to collect'); }
        else if (data && data.length > 0) { toast.success('Card marked as ready to collect!'); fetchRequests(); setViewingRequest(null); }
    };

    const handleMarkAsCollected = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) { toast.error('Request not found'); return; }
        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase.from(tableName).update({ print_status: 'collected', updated_at: new Date().toISOString() }).eq('id', id).select('*');
        if (error) { console.error('Error marking as collected:', error); toast.error(`Failed to mark card as collected: ${error.message}`); }
        else if (data && data.length > 0) {
            toast.success('Card marked as collected!');
            setViewingRequest(null);
            setTimeout(() => fetchRequests(), 500);
        }
    };

    const handleCancelPrint = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) { toast.error('Request not found'); return; }
        try {
            const { error: vendorError } = await supabase.from('vendor_requests').delete().eq('request_id', id);
            if (vendorError) { console.error('Error deleting vendor request:', vendorError); toast.error('Failed to cancel print request'); return; }
            const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
            const { data, error: updateError } = await supabase.from(tableName).update({ status: 'Approved', print_status: 'not_printed', updated_at: new Date().toISOString() }).eq('id', id).select('*');
            if (updateError) { console.error('Error updating request:', updateError); toast.error('Failed to cancel print request'); }
            else if (data && data.length > 0) { toast.success('Print request cancelled successfully!'); fetchRequests(); setViewingRequest(null); }
        } catch (error) { console.error('Error cancelling print request:', error); toast.error('Failed to cancel print request'); }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedRequests(filteredRequests.map(r => r.id));
        else setSelectedRequests([]);
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
        if (e.target.checked) setSelectedRequests([...selectedRequests, id]);
        else setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
    };

    const requestToEmployee = (request: Request) => {
        if (!request) return null;
        const branchInfo = branches.find(b => b.name === request.branch);
        return {
            id: request.id,
            fullName: request.name,
            employeeId: request.employeeId,
            bloodGroup: request.bloodGroup,
            branch: request.branch,
            address: branchInfo?.address || request.branch || undefined,
            photo: request.photo || request.photo_url,
            photo_url: request.photo_url,
            emergencyContact: request.emergencyContact,
            countryCode: '+91',
            frontLogoDataUrl: frontLogoDataUrl,
            backLogoDataUrl: backLogoDataUrl,
        };
    };

    const renderActionButtons = (request: Request) => {
        if (request.status === "Printed" && request.print_status !== 'ready_to_collect' && request.print_status !== 'collected') {
            return (
                <button onClick={() => handleMarkAsDone(request.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-colors">
                    <Box size={14} /> Done
                </button>
            );
        }
        if (request.print_status === 'ready_to_collect') {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                        <Box size={12} /> Ready
                    </span>
                    <button onClick={() => handleMarkAsCollected(request.id)} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors">
                        Collected
                    </button>
                </div>
            );
        }
        if (request.print_status === 'collected') {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                    Collected
                </span>
            );
        }
        if (request.status === "Sent for Print") {
            return (
                <button onClick={() => handleCancelPrint(request.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors">
                    <XCircle size={14} /> Cancel
                </button>
            );
        }
        return (
            <>
                <button onClick={() => handleApprove(request.id)} disabled={request.status === "Approved"}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 transition-colors">
                    <CheckCircle2 size={14} /> {request.status === "Approved" ? "Approved" : "Approve"}
                </button>
                <button onClick={() => handleReject(request.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors">
                    <XCircle size={14} /> Reject
                </button>
            </>
        );
    };

    const statsData = [
        { label: 'In Editing', icon: Edit3, color: 'from-orange-400 to-orange-600', count: requests.filter(r => getDisplayStatus(r) === 'In Editing').length },
        { label: 'Awaiting Approval', icon: Clock, color: 'from-amber-400 to-amber-600', count: requests.filter(r => getDisplayStatus(r) === 'Awaiting Approval').length },
        { label: 'Approved', icon: CheckCircle2, color: 'from-emerald-400 to-emerald-600', count: requests.filter(r => getDisplayStatus(r) === 'Approved').length },
        { label: 'Sent for Print', icon: Printer, color: 'from-blue-400 to-blue-600', count: requests.filter(r => getDisplayStatus(r) === 'Sent for Print').length },
        { label: 'Collected', icon: Package, color: 'from-violet-400 to-violet-600', count: requests.filter(r => getDisplayStatus(r) === 'Collected').length },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate(-1)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                        <ChevronLeft size={18} /> <span className="hidden md:inline">Back</span>
                    </button>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Manage Employee Requests</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Review, approve, and manage ID card requests
                        </p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
                    {statsData.map(stat => {
                        const Icon = stat.icon;
                        return (
                            <button
                                key={stat.label}
                                onClick={() => setStatusFilter(stat.label === 'Awaiting Approval' ? 'Awaiting Approval' : stat.label === 'In Editing' ? 'In Editing' : stat.label === 'Sent for Print' ? 'Sent for Print' : stat.label)}
                                className={`group bg-white dark:bg-gray-800/80 rounded-xl border p-4 hover:shadow-md transition-all text-left ${statusFilter === stat.label || (stat.label === 'In Editing' && statusFilter === 'In Editing') || (stat.label === 'Awaiting Approval' && statusFilter === 'Awaiting Approval')
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

                {/* Filters & Actions */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
                    <div className="p-5 sm:p-6">
                        {/* Status Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
                            {displayStatuses.map(status => (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                        statusFilter === status
                                            ? 'bg-orange-500 text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {/* Search & Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                            <div className="relative w-full sm:w-72">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search name, ID, or branch..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => handleDeleteSelected()}
                                    disabled={selectedRequests.length === 0 || isDownloading}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 hover:bg-red-600 transition-colors"
                                >
                                    <Trash2 size={15} />
                                    Delete
                                </button>
                                <button
                                    onClick={handleBulkDownload}
                                    disabled={selectedRequests.length === 0 || isDownloading}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 hover:bg-emerald-600 transition-colors"
                                >
                                    {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                                    {isDownloading ? 'Downloading...' : 'Download'}
                                </button>
                                <button
                                    onClick={() => setIsVendorModalOpen(true)}
                                    disabled={selectedRequests.length === 0 || isDownloading}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 hover:bg-blue-600 transition-colors"
                                >
                                    <Send size={15} />
                                    Send to Print
                                </button>
                                <button
                                    onClick={handlePrintCompleted}
                                    disabled={selectedRequests.length === 0 || isDownloading}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-xl text-sm font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 hover:bg-green-600 transition-colors"
                                    title="Mark as printed without sending to vendor (offline/out-of-network)"
                                >
                                    <CheckCircle2 size={15} />
                                    Print Completed
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                                    <th className="px-5 py-3.5 text-left w-10">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={filteredRequests.length > 0 && selectedRequests.length === filteredRequests.length}
                                            className="rounded border-gray-300 dark:border-gray-600"
                                        />
                                    </th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee Name</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee ID</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Submitted</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {paginatedRequests.length > 0 ? (
                                    paginatedRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => handleSelectOne(e, request.id)}
                                                    checked={selectedRequests.includes(request.id)}
                                                    className="rounded border-gray-300 dark:border-gray-600"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </td>
                                            <td
                                                className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white cursor-pointer"
                                                onClick={() => setViewingRequest(request)}
                                            >
                                                {request.name}
                                            </td>
                                            <td
                                                className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 cursor-pointer"
                                                onClick={() => setViewingRequest(request)}
                                            >
                                                {request.employeeId}
                                            </td>
                                            <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {request.date}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                    request.sourceTable === 'card_details'
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                                }`}>
                                                    {request.sourceTable === 'card_details' ? 'Single Card' : 'Employee Request'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {getStatusBadge(request)}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setViewingRequest(request)}
                                                        className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                        title="View"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => navigate(`/edit-request/${request.id}?table=${(request as any).sourceTable}`)}
                                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownload(request)}
                                                        disabled={isDownloading}
                                                        className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors disabled:opacity-40"
                                                        title="Download"
                                                    >
                                                        {isDownloading && processingRequest?.id === request.id ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : (
                                                            <Download size={16} />
                                                        )}
                                                    </button>
                                                    {renderActionButtons(request)}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-400">
                                            {searchQuery ? 'No requests match your search.' : 'No requests found.'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                        {paginatedRequests.length > 0 ? (
                            paginatedRequests.map((request) => (
                                <div key={request.id} className="p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        <input
                                            type="checkbox"
                                            onChange={(e) => handleSelectOne(e, request.id)}
                                            checked={selectedRequests.includes(request.id)}
                                            className="mt-1 rounded border-gray-300 dark:border-gray-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{request.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{request.employeeId}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                                request.sourceTable === 'card_details'
                                                    ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800'
                                                    : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
                                            }`}>
                                                {request.sourceTable === 'card_details' ? 'Single Card' : 'Employee Request'}
                                            </span>
                                            {getStatusBadge(request)}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-500 dark:text-gray-400">
                                        <div>
                                            <span className="font-medium uppercase text-[10px] text-gray-400 dark:text-gray-500">Date</span>
                                            <p className="text-gray-900 dark:text-gray-200">{request.date}</p>
                                        </div>
                                        <div>
                                            <span className="font-medium uppercase text-[10px] text-gray-400 dark:text-gray-500">Branch</span>
                                            <p className="text-gray-900 dark:text-gray-200 truncate">{request.branch}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                                        <button onClick={() => setViewingRequest(request)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors" title="View">
                                            <Eye size={16} />
                                        </button>
                                        <button onClick={() => navigate(`/edit-request/${request.id}?table=${(request as any).sourceTable}`)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title="Edit">
                                            <Pencil size={16} />
                                        </button>
                                        <button onClick={() => handleDownload(request)} disabled={isDownloading}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-40" title="Download">
                                            {isDownloading && processingRequest?.id === request.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <Download size={16} />
                                            )}
                                        </button>
                                        <div className="flex-1" />
                                        {request.status === "Printed" && request.print_status !== 'ready_to_collect' && request.print_status !== 'collected' ? (
                                            <button onClick={() => handleMarkAsDone(request.id)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium">
                                                <Box size={13} /> Done
                                            </button>
                                        ) : request.print_status === 'ready_to_collect' ? (
                                            <div className="flex items-center gap-1">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">
                                                    Ready
                                                </span>
                                                <button onClick={() => handleMarkAsCollected(request.id)}
                                                    className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium">
                                                    Collected
                                                </button>
                                            </div>
                                        ) : request.print_status === 'collected' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
                                                Collected
                                            </span>
                                        ) : request.status === "Sent for Print" ? (
                                            <button onClick={() => handleCancelPrint(request.id)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium">
                                                <XCircle size={13} /> Cancel
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleApprove(request.id)} disabled={request.status === "Approved"}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-medium disabled:bg-gray-300 dark:disabled:bg-gray-600">
                                                    <CheckCircle2 size={13} /> {request.status === "Approved" ? "Approved" : "Approve"}
                                                </button>
                                                <button onClick={() => handleReject(request.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium">
                                                    <XCircle size={13} /> Reject
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                                    <Search size={20} className="text-gray-400" />
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {searchQuery ? 'No requests match your search.' : 'No requests found yet.'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    {searchQuery ? 'Try adjusting your search or filters.' : 'New requests will appear here.'}
                                </p>
                            </div>
                        )}
                        {paginatedRequests.length > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Showing {filteredRequests.length} of {requests.length} requests
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                        <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">Rows:</label>
                            <select
                                value={perPage}
                                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                                className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                            >
                                {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(1)}
                                disabled={safePage <= 1}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                &#171;
                            </button>
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={safePage <= 1}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                &#8249;
                            </button>

                            <span className="px-4 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                                Page {safePage} of {totalPages}
                            </span>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={safePage >= totalPages}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                &#8250;
                            </button>
                            <button
                                onClick={() => setPage(totalPages)}
                                disabled={safePage >= totalPages}
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                &#187;
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {viewingRequest && (
                <ViewRequestModal
                    request={viewingRequest}
                    onClose={() => setViewingRequest(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEdit={(id) => navigate(`/edit-request/${id}`)}
                    frontLogoSrc={frontLogoDataUrl}
                    backLogoSrc={backLogoDataUrl}
                />
            )}

            {isVendorModalOpen && (
                <div className="fixed inset-0 bg-gray-800/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Send to Print</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                Select a vendor to send {selectedRequests.length} ID card request(s) to for printing.
                            </p>
                            <select
                                className="w-full p-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none mb-5"
                                onChange={(e) => setSelectedVendorId(e.target.value)}
                                value={selectedVendorId || ''}
                            >
                                <option value="" disabled>Select a vendor</option>
                                {vendors.map(vendor => (
                                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                                ))}
                            </select>
                            <div className="flex justify-end gap-3">
                                <button
                                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => { setIsVendorModalOpen(false); setSelectedVendorId(null); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 transition-colors"
                                    onClick={confirmSendToPrint}
                                    disabled={!selectedVendorId || isDownloading}
                                >
                                    {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                                    {isDownloading ? 'Sending...' : 'Send'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <HiddenCardRenderer
                id={processingRequest ? `id-card-${processingRequest.id}` : undefined}
                employee={processingRequest ? requestToEmployee(processingRequest) : null}
                frontLogoSrc={frontLogoDataUrl}
                backLogoSrc={backLogoDataUrl}
            />
        </div>
    );
};

export default ManageRequests;
