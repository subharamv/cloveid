import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';
import ViewRequestModal from '../components/ViewRequestModal';

const ManageRequests = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedRequests, setSelectedRequests] = useState<number[]>([]);
    const [viewingRequest, setViewingRequest] = useState<any | null>(null);

    // Placeholder for request data
    const [requests, setRequests] = useState([
        { id: 1, name: 'Prasad K', employeeId: 'E12345', date: '2024-07-29', status: 'Pending', photo: 'https://res.cloudinary.com/dmoha80me/image/upload/v1764761272/xskvdovkzyrldjnantyt.jpg', bloodGroup: 'O+', branch: 'HYD', emergencyContact: '9876543210' },
        { id: 2, name: 'Yuva Subharam', employeeId: 'E67890', date: '2024-07-28', status: 'Approved', photo: 'https://res.cloudinary.com/dmoha80me/image/upload/v1764692271/hloog3tjaqy3vcwb9uhy.jpg', bloodGroup: 'A+', branch: 'HYD', emergencyContact: '9876543211' },
        { id: 3, name: 'Padimi V', employeeId: 'E11223', date: '2024-07-27', status: 'Rejected', photo: 'https://res.cloudinary.com/dmoha80me/image/upload/v1764593458/ogqu5okydaeethaswji5.png', bloodGroup: 'B+', branch: 'VIZAG', emergencyContact: '9876543212' },
    ]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRequests(requests.map((r) => r.id));
        } else {
            setSelectedRequests([]);
        }
    };

    const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: number) => {
        if (e.target.checked) {
            setSelectedRequests([...selectedRequests, id]);
        } else {
            setSelectedRequests(selectedRequests.filter((reqId) => reqId !== id));
        }
    };

    const handleSendToPrint = () => {
        console.log('Selected requests to print:', selectedRequests);
        // Add printing logic here
    };

    const handleApprove = (id: number) => {
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
        setViewingRequest(null);
    };

    const handleReject = (id: number) => {
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
        setViewingRequest(null);
    };

    const handleEdit = (id: number) => {
        navigate(`/edit-request/${id}`);
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-gray-200 dark:border-b-gray-700 px-2.5 py-3 bg-white dark:bg-background-dark">
                    <div className="flex items-center gap-4 text-gray-900 dark:text-white">
                        <button className="lg:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                            <span className="material-symbols-outlined text-2xl">menu</span>
                        </button>
                        <img src={logo} alt="Logo" className="h-8 w-auto" />
                    </div>
                    <div className="hidden lg:flex flex-1 justify-center gap-8">
                        <div className="flex items-center gap-9">
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/dashboard">Dashboard</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
                            <a className="text-primary text-sm font-medium leading-normal" href="/manage-requests">Manage Employees</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Settings</a>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                        </button>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" data-alt="User avatar image" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDTuk1Iosn49fHWfKjAP9fBJw3pQzsM6YL5zr-Cxka0K6IIkmxhTiisNLHxHNnJ9KANzspNqOKesKX_0x9HyVIotvJDUojrFn2AWhrITYpZtN0xi9T7ugql-9wNJQnqPuWDUZnZIbtnSxLe2Onfl1FMn0BF4vM61YkMxGtaPP6Gq-SqEPQfugyzpPDy7QoNGts7_1Abd7NSO-7z37gh5XlZ1BW6zV02LVXWhiY9TQDiVZOFWYhWBBRvJEJZ7Ys0spYA1NDiqcHthFzB")' }}></div>
                    </div>
                </header>
                <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
                    <div className="flex flex-1 justify-center py-5 sm:px-4 md:px-10 lg:px-20 xl:px-40">
                        <div className="layout-content-container flex flex-col w-full max-w-[960px] flex-1">
                            <div className="flex justify-between items-center mb-8">
                                <h1 className="text-2xl font-bold">Manage Employee Requests</h1>
                                <button
                                    className="bg-blue-500 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
                                    onClick={handleSendToPrint}
                                    disabled={selectedRequests.length === 0}
                                >
                                    Send to Print
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            <th className="py-3 px-4 text-left">
                                                <input
                                                    type="checkbox"
                                                    onChange={handleSelectAll}
                                                    checked={selectedRequests.length === requests.length && requests.length > 0}
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
                                        {requests.map((request) => (
                                            <tr key={request.id} className="border-b border-gray-200 dark:border-gray-700">
                                                <td className="py-3 px-4">
                                                    <input
                                                        type="checkbox"
                                                        onChange={(e) => handleSelectOne(e, request.id)}
                                                        checked={selectedRequests.includes(request.id)}
                                                    />
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.name}</td>
                                                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.employeeId}</td>
                                                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.date}</td>
                                                <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{request.status}</td>
                                                <td className="py-3 px-4 text-sm">
                                                    <button onClick={() => setViewingRequest(request)} className="bg-purple-500 text-white px-3 py-1 rounded-md mr-2">View</button>

                                                    <button className="bg-green-500 text-white px-3 py-1 rounded-md mr-2">Approve</button>
                                                    <button className="bg-red-500 text-white px-3 py-1 rounded-md">Reject</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
            {viewingRequest && (
                <ViewRequestModal
                    request={viewingRequest}
                    onClose={() => setViewingRequest(null)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onEdit={handleEdit}
                />
            )}
        </div>
    );
};

export default ManageRequests;