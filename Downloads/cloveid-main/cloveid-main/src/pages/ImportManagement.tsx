import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import logo from '@/assets/CLOVE LOGO BLACK.png';
import JSZip from 'jszip';
import { useAuth } from '@/hooks/useAuth';
import AdminHeader from '../components/AdminHeader';
import { supabase } from '@/lib/supabaseClient';
import html2canvas from 'html2canvas';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { imageToDataUrl } from '@/lib/utils';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import ViewRequestModal from '../components/ViewRequestModal';
import { Box } from 'lucide-react';

const ImportManagement = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { initialCsvData = [], headers: initialHeaders = [] } = location.state || {};
    const [csvData, setCsvData] = useState(initialCsvData);
    const [headers, setHeaders] = useState<string[]>(initialHeaders);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
    const [filterAvailableOnly, setFilterAvailableOnly] = useState(false);
    const [zipUrls, setZipUrls] = useState<Record<number, string>>(location.state?.zipUrls || {});
    const [cardIds, setCardIds] = useState<Record<number, number>>(location.state?.cardIds || {});
    const [cardPrintStatuses, setCardPrintStatuses] = useState<Record<number, string>>(location.state?.cardPrintStatuses || {});
    const [isSaving, setIsSaving] = useState(false);
    const [batchId, setBatchId] = useState<string | null>(location.state?.batchId || null);
    const [vendors, setVendors] = useState<any[]>([]);
    const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
    const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
    const [processingRequest, setProcessingRequest] = useState<any>(null);
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [viewingRequest, setViewingRequest] = useState<any>(null);

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
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        const { data, error } = await supabase.from('vendors').select('id,name');
        if (error) {
            console.error('Error fetching vendors:', error);
        } else {
            setVendors(data);
        }
    };

    useEffect(() => {
        const fetchBatchData = async () => {
            if (location.state?.batchId) {
                const bId = location.state.batchId;
                setBatchId(bId);
                
                const { data: cards, error } = await supabase
                    .from('id_cards')
                    .select('*')
                    .eq('batch_id', bId);

                if (error) {
                    toast.error('Error loading batch data');
                    return;
                }

                if (cards && cards.length > 0) {
                    // Reconstruct headers and csvData
                    const firstCardData = cards[0].card_data;
                    const loadedHeaders = Object.keys(firstCardData).filter(h => h !== 'zip_url');
                    const loadedCsvData = cards.map(card => {
                        return loadedHeaders.map(h => card.card_data[h]);
                    });

                    const loadedZipUrls: Record<number, string> = {};
                    const loadedCardIds: Record<number, number> = {};
                    const loadedPrintStatuses: Record<number, string> = {};
                    cards.forEach((card, idx) => {
                        loadedCardIds[idx] = card.id;
                        if (card.card_data.zip_url) {
                            loadedZipUrls[idx] = card.card_data.zip_url;
                        }
                        if (card.print_status) {
                            loadedPrintStatuses[idx] = card.print_status;
                        }
                    });

                    setZipUrls(loadedZipUrls);
                    setCardIds(loadedCardIds);
                    setCardPrintStatuses(loadedPrintStatuses);
                    setHeaders(loadedHeaders);
                    setCsvData(loadedCsvData);
                }
            }
        };

        if (location.state?.batchId && !location.state?.csvData) {
            fetchBatchData();
        }
    }, [location.state]);

    useEffect(() => {
        const { updatedEmployee, rowIndex, zipUrl, csvData: updatedCsvData, headers: updatedHeaders, cardIds: updatedCardIds, batchId: updatedBatchId } = location.state || {};

        if (updatedCsvData) {
            setCsvData(updatedCsvData);
            if (updatedHeaders) {
                setHeaders(updatedHeaders);
            }
            if (updatedCardIds) {
                setCardIds(updatedCardIds);
            }
            if (updatedBatchId) {
                setBatchId(updatedBatchId);
            }
            
            const dataToUpdate = updatedCsvData || initialCsvData;
            const newCsvData = dataToUpdate.map((row: any[]) => [...row]);

            if (zipUrl && rowIndex !== undefined) {
                setZipUrls(prev => ({ ...prev, [rowIndex]: zipUrl }));
            }

            if (updatedEmployee && rowIndex !== undefined && rowIndex !== -1) {
                const headersToUse = updatedHeaders || headers;
                const newRow = [...(newCsvData[rowIndex] || [])];

                const headerMapping: { [key: string]: string } = {
                    'full name': 'fullName',
                    'employee id': 'employeeId',
                    'blood group': 'bloodGroup',
                    'branch': 'branch',
                    'emergency contact': 'emergencyContact',
                    'emergency no': 'emergencyContact',
                    'photo': 'photo',
                    'image': 'photo',
                    'photo (upload)': 'photo',
                };

                headersToUse.forEach((header: string, headerIndex: number) => {
                    const key = String(header || '').trim().toLowerCase();
                    const employeeKey = headerMapping[key];
                    if (employeeKey) {
                        newRow[headerIndex] = updatedEmployee[employeeKey as keyof typeof updatedEmployee];
                    }
                });
                
                // Update the row in newCsvData
                newCsvData[rowIndex] = newRow;

                const currentZipUrls = location.state?.zipUrls || {};
                if (zipUrl && rowIndex !== undefined) {
                    currentZipUrls[rowIndex] = zipUrl;
                }

                const currentCardIds = updatedCardIds || cardIds;
                const currentBatchId = updatedBatchId || batchId;

                navigate(location.pathname, { 
                    replace: true, 
                    state: { 
                        csvData: newCsvData, 
                        headers: headersToUse, 
                        zipUrls: currentZipUrls,
                        cardIds: currentCardIds,
                        batchId: currentBatchId
                    } 
                });
            }
        }
    }, [location.state, initialCsvData, headers]);

    // Initialize zipUrls from existing blob URLs in csvData (legacy support)
    useEffect(() => {
        const photoIndex = getPhotoColumnIndex();
        if (photoIndex !== -1) {
            const newZipUrls: Record<number, string> = {};
            csvData.forEach((row, index) => {
                const cell = row[photoIndex];
                if (typeof cell === 'string' && cell.startsWith('blob:')) {
                    newZipUrls[index] = cell;
                }
            });
            if (Object.keys(newZipUrls).length > 0) {
                setZipUrls(prev => ({ ...prev, ...newZipUrls }));
            }
        }
    }, []);

    const getPhotoColumnIndex = React.useCallback(() => {
        const lowerCaseHeaders = headers.map(h => String(h || '').toLowerCase());
        const photoIndex = lowerCaseHeaders.indexOf('photo (upload)');
        if (photoIndex !== -1) return photoIndex;
        const imageIndex = lowerCaseHeaders.indexOf('image');
        if (imageIndex !== -1) return imageIndex;
        return lowerCaseHeaders.indexOf('photo');
    }, [headers]);

    const isZipAvailable = (index: number) => {
        return !!zipUrls[index];
    };

    const handleEdit = (rowData: string[], rowIndex: number) => {
        const cardId = cardIds[rowIndex];
        navigate('/bulk-card-editor', { state: { rowData, headers, rowIndex, csvData, zipUrls, cardId, batchId, cardIds } });
    };

    const handleDownload = (rowData: string[], rowIndex: number) => {
        const fullNameIndex = headers.indexOf('Full Name');
        const employeeName = fullNameIndex !== -1 ? rowData[fullNameIndex] : 'employee';

        const zipUrl = zipUrls[rowIndex];
        if (!zipUrl) {
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

    const handleSaveBatch = async () => {
        if (csvData.length === 0) {
            toast.error('No data to save');
            return;
        }

        setIsSaving(true);
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const user = currentSession?.user;
            if (!user) throw new Error('User not authenticated');

            let finalBatchId = batchId;

            if (!finalBatchId) {
                // 1. Generate Batch ID
                const { data: lastBatch } = await supabase
                    .from('card_batches')
                    .select('batch_id')
                    .order('batch_id', { ascending: false })
                    .limit(1);
                
                let nextBatchNumber = 1;
                if (lastBatch && lastBatch.length > 0) {
                    const lastId = lastBatch[0].batch_id;
                    const match = lastId.match(/B-(\d+)/);
                    if (match) {
                        nextBatchNumber = parseInt(match[1]) + 1;
                    }
                }
                finalBatchId = `B-${String(nextBatchNumber).padStart(5, '0')}`;

                // 2. Insert into card_batches
                const { error: batchError } = await supabase
                    .from('card_batches')
                    .insert([{
                        batch_id: finalBatchId,
                        name: `Batch ${finalBatchId}`,
                        total_cards: csvData.length,
                        status: 'pending',
                        created_by: user.id
                    }]);

                if (batchError) throw batchError;
                setBatchId(finalBatchId);
            } else {
                // Update existing batch
                await supabase
                    .from('card_batches')
                    .update({ total_cards: csvData.length, updated_at: new Date().toISOString() })
                    .eq('batch_id', finalBatchId);
                
                // Delete existing cards to re-insert (or we could update, but re-insert is simpler for bulk)
                await supabase
                    .from('id_cards')
                    .delete()
                    .eq('batch_id', finalBatchId);
            }

            // 3. For each row, find/create employee and insert into id_cards
            const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
            const idIndex = lowerHeaders.findIndex(h => h === 'employee id' || h === 'id' || h === 'employeeid' || h === 'emp id');
            const nameIndex = lowerHeaders.findIndex(h => h === 'full name' || h === 'name' || h === 'employee name');
            const branchIndex = lowerHeaders.findIndex(h => h === 'branch' || h === 'location');
            const emailIndex = lowerHeaders.findIndex(h => h === 'email' || h === 'email address');
            const photoIndex = getPhotoColumnIndex();

            const cardsToInsert = [];

            for (let i = 0; i < csvData.length; i++) {
                const row = csvData[i];
                const employeeIdStr = idIndex !== -1 ? String(row[idIndex] || '').trim() : '';
                const employeeName = nameIndex !== -1 ? String(row[nameIndex] || '') : 'Unknown';

                if (!employeeIdStr) {
                    console.warn(`Row ${i} skipped: Missing Employee ID`);
                    continue;
                }

                // Helper to upload media if it's local (blob or dataUrl)
                const uploadMedia = async (url: string, prefix: string, ext: string) => {
                    if (!url || (!url.startsWith('blob:') && !url.startsWith('data:'))) return url;

                    try {
                        const response = await fetch(url);
                        const blob = await response.blob();
                        const fileName = `${employeeIdStr}_${prefix}.${ext}`;
                        const path = `bulk/${finalBatchId}/${fileName}`;
                        
                        const { error } = await supabase.storage
                            .from('id-card-images')
                            .upload(path, blob, { upsert: true });
                        
                        if (error) throw error;
                        return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
                    } catch (err) {
                        console.error(`Error uploading ${prefix}:`, err);
                        return url;
                    }
                };

                let { data: employee } = await supabase
                    .from('employees')
                    .select('id')
                    .eq('employee_id', employeeIdStr)
                    .maybeSingle();

                if (!employee) {
                    const email = emailIndex !== -1 ? String(row[emailIndex] || '').trim() : `${employeeIdStr.toLowerCase()}@clove.com`;
                    const rawBranch = branchIndex !== -1 ? String(row[branchIndex] || '').toUpperCase().trim() : 'HYD';
                    
                    // Validate branch enum: 'HYD', 'VIZAG', 'BLR', 'MUM', 'DEL'
                    const validBranches = ['HYD', 'VIZAG', 'BLR', 'MUM', 'DEL'];
                    const finalBranch = validBranches.includes(rawBranch) ? rawBranch : 'HYD';

                    const { data: newEmployee, error: empError } = await supabase
                        .from('employees')
                        .insert([{
                            employee_id: employeeIdStr,
                            name: employeeName,
                            branch: finalBranch,
                            email: email || `${employeeIdStr.toLowerCase()}@clove.com`
                        }])
                        .select()
                        .single();
                    
                    if (empError) {
                        console.error(`Error creating employee for row ${i}:`, empError);
                        continue;
                    }
                    employee = newEmployee;
                }

                if (!employee) continue;

                // 4. Prepare card data and upload local media
                const cardData: Record<string, any> = {};
                
                // Upload edited photo if it's local
                if (photoIndex !== -1 && row[photoIndex]) {
                    row[photoIndex] = await uploadMedia(row[photoIndex], 'photo', 'png');
                }

                headers.forEach((header, hIdx) => {
                    cardData[header] = row[hIdx];
                });

                // Save and upload zipUrl if available
                if (zipUrls[i]) {
                    cardData['zip_url'] = await uploadMedia(zipUrls[i], 'id_card', 'zip');
                }

                cardsToInsert.push({
                    employee_id: employee.id,
                    batch_id: finalBatchId,
                    card_data: cardData,
                    photo_url: (photoIndex !== -1 && row[photoIndex]) ? row[photoIndex] : null,
                    zip_url: cardData['zip_url'] || null,
                    status: 'pending',
                    created_by: user.id
                });
            }

            if (cardsToInsert.length > 0) {
                const { error: cardError } = await supabase
                    .from('id_cards')
                    .insert(cardsToInsert);

                if (cardError) throw cardError;
            }

            toast.success(`Batch ${finalBatchId} saved successfully!`);
            navigate('/dashboard');

        } catch (error: any) {
            console.error('Save error:', error);
            toast.error(`Error saving batch: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownloadAll = async () => {
        if (selectedRows.size === 0) {
            toast.error('Please select at least one row to download');
            return;
        }

        try {
            const fullNameIndex = headers.indexOf('Full Name');

            const masterZip = new JSZip();
            let hasValidZips = false;

            for (const rowIndex of selectedRows) {
                const row = csvData[rowIndex];
                const zipUrl = zipUrls[rowIndex];
                const employeeName = fullNameIndex !== -1 ? row[fullNameIndex] : `employee_${rowIndex}`;

                if (zipUrl) {
                    try {
                        const response = await fetch(zipUrl);
                        if (!response.ok) throw new Error(`Failed to fetch ZIP for ${employeeName}`);
                        const blob = await response.blob();
                        const zip = new JSZip();
                        const loadedZip = await zip.loadAsync(blob);

                        loadedZip.forEach((relativePath: string, file: JSZip.JSZipObject) => {
                            if (!file.dir) {
                                masterZip.file(`${employeeName}/${relativePath}`, file.async('blob'));
                            }
                        });
                        hasValidZips = true;
                    } catch (err) {
                        console.error(`Error processing row ${rowIndex} (${employeeName}):`, err);
                        toast.error(`Failed to process ZIP for ${employeeName}`);
                    }
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

    const filteredData = React.useMemo(() => {
        const dataWithIndex = csvData.map((row, index) => ({ row, index }));

        if (filterAvailableOnly) {
            return dataWithIndex.filter(({ index }) => isZipAvailable(index));
        }

        if (!searchQuery) {
            return dataWithIndex;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        const nameIndex = headers.indexOf('Full Name');
        const idIndex = headers.indexOf('Employee ID');
        const branchIndex = headers.indexOf('Branch');

        return dataWithIndex.filter(({ row }) => {
            const name = nameIndex !== -1 ? String(row[nameIndex] ?? '').toLowerCase() : '';
            const id = idIndex !== -1 ? String(row[idIndex] ?? '').toLowerCase() : '';
            const branch = branchIndex !== -1 ? String(row[branchIndex] ?? '').toLowerCase() : '';
            return name.includes(lowercasedQuery) || id.includes(lowercasedQuery) || branch.includes(lowercasedQuery);
        });
    }, [csvData, searchQuery, filterAvailableOnly, zipUrls]);

    const handleRowCheckboxChange = (rowIndex: number) => {
        const newSelectedRows = new Set(selectedRows);
        if (selectedRows.has(rowIndex)) {
            newSelectedRows.delete(rowIndex);
        } else {
            newSelectedRows.add(rowIndex);
        }
        setSelectedRows(newSelectedRows);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const newSelectedRows = new Set<number>();
            filteredData.forEach(({ index }) => {
                newSelectedRows.add(index);
            });
            setSelectedRows(newSelectedRows);
        } else {
            setSelectedRows(new Set());
        }
    };

    const photoColumnIndex = getPhotoColumnIndex();

    const handleDeleteSelectedRows = () => {
        if (selectedRows.size === 0) {
            toast.error('No rows selected');
            return;
        }

        const newCsvData = csvData.filter((_, index) => !selectedRows.has(index));
        setCsvData(newCsvData);
        setSelectedRows(new Set());
        toast.success(`Deleted ${selectedRows.size} rows`);
    };

    const handleDeleteBatch = async () => {
        if (!batchId) {
            toast.error('No batch to delete');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this entire batch? This action cannot be undone.')) {
            return;
        }

        setIsSaving(true);
        try {
            console.log('Starting deletion for batch:', batchId);
            
            // Delete id_cards first
            const { error: cardsError, count: cardsCount } = await supabase
                .from('id_cards')
                .delete({ count: 'exact' })
                .eq('batch_id', batchId);

            console.log('id_cards delete result:', { cardsError, cardsCount });
            if (cardsError) throw cardsError;

            // Delete the batch
            const { error: batchError, count: batchCount } = await supabase
                .from('card_batches')
                .delete({ count: 'exact' })
                .eq('batch_id', batchId);

            console.log('card_batches delete result:', { batchError, batchCount });
            if (batchError) throw batchError;

            if (batchCount === 0) {
                console.warn('Batch deletion returned 0 count. This usually means RLS is blocking the DELETE operation or the batch ID is incorrect.');
                toast.error('Deletion failed: Permission denied or batch not found. Please check Supabase RLS policies.');
                return;
            }

            toast.success('Batch deleted successfully');
            setTimeout(() => {
                navigate('/dashboard');
            }, 500);
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(`Error deleting batch: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRow = (index: number) => {
        const newCsvData = [...csvData];
        newCsvData.splice(index, 1);
        setCsvData(newCsvData);

        // Update selectedRows if necessary
        if (selectedRows.has(index)) {
            const newSelectedRows = new Set(selectedRows);
            newSelectedRows.delete(index);
            setSelectedRows(newSelectedRows);
        }

        toast.success('Row deleted');
    };

    const handleMarkAsDone = async (rowIndex: number) => {
        const cardId = cardIds[rowIndex];
        if (!cardId) {
            toast.error('Card ID not found');
            return;
        }

        const { data, error } = await supabase
            .from('id_cards')
            .update({ print_status: 'ready_to_collect', status: 'completed' })
            .eq('id', cardId)
            .select();

        if (error) {
            console.error('Error marking as done:', error);
            toast.error('Failed to mark card as ready to collect');
        } else if (data) {
            toast.success('Card marked as ready to collect!');
            setCardPrintStatuses(prev => ({ ...prev, [rowIndex]: 'ready_to_collect' }));

            // Check if all cards in this batch are ready to collect
            if (batchId) {
                const { data: remainingCards } = await supabase
                    .from('id_cards')
                    .select('id')
                    .eq('batch_id', batchId)
                    .neq('print_status', 'ready_to_collect');

                if (!remainingCards || remainingCards.length === 0) {
                    await supabase
                        .from('card_batches')
                        .update({ status: 'completed', completed_at: new Date().toISOString() })
                        .eq('batch_id', batchId);
                }
            }
        }
    };

    const csvRowToEmployee = (row: string[], rowIndex: number) => {
        const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
        const nameIndex = lowerHeaders.findIndex(h => h === 'full name' || h === 'name' || h === 'employee name');
        const idIndex = lowerHeaders.findIndex(h => h === 'employee id' || h === 'id' || h === 'employeeid' || h === 'emp id');
        const bloodGroupIndex = lowerHeaders.findIndex(h => h === 'blood group' || h === 'bloodgroup');
        const branchIndex = lowerHeaders.findIndex(h => h === 'branch' || h === 'location');
        const emergencyContactIndex = lowerHeaders.findIndex(h => h === 'emergency contact' || h === 'emergency no' || h === 'emergencycontact');
        const photoIndex = getPhotoColumnIndex();

        return {
            fullName: nameIndex !== -1 ? String(row[nameIndex] || '') : 'Unknown',
            employeeId: idIndex !== -1 ? String(row[idIndex] || '') : '',
            bloodGroup: bloodGroupIndex !== -1 ? String(row[bloodGroupIndex] || '') : '',
            branch: branchIndex !== -1 ? String(row[branchIndex] || '') : '',
            emergencyContact: emergencyContactIndex !== -1 ? String(row[emergencyContactIndex] || '') : '',
            photo: photoIndex !== -1 ? String(row[photoIndex] || '') : '',
            photo_url: photoIndex !== -1 ? String(row[photoIndex] || '') : '',
            zip_url: zipUrls[rowIndex] || null,
            countryCode: '+91',
        };
    };

    const handleViewCard = (row: string[], rowIndex: number) => {
        const employee = csvRowToEmployee(row, rowIndex);
        const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
        const nameIndex = lowerHeaders.findIndex(h => h === 'full name' || h === 'name' || h === 'employee name');

        // Create a request object for the modal
        const request = {
            id: rowIndex,
            name: employee.fullName,
            employeeId: employee.employeeId,
            date: new Date().toLocaleDateString(),
            status: 'Preview',
            photo: employee.photo,
            bloodGroup: employee.bloodGroup,
            branch: employee.branch,
            emergencyContact: employee.emergencyContact,
        };

        setViewingRequest(request);
    };

    const confirmSendToPrint = async () => {
        if (!selectedVendorId) {
            toast.error('Please select a vendor.');
            return;
        }

        if (selectedRows.size === 0) {
            toast.error('Please select at least one row to send.');
            return;
        }

        setIsDownloading(true);

        const recordsToInsert = [];

        for (const rowIndex of selectedRows) {
            const row = csvData[rowIndex];
            if (!row) continue;

            const cardId = cardIds[rowIndex];
            const employee = csvRowToEmployee(row, rowIndex);

            try {
                // If we have a cardId and batchId, try to fetch the zip_url from id_cards
                let existingZipUrl = zipUrls[rowIndex];
                let front_image_url = '';
                let back_image_url = '';

                if (cardId) {
                    const { data: cardData } = await supabase
                        .from('id_cards')
                        .select('zip_url, photo_url')
                        .eq('id', cardId)
                        .single();
                    
                    if (cardData?.zip_url) {
                        existingZipUrl = cardData.zip_url;
                    }
                }

                // If no ZIP URL exists, we fallback to generating images (backward compatibility or missing edits)
                if (!existingZipUrl) {
                    setProcessingRequest({ ...employee, id: rowIndex });
                    await new Promise(resolve => setTimeout(resolve, 500));

                    const cardElement = document.getElementById(`id-card-${rowIndex}`);
                    if (cardElement) {
                        const frontCanvas = await html2canvas(cardElement.querySelector('.id-card-front') as HTMLElement, { scale: 12, useCORS: true, allowTaint: true });
                        const backCanvas = await html2canvas(cardElement.querySelector('.id-card-back') as HTMLElement, { scale: 12, useCORS: true, allowTaint: true });

                        const frontImage = frontCanvas.toDataURL('image/png');
                        const backImage = backCanvas.toDataURL('image/png');

                        const frontImagePath = `public/bulk-${batchId || 'no-batch'}-${rowIndex}-front.png`;
                        const backImagePath = `public/bulk-${batchId || 'no-batch'}-${rowIndex}-back.png`;

                        const uploadImage = async (path: string, dataUrl: string) => {
                            const blob = await (await fetch(dataUrl)).blob();
                            const { error } = await supabase.storage
                                .from('id-card-images')
                                .upload(path, blob, { upsert: true });
                            if (error) throw error;
                            return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
                        };

                        [front_image_url, back_image_url] = await Promise.all([
                            uploadImage(frontImagePath, frontImage),
                            uploadImage(backImagePath, backImage),
                        ]);
                    }
                }

                recordsToInsert.push({
                    request_id: null,
                    vendor_id: selectedVendorId,
                    front_image_url: front_image_url || null,
                    back_image_url: back_image_url || null,
                    zip_url: existingZipUrl || null,
                    card_details: employee,
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    batch_id: batchId
                });

                // Update id_card status if it exists
                if (cardId) {
                    await supabase
                        .from('id_cards')
                        .update({ status: 'sent_for_printing' })
                        .eq('id', cardId);
                }

            } catch (error) {
                console.error(`Error processing row ${rowIndex}:`, error);
                toast.error(`Failed to process ID card for ${employee.fullName}.`);
            }
        }

        if (recordsToInsert.length > 0) {
            const { error: sendError } = await supabase
                .from('vendor_requests')
                .insert(recordsToInsert);

            if (sendError) {
                console.error('Error creating vendor request records:', sendError);
                toast.error('Failed to send requests to vendor.');
            } else {
                // Update batch status if all cards are sent
                if (batchId) {
                    const { data: remainingCards } = await supabase
                        .from('id_cards')
                        .select('id')
                        .eq('batch_id', batchId)
                        .neq('status', 'sent_for_printing');
                    
                    if (!remainingCards || remainingCards.length === 0) {
                        await supabase
                            .from('card_batches')
                            .update({ status: 'sent_for_printing', sent_for_printing_at: new Date().toISOString() })
                            .eq('batch_id', batchId);
                    }
                }

                toast.success('Requests sent to vendor successfully!');
                setSelectedRows(new Set());
                setIsVendorModalOpen(false);
                setSelectedVendorId(null);
            }
        }

        setIsDownloading(false);
        setProcessingRequest(null);
    };

    return (
        <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
            <div className="layout-container flex h-full grow flex-col">
                <AdminHeader setIsSidebarOpen={setIsSidebarOpen} activeTab="selection" />
                <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
                    <div className="layout-content-container flex flex-col max-w-7xl mx-auto flex-1">
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                            <div className="flex min-w-72 flex-col gap-2">
                                <p className="text-[#111418] dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">
                                    Bulk ID Card Management</p>
                                <p className="text-[#617289] dark:text-gray-400 text-base font-normal leading-normal">Review,
                                    approve, and process multiple ID cards at once.</p>
                            </div>
                            <div className="flex gap-2">
                                {batchId && (
                                    <button
                                        onClick={handleDeleteBatch}
                                        disabled={isSaving}
                                        className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-red-600/10 text-red-600 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4 hover:bg-red-600/20 transition-colors disabled:opacity-50"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                        <span className="truncate">Delete Batch</span>
                                    </button>
                                )}
                                <button
                                    onClick={handleSaveBatch}
                                    disabled={isSaving || csvData.length === 0}
                                    className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-green-600 text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4 hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    <span className="material-symbols-outlined text-base">save</span>
                                    <span className="truncate">{isSaving ? 'Saving...' : 'Save Batch'}</span>
                                </button>
                                <button
                                    onClick={handleDownloadAll}
                                    disabled={selectedRows.size === 0}
                                    className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-primary/10 dark:bg-primary/20 text-primary dark:text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">archive</span>
                                    <span className="truncate">Download Selected ({selectedRows.size})</span>
                                </button>
                                <button
                                    onClick={handleDeleteSelectedRows}
                                    disabled={selectedRows.size === 0}
                                    className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-red-600/10 text-red-600 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600/20 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-base">delete_sweep</span>
                                    <span className="truncate">Delete Selected ({selectedRows.size})</span>
                                </button>
                                <button
                                    onClick={() => setIsVendorModalOpen(true)}
                                    disabled={selectedRows.size === 0 || isDownloading}
                                    className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-primary text-white gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-4 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="material-symbols-outlined text-base">print</span>
                                    <span className="truncate">{isDownloading ? 'Processing...' : `Send to Print (${selectedRows.size})`}</span>
                                </button>
                            </div>
                        </div>
                        
                    <div className="flex flex-col gap-8">
                        <div
                            className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                            <div
                                className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="w-full md:w-1/3">
                                    <label className="flex flex-col min-w-40 h-10 w-full relative">
                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                            <span className="material-symbols-outlined text-[20px]">search</span>
                                        </div>
                                        <input
                                            className="text-gray-500 dark:text-gray-400 flex bg-white dark:bg-gray-900 items-center justify-center pl-10 rounded-lg border border-gray-200 dark:border-gray-700 h-full placeholder:text-gray-500 dark:placeholder:text-gray-400 px-4 text-sm font-normal leading-normal focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            placeholder="Search by Name, Employee ID, or Branch..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </label>
                                </div>
                                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 items-center">
                                    <button
                                        className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${!filterAvailableOnly ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                        onClick={() => setFilterAvailableOnly(false)}
                                    >
                                        All <span className={`ml-1 text-xs rounded-full px-1.5 py-0.5 ${!filterAvailableOnly ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>{csvData.length}</span>
                                    </button>
                                    <button
                                        onClick={() => setFilterAvailableOnly(true)}
                                        className={`flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 text-sm font-medium transition-colors ${filterAvailableOnly ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                        Available
                                    </button>
                                    <button
                                        className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
                                    >
                                        Pending
                                    </button>
                                    <button
                                        className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
                                    >
                                        Approved
                                    </button>
                                    <button
                                        className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium transition-colors"
                                    >
                                        Printed
                                    </button>
                                </div>
                            </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th className="px-6 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedRows.size > 0 && selectedRows.size === filteredData.length}
                                                ref={input => {
                                                    if (input) {
                                                        input.indeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length;
                                                    }
                                                }}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                            />
                                        </th>
                                        {headers.map(header => {
                                            let displayHeader = header;
                                            if (header.toLowerCase() === 'photo' || header.toLowerCase() === 'photo (upload)') {
                                                displayHeader = 'Image';
                                            }
                                            return <th key={header} className="px-6 py-3">{displayHeader}</th>;
                                        })}
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map(({ row, index: i }) => {
                                        return (
                                            <tr key={i} className={`border-b dark:border-gray-700 ${selectedRows.has(i) ? 'bg-gray-100 dark:bg-gray-900' : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'}`}>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRows.has(i)}
                                                        onChange={() => handleRowCheckboxChange(i)}
                                                    />
                                                </td>
                                                {row.map((cell, j) => {
                                                    if (j === photoColumnIndex) {
                                                        if (typeof cell === 'string') {
                                                            if (cell.startsWith('blob:')) {
                                                                // Legacy blob URL in cell - show placeholder
                                                                return (
                                                                    <td key={j} className="px-6 py-4">
                                                                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">
                                                                            -
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
                                                <td className="px-6 py-4">
                                                    {cardPrintStatuses[i] === 'ready_to_collect' ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            Ready to Collect
                                                        </span>
                                                    ) : cardPrintStatuses[i] === 'printed' ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                            Printed
                                                        </span>
                                                    ) : isZipAvailable(i) ? (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                            Sent to Print
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                                                            Not Sent
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewCard(row, i)}
                                                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400"
                                                            title="View Card"
                                                        >
                                                            <span className="material-symbols-outlined text-base">visibility</span>
                                                        </button>
                                                        <button
                                                            onClick={() => handleEdit(row, i)}
                                                            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                                                            title="Edit"
                                                        >
                                                            <span className="material-symbols-outlined text-base">edit</span>
                                                        </button>
                                                        {isZipAvailable(i) && (
                                                            <button
                                                                onClick={() => handleDownload(row, i)}
                                                                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-primary"
                                                                title="Download ZIP"
                                                            >
                                                                <span className="material-symbols-outlined text-base">download</span>
                                                            </button>
                                                        )}
                                                        {cardIds[i] && cardPrintStatuses[i] === 'printed' && (
                                                            <button
                                                                onClick={() => handleMarkAsDone(i)}
                                                                className="p-2 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center gap-1"
                                                                title="Mark as Ready to Collect"
                                                            >
                                                                <Box size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteRow(i)}
                                                            className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                                                            title="Delete"
                                                        >
                                                            <span className="material-symbols-outlined text-base">delete</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        </div>
                        <div className="flex justify-end gap-4">
                            <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-gray-200 text-gray-800 text-sm font-bold leading-normal" onClick={() => navigate(-1)}>
                                Back
                            </button>
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
                    <Link className="text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-primary text-sm font-medium leading-normal" to="/import-management">Bulk Actions</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="#">Settings</Link>
                    <button onClick={logout} className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </button>
                </nav>
            </div>
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
                                {isDownloading ? 'Processing...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {processingRequest && (
                <HiddenCardRenderer
                    id={`id-card-${processingRequest.id}`}
                    employee={{
                        fullName: processingRequest.fullName,
                        employeeId: processingRequest.employeeId,
                        bloodGroup: processingRequest.bloodGroup,
                        branch: processingRequest.branch,
                        emergencyContact: processingRequest.emergencyContact,
                        photo: processingRequest.photo,
                        countryCode: '+91'
                    }}
                />
            )}
            {viewingRequest && (
                <ViewRequestModal
                    request={viewingRequest}
                    onClose={() => setViewingRequest(null)}
                    onApprove={() => {}}
                    onReject={() => {}}
                    isVendorView={false}
                />
            )}
        </div>
    );
};

export default ImportManagement;