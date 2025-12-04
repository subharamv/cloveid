import React, { useState, useRef } from 'react';
import { IDCardFront } from './IDCardFront';
import { IDCardBack } from './IDCardBack';
import { Employee } from '@/types/employee';

interface Request {
    id: number;
    name: string;
    employeeId: string;
    date: string;
    status: string;
    photo?: string;
    bloodGroup: string;
    branch: string;
    emergencyContact: string;
}

interface ViewRequestModalProps {
    request: Request | null;
    onClose: () => void;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    onEdit: (id: number) => void;
}

const ViewRequestModal: React.FC<ViewRequestModalProps> = ({ request, onClose, onApprove, onReject, onEdit }) => {
    const [isCardFlipped, setCardFlipped] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const photoBoxRef = useRef<HTMLDivElement | null>(null);

    if (!request) return null;

    const employee: Employee = {
        fullName: request.name,
        employeeId: request.employeeId,
        bloodGroup: request.bloodGroup,
        branch: request.branch,
        emergencyContact: request.emergencyContact,
        countryCode: '+91',
        photo: request.photo || null,
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-background-dark p-8 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">View Request</h2>
                <div className="mb-4">
                    <p><strong>Employee Name:</strong> {request.name}</p>
                    <p><strong>Employee ID:</strong> {request.employeeId}</p>
                    <p><strong>Date Submitted:</strong> {request.date}</p>
                    <p><strong>Status:</strong> {request.status}</p>
                </div>
                <div className="mb-4">
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal mb-4">Click the card to see the back</p>
                    <div className={`relative h-[400px] w-full perspective-1000 flex items-center justify-center`}>
                        <div
                            className={`relative w-full h-full max-w-sm transition-transform duration-700 transform-style-preserve-3d cursor-pointer ${isCardFlipped ? 'rotate-y-180' : ''}`}
                            onClick={() => setCardFlipped(!isCardFlipped)}
                        >
                            <div className="absolute w-full h-full backface-hidden">
                                <div className="w-full h-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg flex items-center justify-center">
                                    <IDCardFront 
                                        employee={employee} 
                                        canvasRef={canvasRef} 
                                        photoBoxRef={photoBoxRef} 
                                        onPointerDown={() => {}} 
                                        onPointerMove={() => {}} 
                                        onPointerUp={() => {}} 
                                    />
                                </div>
                            </div>
                            <div className="absolute w-full h-full backface-hidden rotate-y-180">
                                <div className="w-full h-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg flex items-center justify-center">
                                    <IDCardBack employee={employee} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded-md">Close</button>
                    <button onClick={() => onApprove(request.id)} className="bg-green-500 text-white px-4 py-2 rounded-md">Approve</button>
                    <button onClick={() => onEdit(request.id)} className="bg-blue-500 text-white px-4 py-2 rounded-md">Edit</button>
                    <button onClick={() => onReject(request.id)} className="bg-red-500 text-white px-4 py-2 rounded-md">Reject</button>
                </div>
            </div>
        </div>
    );
};

export default ViewRequestModal;