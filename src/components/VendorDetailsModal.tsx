import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface VendorDetailsModalProps {
    vendor: any;
    onClose: () => void;
}

const VendorDetailsModal: React.FC<VendorDetailsModalProps> = ({ vendor, onClose }) => {
    const [sends, setSends] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            // 1. Fetch all sends for the vendor
            const { data: sendsData, error: sendsError } = await supabase
                .from('vendor_requests')
                .select('*')
                .eq('vendor_id', vendor.id);

            if (sendsError) {
                console.error('Error fetching vendor sends:', sendsError);
                setLoading(false);
                return;
            }
            setSends(sendsData);

            // 2. Collect all request IDs from all sends
            const allRequestIds = sendsData.reduce((acc, send) => [...acc, ...send.request_ids], []);

            if (allRequestIds.length > 0) {
                // 3. Fetch details for all requests
                const { data: requestsData, error: requestsError } = await supabase
                    .from('requests')
                    .select('*')
                    .in('id', allRequestIds);

                if (requestsError) {
                    console.error('Error fetching requests:', requestsError);
                } else {
                    setRequests(requestsData);
                }
            }
            setLoading(false);
        };

        fetchDetails();
    }, [vendor]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-background-dark p-8 rounded-md w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <h2 className="text-2xl font-bold mb-4">Details for {vendor.name}</h2>
                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div>
                        {sends.length === 0 ? (
                            <p>No ID cards have been sent to this vendor yet.</p>
                        ) : (
                            sends.map(send => (
                                <div key={send.id} className="mb-6 border p-4 rounded-md">
                                    <h3 className="text-lg font-semibold">
                                        Batch sent on: {new Date(send.created_at).toLocaleString()}
                                    </h3>
                                    <p>Number of IDs: {send.id_count}</p>
                                    <table className="min-w-full mt-2">
                                        <thead>
                                            <tr>
                                                <th className="text-left">Employee Name</th>
                                                <th className="text-left">Employee ID</th>
                                                <th className="text-left">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requests
                                                .filter(req => send.request_ids.includes(req.id))
                                                .map(req => (
                                                    <tr key={req.id}>
                                                        <td>{req.full_name}</td>
                                                        <td>{req.employee_id}</td>
                                                        <td>{req.status}</td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))
                        )}
                    </div>
                )}
                <div className="flex justify-end mt-4">
                    <button onClick={onClose} className="bg-gray-300 dark:bg-gray-600 p-2 rounded-md">Close</button>
                </div>
            </div>
        </div>
    );
};

export default VendorDetailsModal;