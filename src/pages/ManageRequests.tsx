import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';
import ViewRequestModal from '../components/ViewRequestModal';
import { useAuth } from '../hooks/useAuth';
import { useBranches } from '../hooks/useBranches';
import { supabase } from '@/lib/supabaseClient';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { useDownloadZip } from '../hooks/useDownloadZip';
import { imageToDataUrl } from '@/lib/utils';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import JSZip from 'jszip';
import { toast } from 'sonner';
import { Eye, Pencil, Download, Box } from 'lucide-react';

import AdminHeader from '../components/AdminHeader';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { branches } = useBranches();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
    const [viewingRequest, setViewingRequest] = useState<Request | null>(null);
    const [requests, setRequests] = useState<Request[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<Request[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [vendors, setVendors] = useState<any[]>([]);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

    // Download related state
    const { downloadZip } = useDownloadZip();
    const [processingRequest, setProcessingRequest] = useState<Request | null>(null);
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);
    const cardContainerRef = useRef<HTMLDivElement>(null);

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

        // Add window focus listener to refresh data when tab regains focus
        const handleWindowFocus = () => {
            fetchRequests();
        };
        window.addEventListener('focus', handleWindowFocus);

        // Optional: Set up periodic refresh every 20 seconds
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
            if (requestToView) {
                setViewingRequest(requestToView);
            }
        }
    }, [requests]);

    const fetchVendors = async () => {
        const { data, error } = await supabase.from('vendors').select('id,name');
        if (error) {
            console.error('Error fetching vendors:', error);
        } else {
            setVendors(data);
        }
    };

    const fetchRequests = async () => {
        // Fetch from both requests and card_details tables
        const [requestsRes, cardDetailsRes] = await Promise.all([
            supabase
                .from('requests')
                .select('*, is_edited, batch_id')
                .is('batch_id', null)
                .order('created_at', { ascending: false }),
            supabase
                .from('card_details')
                .select('*')
                .order('created_at', { ascending: false })
        ]);

        if (requestsRes.error) console.error('Error fetching requests:', requestsRes.error);
        if (cardDetailsRes.error) console.error('Error fetching card_details:', cardDetailsRes.error);

        const individualRequests = requestsRes.data || [];
        const cardDetails = cardDetailsRes.data || [];

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
            type: 'individual',
            sourceTable: 'requests'
        }));

        const formattedCardDetails = cardDetails.map(req => ({
            id: req.id,
            name: req.full_name,
            employeeId: req.employee_id,
            date: new Date(req.created_at).toLocaleDateString(),
            status: req.status,
            is_edited: req.is_edited,
            batch_id: null,
            photo: req.photo_url,
            photo_url: req.photo_url,
            bloodGroup: req.blood_group,
            branch: req.branch,
            emergencyContact: req.emergency_contact,
            created_at: req.created_at,
            print_status: req.print_status || 'not_printed',
            type: 'individual',
            sourceTable: 'card_details'
        }));

        setRequests([...formattedIndividual, ...formattedCardDetails].sort((a, b) =>
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
        if (statusFilter !== 'All') {
            if (statusFilter === 'In Editing') {
                filtered = requests.filter(r => r.status === 'Pending' && r.is_edited === false);
            } else if (statusFilter === 'Awaiting Approval') {
                filtered = requests.filter(r => r.status === 'Pending' && r.is_edited === true);
            } else {
                filtered = requests.filter(r => r.status === statusFilter);
            }
        }
        setFilteredRequests(filtered);
    }, [statusFilter, requests]);

    const getDisplayStatus = (request: Request) => {
        // If collected, always show Collected regardless of other status
        if (request.print_status === 'collected') {
            return 'Collected';
        }
        if (request.status === 'Pending') {
            return request.is_edited ? 'Awaiting Approval' : 'In Editing';
        }
        return request.status;
    };

    const getStatusClassName = (request: Request) => {
        const displayStatus = getDisplayStatus(request);
        switch (displayStatus) {
            case 'In Editing':
                return 'bg-orange-100 text-orange-800';
            case 'Awaiting Approval':
                return 'bg-yellow-100 text-yellow-800';
            case 'Approved':
                return 'bg-green-100 text-green-800';
            case 'Sent for Print':
                return 'bg-blue-100 text-blue-800';
            case 'Printed':
                return 'bg-green-100 text-green-800';
            case 'Collected':
                return 'bg-gray-100 text-gray-800';
            case 'Rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleDownload = async (request: Request) => {
        setIsDownloading(true);
        setProcessingRequest(request);

        // Wait for the hidden card to render
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
                // ensure images are loaded into the DOM before canvas capture
                await waitForImages(cardElement, 3000);
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

                const { jsPDF } = await import('jspdf');
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

                // Update request status to "Printed" and print_status to "printed" after successful download
                const table = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
                const { error: updateError } = await supabase
                    .from(table)
                    .update({ status: 'Printed', print_status: 'printed' })
                    .eq('id', request.id);

                if (updateError) {
                    console.error('Error updating request status to Printed:', updateError);
                    toast.error('Card downloaded but failed to update status.');
                } else {
                    // Update local state
                    setRequests(requests.map(req =>
                        req.id === request.id
                            ? { ...req, status: 'Printed', print_status: 'printed' }
                            : req
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

            // Wait for the hidden card to render
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
                    const folder = zip.folder(request.name);
                    if (folder) {
                        folder.file(`${request.name}-front.png`, frontImage.toDataURL().split(',')[1], { base64: true });
                        folder.file(`${request.name}-back.png`, backImage.toDataURL().split(',')[1], { base64: true });

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
                        folder.file(`${request.name}-id-card.pdf`, pdfBlob);

                        // Track all requests for status update
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

                // Update statuses to "Printed" for all downloaded requests with "Sent for Print" status
                if (requestsToUpdate.length > 0) {
                    for (const request of requestsToUpdate) {
                        const table = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
                        const { error: updateError } = await supabase
                            .from(table)
                            .update({ status: 'Printed', print_status: 'printed' })
                            .eq('id', request.id);

                        if (updateError) {
                            console.error(`Error updating request ${request.id} status:`, updateError);
                        }
                    }

                    // Update local state
                    setRequests(requests.map(req =>
                        requestsToUpdate.some(u => u.id === req.id)
                            ? { ...req, status: 'Printed', print_status: 'printed' }
                            : req
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
        if (!selectedVendorId) {
            toast.error('Please select a vendor.');
            return;
        }

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

                    // Upload images to Supabase Storage
                    const frontImagePath = `public/${request.id}-${request.employeeId}-front.png`;
                    const backImagePath = `public/${request.id}-${request.employeeId}-back.png`;

                    const uploadImage = async (path: string, dataUrl: string) => {
                        const blob = await (await fetch(dataUrl)).blob();
                        const { data, error } = await supabase.storage
                            .from('id-card-images')
                            .upload(path, blob, { upsert: true });
                        if (error) {
                            console.error('Upload error:', error);
                            throw error;
                        }
                        return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
                    };

                    let front_image_url = '';
                    let back_image_url = '';

                    try {
                        [front_image_url, back_image_url] = await Promise.all([
                            uploadImage(frontImagePath, frontImage),
                            uploadImage(backImagePath, backImage),
                        ]);
                    } catch (uploadErr) {
                        console.error('Storage upload failed, using local generation fallback in dashboard', uploadErr);
                        // We will still insert the record but without permanent URLs if storage fails
                        // The vendor dashboard will use HiddenCardRenderer as fallback
                    }

                    // Determine which table the request came from
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

                    // Add the appropriate ID based on source
                    if (sourceTable === 'card_details') {
                        vendorRequestRecord.card_details_id = reqId;
                    } else {
                        vendorRequestRecord.request_id = reqId;
                    }

                    recordsToInsert.push(vendorRequestRecord);
                    requestsToUpdate.push({ id: reqId, sourceTable });
                }
            } catch (error) {
                console.error(`Error processing request ${request.id}:`, error);
                toast.error(`Failed to process ID card for ${request.name}.`);
            }
        }

        if (recordsToInsert.length > 0) {
            const { error: sendError } = await supabase
                .from('vendor_requests')
                .insert(recordsToInsert);

            if (sendError) {
                console.error('Error creating vendor send records:', sendError);
                toast.error('Failed to send requests to vendor.');
            } else {
                // Update request statuses to 'Sent for Print' and print_status to 'sent_for_printing' in the appropriate tables
                for (const update of requestsToUpdate) {
                    const table = update.sourceTable === 'card_details' ? 'card_details' : 'requests';
                    await supabase
                        .from(table)
                        .update({ status: 'Sent for Print', print_status: 'sent_for_printing' })
                        .eq('id', update.id);
                }

                toast.success('Requests sent to vendor successfully!');
                setRequests(requests.map(req =>
                    requestsToUpdate.some(u => u.id === req.id)
                        ? { ...req, status: 'Sent for Print', print_status: 'sent_for_printing' }
                        : req
                ));
                setSelectedRequests([]);
                setIsVendorModalOpen(false);
                setSelectedVendorId(null);
            }
        }

        setIsDownloading(false);
        setProcessingRequest(null);
    };

    const handleDeleteSelected = async () => {
        if (selectedRequests.length === 0) {
            toast.error('No requests selected to delete.');
            return;
        }

        // Separate requests by source table
        const requestIds = selectedRequests.filter(id => {
            const req = requests.find(r => r.id === id);
            return req && req.sourceTable !== 'card_details';
        });
        const cardDetailsIds = selectedRequests.filter(id => {
            const req = requests.find(r => r.id === id);
            return req && req.sourceTable === 'card_details';
        });

        let hasError = false;

        // Delete from requests table
        if (requestIds.length > 0) {
            const { error } = await supabase
                .from('requests')
                .delete()
                .in('id', requestIds);
            if (error) {
                console.error('Error deleting from requests:', error);
                hasError = true;
            }
        }

        // Delete from card_details table
        if (cardDetailsIds.length > 0) {
            const { error } = await supabase
                .from('card_details')
                .delete()
                .in('id', cardDetailsIds);
            if (error) {
                console.error('Error deleting from card_details:', error);
                hasError = true;
            }
        }

        if (hasError) {
            toast.error('Error deleting some requests.');
        } else {
            toast.success('Selected requests have been deleted.');
            setRequests(requests.filter(req => !selectedRequests.includes(req.id)));
            setSelectedRequests([]);
        }
    };


    const handleApprove = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) {
            console.error('Request not found');
            return;
        }

        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase
            .from(tableName)
            .update({
                status: 'Approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*');

        if (error) {
            console.error('Error approving request:', error);
            toast.error('Failed to approve request');
        } else if (data && data.length > 0) {
            toast.success('Request approved successfully');
            fetchRequests();
            setViewingRequest(null);
        }
    };

    const handleReject = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) {
            console.error('Request not found');
            return;
        }

        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase
            .from(tableName)
            .update({
                status: 'Rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*');

        if (error) {
            console.error('Error rejecting request:', error);
            toast.error('Failed to reject request');
        } else if (data && data.length > 0) {
            toast.success('Request rejected successfully');
            fetchRequests();
            setViewingRequest(null);
        }
    };

    const handleMarkAsDone = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) {
            toast.error('Request not found');
            return;
        }

        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase
            .from(tableName)
            .update({
                print_status: 'ready_to_collect',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*');

        if (error) {
            console.error('Error marking as done:', error);
            toast.error('Failed to mark card as ready to collect');
        } else if (data && data.length > 0) {
            toast.success('Card marked as ready to collect!');
            fetchRequests();
            setViewingRequest(null);
        }
    };

    const handleMarkAsCollected = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) {
            toast.error('Request not found');
            return;
        }

        const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
        const { data, error } = await supabase
            .from(tableName)
            .update({
                print_status: 'collected',
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*');

        if (error) {
            console.error('Error marking as collected:', error);
            toast.error(`Failed to mark card as collected: ${error.message}`);
        } else if (data && data.length > 0) {
            console.log('Card marked as collected:', data[0]);
            toast.success('Card marked as collected!');
            setViewingRequest(null);

            // Force immediate refetch after successful update
            setTimeout(() => {
                fetchRequests();
            }, 500);
        }
    };

    const handleCancelPrint = async (id: number) => {
        const request = requests.find(r => r.id === id);
        if (!request) {
            toast.error('Request not found');
            return;
        }

        try {
            // Delete from vendor_requests table
            const { error: vendorError } = await supabase
                .from('vendor_requests')
                .delete()
                .eq('request_id', id);

            if (vendorError) {
                console.error('Error deleting vendor request:', vendorError);
                toast.error('Failed to cancel print request');
                return;
            }

            // Update status back to 'Approved' and reset print_status
            const tableName = request.sourceTable === 'card_details' ? 'card_details' : 'requests';
            const { data, error: updateError } = await supabase
                .from(tableName)
                .update({
                    status: 'Approved',
                    print_status: 'not_printed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select('*');

            if (updateError) {
                console.error('Error updating request:', updateError);
                toast.error('Failed to cancel print request');
            } else if (data && data.length > 0) {
                toast.success('Print request cancelled successfully!');
                fetchRequests();
                setViewingRequest(null);
            }
        } catch (error) {
            console.error('Error cancelling print request:', error);
            toast.error('Failed to cancel print request');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRequests(filteredRequests.map(r => r.id));
        } else {
            setSelectedRequests([]);
        }
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
        if (e.target.checked) {
            setSelectedRequests([...selectedRequests, id]);
        } else {
            setSelectedRequests(selectedRequests.filter(reqId => reqId !== id));
        }
    };

    const requestToEmployee = (request: Request) => {
        if (!request) return null;

        // Find branch info to get address
        const branchInfo = branches.find(b => b.name === request.branch);

        return {
            id: request.id,
            fullName: request.name,
            employeeId: request.employeeId,
            bloodGroup: request.bloodGroup,
            branch: request.branch,
            address: branchInfo?.address || request.branch || undefined, // Use branch address if found
            photo: request.photo || request.photo_url,
            photo_url: request.photo_url,
            emergencyContact: request.emergencyContact,
            countryCode: '+91',
            frontLogoDataUrl: frontLogoDataUrl,
            backLogoDataUrl: backLogoDataUrl,
        };
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="manage-requests" />
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="flex flex-1 justify-center py-5 sm:px-4 md:px-10 lg:px-20 xl:px-40">
                        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                            <div className="flex flex-col mb-8 gap-4">
                                <h1 className="text-2xl font-bold text-center sm:text-left">Manage Employee Requests</h1>

                                {/* Status Tabs */}
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    <button
                                        onClick={() => setStatusFilter('All')}
                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === 'All'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('In Editing')}
                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === 'In Editing'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Available
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('Pending')}
                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === 'Pending'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Pending
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('Approved')}
                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === 'Approved'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Approved
                                    </button>
                                    <button
                                        onClick={() => setStatusFilter('Printed')}
                                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${statusFilter === 'Printed'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Printed
                                    </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                    <button
                                        className="bg-red-500 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
                                        onClick={() => handleDeleteSelected()}
                                        disabled={selectedRequests.length === 0}
                                    >
                                        Delete Selected
                                    </button>
                                    <button
                                        className="bg-green-600 text-white px-4 py-2 rounded-md disabled:bg-gray-400 flex items-center justify-center gap-2"
                                        onClick={handleBulkDownload}
                                        disabled={selectedRequests.length === 0 || isDownloading}
                                    >
                                        {isDownloading ? 'Processing...' : 'Download Selected'}
                                    </button>
                                    <button
                                        className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
                                        onClick={() => setIsVendorModalOpen(true)}
                                        disabled={selectedRequests.length === 0}
                                    >
                                        Send to Print
                                    </button>
                                </div>
                            </div>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            <th className="py-3 px-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    onChange={handleSelectAll}
                                                    checked={filteredRequests.length > 0 && selectedRequests.length === filteredRequests.length}
                                                />
                                            </th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Employee Name</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Employee ID</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Date Submitted</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                                        </tr>
                                    </thead>


                                    <tbody>
                                        {filteredRequests.map((request) => (
                                            <tr
                                                key={request.id}
                                                className="border-b border-gray-200 dark:border-gray-700"
                                            >
                                                {/* Checkbox */}
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="checkbox"
                                                        onChange={(e) => handleSelectOne(e, request.id)}
                                                        checked={selectedRequests.includes(request.id)}
                                                    />
                                                </td>

                                                {/* Employee Name */}
                                                <td
                                                    className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    onClick={() => handleSelectOne({ target: { checked: !selectedRequests.includes(request.id) } } as React.ChangeEvent<HTMLInputElement>, request.id)}
                                                >
                                                    {request.name}
                                                </td>

                                                {/* Employee ID */}
                                                <td
                                                    className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                                    onClick={() => handleSelectOne({ target: { checked: !selectedRequests.includes(request.id) } } as React.ChangeEvent<HTMLInputElement>, request.id)}
                                                >
                                                    {request.employeeId}
                                                </td>

                                                {/* Date */}
                                                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">
                                                    {request.date}
                                                </td>

                                                {/* Status */}
                                                <td className="py-3 px-4 text-sm">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(
                                                            request
                                                        )}`}
                                                    >
                                                        {getDisplayStatus(request)}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-sm">
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            onClick={() => setViewingRequest(request)}
                                                            className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                                        >
                                                            <Eye size={18} />
                                                        </button>

                                                        <button
                                                            onClick={() => navigate(`/edit-request/${request.id}?table=${(request as any).sourceTable}`)}
                                                            className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                                        >
                                                            <Pencil size={18} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDownload(request)}
                                                            className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                                            disabled={isDownloading}
                                                        >
                                                            <Download size={18} />
                                                        </button>

                                                        {request.status === "Printed" && request.print_status !== 'ready_to_collect' && request.print_status !== 'collected' ? (
                                                            <button
                                                                onClick={() => handleMarkAsDone(request.id)}
                                                                className="bg-green-500 text-white px-3 py-1 rounded-md flex items-center gap-1"
                                                            >
                                                                <Box size={16} />
                                                                Done
                                                            </button>
                                                        ) : request.print_status === 'ready_to_collect' ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1">
                                                                    <Box size={16} />
                                                                    Ready to Collect
                                                                </span>
                                                                <button
                                                                    onClick={() => handleMarkAsCollected(request.id)}
                                                                    className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
                                                                >
                                                                    Collected
                                                                </button>
                                                            </div>
                                                        ) : request.print_status === 'collected' ? (
                                                            <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-md text-sm font-medium">
                                                                Collected
                                                            </span>
                                                        ) : request.status === "Sent for Print" ? (
                                                            <button
                                                                onClick={() => handleCancelPrint(request.id)}
                                                                className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600"
                                                            >
                                                                Cancel
                                                            </button>
                                                        ) : (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(request.id)}
                                                                    className="bg-green-500 text-white px-3 py-1 rounded-md disabled:bg-gray-400"
                                                                    disabled={request.status === "Approved"}
                                                                >
                                                                    {request.status === "Approved" ? "Approved" : "Approve"}
                                                                </button>

                                                                <button
                                                                    onClick={() => handleReject(request.id)}
                                                                    className="bg-red-500 text-white px-3 py-1 rounded-md"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>

                                </table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="md:hidden space-y-4">
                                {filteredRequests.length > 0 ? (
                                    filteredRequests.map((request) => (
                                        <div key={request.id} className="bg-white dark:bg-background-dark rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            {/* Header with Checkbox, Name and Status */}
                                            <div className="flex items-start gap-3 mb-3">
                                                <input
                                                    type="checkbox"
                                                    onChange={(e) => handleSelectOne(e, request.id)}
                                                    checked={selectedRequests.includes(request.id)}
                                                    className="mt-1"
                                                />
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{request.name}</p>
                                                    <span
                                                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusClassName(request)}`}
                                                    >
                                                        {getDisplayStatus(request)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Details Grid */}
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Employee ID</p>
                                                    <p className="text-sm text-gray-900 dark:text-gray-200">{request.employeeId}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Date Submitted</p>
                                                    <p className="text-sm text-gray-900 dark:text-gray-200">{request.date}</p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <button
                                                    onClick={() => setViewingRequest(request)}
                                                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                                    title="View"
                                                >
                                                    <Eye size={18} />
                                                </button>

                                                <button
                                                    onClick={() => navigate(`/edit-request/${request.id}?table=${(request as any).sourceTable}`)}
                                                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                                    title="Edit"
                                                >
                                                    <Pencil size={18} />
                                                </button>

                                                <button
                                                    onClick={() => handleDownload(request)}
                                                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                                    disabled={isDownloading}
                                                    title="Download"
                                                >
                                                    <Download size={18} />
                                                </button>

                                                {request.status === "Printed" && request.print_status !== 'ready_to_collect' && request.print_status !== 'collected' ? (
                                                    <button
                                                        onClick={() => handleMarkAsDone(request.id)}
                                                        className="bg-green-500 text-white px-3 py-1 rounded-md flex items-center gap-1 text-sm"
                                                    >
                                                        <Box size={16} />
                                                        Done
                                                    </button>
                                                ) : request.print_status === 'ready_to_collect' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1">
                                                            <Box size={16} />
                                                            Ready to Collect
                                                        </span>
                                                        <button
                                                            onClick={() => handleMarkAsCollected(request.id)}
                                                            className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 text-sm"
                                                        >
                                                            Collected
                                                        </button>
                                                    </div>
                                                ) : request.print_status === 'collected' ? (
                                                    <span className="bg-gray-200 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 px-3 py-1 rounded-md text-sm font-medium">
                                                        Collected
                                                    </span>
                                                ) : request.status === "Sent for Print" ? (
                                                    <button
                                                        onClick={() => handleCancelPrint(request.id)}
                                                        className="bg-yellow-500 text-white px-3 py-1 rounded-md hover:bg-yellow-600 text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleApprove(request.id)}
                                                            className="bg-green-500 text-white px-3 py-1 rounded-md disabled:bg-gray-400 text-sm"
                                                            disabled={request.status === "Approved"}
                                                        >
                                                            {request.status === "Approved" ? "Approved" : "Approve"}
                                                        </button>

                                                        <button
                                                            onClick={() => handleReject(request.id)}
                                                            className="bg-red-500 text-white px-3 py-1 rounded-md text-sm"
                                                        >
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-white dark:bg-background-dark rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No requests found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}
            <div className={`fixed top-0 left-0 h-full bg-white dark:bg-background-dark w-64 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setIsSidebarOpen(false)}>
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
                <nav className="flex flex-col p-5 gap-4">
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/dashboard">Dashboard</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-primary text-sm font-medium leading-normal" to="/manage-requests">Manage Employees</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="#">Settings</Link>
                    <button onClick={logout} className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
            {viewingRequest && (
                <ViewRequestModal
                    request={viewingRequest}
                    onClose={() => setViewingRequest(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEdit={(id) => navigate(`/edit-request/${id}`)}
                />
            )}
            {isVendorModalOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 flex items-center justify-center">
                    <div className="bg-white dark:bg-background-dark p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-xl font-bold mb-4">Select a Vendor</h2>
                        <p className="mb-4">Select a vendor to send the ID card requests to for printing.</p>
                        <select
                            className="w-full p-2 border rounded-md mb-4"
                            onChange={(e) => setSelectedVendorId(e.target.value)}
                            value={selectedVendorId || ''}
                        >
                            <option value="" disabled>Select a vendor</option>
                            {vendors.map(vendor => (
                                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                            ))}
                        </select>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 rounded-md border"
                                onClick={() => setIsVendorModalOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="px-4 py-2 rounded-md bg-blue-500 text-white"
                                onClick={confirmSendToPrint}
                                disabled={!selectedVendorId || isDownloading}
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <HiddenCardRenderer
                id={processingRequest ? `id-card-${processingRequest.id}` : undefined}
                employee={processingRequest ? requestToEmployee(processingRequest) : null}
            />
        </div>
    );
};
export default ManageRequests;