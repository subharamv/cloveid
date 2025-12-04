import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/CLOVE LOGO BLACK.png';

const MapFields = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [csvData, setCsvData] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [images, setImages] = useState<(string | null)[]>([]);

    const handleLogout = () => {
        navigate('/');
    };

    useEffect(() => {
        if (location.state && location.state.file) {
            const file = location.state.file;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const rows = text.split('\n').map(row => row.split(','));
                setHeaders(rows[0]);
                const data = rows.slice(1);
                setCsvData(data);
                setImages(new Array(data.length).fill(null));
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
        let imageColIndex = headers.findIndex(h => h.toLowerCase() === 'image');
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

        navigate("/import-management", { state: { csvData: newCsvData, headers: newHeaders } });
    };

    const handleCapture = async (index: number) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            video.play();

            const takePicture = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/png');
                const newImages = [...images];
                newImages[index] = dataUrl;
                setImages(newImages);
                stream.getTracks().forEach(track => track.stop());
                document.body.removeChild(video);
                document.body.removeChild(button);
            };

            const button = document.createElement('button');
            button.textContent = 'Take Picture';
            button.onclick = takePicture;

            document.body.appendChild(video);
            document.body.appendChild(button);
        } catch (error) {
            console.error('Error accessing camera:', error);
        }
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
                            <a className="text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Manage Employees</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Settings</a>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="material-symbols-outlined text-xl">notifications</span>
                        </button>
                        <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" data-alt="User avatar image" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDTuk1Iosn49fHWfKjAP9fBJw3pQzsM6YL5zr-Cxka0K6IIkmxhTiisNLHxHNnJ9KANzspNqOKesKX_0x9HyVIotvJDUojrFn2AWhrITYpZtN0xi9T7ugql-9wNJQnqPuWDUZnZIbtnSxLe2Onfl1FMn0BF4vM61YkMxGtaPP6Gq-SqEPQfugyzpPDy7QoNGts7_1Abd7NSO-7z37gh5XlZ1BW6zV02LVXWhiY9TQDiVZOFWYhWBBRvJEJZ7Ys0spYA1NDiqcHthFzB")' }}></div>
                        <button onClick={handleLogout} className="hidden lg:flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 w-10 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
                            <span className="material-symbols-outlined text-xl">logout</span>
                        </button>
                    </div>
                </header>
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
                            <div
                                className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-[#f0f2f4] dark:bg-[#2c3746] pl-2 pr-4 text-[#617289] dark:text-gray-400">
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span>
                                <p className="text-sm font-medium leading-normal">1. Upload</p>
                            </div>
                            <div
                                className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-primary/10 dark:bg-primary/20 pl-2 pr-4 text-primary">
                                <span className="material-symbols-outlined !fill-1" style={{ fontSize: '20px' }}>check_circle</span>
                                <p className="text-sm font-medium leading-normal">2. Map Fields</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        {headers.map(header => <th key={header} className="px-6 py-3">{header}</th>)}
                                        <th className="px-6 py-3">Upload Photo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvData.map((row, i) => (
                                        <tr key={i} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                            {row.map((cell, j) => <td key={j} className="px-6 py-4">{cell}</td>)}
                                            <td className="px-6 py-4">
                                                {images[i] ? (
                                                    <img src={images[i]!} alt={`upload for row ${i}`} className="w-10 h-10 object-cover rounded-full" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleImageUpload(e, i)}
                                                    className="hidden"
                                                    id={`file-input-${i}`}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => document.getElementById(`file-input-${i}`)?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                        <span className="material-symbols-outlined text-base">add_photo_alternate</span>
                                                    </button>
                                                    <button onClick={() => handleCapture(i)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                                                        <span className="material-symbols-outlined text-base">add_a_photo</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal" onClick={() => navigate(-1)}>
                                Back
                            </button>
                            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold leading-normal" onClick={handleConfirmMapping}>
                                Confirm Mapping
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MapFields;