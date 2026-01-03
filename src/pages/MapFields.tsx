import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';
import { useAuth } from '../hooks/useAuth';
import AdminHeader from '../components/AdminHeader';

const MapFields = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [images, setImages] = useState<(string | null)[]>([]);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraIndex, setCameraIndex] = useState<number | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const rows = text.split('\n').map(row => row.split(','));
                setHeaders(rows[0]);
                const data = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
                setCsvData(data);
                setImages(new Array(data.length).fill(null));
                setSelectedRows(data.map((_, i) => i));
            };
            reader.readAsText(file);
        }
    };

    const handleChooseFileClick = () => {
        fileInputRef.current?.click();
    };

    useEffect(() => {
        if (location.state && location.state.file) {
            const file = location.state.file;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const rows = text.split('\n').map(row => row.split(','));
                setHeaders(rows[0]);
                const data = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ''));
                setCsvData(data);
                setImages(new Array(data.length).fill(null));
                setSelectedRows(data.map((_, i) => i));
            };
            reader.readAsText(file);
        }
    }, [location.state]);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newImages = [...images];
                newImages[index] = reader.result as string;
                setImages(newImages);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleConfirmMapping = () => {
        let imageColIndex = headers.findIndex(h => String(h || '').toLowerCase() === 'image');
        let newHeaders = [...headers];
        let newCsvData = csvData.map(row => [...row]);

        if (images.some(img => img !== null)) {
            if (imageColIndex === -1) {
                imageColIndex = newHeaders.length;
                newHeaders.push('Image');
                newCsvData = newCsvData.map(row => [...row, '']);
            }

            images.forEach((img, index) => {
                if (img) {
                    if (newCsvData[index]) {
                        newCsvData[index][imageColIndex] = img;
                    }
                }
            });
        }

        const selectedCsvData = newCsvData.filter((_, i) => selectedRows.includes(i));

        navigate("/import-management", { state: { csvData: selectedCsvData, headers: newHeaders } });
    };

    const handleEdit = (rowData: string[], rowIndex: number) => {
        navigate('/bulk-card-editor', { state: { rowData, headers, rowIndex, csvData } });
    };

    const handleCapture = async (index: number) => {
        setCameraIndex(index);
        setIsCameraOpen(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
    };

    const takePicture = () => {
        if (videoRef.current && cameraIndex !== null) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/png');
            const newImages = [...images];
            newImages[cameraIndex] = dataUrl;
            setImages(newImages);
            closeCamera();
        }
    };

    const closeCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
        setCameraIndex(null);
    };

    const handleSelectRow = (index: number) => {
        if (selectedRows.includes(index)) {
            setSelectedRows(selectedRows.filter(i => i !== index));
        } else {
            setSelectedRows([...selectedRows, index]);
        }
    };

    const handleSelectAll = () => {
        if (selectedRows.length === csvData.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(csvData.map((_, i) => i));
        }
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="selection" />
                <main className="flex-1 p-8">
                    <div className="max-w-7xl mx-auto flex flex-col gap-8">
                        <div className="flex flex-wrap justify-between items-start gap-3">
                            <div className="flex min-w-72 flex-col gap-2">
                                <p className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                                    Map Fields</p>
                                <p className="text-[#617289] dark:text-gray-400 text-base font-normal leading-normal">Match your CSV columns to the required ID card fields.</p>
                            </div>
                        </div>
                        <div className="flex gap-2 p-3 flex-wrap bg-white dark:bg-[#18212b] rounded-xl border border-gray-200 dark:border-gray-800">
                            <div className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary/10 dark:bg-primary/20 pl-2 pr-4 text-primary">
                                <span className="material-symbols-outlined !fill-1" style={{ fontSize: '20px' }}>check_circle</span>
                                <p className="text-sm font-medium leading-normal">1. Upload</p>
                            </div>
                            <div className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg pl-2 pr-4 ${csvData.length > 0 ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-[#f0f2f4] dark:bg-[#2c3746] text-[#617289] dark:text-gray-400'}`}>
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{csvData.length > 0 ? 'check_circle' : 'circle'}</span>
                                <p className="text-sm font-medium leading-normal">2. Map Fields</p>
                            </div>
                        </div>
                        {csvData.length === 0 ? (
                            <div className="flex flex-col p-4 bg-white dark:bg-[#18212b] rounded-xl border border-gray-200 dark:border-gray-800">
                                <div className="flex flex-col items-center gap-6 rounded-lg border-2 border-dashed border-[#dbe0e6] dark:border-gray-700 px-6 py-14 bg-background-light dark:bg-background-dark">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-primary" style={{ fontSize: '48px' }}>cloud_upload</span>
                                        <p className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center">
                                            Drag & drop your CSV file here</p>
                                        <p className="text-[#617289] dark:text-gray-400 text-sm font-normal leading-normal text-center">
                                            or click to browse</p>
                                    </div>
                                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                                    <button onClick={handleChooseFileClick} className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em]">
                                        <span className="truncate">Choose File</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4">
                                <div className="overflow-x-auto bg-white dark:bg-[#18212b] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">Preview & Map Data</h3>
                                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10">
                                                <tr>
                                                    {headers.map((header, index) => (
                                                        <th key={index} className="px-6 py-3 whitespace-nowrap">
                                                            {header}
                                                        </th>
                                                    ))}
                                                    <th className="px-6 py-3 whitespace-nowrap">Photo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {csvData.map((row, rowIndex) => (
                                                    <tr key={rowIndex} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                                        {row.map((cell, cellIndex) => (
                                                            <td key={cellIndex} className="px-6 py-4 whitespace-nowrap">
                                                                {cell}
                                                            </td>
                                                        ))}
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                {images[rowIndex] ? (
                                                                    <img src={images[rowIndex] || ''} alt="Preview" className="h-10 w-10 object-cover rounded-full border border-gray-200" />
                                                                ) : (
                                                                    <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                                                        <span className="material-symbols-outlined text-gray-400 text-xl">person</span>
                                                                    </div>
                                                                )}
                                                                <div className="flex gap-1">
                                                                    <label className="cursor-pointer p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors" title="Upload Photo">
                                                                        <input 
                                                                            type="file" 
                                                                            accept="image/*" 
                                                                            className="hidden" 
                                                                            onChange={(e) => handleImageUpload(e, rowIndex)}
                                                                        />
                                                                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-xl">upload</span>
                                                                    </label>
                                                                    <button 
                                                                        onClick={() => handleCapture(rowIndex)}
                                                                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                                                                        title="Take Photo"
                                                                    >
                                                                        <span className="material-symbols-outlined text-gray-600 dark:text-gray-300 text-xl">photo_camera</span>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                        Total rows: {csvData.length}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4">
                                    <button 
                                        onClick={() => setCsvData([])}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleConfirmMapping}
                                        className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-primary/90"
                                    >
                                        Confirm & Proceed
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="text-center">
                            <a className="text-[#617289] dark:text-gray-400 text-sm font-normal leading-normal underline hover:text-primary dark:hover:text-primary" href="/template.csv" download>Don't have a template? Download our CSV template</a>
                            <p className="text-[#617289] dark:text-gray-500 text-xs mt-2">Accepted format: .csv. Max file size: 5MB.
                            </p>
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
                    <Link className="text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/manage-requests">Manage Employees</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="#">Settings</Link>
                    <button onClick={logout} className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
            {isCameraOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                        <video ref={videoRef} autoPlay className="w-full h-auto" />
                        <div className="flex justify-center mt-4">
                            <button onClick={takePicture} className="p-2 bg-primary text-white rounded-full">
                                <span className="material-symbols-outlined">photo_camera</span>
                            </button>
                            <button onClick={closeCamera} className="p-2 bg-red-500 text-white rounded-full ml-4">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MapFields;
