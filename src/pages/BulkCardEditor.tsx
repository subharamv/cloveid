
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Employee, PhotoTransform } from '@/types/employee';
import { EmployeeForm } from '@/components/EmployeeForm';
import { PhotoUpload } from '@/components/PhotoUpload';
import { IDCardFront } from '@/components/IDCardFront';
import { IDCardBack } from '@/components/IDCardBack';
import { Modal } from '@/components/Modal';
import { ActionButtons } from '@/components/ActionButtons';
import { useDownloadZip } from '@/hooks/useDownloadZip';
import logo from '@/assets/CLOVE LOGO BLACK.png';
import { toast } from 'sonner';
import cloveLogo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';
import { Cloudinary } from '@cloudinary/url-gen';
import { backgroundRemoval } from '@cloudinary/url-gen/actions/effect';
import { imageToDataUrl } from '@/lib/utils';
import AdminHeader from '../components/AdminHeader';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

const BulkCardEditor: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { rowData, headers, rowIndex, csvData, zipUrls, cardId, batchId, cardIds } = location.state || { rowData: [], headers: [], rowIndex: -1, csvData: [], zipUrls: {}, cardId: null, batchId: null, cardIds: {} };

    const { downloadZip } = useDownloadZip();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [zipBlob, setZipBlob] = useState<Blob | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');

    const frontCardRef = useRef<HTMLDivElement>(null);
    const backCardRef = useRef<HTMLDivElement>(null);

    const [employee, setEmployee] = useState<Employee>({
        fullName: '',
        employeeId: '',
        bloodGroup: '',
        branch: '',
        emergencyContact: '',
        countryCode: '+91',
        photo: null,
    });

    useEffect(() => {
        const processImage = async (imageUrl: string) => {
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

            const loadImage = (url: string, fallbackUrl?: string) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    setEditor(prev => ({ ...prev, img, scale: 1, rotation: 0, tx: 0, ty: 0 }));
                    setShowUploadNote(false);
                };
                img.onerror = () => {
                    if (fallbackUrl) {
                        toast.error('Failed to load processed image. Loading original.');
                        loadImage(fallbackUrl);
                    } else {
                        toast.error(`Failed to load image from URL: ${url}`);
                    }
                };
                img.src = url;
            };

            if (!cloudName) {
                toast.error('Cloudinary configuration is missing. Cannot process image.');
                loadImage(imageUrl);
                return;
            }

            const cld = new Cloudinary({ cloud: { cloudName }, url: { secure: true } });
            let processedImageUrl: string;

            try {
                if (imageUrl.startsWith('http')) {
                    processedImageUrl = cld.image(imageUrl)
                        .setDeliveryType('fetch')
                        .effect(backgroundRemoval())
                        .toURL();
                } else if (imageUrl.startsWith('data:image')) {
                    if (!uploadPreset) {
                        toast.error('Cloudinary upload preset is missing. Cannot process uploaded image.');
                        loadImage(imageUrl);
                        return;
                    }
                    const formData = new FormData();
                    formData.append('file', imageUrl);
                    formData.append('upload_preset', uploadPreset);

                    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();

                    if (data.public_id) {
                        processedImageUrl = cld.image(data.public_id)
                            .effect(backgroundRemoval())
                            .toURL();
                    } else {
                        throw new Error(data?.error?.message ?? 'Invalid Cloudinary response after upload.');
                    }
                } else {
                    // Not a processable URL, just load it
                    loadImage(imageUrl);
                    return;
                }
                loadImage(processedImageUrl, imageUrl); // Try processed, fallback to original
                setPhotoUrl(processedImageUrl);
            } catch (error) {
                toast.error(`Image processing failed: ${error instanceof Error ? error.message : String(error)}`);
                loadImage(imageUrl); // Fallback to original on any error
                setPhotoUrl(imageUrl);
            }
        };

        if (rowData && headers) {
            const headerMapping: { [key: string]: keyof Employee } = {
                'employee id': 'employeeId',
                'full name': 'fullName',
                'blood group': 'bloodGroup',
                'branch': 'branch',
                'emergency contact': 'emergencyContact',
                'emergency no': 'emergencyContact',
            };

            const newEmployee: Partial<Employee> = {};
            let imageUrl: string | undefined;

            headers.forEach((header: string, index: number) => {
                const key = String(header || '').trim().toLowerCase();
                const employeeKey = headerMapping[key];
                if (employeeKey) {
                    newEmployee[employeeKey] = rowData[index];
                }
                if (key === 'photo' || key === 'image' || key === 'photo (upload)') {
                    imageUrl = rowData[index];
                }
            });

            setEmployee(prev => ({ ...prev, ...newEmployee }));

            if (imageUrl) {
                processImage(imageUrl);
            }
        }
    }, [rowData, headers]);

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

    const [showUploadNote, setShowUploadNote] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, type: 'error' as 'error' | 'success', title: '', message: '' });

    // editor state holds the HTMLImageElement and transform params
    const [editor, setEditor] = useState({
        img: null as HTMLImageElement | null,
        scale: 1,
        rotation: 0,
        tx: 0,
        ty: 0,
        isDragging: false,
        dragStart: { x: 0, y: 0 },
        lastPos: { x: 0, y: 0 },
    });

    // refs for canvas and photo box (the photo box lives inside IDCardFront)
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const photoBoxRef = useRef<HTMLDivElement | null>(null);

    // track last object URL to revoke it later
    const lastObjectUrlRef = useRef<string | null>(null);

    // target export size in pixels (1200 DPI for maximum quality)
    const TARGET_W_PX = Math.round(2.125 * 1200); // width in px
    // Maintain aspect ratio of the photo box (230x276) to prevent distortion
    const TARGET_H_PX = Math.round(TARGET_W_PX * (276 / 230));

    const handleShowModal = useCallback((type: 'error' | 'success', title: string, message: string) => {
        setModal({ isOpen: true, type, title, message });
    }, []);

    const handleHideUploadNote = useCallback(() => {
        setShowUploadNote(false);
    }, []);



    const handlePhotoSelect = useCallback(async (file: File) => {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            throw new Error('Missing Cloudinary configuration');
        }

        const cld = new Cloudinary({
            cloud: {
                cloudName
            },
            url: {
                secure: true
            }
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data?.error?.message ?? 'Failed to upload image to Cloudinary';
            throw new Error(message);
        }

        const publicId = data.public_id;

        if (!publicId) {
            throw new Error('Invalid Cloudinary response');
        }

        const cloudinaryImage = cld.image(publicId).effect(backgroundRemoval());
        const imageUrl = cloudinaryImage.toURL();
        setPhotoUrl(imageUrl);

        await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                setEditor(prev => ({
                    ...prev,
                    img,
                    scale: 1,
                    rotation: 0,
                    tx: 0,
                    ty: 0,
                }));
                setEmployee(prev => ({ ...prev, photo: file }));
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }, [setEditor, setEmployee]);

    // drawEditor: paints the editor.img into the visible canvas sized to photoBoxRef
    const drawEditor = useCallback(() => {
        const canvas = canvasRef.current;
        const photoBox = photoBoxRef.current;
        if (!canvas || !photoBox || !editor.img) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = photoBox.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        // set backing store size for crisp rendering
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        // set CSS size
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';

        // work in CSS pixels; set transform for DPR
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        // fill background (white)
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        // draw into an offscreen canvas at target export resolution,
        // then scale down to visible rect so positioning math uses target px space
        try {
            const offscreen = document.createElement('canvas');
            offscreen.width = TARGET_W_PX;
            offscreen.height = TARGET_H_PX;
            const oc = offscreen.getContext('2d');
            if (!oc) return;

            oc.fillStyle = '#fff';
            oc.fillRect(0, 0, offscreen.width, offscreen.height);
            oc.save();

            // translate to center and apply rotation
            oc.translate(offscreen.width / 2, offscreen.height / 2);
            oc.rotate(editor.rotation);

            // compute cover scale (cover the whole offscreen area)
            const coverScale = Math.max(offscreen.width / editor.img.width, offscreen.height / editor.img.height);
            const renderScale = coverScale * editor.scale;
            oc.scale(renderScale, renderScale);

            // compute dx/dy such that tx/ty correspond to image pixel offsets in the original image space
            // editor.tx and editor.ty are in image px-space (as per your pointer math)
            const dx = -editor.tx - editor.img.width / 2;
            const dy = -editor.ty - editor.img.height / 2;

            oc.drawImage(editor.img, dx, dy, editor.img.width, editor.img.height);
            oc.restore();

            // finally draw the offscreen to the visible canvas (scaled to rect)
            ctx.drawImage(offscreen, 0, 0, rect.width, rect.height);
        } catch (e) {
            console.error('drawEditor error', e);
        }
    }, [editor, TARGET_W_PX, TARGET_H_PX]);

    // redraw whenever editor changes
    useEffect(() => {
        drawEditor();

        // Listen for force redraw events for download capture
        const canvas = canvasRef.current;
        if (canvas) {
            const handleForceRedraw = () => drawEditor();
            canvas.addEventListener('forceRedraw', handleForceRedraw);
            return () => canvas.removeEventListener('forceRedraw', handleForceRedraw);
        }
    }, [drawEditor, editor.img]);

    // redraw on window resize to keep canvas sized to layout
    useEffect(() => {
        const onResize = () => drawEditor();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [drawEditor]);

    // pointer handlers for dragging the image
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (!editor.img || !canvasRef.current) return;

        try {
            canvasRef.current.setPointerCapture(e.pointerId);
        } catch (err) { /* ignore if fails */ }

        setEditor(prev => ({
            ...prev,
            isDragging: true,
            dragStart: { x: e.clientX, y: e.clientY },
            lastPos: { x: prev.tx, y: prev.ty },
        }));
    }, [editor.img]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!editor.isDragging || !editor.img || !photoBoxRef.current) return;

        // how many CSS pixels did pointer move?
        const dx = e.clientX - editor.dragStart.x;
        const dy = e.clientY - editor.dragStart.y;

        // compute how movement in CSS pixels maps to movement in image pixel space
        const coverScale = Math.max(TARGET_W_PX / editor.img.width, TARGET_H_PX / editor.img.height);
        const renderScale = coverScale * editor.scale;

        const rect = photoBoxRef.current.getBoundingClientRect();
        const factor = TARGET_W_PX / rect.width; // image px per CSS px
        const imageDx = dx * factor / renderScale;
        const imageDy = dy * factor / renderScale;

        setEditor(prev => ({
            ...prev,
            tx: prev.lastPos.x + imageDx,
            ty: prev.lastPos.y + imageDy,
        }));
    }, [editor.isDragging, editor.img, editor.dragStart, editor.scale, editor.lastPos, TARGET_W_PX, TARGET_H_PX]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        setEditor(prev => ({ ...prev, isDragging: false }));
        try {
            if (canvasRef.current) {
                canvasRef.current.releasePointerCapture(e.pointerId);
            }
        } catch (err) { /* ignore */ }
    }, []);

    // zoom & rotate controls
    const handleZoomIn = useCallback(() => {
        if (!editor.img) return;
        setEditor(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.12) }));
    }, [editor.img]);

    const handleZoomOut = useCallback(() => {
        if (!editor.img) return;
        setEditor(prev => ({ ...prev, scale: Math.max(0.5, prev.scale / 1.12) }));
    }, [editor.img]);

    const handleRotateLeft = useCallback(() => {
        if (!editor.img) return;
        setEditor(prev => ({ ...prev, rotation: prev.rotation - Math.PI / 12 }));
    }, [editor.img]);

    const handleRotateRight = useCallback(() => {
        if (!editor.img) return;
        setEditor(prev => ({ ...prev, rotation: prev.rotation + Math.PI / 12 }));
    }, [editor.img]);

    const handleResetPos = useCallback(() => {
        if (!editor.img) return;
        setEditor(prev => ({ ...prev, scale: 1, rotation: 0, tx: 0, ty: 0 }));
    }, [editor.img]);

    const handleSaveAndBack = async () => {
        if (!employee.fullName || !employee.employeeId) {
            toast.error('Please fill in at least Full Name and Employee ID');
            return;
        }

        setIsSaving(true);
        try {
            const canvas = canvasRef.current;
            let updatedEmployee = { ...employee };
            
            if (canvas) {
                // Ensure the canvas is up to date with latest transforms
                drawEditor();
                const photoDataUrl = canvas.toDataURL('image/png', 1.0);
                updatedEmployee.photo = photoDataUrl;
            }

            const blob = await generateZip();
            
            // Upload ZIP to Supabase Storage
            const zipFileName = `zips/${employee.fullName.replace(/ /g, '_')}_${employee.employeeId}_ID_Card.zip`;
            const { error: zipError } = await supabase.storage
                .from('id-card-images')
                .upload(zipFileName, blob, { upsert: true });

            if (zipError) throw zipError;

            const { data: publicUrlData } = supabase.storage
                .from('id-card-images')
                .getPublicUrl(zipFileName);

            const finalZipUrl = publicUrlData.publicUrl;
            
            // Update updatedEmployee with photoUrl and zipUrl
            updatedEmployee.photo_url = photoUrl;
            updatedEmployee.zip_url = finalZipUrl;

            // Update database if cardId exists
            if (cardId) {
                const headerMapping: { [key: string]: keyof Employee } = {
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

                const newCardData = { ...rowData.reduce((acc: any, val: any, idx: number) => {
                    acc[headers[idx]] = val;
                    return acc;
                }, {}) };

                headers.forEach((header: string, idx: number) => {
                    const key = String(header || '').trim().toLowerCase();
                    const employeeKey = headerMapping[key];
                    if (employeeKey) {
                        newCardData[header] = updatedEmployee[employeeKey];
                    }
                });

                newCardData['photo_url'] = photoUrl;
                newCardData['zip_url'] = finalZipUrl;

                const { error: dbError } = await supabase
                    .from('id_cards')
                    .update({
                        card_data: newCardData,
                        photo_url: photoUrl,
                        zip_url: finalZipUrl
                    } as any)
                    .eq('id', cardId);

                if (dbError) {
                    console.error('Error updating id_cards:', dbError);
                    toast.error('Failed to update database record, but ZIP was saved.');
                }
            }

            toast.success('Changes saved! Returning to management...');
            navigate('/import-management', { 
                state: { 
                    updatedEmployee, 
                    rowIndex, 
                    zipUrl: finalZipUrl, 
                    csvData, 
                    headers, 
                    zipUrls,
                    cardIds,
                    batchId
                } 
            });
        } catch (error) {
            console.error('Error in handleSaveAndBack:', error);
            toast.error(`Failed to save changes: ${error instanceof Error ? error.message : 'Please try again.'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const generateZip = async () => {
        toast.info('Generating ZIP file...');
        
        // Ensure we have the latest DOM state
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!frontCardRef.current || !backCardRef.current) {
            throw new Error('Card elements not found');
        }

        const blob = await downloadZip(
            employee,
            {
                img: editor.img,
                scale: editor.scale,
                rotation: editor.rotation,
                tx: editor.tx,
                ty: editor.ty,
            },
            {
                w: TARGET_W_PX,
                h: TARGET_H_PX,
            },
            frontCardRef.current,
            backCardRef.current,
            frontLogoDataUrl,
            backLogoDataUrl
        );
        setZipBlob(blob);
        toast.success('ZIP file generated successfully!');
        return blob;
    };

    const handleDownload = async () => {
        if (!employee.fullName || !employee.employeeId) {
            toast.error('Please fill in at least Full Name and Employee ID');
            return;
        }

        try {
            const blob = zipBlob || await generateZip();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${employee.fullName.replace(/ /g, '_')}_ID_Card.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('Download started!');
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download ZIP file');
        }
    };

    // keep drawEditor in sync when editor transform changes (i.e. redraw)
    useEffect(() => {
        drawEditor();
    }, [editor.scale, editor.rotation, editor.tx, editor.ty, drawEditor]);

    // cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (lastObjectUrlRef.current) {
                try { URL.revokeObjectURL(lastObjectUrlRef.current); } catch (e) { }
                lastObjectUrlRef.current = null;
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <AdminHeader setIsSidebarOpen={setSidebarOpen} activeTab="selection" />

            {isSidebarOpen && (
                <div className="fixed inset-0 bg-gray-800 bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}></div>
            )}
            <div className={`fixed top-0 left-0 h-full bg-white dark:bg-background-dark w-64 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:hidden`}>
                <div className="p-5 border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setSidebarOpen(false)}>
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                </div>
                <nav className="flex flex-col p-5 gap-4">
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="/dashboard">Dashboard</Link>
                    <Link className="text-primary text-sm font-medium leading-normal" to="/selection">New Batch</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="#">Manage Employees</Link>
                    <Link className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal" to="#">Settings</Link>
                    <button onClick={logout} className="text-gray-800 dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </button>
                </nav>
            </div>

            <main className="flex flex-col lg:flex-row">
                <div className="flex-1 p-4 lg:p-10">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <div className="space-y-8">
                                    <IDCardFront
                                        ref={frontCardRef}
                                        employee={employee}
                                        logo={cloveLogo}
                                        photoBoxRef={photoBoxRef}
                                        canvasRef={canvasRef}
                                        onPointerDown={handlePointerDown}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                    />
                                    <IDCardBack ref={backCardRef} employee={employee} />
                                </div>
                            </div>
                            <div>
                                <div className="bg-white dark:bg-background-dark p-6 rounded-lg shadow-lg">
                                    <h2 className="text-2xl font-bold mb-6">Edit Employee Details</h2>
                                    <EmployeeForm employee={employee} onEmployeeChange={setEmployee} />
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold mb-4">Photo</h3>
                                        <PhotoUpload
                                            onPhotoSelect={handlePhotoSelect}
                                            onHideUploadNote={handleHideUploadNote}
                                            showUploadNote={showUploadNote}
                                            editor={editor}
                                            onZoomIn={handleZoomIn}
                                            onZoomOut={handleZoomOut}
                                            onRotateLeft={handleRotateLeft}
                                            onRotateRight={handleRotateRight}
                                            onReset={handleResetPos}
                                        />
                                    </div>
                                    <div className="mt-8 flex flex-col gap-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                onClick={handleDownload}
                                                className="flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-gray-900 dark:text-white transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                                            >
                                                <span className="material-symbols-outlined">download</span>
                                                Download ZIP
                                            </button>
                                            <button
                                                onClick={handleSaveAndBack}
                                                className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90"
                                            >
                                                <span className="material-symbols-outlined">save</span>
                                                Save & Back
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {modal.isOpen && (
                <Modal
                    type={modal.type}
                    title={modal.title}
                    message={modal.message}
                    onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
                />
            )}
        </div>
    );
};

export default BulkCardEditor;