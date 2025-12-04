
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import logo from '@/assets/CLOVE LOGO BLACK.png';
import JSZip from 'jszip';

const ImportManagement = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { csvData: initialCsvData = [], headers = [] } = location.state || {};
    const [csvData, setCsvData] = useState(initialCsvData);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
    const processedRowIndexRef = useRef<number>(-1);

    useEffect(() => {
        const { updatedEmployee, rowIndex, zipUrl, csvData: updatedCsvData, headers: updatedHeaders } = location.state || {};

        if (updatedCsvData && processedRowIndexRef.current !== rowIndex) {
            setCsvData(updatedCsvData);
        }

        if (updatedEmployee && rowIndex !== undefined && rowIndex !== -1 && processedRowIndexRef.current !== rowIndex) {
            processedRowIndexRef.current = rowIndex;

            const dataToUpdate = updatedCsvData || initialCsvData;
            const newCsvData = [...dataToUpdate];
            const newRow = [...(newCsvData[rowIndex] || [])];

            const headersToUse = updatedHeaders || headers;
            headersToUse.forEach((header: string, headerIndex: number) => {
                const key = header.trim();
                switch (key) {
                    case 'Full Name':
                        newRow[headerIndex] = updatedEmployee.fullName;
                        break;
                    case 'Employee ID':
                        newRow[headerIndex] = updatedEmployee.employeeId;
                        break;
                    case 'Blood Group':
                        newRow[headerIndex] = updatedEmployee.bloodGroup;
                        break;
                    case 'Branch':
                        newRow[headerIndex] = updatedEmployee.branch;
                        break;
                    case 'Emergency Contact':
                        newRow[headerIndex] = updatedEmployee.emergencyContact;
                        break;
                    default:
                        break;
                }
            });

            if (zipUrl) {
                const photoHeaderIndex = getPhotoColumnIndex();
                if (photoHeaderIndex !== -1) {
                    newRow[photoHeaderIndex] = zipUrl;
                }
            }

            newCsvData[rowIndex] = newRow;
            setCsvData(newCsvData);
            toast.success('Employee details updated successfully!');

            navigate(location.pathname, { replace: true, state: { csvData: newCsvData, headers: headersToUse } });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.state, initialCsvData, headers]);

    const getPhotoColumnIndex = React.useCallback(() => {
        const lowerCaseHeaders = headers.map(h => h.toLowerCase());
        const photoIndex = lowerCaseHeaders.indexOf('photo (upload)');
        if (photoIndex !== -1) return photoIndex;
        return lowerCaseHeaders.indexOf('image');
    }, [headers]);

    const isZipAvailable = (zipUrl: unknown) => {
        if (!zipUrl || typeof zipUrl !== 'string') {
            return false;
        }
        return zipUrl.startsWith('blob:') || zipUrl.startsWith('http') || zipUrl.startsWith('data:');
    };

    const handleEdit = (rowData: string[], rowIndex: number) => {
        navigate('/bulk-card-editor', { state: { rowData, headers, rowIndex, csvData } });
    };

    const handleDownload = (rowData: string[]) => {
        const photoHeaderIndex = getPhotoColumnIndex();
        const fullNameIndex = headers.indexOf('Full Name');

        if (photoHeaderIndex === -1) {
            toast.error('Image column not found');
            return;
        }

        const zipUrl = rowData[photoHeaderIndex];
        const employeeName = fullNameIndex !== -1 ? rowData[fullNameIndex] : 'employee';

        if (!isZipAvailable(zipUrl)) {
            toast.error('ZIP file not available. Please edit and save the employee first.');
            return;
        }

        try {
            const link = document.createElement('a');
            link.href = zipUrl;
            link.download = `${employeeName.replace(/ /g, '_')}_ID_Card.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Download started!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download ZIP file');
        }
    };

    const filteredData = React.useMemo(() => {
        let data = csvData;

        if (filterAvailableOnly) {
            data = csvData.filter((row: string[]) => {
                const photoIndex = getPhotoColumnIndex();
                return isZipAvailable(row[photoIndex]);
            });
        }

        if (!searchQuery) {
            return data;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        const nameIndex = headers.indexOf('Full Name');
        const idIndex = headers.indexOf('Employee ID');
        const branchIndex = headers.indexOf('Branch');

        return data.filter((row: string[]) => {
            const name = nameIndex !== -1 ? String(row[nameIndex] ?? '').toLowerCase() : '';
            const id = idIndex !== -1 ? String(row[idIndex] ?? '').toLowerCase() : '';
            const branch = branchIndex !== -1 ? String(row[branchIndex] ?? '').toLowerCase() : '';
            return name.includes(lowercasedQuery) || id.includes(lowercasedQuery) || branch.includes(lowercasedQuery);
        });
    }, [csvData, searchQuery, headers, filterAvailableOnly, getPhotoColumnIndex]);

    const handleRowCheckboxChange = (rowIndex: number) => {
        const newSelectedRows = new Set(selectedRows);
        if (newSelectedRows.has(rowIndex)) {
            newSelectedRows.delete(rowIndex);
        } else {
            newSelectedRows.add(rowIndex);
        }
        setSelectedRows(newSelectedRows);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const newSelectedRows = new Set<number>();
            filteredData.forEach((row: string[]) => {
                const originalIndex = csvData.findIndex(originalRow => originalRow === row);
                newSelectedRows.add(originalIndex);
            });
            setSelectedRows(newSelectedRows);
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleDownloadAll = async () => {
        if (selectedRows.size === 0) {
            toast.error('Please select at least one row to download');
            return;
        }

        try {
            const photoHeaderIndex = getPhotoColumnIndex();
            const fullNameIndex = headers.indexOf('Full Name');
            const employeeIdIndex = headers.indexOf('Employee ID');

            if (photoHeaderIndex === -1) {
                toast.error('Image column not found');
                return;
            }

            const masterZip = new JSZip();
            let hasValidZips = false;

            for (const rowIndex of selectedRows) {
                const row = csvData[rowIndex];
                const zipUrl = row[photoHeaderIndex];
                const employeeName = fullNameIndex !== -1 ? row[fullNameIndex] : `employee_${rowIndex}`;
                const employeeId = employeeIdIndex !== -1 ? row[employeeIdIndex] : '';
                const folderName = employeeId
                    ? `${employeeId}_${employeeName}`.replace(/ /g, '_')
                    : employeeName.replace(/ /g, '_');

                if (isZipAvailable(zipUrl)) {
                    hasValidZips = true;
                    const response = await fetch(zipUrl);
                    const blob = await response.blob();
                    const zip = new JSZip();
                    const loadedZip = await zip.loadAsync(blob);

                    loadedZip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
                        if (!file.dir) {
                            masterZip.file(`${folderName}/${relativePath}`, file.async('blob'));
                        }
                    });
                }
            }

            if (!hasValidZips) {
                toast.error('No valid ZIP files found in selected rows');
                return;
            }

            const finalZip = await masterZip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(finalZip);
            link.download = `ID_Cards_${new Date().getTime()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            toast.success('Download started!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download ZIP files');
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
                            <a className="text-primary text-sm font-medium leading-normal" href="/dashboard">Dashboard</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
                            <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/import-management">Bulk Actions</a>
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
                <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                    <div className="layout-content-container flex flex-col max-w-7xl mx-auto flex-1">
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                            <div className="flex min-w-72 flex-col gap-2">
                                <p
                                    className="text-gray-800 dark:text-gray-100 text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                                    Bulk ID Card Management</p>
                                <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">Review,
                                    approve, and process multiple ID cards at once.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleDownloadAll}
                                    disabled={selectedRows.size === 0}
                                    className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-primary/20 dark:bg-primary/30 text-primary dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <span className="material-symbols-outlined text-base">archive</span>
                                    <span className="truncate">Download Selected ({selectedRows.size})</span>
                                </button>
                                <button
                                    className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-primary text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4">
                                    <span className="material-symbols-outlined text-base">print</span>
                                    <span className="truncate">Send All to Print</span>
                                </button>
                            </div>
                        </div>
                        <div
                            className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
                            <div
                                className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center">
                                <div className="w-full md:flex-1">
                                    <label className="flex flex-col min-w-40 h-12 w-full">
                                        <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                                            <div
                                                className="text-gray-500 dark:text-gray-400 flex bg-background-light dark:bg-gray-900/50 items-center justify-center pl-4 rounded-l-lg border-y border-l border-gray-200 dark:border-gray-700">
                                                <span className="material-symbols-outlined">search</span>
                                            </div>
                                            <input
                                                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-gray-800 dark:text-gray-200 focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 dark:border-gray-700 bg-background-light dark:bg-gray-900/50 h-full placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                                                placeholder="Search by Name, Employee ID, or Branch..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                    </label>
                                </div>
                                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                                    <button
                                        className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg pl-4 pr-3 ${!filterAvailableOnly ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                                        <p className="text-sm font-medium leading-normal">All</p>
                                        <span className={`text-xs rounded-full px-1.5 py-0.5 ${!filterAvailableOnly ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>{filteredData.length}</span>
                                    </button>
                                    <button
                                        onClick={() => setFilterAvailableOnly(!filterAvailableOnly)}
                                        className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg pl-4 pr-3 ${filterAvailableOnly ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        <p className="text-sm font-medium leading-normal">Available</p>
                                    </button>
                                    <button
                                        className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 pl-4 pr-3">
                                        <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">
                                            Pending</p>
                                    </button>
                                    <button
                                        className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 pl-4 pr-3">
                                        <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">
                                            Approved</p>
                                    </button>
                                    <button
                                        className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 pl-4 pr-3">
                                        <p className="text-gray-800 dark:text-gray-200 text-sm font-medium leading-normal">
                                            Printed</p>
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead
                                        className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="p-4" scope="col"><input
                                                className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-primary/50"
                                                type="checkbox"
                                                checked={selectedRows.size > 0 && selectedRows.size === filteredData.length}
                                                indeterminate={selectedRows.size > 0 && selectedRows.size < filteredData.length}
                                                onChange={(e) => handleSelectAll(e.target.checked)} /></th>
                                            {headers.map(header => <th key={header} className="px-6 py-3">{header}</th>)}
                                            <th className="px-6 py-3 text-right" scope="col">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredData.map((row) => {
                                            const originalIndex = csvData.findIndex(originalRow => originalRow === row);
                                            return (
                                                <tr key={originalIndex} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                                    <td className="w-4 p-4"><input
                                                        className="form-checkbox h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:ring-primary/50"
                                                        type="checkbox"
                                                        checked={selectedRows.has(originalIndex)}
                                                        onChange={() => handleRowCheckboxChange(originalIndex)} /></td>
                                                    {row.map((cell, j) => {
                                                        const header = headers[j];
                                                        if (header && (header.toLowerCase() === 'image' || header.toLowerCase() === 'photo (upload)')) {
                                                            if (typeof cell === 'string') {
                                                                if (cell.startsWith('blob:')) {
                                                                    return (
                                                                        <td key={j} className="px-6 py-4">
                                                                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center text-green-600">
                                                                                <span className="material-symbols-outlined text-base">done</span>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                } else if (cell.startsWith('http') || cell.startsWith('data:')) {
                                                                    return (
                                                                        <td key={j} className="px-6 py-4">
                                                                            <img
                                                                                src={cell}
                                                                                alt="ID Card"
                                                                                className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                                                                                title="Employee Photo"
                                                                                onError={(e) => {
                                                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                                                }}
                                                                            />
                                                                        </td>
                                                                    );
                                                                }
                                                            }
                                                            return (
                                                                <td key={j} className="px-6 py-4">
                                                                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                                                                        -
                                                                    </div>
                                                                </td>
                                                            );
                                                        }
                                                        return <td key={j} className="px-6 py-4">{cell}</td>;
                                                    })}
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEdit(row, originalIndex)}
                                                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"><span
                                                                    className="material-symbols-outlined text-base">edit</span></button>
                                                            <button
                                                                onClick={() => handleDownload(row)}
                                                                disabled={!isZipAvailable(row[getPhotoColumnIndex()])}
                                                                title={isZipAvailable(row[getPhotoColumnIndex()]) ? 'Download ID Card ZIP' : 'No ZIP generated yet'}
                                                                className="p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-blue-500"><span
                                                                    className="material-symbols-outlined text-base">download</span></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </main>
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
                        <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/dashboard">Dashboard</a>
                        <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="/selection">New Batch</a>
                        <a className="text-primary text-sm font-medium leading-normal" href="/import-management">Bulk Actions</a>
                        <a className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" href="#">Settings</a>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default ImportManagement;