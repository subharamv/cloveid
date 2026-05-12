import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import JSZip from 'jszip';
import AppHeader from '../components/AppHeader';
import { supabase } from '@/lib/supabaseClient';
import html2canvas from 'html2canvas';
import { HiddenCardRenderer } from '../components/HiddenCardRenderer';
import { IDCardFront } from '../components/IDCardFront';
import { IDCardBack } from '../components/IDCardBack';
import { imageToDataUrl } from '@/lib/utils';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import {
    Box, ChevronLeft, Search, Loader2, Trash2, Download, Send, Eye, Edit3, X,
} from 'lucide-react';

const ImportManagement = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { initialCsvData = [], headers: initialHeaders = [] } = location.state || {};
    const [csvData, setCsvData] = useState(initialCsvData);
    const [headers, setHeaders] = useState<string[]>(initialHeaders);
    const [searchQuery, setSearchQuery] = useState('');
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
    const [deletedCardIds, setDeletedCardIds] = useState<number[]>([]);
    const [cardPhotoUrls, setCardPhotoUrls] = useState<Record<number, string>>(location.state?.cardPhotoUrls || {});
    const [cardViewEmployee, setCardViewEmployee] = useState<any>(null);
    const [isCardViewOpen, setIsCardViewOpen] = useState(false);
    const [isCardFlipped, setIsCardFlipped] = useState(false);

    useEffect(() => {
        const loadLogos = async () => {
            try {
                const [front, back] = await Promise.all([
                    imageToDataUrl(cloveLogo),
                    imageToDataUrl(backLogoSvg),
                ]);
                setFrontLogoDataUrl(front);
                setBackLogoDataUrl(back);
            } catch (error) {
                console.error('Error loading logos:', error);
            }
        };
        loadLogos();
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        const { data, error } = await supabase.from('vendors').select('id,name');
        if (error) console.error('Error fetching vendors:', error);
        else setVendors(data || []);
    };

    const checkAndUpdateBatchStatus = async (batchIdToCheck: string) => {
        if (!batchIdToCheck) return;
        try {
            const { data: cards, error } = await supabase
                .from('id_cards')
                .select('id, status, print_status')
                .eq('batch_id', batchIdToCheck);
            if (error || !cards || cards.length === 0) return;
            const allCompleted = cards.every(c =>
                c.print_status === 'printed' || c.print_status === 'ready_to_collect'
            );
            if (allCompleted) {
                const { error: updateError } = await supabase
                    .from('card_batches')
                    .update({ status: 'completed', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
                    .eq('batch_id', batchIdToCheck);
                if (!updateError) toast.success('Batch marked as completed!');
            }
        } catch (error) {
            console.error('Error in checkAndUpdateBatchStatus:', error);
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
                if (error) { toast.error('Error loading batch data'); return; }
                if (cards && cards.length > 0) {
                    const firstCardData = cards[0].card_data;
                    const loadedHeaders = Object.keys(firstCardData).filter(h => h !== 'zip_url' && h.toLowerCase() !== 'photo_url');
                    const lowerHeaders = loadedHeaders.map(h => String(h || '').toLowerCase());
                    const photoIndex = lowerHeaders.indexOf('photo (upload)') !== -1 ? lowerHeaders.indexOf('photo (upload)') :
                        lowerHeaders.indexOf('image') !== -1 ? lowerHeaders.indexOf('image') :
                            lowerHeaders.indexOf('photo');
                    const loadedCsvData = cards.map(card => {
                        const row = loadedHeaders.map(h => card.card_data[h]);
                        if (photoIndex !== -1 && typeof row[photoIndex] === 'string' && row[photoIndex].includes('image/fetch/')) {
                            row[photoIndex] = '';
                        }
                        if (photoIndex !== -1 && card.photo_url && !card.photo_url.includes('image/fetch/')) {
                            row[photoIndex] = card.photo_url;
                        }
                        return row;
                    });
                    const loadedZipUrls: Record<number, string> = {};
                    const loadedCardIds: Record<number, number> = {};
                    const loadedPrintStatuses: Record<number, string> = {};
                    const loadedCardPhotoUrls: Record<number, string> = {};
                    cards.forEach((card, idx) => {
                        loadedCardIds[idx] = card.id;
                        if (card.card_data.zip_url) loadedZipUrls[idx] = card.card_data.zip_url;
                        loadedPrintStatuses[idx] = card.print_status || card.status || 'pending';
                        loadedCardPhotoUrls[idx] = card.photo_url || '';
                    });
                    setZipUrls(loadedZipUrls);
                    setCardIds(loadedCardIds);
                    setCardPrintStatuses(loadedPrintStatuses);
                    setCardPhotoUrls(loadedCardPhotoUrls);
                    setHeaders(loadedHeaders);
                    setCsvData(loadedCsvData);
                }
            }
        };
        if (location.state?.batchId && !location.state?.csvData) fetchBatchData();
    }, [location.state]);

    useEffect(() => {
        const { updatedEmployee, rowIndex, zipUrl, csvData: updatedCsvData, headers: updatedHeaders, cardIds: updatedCardIds, batchId: updatedBatchId, cardPrintStatuses: receivedPrintStatuses, cardPhotoUrls: updatedCardPhotoUrls } = location.state || {};
        if (updatedCsvData) {
            setCsvData(updatedCsvData);
            if (updatedHeaders) setHeaders(updatedHeaders);
            if (updatedCardIds) setCardIds(updatedCardIds);
            if (updatedBatchId) setBatchId(updatedBatchId);
            if (receivedPrintStatuses) setCardPrintStatuses(receivedPrintStatuses);
            if (updatedCardPhotoUrls) setCardPhotoUrls(updatedCardPhotoUrls);
            if (location.state?.zipUrls) setZipUrls(location.state.zipUrls);
            const dataToUpdate = updatedCsvData || initialCsvData;
            const newCsvData = dataToUpdate.map((row: any[]) => [...row]);
            if (zipUrl && rowIndex !== undefined) setZipUrls(prev => ({ ...prev, [rowIndex]: zipUrl }));
            if (updatedEmployee && rowIndex !== undefined && rowIndex !== -1) {
                const headersToUse = updatedHeaders || headers;
                const newRow = [...(newCsvData[rowIndex] || [])];
                const headerMapping: Record<string, string> = {
                    'full name': 'fullName', 'employee id': 'employeeId', 'blood group': 'bloodGroup',
                    'branch': 'branch', 'emergency contact': 'emergencyContact', 'emergency no': 'emergencyContact',
                    'photo': 'photo', 'image': 'photo', 'photo (upload)': 'photo',
                };
                headersToUse.forEach((header: string, headerIndex: number) => {
                    const key = String(header || '').trim().toLowerCase();
                    const employeeKey = headerMapping[key];
                    if (employeeKey) newRow[headerIndex] = updatedEmployee[employeeKey];
                });
                newCsvData[rowIndex] = newRow;
                const currentZipUrls = location.state?.zipUrls || {};
                if (zipUrl && rowIndex !== undefined) currentZipUrls[rowIndex] = zipUrl;
                navigate(location.pathname, {
                    replace: true,
                    state: {
                        csvData: newCsvData, headers: headersToUse,
                        zipUrls: currentZipUrls, cardIds: updatedCardIds || cardIds,
                        cardPrintStatuses: receivedPrintStatuses || cardPrintStatuses,
                        batchId: updatedBatchId || batchId,
                        cardPhotoUrls: updatedCardPhotoUrls || cardPhotoUrls,
                    },
                });
            }
        }
    }, [location.state, initialCsvData, headers]);

    useEffect(() => {
        const photoIndex = getPhotoColumnIndex();
        if (photoIndex !== -1) {
            const newZipUrls: Record<number, string> = {};
            csvData.forEach((row, index) => {
                const cell = row[photoIndex];
                if (typeof cell === 'string' && cell.startsWith('blob:')) newZipUrls[index] = cell;
            });
            if (Object.keys(newZipUrls).length > 0) setZipUrls(prev => ({ ...prev, ...newZipUrls }));
        }
    }, []);

    useEffect(() => {
        if (csvData.length > 0) {
            const updatedStatuses = { ...cardPrintStatuses };
            let hasChanges = false;
            csvData.forEach((_, index) => {
                if (!updatedStatuses[index]) { updatedStatuses[index] = 'sent_for_printing'; hasChanges = true; }
            });
            if (hasChanges) setCardPrintStatuses(updatedStatuses);
        }
    }, [csvData]);

    const getPhotoColumnIndex = React.useCallback(() => {
        const lc = headers.map(h => String(h || '').toLowerCase());
        const i1 = lc.indexOf('photo (upload)');
        if (i1 !== -1) return i1;
        const i2 = lc.indexOf('image');
        if (i2 !== -1) return i2;
        return lc.indexOf('photo');
    }, [headers]);

    const isZipAvailable = (index: number) => !!zipUrls[index];

    const handleEdit = (rowData: string[], rowIndex: number) => {
        const cardId = cardIds[rowIndex];
        navigate('/bulk-card-editor', {
            state: {
                rowData, headers, rowIndex, csvData,
                zipUrls: { ...zipUrls }, cardIds: { ...cardIds },
                batchId, cardPrintStatuses: { ...cardPrintStatuses }, cardId,
                cardPhotoUrls: { ...cardPhotoUrls },
            },
        });
    };

    const handleDownload = async (rowData: string[], rowIndex: number) => {
        const fullNameIndex = headers.indexOf('Full Name');
        const employeeName = fullNameIndex !== -1 ? rowData[fullNameIndex] : 'employee';
        const zipUrl = zipUrls[rowIndex];
        const cardId = cardIds[rowIndex];
        if (!zipUrl) { toast.error('ZIP file not available. Please edit and save the employee first.'); return; }
        try {
            if (cardId) {
                await supabase.from('id_cards').update({ print_status: 'printed', updated_at: new Date().toISOString() }).eq('id', cardId);
                await supabase.from('vendor_requests').update({ status: 'completed', created_at: new Date().toISOString() }).eq('id_card_id', cardId);
                const { data: updatedCard } = await supabase.from('id_cards').select('print_status').eq('id', cardId).single();
                if (updatedCard) setCardPrintStatuses(prev => ({ ...prev, [rowIndex]: updatedCard.print_status || 'printed' }));
                if (batchId) await checkAndUpdateBatchStatus(batchId);
            }
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
        if (csvData.length === 0) { toast.error('No data to save'); return; }
        setIsSaving(true);
        try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const user = currentSession?.user;
            if (!user) throw new Error('User not authenticated');

            let finalBatchId = batchId;
            if (!finalBatchId) {
                const { data: lastBatch } = await supabase.from('card_batches').select('batch_id').order('batch_id', { ascending: false }).limit(1);
                let nextBatchNumber = 1;
                if (lastBatch && lastBatch.length > 0) {
                    const match = lastBatch[0].batch_id.match(/B-(\d+)/);
                    if (match) nextBatchNumber = parseInt(match[1]) + 1;
                }
                finalBatchId = `B-${String(nextBatchNumber).padStart(5, '0')}`;
                const { error: batchError } = await supabase.from('card_batches').insert([{
                    batch_id: finalBatchId, name: `Batch ${finalBatchId}`,
                    total_cards: csvData.length, status: 'pending', created_by: user.id,
                }]);
                if (batchError) throw batchError;
                setBatchId(finalBatchId);
            } else {
                await supabase.from('card_batches').update({ total_cards: csvData.length, updated_at: new Date().toISOString() }).eq('batch_id', finalBatchId);
                if (deletedCardIds.length > 0) {
                    await supabase.from('id_cards').delete().in('id', deletedCardIds);
                    setDeletedCardIds([]);
                }
            }

            const lowerHeaders = headers.map(h => String(h || '').toLowerCase().trim());
            const idIndex = lowerHeaders.findIndex(h => h === 'employee id' || h === 'id' || h === 'employeeid' || h === 'emp id');
            const nameIndex = lowerHeaders.findIndex(h => h === 'full name' || h === 'name' || h === 'employee name');
            const branchIndex = lowerHeaders.findIndex(h => h === 'branch' || h === 'location');
            const emailIndex = lowerHeaders.findIndex(h => h === 'email' || h === 'email address');
            const photoIndex = getPhotoColumnIndex();

            const cardsToUpsert = [];
            for (let i = 0; i < csvData.length; i++) {
                const row = csvData[i];
                const employeeIdStr = idIndex !== -1 ? String(row[idIndex] || '').trim() : '';
                const employeeName = nameIndex !== -1 ? String(row[nameIndex] || '') : 'Unknown';
                const existingCardId = cardIds[i];
                if (!employeeIdStr) continue;

                const uploadMedia = async (url: string, prefix: string, ext: string) => {
                    if (!url || (!url.startsWith('blob:') && !url.startsWith('data:'))) return url;
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const path = `bulk/${finalBatchId}/${employeeIdStr}_${prefix}.${ext}`;
                    const { error } = await supabase.storage.from('id-card-images').upload(path, blob, { upsert: true });
                    if (error) throw error;
                    return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
                };

                let { data: employee } = await supabase.from('employees').select('id').eq('employee_id', employeeIdStr).maybeSingle();
                if (!employee) {
                    const email = emailIndex !== -1 ? String(row[emailIndex] || '').trim() : `${employeeIdStr.toLowerCase()}@clove.com`;
                    const rawBranch = branchIndex !== -1 ? String(row[branchIndex] || '').toUpperCase().trim() : 'HYD';
                    const validBranches = ['HYD', 'VIZAG', 'BLR', 'MUM', 'DEL'];
                    const finalBranch = validBranches.includes(rawBranch) ? rawBranch : 'HYD';
                    const { data: newEmployee, error: empError } = await supabase.from('employees').insert([{
                        employee_id: employeeIdStr, name: employeeName, branch: finalBranch,
                        email: email || `${employeeIdStr.toLowerCase()}@clove.com`,
                    }]).select().single();
                    if (empError) { console.error(`Error creating employee for row ${i}:`, empError); continue; }
                    employee = newEmployee;
                }
                if (!employee) continue;

                if (photoIndex !== -1 && row[photoIndex]) row[photoIndex] = await uploadMedia(row[photoIndex], 'photo', 'png');
                const cardData: Record<string, any> = {};
                headers.forEach((header, hIdx) => { cardData[header] = row[hIdx]; });
                if (zipUrls[i]) cardData['zip_url'] = await uploadMedia(zipUrls[i], 'id_card', 'zip');

                const cardPayload: any = {
                    employee_id: employee.id, batch_id: finalBatchId, card_data: cardData,
                    photo_url: (photoIndex !== -1 && row[photoIndex]) ? row[photoIndex] : null,
                    zip_url: cardData['zip_url'] || null, updated_at: new Date().toISOString(),
                };
                if (existingCardId) { cardPayload.id = existingCardId; }
                else { cardPayload.status = 'pending'; cardPayload.created_by = user.id; }
                cardsToUpsert.push(cardPayload);
            }

            if (cardsToUpsert.length > 0) {
                const { error: cardError } = await supabase.from('id_cards').upsert(cardsToUpsert);
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
        if (selectedRows.size === 0) { toast.error('Please select at least one row to download'); return; }
        try {
            const cardIdsToUpdate = Array.from(selectedRows).map(i => cardIds[i]).filter(Boolean);
            if (cardIdsToUpdate.length > 0) {
                await supabase.from('id_cards').update({ print_status: 'printed', updated_at: new Date().toISOString() }).in('id', cardIdsToUpdate);
                await supabase.from('vendor_requests').update({ status: 'completed', created_at: new Date().toISOString() }).in('id_card_id', cardIdsToUpdate);
                const { data: updatedCards } = await supabase.from('id_cards').select('id, print_status').in('id', cardIdsToUpdate);
                const newStatuses = { ...cardPrintStatuses };
                if (updatedCards) {
                    updatedCards.forEach(card => {
                        for (const rowIndex of selectedRows) {
                            if (cardIds[rowIndex] === card.id) newStatuses[rowIndex] = card.print_status || 'printed';
                        }
                    });
                } else {
                    for (const rowIndex of selectedRows) newStatuses[rowIndex] = 'printed';
                }
                setCardPrintStatuses(newStatuses);
            }

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
                        if (!response.ok) continue;
                        const blob = await response.blob();
                        const inner = await new JSZip().loadAsync(blob);
                        inner.forEach((path: string, file: any) => {
                            if (!file.dir) masterZip.file(`${employeeName}/${path}`, file.async('blob'));
                        });
                        hasValidZips = true;
                    } catch { toast.error(`Failed to process ZIP for ${employeeName}`); }
                }
            }
            if (!hasValidZips) { toast.error('No valid ZIP files found in selected rows'); return; }
            const finalZip = await masterZip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(finalZip);
            link.download = `ID_Cards_${Date.now()}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            if (batchId) await checkAndUpdateBatchStatus(batchId);
            toast.success('Download started!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download ZIP files');
        }
    };

    const filteredData = React.useMemo(() => {
        const dataWithIndex = csvData.map((row, index) => ({ row, index }));
        if (filterAvailableOnly) return dataWithIndex.filter(({ index }) => isZipAvailable(index));
        if (!searchQuery) return dataWithIndex;
        const q = searchQuery.toLowerCase();
        const nameIndex = headers.indexOf('Full Name');
        const idIndex = headers.indexOf('Employee ID');
        const branchIndex = headers.indexOf('Branch');
        return dataWithIndex.filter(({ row }) => {
            const name = nameIndex !== -1 ? String(row[nameIndex] ?? '').toLowerCase() : '';
            const id = idIndex !== -1 ? String(row[idIndex] ?? '').toLowerCase() : '';
            const branch = branchIndex !== -1 ? String(row[branchIndex] ?? '').toLowerCase() : '';
            return name.includes(q) || id.includes(q) || branch.includes(q);
        });
    }, [csvData, searchQuery, filterAvailableOnly, zipUrls]);

    const handleRowCheckboxChange = (rowIndex: number) => {
        const next = new Set(selectedRows);
        if (next.has(rowIndex)) next.delete(rowIndex); else next.add(rowIndex);
        setSelectedRows(next);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const next = new Set<number>();
            filteredData.forEach(({ index }) => next.add(index));
            setSelectedRows(next);
        } else {
            setSelectedRows(new Set());
        }
    };

    const photoColumnIndex = getPhotoColumnIndex();

    const handleDeleteSelectedRows = () => {
        if (selectedRows.size === 0) { toast.error('No rows selected'); return; }
        if (!window.confirm(`Delete ${selectedRows.size} selected card(s)?`)) return;
        const newDeletedIds: number[] = [];
        const newCsvData: any[][] = [];
        const newCardIds: Record<number, number> = {};
        const newZipUrls: Record<number, string> = {};
        const newPrintStatuses: Record<number, string> = {};
        let newIdx = 0;
        csvData.forEach((row, oldIdx) => {
            if (selectedRows.has(oldIdx)) {
                if (cardIds[oldIdx]) newDeletedIds.push(cardIds[oldIdx]);
            } else {
                newCsvData.push(row);
                if (cardIds[oldIdx]) newCardIds[newIdx] = cardIds[oldIdx];
                if (zipUrls[oldIdx]) newZipUrls[newIdx] = zipUrls[oldIdx];
                if (cardPrintStatuses[oldIdx]) newPrintStatuses[newIdx] = cardPrintStatuses[oldIdx];
                newIdx++;
            }
        });
        setDeletedCardIds(prev => [...prev, ...newDeletedIds]);
        setCsvData(newCsvData);
        setCardIds(newCardIds);
        setZipUrls(newZipUrls);
        setCardPrintStatuses(newPrintStatuses);
        setSelectedRows(new Set());
        toast.success(`Deleted ${selectedRows.size} row(s)`);
    };

    const handleDeleteBatch = async () => {
        if (!batchId) { toast.error('No batch to delete'); return; }
        if (!window.confirm('Delete this entire batch? This cannot be undone.')) return;
        setIsSaving(true);
        try {
            const { error: cardsError } = await supabase.from('id_cards').delete().eq('batch_id', batchId);
            if (cardsError) throw cardsError;
            const { error: batchError } = await supabase.from('card_batches').delete().eq('batch_id', batchId);
            if (batchError) throw batchError;
            toast.success('Batch deleted successfully');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(`Error deleting batch: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteRow = (index: number) => {
        if (!window.confirm('Delete this card?')) return;
        const newDeletedIds: number[] = [];
        if (cardIds[index]) newDeletedIds.push(cardIds[index]);
        const newCsvData: any[][] = [];
        const newCardIds: Record<number, number> = {};
        const newZipUrls: Record<number, string> = {};
        const newPrintStatuses: Record<number, string> = {};
        let newIdx = 0;
        csvData.forEach((row, oldIdx) => {
            if (oldIdx !== index) {
                newCsvData.push(row);
                if (cardIds[oldIdx]) newCardIds[newIdx] = cardIds[oldIdx];
                if (zipUrls[oldIdx]) newZipUrls[newIdx] = zipUrls[oldIdx];
                if (cardPrintStatuses[oldIdx]) newPrintStatuses[newIdx] = cardPrintStatuses[oldIdx];
                newIdx++;
            }
        });
        setDeletedCardIds(prev => [...prev, ...newDeletedIds]);
        setCsvData(newCsvData);
        setCardIds(newCardIds);
        setZipUrls(newZipUrls);
        setCardPrintStatuses(newPrintStatuses);
        if (selectedRows.has(index)) {
            const next = new Set(selectedRows);
            next.delete(index);
            setSelectedRows(next);
        }
        toast.success('Row deleted');
    };

    const handleMarkAsDone = async (rowIndex: number) => {
        const cardId = cardIds[rowIndex];
        if (!cardId) { toast.error('Card ID not found'); return; }
        const { error } = await supabase.from('id_cards').update({ print_status: 'ready_to_collect', status: 'completed' }).eq('id', cardId);
        if (error) { toast.error('Failed to mark card as ready to collect'); return; }
        toast.success('Card marked as ready to collect!');
        setCardPrintStatuses(prev => ({ ...prev, [rowIndex]: 'ready_to_collect' }));
        if (batchId) {
            const { data: remaining } = await supabase.from('id_cards').select('id').eq('batch_id', batchId).neq('print_status', 'ready_to_collect');
            if (!remaining || remaining.length === 0) {
                await supabase.from('card_batches').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('batch_id', batchId);
            }
        }
    };

    const handleMarkAsCollected = async (rowIndex: number) => {
        const cardId = cardIds[rowIndex];
        if (!cardId) { toast.error('Card ID not found'); return; }
        const { error } = await supabase.from('id_cards').update({ print_status: 'collected', updated_at: new Date().toISOString() }).eq('id', cardId);
        if (error) { toast.error('Failed to mark card as collected'); return; }
        toast.success('Card marked as collected!');
        setCardPrintStatuses(prev => ({ ...prev, [rowIndex]: 'collected' }));
        if (batchId) await checkAndUpdateBatchStatus(batchId);
    };

    const csvRowToEmployee = (row: string[], rowIndex: number) => {
        const lc = headers.map(h => String(h || '').toLowerCase().trim());
        const nameIndex = lc.findIndex(h => h === 'full name' || h === 'name' || h === 'employee name');
        const idIndex = lc.findIndex(h => h === 'employee id' || h === 'id' || h === 'employeeid' || h === 'emp id');
        const bgIndex = lc.findIndex(h => h === 'blood group' || h === 'bloodgroup');
        const branchIndex = lc.findIndex(h => h === 'branch' || h === 'location');
        const ecIndex = lc.findIndex(h => h === 'emergency contact' || h === 'emergency no' || h === 'emergencycontact');
        const photoIndex = getPhotoColumnIndex();
        return {
            fullName: nameIndex !== -1 ? String(row[nameIndex] || '') : 'Unknown',
            employeeId: idIndex !== -1 ? String(row[idIndex] || '') : '',
            bloodGroup: bgIndex !== -1 ? String(row[bgIndex] || '') : '',
            branch: branchIndex !== -1 ? String(row[branchIndex] || '') : '',
            emergencyContact: ecIndex !== -1 ? String(row[ecIndex] || '') : '',
            photo: photoIndex !== -1 ? String(row[photoIndex] || '') : '',
            photo_url: photoIndex !== -1 ? String(row[photoIndex] || '') : '',
            zip_url: zipUrls[rowIndex] || null,
            countryCode: '+91',
        };
    };

    const handleViewCard = (row: string[], rowIndex: number) => {
        const employee = csvRowToEmployee(row, rowIndex);
        if (cardPhotoUrls[rowIndex]) {
            employee.photo_url = cardPhotoUrls[rowIndex];
            employee.photo = cardPhotoUrls[rowIndex];
        }
        setCardViewEmployee(employee);
        setIsCardViewOpen(true);
        setIsCardFlipped(false);
    };

    const confirmSendToPrint = async () => {
        if (!selectedVendorId) { toast.error('Please select a vendor.'); return; }
        if (selectedRows.size === 0) { toast.error('Please select at least one row.'); return; }
        setIsDownloading(true);
        const recordsToInsert: any[] = [];

        for (const rowIndex of selectedRows) {
            const row = csvData[rowIndex];
            if (!row) continue;
            const cardId = cardIds[rowIndex];
            const employee = csvRowToEmployee(row, rowIndex);
            try {
                let existingZipUrl = zipUrls[rowIndex];
                let front_image_url = '';
                let back_image_url = '';
                if (cardId) {
                    const { data: cardData } = await supabase.from('id_cards').select('zip_url').eq('id', cardId).single();
                    if (cardData?.zip_url) existingZipUrl = cardData.zip_url;
                }
                if (!existingZipUrl) {
                    setProcessingRequest({ ...employee, id: rowIndex });
                    await new Promise(resolve => setTimeout(resolve, 500));
                    const cardElement = document.getElementById(`id-card-${rowIndex}`);
                    if (cardElement) {
                        const fc = await html2canvas(cardElement.querySelector('.id-card-front') as HTMLElement, { scale: 12, useCORS: true, allowTaint: true });
                        const bc = await html2canvas(cardElement.querySelector('.id-card-back') as HTMLElement, { scale: 12, useCORS: true, allowTaint: true });
                        const upload = async (path: string, dataUrl: string) => {
                            const blob = await (await fetch(dataUrl)).blob();
                            const { error } = await supabase.storage.from('id-card-images').upload(path, blob, { upsert: true });
                            if (error) throw error;
                            return supabase.storage.from('id-card-images').getPublicUrl(path).data.publicUrl;
                        };
                        [front_image_url, back_image_url] = await Promise.all([
                            upload(`public/bulk-${batchId || 'no-batch'}-${rowIndex}-front.png`, fc.toDataURL('image/png')),
                            upload(`public/bulk-${batchId || 'no-batch'}-${rowIndex}-back.png`, bc.toDataURL('image/png')),
                        ]);
                    }
                }
                recordsToInsert.push({
                    request_id: null, id_card_id: cardId || null, vendor_id: selectedVendorId,
                    front_image_url: front_image_url || null, back_image_url: back_image_url || null,
                    zip_url: existingZipUrl || null, card_details: employee,
                    status: 'sent', sent_at: new Date().toISOString(), batch_id: batchId,
                });
                if (cardId) {
                    await supabase.from('id_cards').update({ status: 'sent_for_printing', print_status: 'sent_for_printing' }).eq('id', cardId);
                    setCardPrintStatuses(prev => ({ ...prev, [rowIndex]: 'sent_for_printing' }));
                }
            } catch (error) {
                console.error(`Error processing row ${rowIndex}:`, error);
                toast.error(`Failed to process card for ${employee.fullName}.`);
            }
        }

        if (recordsToInsert.length > 0) {
            const { error: sendError } = await supabase.from('vendor_requests').insert(recordsToInsert);
            if (sendError) {
                toast.error('Failed to send requests to vendor.');
            } else {
                if (batchId) {
                    const { data: remaining } = await supabase.from('id_cards').select('id').eq('batch_id', batchId)
                        .not('status', 'in', '("sent_for_printing","printed","ready_to_collect")')
                        .not('print_status', 'in', '("sent_for_printing","printed","ready_to_collect")');
                    if (!remaining || remaining.length === 0) {
                        await supabase.from('card_batches').update({ status: 'sent_for_printing', sent_for_printing_at: new Date().toISOString() }).eq('batch_id', batchId);
                    }
                }
                toast.success('Cards sent to vendor successfully!');
                setSelectedRows(new Set());
                setIsVendorModalOpen(false);
                setSelectedVendorId(null);
            }
        }

        setIsDownloading(false);
        setProcessingRequest(null);
    };

    const printStatusBadge = (status: string) => {
        const map: Record<string, string> = {
            ready_to_collect: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
            printed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
            collected: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            sent_for_printing: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        };
        const labels: Record<string, string> = {
            ready_to_collect: 'Ready to Collect', printed: 'Printed',
            collected: 'Collected', sent_for_printing: 'Sent to Print',
        };
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                {labels[status] || 'Pending'}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <AppHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">

                {/* Page Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                            <ChevronLeft size={18} /> <span className="hidden md:inline">Back</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk ID Card Management</h1>
                            {batchId && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                    Batch <span className="font-mono">{batchId}</span> · {csvData.length} card{csvData.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {batchId && (
                            <button
                                onClick={handleDeleteBatch}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            >
                                <Trash2 size={14} /> Delete Batch
                            </button>
                        )}
                        <button
                            onClick={handleDownloadAll}
                            disabled={selectedRows.size === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Download size={14} /> Download ({selectedRows.size})
                        </button>
                        <button
                            onClick={handleDeleteSelectedRows}
                            disabled={selectedRows.size === 0}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <Trash2 size={14} /> Delete ({selectedRows.size})
                        </button>
                        <button
                            onClick={() => setIsVendorModalOpen(true)}
                            disabled={selectedRows.size === 0 || isDownloading}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            {isDownloading ? 'Processing...' : `Send to Print (${selectedRows.size})`}
                        </button>
                        <button
                            onClick={handleSaveBatch}
                            disabled={isSaving || csvData.length === 0}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
                        >
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                            {isSaving ? 'Saving...' : 'Save Batch'}
                        </button>
                    </div>
                </div>

                {/* Table Card */}
                <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Filters */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, ID, or branch..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilterAvailableOnly(false)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!filterAvailableOnly ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            >
                                All <span className="ml-1 opacity-70">{csvData.length}</span>
                            </button>
                            <button
                                onClick={() => setFilterAvailableOnly(true)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterAvailableOnly ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                            >
                                Available
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-100 dark:border-gray-700">
                                    <th className="px-5 py-3.5 text-left w-10">
                                        <input
                                            type="checkbox"
                                            checked={selectedRows.size > 0 && selectedRows.size === filteredData.length}
                                            ref={input => {
                                                if (input) input.indeterminate = selectedRows.size > 0 && selectedRows.size < filteredData.length;
                                            }}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                            className="rounded border-gray-300 dark:border-gray-600"
                                        />
                                    </th>
                                    {headers.map(header => {
                                        if (header.toLowerCase() === 'photo_url') return null;
                                        const display = (header.toLowerCase() === 'photo' || header.toLowerCase() === 'photo (upload)') ? 'Photo' : header;
                                        return (
                                            <th key={header} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {display}
                                            </th>
                                        );
                                    })}
                                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={headers.length + 3} className="px-5 py-12 text-center text-sm text-gray-400">
                                            {searchQuery ? 'No cards match your search.' : 'No cards in this batch.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map(({ row, index: i }) => (
                                        <tr key={i} className={`transition-colors ${selectedRows.has(i) ? 'bg-orange-50 dark:bg-orange-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-900/20'}`}>
                                            <td className="px-5 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.has(i)}
                                                    onChange={() => handleRowCheckboxChange(i)}
                                                    className="rounded border-gray-300 dark:border-gray-600"
                                                />
                                            </td>
                                            {row.map((cell, j) => {
                                                if (headers[j]?.toLowerCase() === 'photo_url') return null;
                                                if (j === photoColumnIndex) {
                                                    const src = typeof cell === 'string' && !cell.includes('image/fetch/') && !cell.startsWith('blob:') && (cell.startsWith('http') || cell.startsWith('data:')) ? cell : null;
                                                    return (
                                                        <td key={j} className="px-5 py-4">
                                                            {src ? (
                                                                <img src={src} alt="" className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600 object-cover" onError={e => e.currentTarget.classList.add('hidden')} />
                                                            ) : (
                                                                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500">-</div>
                                                            )}
                                                        </td>
                                                    );
                                                }
                                                return <td key={j} className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">{cell}</td>;
                                            })}
                                            <td className="px-5 py-4">
                                                {cardPrintStatuses[i] === 'ready_to_collect' ? (
                                                    <div className="flex items-center gap-2">
                                                        {printStatusBadge('ready_to_collect')}
                                                        <button
                                                            onClick={() => handleMarkAsCollected(i)}
                                                            className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                                                        >
                                                            Collected
                                                        </button>
                                                    </div>
                                                ) : cardPrintStatuses[i] ? (
                                                    printStatusBadge(cardPrintStatuses[i])
                                                ) : isZipAvailable(i) ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Available
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                        Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button onClick={() => handleViewCard(row, i)}
                                                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="View">
                                                        <Eye size={15} />
                                                    </button>
                                                    <button onClick={() => handleEdit(row, i)}
                                                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Edit">
                                                        <Edit3 size={15} />
                                                    </button>
                                                    {isZipAvailable(i) && (
                                                        <button onClick={() => handleDownload(row, i)}
                                                            className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="Download">
                                                            <Download size={15} />
                                                        </button>
                                                    )}
                                                    {cardIds[i] && cardPrintStatuses[i] === 'printed' && (
                                                        <button onClick={() => handleMarkAsDone(i)}
                                                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Mark as Ready to Collect">
                                                            <Box size={15} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteRow(i)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer count */}
                    {filteredData.length > 0 && (
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Showing {filteredData.length} of {csvData.length} card{csvData.length !== 1 ? 's' : ''}
                                {selectedRows.size > 0 && ` · ${selectedRows.size} selected`}
                            </p>
                        </div>
                    )}
                </div>
            </main>

            {/* Vendor Modal */}
            {isVendorModalOpen && (
                <div className="fixed inset-0 bg-gray-800/50 z-40 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Send to Print</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                                Select a vendor to send {selectedRows.size} card{selectedRows.size !== 1 ? 's' : ''} for printing.
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

            {isCardViewOpen && cardViewEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">View Card</h3>
                            <button onClick={() => setIsCardViewOpen(false)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex justify-center" style={{ perspective: '1000px' }}>
                            <div
                                className="relative w-[230px] h-[365px] cursor-pointer"
                                style={{ transformStyle: 'preserve-3d', transition: 'transform 0.6s', transform: isCardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                                onClick={() => setIsCardFlipped(!isCardFlipped)}
                            >
                                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                                    <IDCardFront employee={cardViewEmployee} logoSrc={frontLogoDataUrl} />
                                </div>
                                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                                    <IDCardBack employee={cardViewEmployee} logoSrc={backLogoDataUrl} />
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">Click card to flip</p>
                        <div className="flex justify-end mt-4">
                            <button onClick={() => setIsCardViewOpen(false)} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Close</button>
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
                        countryCode: '+91',
                    }}
                    frontLogoSrc={frontLogoDataUrl}
                    backLogoSrc={backLogoDataUrl}
                />
            )}
        </div>
    );
};

export default ImportManagement;
