import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import ViewRequestModal from '../components/ViewRequestModal';
import { toast } from 'sonner';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { LogOut, Menu, X, Download, CheckCircle, XCircle, Eye, Printer } from 'lucide-react';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { imageToDataUrl } from '@/lib/utils';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import { jsPDF } from 'jspdf';

const VendorDashboard = () => {
    const { user, logout, clearSession } = useAuth();
    const [requests, setRequests] = useState<any[]>([]);
    const [viewingRequest, setViewingRequest] = useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [newRequestCount, setNewRequestCount] = useState(0);

    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [processingRequest, setProcessingRequest] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

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
        if (user) {
            fetchVendorRequests();
            // Set up periodic refresh every 30 seconds
            const interval = setInterval(fetchVendorRequests, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchVendorRequests = async () => {
        setLoading(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            console.log('Fetching vendor requests for user:', user.id);

            // Fetch vendor requests from the correct table 'vendor_requests'
            const { data: vendorRequestsData, error: vendorRequestsError } = await supabase
                .from('vendor_requests')
                .select('*')
                .eq('vendor_id', user.id)
                .order('sent_at', { ascending: false })
                .abortSignal(controller.signal);

            clearTimeout(timeoutId);

            if (vendorRequestsError) throw vendorRequestsError;

            if (!vendorRequestsData || vendorRequestsData.length === 0) {
                console.log('No vendor requests found');
                setRequests([]);
                setLoading(false);
                return;
            }

            // Map data using card_details if available, fallback to a request join only if necessary
            // Using card_details is safer for Vendors due to RLS on the main requests table
            const combinedData = vendorRequestsData.map(vr => {
                const details = vr.card_details;
                if (!details) return null;

                return {
                    id: vr.request_id || vr.id, // Use original request ID if available
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
                    card_details: details
                };
            }).filter(Boolean);

            console.log('Processed vendor requests:', combinedData);
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
            // Update the vendor_requests status to 'accepted' directly using its ID
            const { error: vendorError } = await supabase
                .from('vendor_requests')
                .update({ status: 'accepted' })
                .eq('id', vendorRequestId);

            if (vendorError) {
                toast.error(vendorError.message);
                return;
            }

            toast.success('Request accepted successfully! Download button is now available.');
            fetchVendorRequests();
        } catch (error) {
            console.error('Error accepting request:', error);
            toast.error('Failed to accept request');
        }
    };

    const handleReject = async (vendorRequestId: number) => {
        try {
            // Update the vendor_requests status to 'rejected' directly using its ID
            const { error: vendorError } = await supabase
                .from('vendor_requests')
                .update({ status: 'rejected' })
                .eq('id', vendorRequestId);

            if (vendorError) {
                toast.error(vendorError.message);
                return;
            }

            toast.success('Request rejected successfully!');
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

                // Update status to completed in database
                await updateRequestStatus(request);
                toast.success('ID card downloaded successfully!');
                fetchVendorRequests();
                return;
            } catch (error) {
                console.error('Error downloading ZIP:', error);
                toast.error('Failed to download ZIP file');
            }
        }

        setProcessingRequest(request);

        // Wait for the hidden card to render
        await new Promise(resolve => setTimeout(resolve, 500));

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

                // Update status to completed in database
                await updateRequestStatus(request);

                toast.success('ID card downloaded successfully! Status updated.');
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
        // 1. Update vendor_requests status
        const { error: updateError } = await supabase
            .from('vendor_requests')
            .update({ status: 'completed' })
            .eq('id', request.vendor_request_id);

        if (updateError) console.error('Error updating vendor_requests status:', updateError);

        // 2. Update individual request if it exists
        if (request.id && !request.batch_id) {
            const { error: requestUpdateError } = await supabase
                .from('requests')
                .update({ status: 'Printed', print_status: 'printed' })
                .eq('id', request.id);
            if (requestUpdateError) console.error('Error updating request status:', requestUpdateError);
        }

        // 3. Update bulk card if it belongs to a batch
        if (request.batch_id) {
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

            // Check if all cards in batch are printed
            const { data: remainingCards } = await supabase
                .from('id_cards')
                .select('id')
                .eq('batch_id', request.batch_id)
                .neq('print_status', 'printed');

            if (!remainingCards || remainingCards.length === 0) {
                await supabase
                    .from('card_batches')
                    .update({ status: 'sent_for_printing' })
                    .eq('batch_id', request.batch_id);
            }
        }
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className={`bg-gray-100 text-black w-64 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:translate-x-0 md:relative`}>
                <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center">
                        <img src={logo} alt="Clove Dental" className="h-10 mr-3" />

                    </div>
                    <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>
                <nav className="mt-10">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`w-full flex items-center px-4 py-2 hover:bg-gray-200 transition-colors ${activeTab === 'active' ? 'bg-gray-200 text-black font-semibold' : 'text-gray-800'}`}
                    >
                        <Menu className="mr-3" size={20} />
                        Active Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`w-full flex items-center px-4 py-2 hover:bg-gray-200 transition-colors ${activeTab === 'completed' ? 'bg-gray-200 text-black font-semibold' : 'text-gray-800'}`}
                    >
                        <CheckCircle className="mr-3" size={20} />
                        Completed Cards
                    </button>
                </nav>
                <div className="absolute bottom-0 w-full p-4 space-y-2">
                    <button
                        onClick={clearSession}
                        className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                        <XCircle className="mr-2" />
                        Clear Session
                    </button>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        <LogOut className="mr-2" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-white shadow-md p-4 flex justify-between items-center">
                    <button className="md:hidden" onClick={() => setIsSidebarOpen(true)}>
                        <Menu size={24} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">{activeTab === 'active' ? 'Active Requests' : 'Completed Cards'}</h1>
                    <div className="flex items-center">
                        <span className="mr-4">Welcome, {user?.email}</span>
                    </div>
                </header>

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-200 p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="loader">Loading...</div>
                        </div>
                    ) : (
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">ID</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Full Name</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Employee ID</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Branch</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Status</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Sent At</th>
                                            <th className="py-3 px-4 text-left text-sm font-medium text-gray-600 dark:text-gray-300">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requests.filter(request => activeTab === 'active' ? request.vendor_status !== 'completed' : request.vendor_status === 'completed').length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-10 text-center text-gray-500">
                                                    No {activeTab === 'active' ? 'active' : 'completed'} requests found.
                                                </td>
                                            </tr>
                                        ) : (
                                            requests
                                                .filter(request => activeTab === 'active' ? request.vendor_status !== 'completed' : request.vendor_status === 'completed')
                                                .map(request => (
                                                    <tr key={request.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.id}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.name}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.employeeId}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.branch}</td>
                                                        <td className="py-3 px-4 text-sm">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${request.vendor_status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                                request.vendor_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                    request.vendor_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                                                        'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {request.vendor_status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{new Date(request.sent_at).toLocaleString()}</td>
                                                        <td className="py-3 px-4 text-sm">
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    onClick={() => setViewingRequest(request)}
                                                                    className="p-1 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700"
                                                                    title="View Request"
                                                                >
                                                                    <Eye size={18} />
                                                                </button>

                                                                {request.vendor_status === 'sent' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleAccept(request.vendor_request_id)}
                                                                            className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 text-xs font-medium"
                                                                        >
                                                                            Accept
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleReject(request.vendor_request_id)}
                                                                            className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 text-xs font-medium"
                                                                        >
                                                                            Reject
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {(request.vendor_status === 'accepted' || request.vendor_status === 'completed') && (
                                                                    <button
                                                                        onClick={() => handleDownload(request)}
                                                                        className="p-1 rounded-md text-blue-600 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-gray-700"
                                                                        title="Download ID Card"
                                                                    >
                                                                        <Download size={18} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </main>
            </div>

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
                />
            )}
        </div>
    );
};

export default VendorDashboard;