
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Employee, getRequiredFieldsToastMessage } from '@/types/employee';
import { EmployeeForm } from '@/components/EmployeeForm';
import { IDCardFront } from '@/components/IDCardFront';
import { IDCardBack } from '@/components/IDCardBack';
import { useDownloadZip } from '@/hooks/useDownloadZip';

import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/AppHeader';
import { Check, Edit2, ZoomOut, ZoomIn, RotateCcw, RotateCw, RefreshCw } from 'lucide-react';


import logo from '@/assets/CLOVE LOGO BLACK.png';
import backLogoSvg from '@/assets/logo svg.png';

import { Cloudinary } from '@cloudinary/url-gen';
import { backgroundRemoval } from '@cloudinary/url-gen/actions/effect';
import { scale } from "@cloudinary/url-gen/actions/resize";
import { quality, format } from "@cloudinary/url-gen/actions/delivery";
import { auto } from "@cloudinary/url-gen/qualifiers/quality";
import { auto as autoFormat } from "@cloudinary/url-gen/qualifiers/format";

import { imageToDataUrl, compressImage } from '@/lib/utils';

import '@/styles/EmployeePage.css';
const EmployeePage: React.FC = () => {
    const { downloadZip } = useDownloadZip();
    const { effectiveUserId } = useAuth();
    const navigate = useNavigate();
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [isCardFlipped, setCardFlipped] = useState(false);

    const [isEditingPhoto, setIsEditingPhoto] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [employee, setEmployee] = useState<Employee>({
        fullName: '',
        employeeId: '',
        bloodGroup: '',
        branch: '',
        emergencyContact: '',
        countryCode: '+91',
        photo: null,
        status: 'Submitted',
    });

    const [isProcessingImage, setIsProcessingImage] = useState(false);
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
    const TARGET_H_PX = Math.round(2.392 * 1200); // height in px

    useEffect(() => {
        const loadLogos = async () => {
            try {
                const frontLogoUrl = await imageToDataUrl(logo);
                setFrontLogoDataUrl(frontLogoUrl);
                const backLogoUrl = await imageToDataUrl(backLogoSvg);
                setBackLogoDataUrl(backLogoUrl);
            } catch (error) {
                console.error('Error loading logo images:', error);
            }
        };
        loadLogos();
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                if (!effectiveUserId) return;

                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', effectiveUserId)
                    .single();

                if (profile) {
                    setEmployee(prev => ({
                        ...prev,
                        fullName: profile.full_name || prev.fullName,
                        employeeId: profile.employee_id || prev.employeeId,
                        bloodGroup: profile.blood_group || prev.bloodGroup,
                        branch: profile.branch || prev.branch,
                        emergencyContact: profile.phone || prev.emergencyContact,
                    }));
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            }
        };

        fetchProfile();
    }, [effectiveUserId]);

    const handleShowModal = useCallback((type: 'error' | 'success', title: string, message: string) => {
        setModal({ isOpen: true, type, title, message });
    }, []);

    const handlePhotoSelect = useCallback(async (file: File) => {
        setIsProcessingImage(true);
        try {
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

            if (!cloudName || !uploadPreset) {
                throw new Error('Missing Cloudinary configuration');
            }

            const cld = new Cloudinary({
                cloud: { cloudName },
                url: { secure: true }
            });

            const fileSizeMB = file.size / (1024 * 1024);
            let fileToUpload = file;

            if (fileSizeMB >= 10) {
                console.log(`📦 File >= 10MB, compressing locally to stay within Cloudinary's 10MB limit...`);
                toast.info(`Compressing ${fileSizeMB.toFixed(2)}MB image...`);
                fileToUpload = await compressImage(file);
                const compressedSizeMB = fileToUpload.size / (1024 * 1024);
                console.log(`✓ Local compression complete: ${compressedSizeMB.toFixed(2)}MB`);
            } else {
                console.log(`✓ File < 10MB, uploading directly`);
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);
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

            const cloudinaryImage = cld.image(publicId)
                .effect(backgroundRemoval())
                .resize(scale().width(1000))
                .delivery(quality(auto()))
                .delivery(format(autoFormat()));
            const imageUrl = cloudinaryImage.toURL();

            const originalImage = cld.image(publicId)
                .resize(scale().width(1000))
                .delivery(quality(auto()))
                .delivery(format(autoFormat()));
            const originalImageUrl = originalImage.toURL();
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
                    setEmployee(prev => ({ ...prev, photo: fileToUpload }));
                    setPhotoUrl(img.src);
                    setIsProcessingImage(false);
                    resolve();
                };
                img.onerror = () => {
                    if (img.src === imageUrl) {
                        console.warn('⚠️ Background removal failed - trying original...');
                        img.src = originalImageUrl;
                    } else {
                        setIsProcessingImage(false);
                        reject(new Error('Failed to load image from Cloudinary'));
                    }
                };
                img.src = imageUrl;
            });
        } catch (error) {
            setIsProcessingImage(false);
            console.error('Photo upload error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
        }
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
    }, [drawEditor]);

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

    // Reset everything (revoke object URL)
    const handleDownloadZip = useCallback(async () => {
        const missingFieldsMessage = getRequiredFieldsToastMessage(employee);
        if (missingFieldsMessage) {
            toast.error(missingFieldsMessage);
            return;
        }

        const frontCard = document.querySelector('.id-card-front-container') as HTMLElement;
        const backCard = document.querySelector('.id-card-back-container') as HTMLElement;

        if (!frontCard || !backCard) {
            toast.error('Error generating ZIP: Card elements not found.');
            return;
        }

        try {
            toast.info('Generating ZIP file...');
            const zipBlob = await downloadZip(employee, {
                img: editor.img,
                scale: editor.scale,
                rotation: editor.rotation,
                tx: editor.tx,
                ty: editor.ty,
            }, {
                w: TARGET_W_PX,
                h: TARGET_H_PX,
            }, frontCard, backCard, frontLogoDataUrl, backLogoDataUrl);

            // Create download link
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${employee.fullName.replace(/ /g, '_')}_ID_Card.zip`;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 100);

            toast.success('ZIP file downloaded successfully!');
        } catch (error) {
            toast.error('Failed to download ZIP file. Please try again.');
        }
    }, [employee, downloadZip, backLogoDataUrl, editor.img, editor.rotation, editor.scale, editor.tx, editor.ty, TARGET_W_PX, TARGET_H_PX]);

    const generateCardCanvas = useCallback((cardElement: HTMLElement, isFront: boolean) => {
        return new Promise<HTMLCanvasElement>((resolve, reject) => {
            import('html2canvas').then(({ default: html2canvas }) => {
                html2canvas(cardElement, {
                    scale: 10, // Use a high scale for maximum quality
                    backgroundColor: '#FFFFFF',
                    useCORS: true,
                    allowTaint: true,
                    imageTimeout: 15000,
                    onclone: (clonedDoc) => {
                        // Ensure logos use data URLs in the cloned document
                        const logoDataUrl = isFront ? frontLogoDataUrl : backLogoDataUrl;
                        if (logoDataUrl) {
                            const logoImgs = clonedDoc.querySelectorAll('img[alt*="Clove"]');
                            logoImgs.forEach((logoImg) => {
                                (logoImg as HTMLImageElement).src = logoDataUrl;
                            });
                        }

                        if (!isFront) return;

                        const canvasEl = clonedDoc.querySelector('canvas');
                        if (!canvasEl || !editor.img) return;

                        const offscreen = clonedDoc.createElement('canvas');
                        offscreen.width = TARGET_W_PX;
                        offscreen.height = TARGET_H_PX;
                        const oc = offscreen.getContext('2d');
                        if (!oc) return;

                        oc.fillStyle = '#fff';
                        oc.fillRect(0, 0, offscreen.width, offscreen.height);
                        oc.save();
                        oc.translate(offscreen.width / 2, offscreen.height / 2);
                        oc.rotate(editor.rotation);

                        const coverScale = Math.max(offscreen.width / editor.img.width, offscreen.height / editor.img.height);
                        const renderScale = coverScale * editor.scale;
                        oc.scale(renderScale, renderScale);

                        const dx = -editor.tx - editor.img.width / 2;
                        const dy = -editor.ty - editor.img.height / 2;

                        oc.drawImage(editor.img, dx, dy, editor.img.width, editor.img.height);
                        oc.restore();

                        canvasEl.width = TARGET_W_PX;
                        canvasEl.height = TARGET_H_PX;
                        const ctx = canvasEl.getContext('2d');
                        ctx?.drawImage(offscreen, 0, 0, TARGET_W_PX, TARGET_H_PX);
                    },
                }).then(resolve).catch(reject);
            });
        });
    }, [editor.img, editor.rotation, editor.scale, editor.tx, editor.ty, TARGET_W_PX, TARGET_H_PX, frontLogoDataUrl, backLogoDataUrl]);

    const handleReset = useCallback(() => {
        setEmployee({
            fullName: '',
            employeeId: '',
            bloodGroup: '',
            branch: '',
            emergencyContact: '',
            countryCode: '+91',
            photo: null,
            status: 'Submitted',
        });

        setEditor({
            img: null,
            scale: 1,
            rotation: 0,
            tx: 0,
            ty: 0,
            isDragging: false,
            dragStart: { x: 0, y: 0 },
            lastPos: { x: 0, y: 0 },
        });

        if (lastObjectUrlRef.current) {
            try { URL.revokeObjectURL(lastObjectUrlRef.current); } catch (e) { /* ignore */ }
            lastObjectUrlRef.current = null;
        }
    }, []);

    const handleSubmitRequest = async () => {
        const missingFieldsMessage = getRequiredFieldsToastMessage(employee);
        if (missingFieldsMessage) {
            toast.error(missingFieldsMessage);
            return;
        }
        if (!photoUrl) {
            toast.error('Please upload a photo');
            return;
        }

        try {
            if (!effectiveUserId) {
                toast.error('You must be logged in to submit a request.');
                return;
            }

            const { error } = await supabase.from('requests').insert({
                user_id: effectiveUserId,
                full_name: employee.fullName,
                employee_id: employee.employeeId,
                branch: employee.branch,
                blood_group: employee.bloodGroup,
                emergency_contact: employee.emergencyContact,
                country_code: employee.countryCode,
                photo_url: photoUrl,
                status: 'Pending',
                is_edited: false
            });

            if (error) throw error;

            toast.success('Request submitted successfully!');
            setTimeout(() => {
                navigate('/user-dashboard');
            }, 2000);
        } catch (error) {
            console.error('Error submitting request:', error);
            toast.error('Failed to submit request.');
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

    const onPrint = async () => {
        toast.info('Generating PDF for printing...');

        const frontCard = document.querySelector('.id-card-front-container') as HTMLElement;
        const backCard = document.querySelector('.id-card-back-container') as HTMLElement;

        if (!frontCard || !backCard) {
            toast.error('Error generating PDF: Card elements not found.');
            return;
        }

        try {
            const [frontCanvas, backCanvas] = await Promise.all([
                generateCardCanvas(frontCard, true),
                generateCardCanvas(backCard, false),
            ]);

            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'cm',
                format: [5.3, 8.5]
            });

            const frontImgData = frontCanvas.toDataURL('image/png', 1.0);
            const backImgData = backCanvas.toDataURL('image/png', 1.0);

            pdf.addImage(frontImgData, 'PNG', 0, 0, 5.3, 8.5);
            pdf.addPage();
            pdf.addImage(backImgData, 'PNG', 0, 0, 5.3, 8.5);

            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);

            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
                printWindow.onload = () => {
                    printWindow.print();
                    URL.revokeObjectURL(pdfUrl); // Clean up the object URL after printing
                };
            } else {
                toast.error('Could not open print window. Please check your browser settings.');
            }

        } catch (error) {
            console.error('Error generating PDF for printing:', error);
            toast.error('Error generating PDF for printing. Please try again.');
        }
    };

    return (
        <div className="font-display bg-background-light dark:bg-background-dark">
            <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
                <div className="layout-container flex h-full grow flex-col">
                    <AppHeader />
                    <main className="flex-1 px-4 sm:px-6 lg:px-10 py-8">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex flex-wrap justify-between gap-4 mb-8">
                                <div className="flex min-w-72 flex-col gap-2">
                                    <p className="text-slate-900 dark:text-white text-3xl sm:text-4xl font-black leading-tight tracking-[-0.033em]">Request Your Employee ID Card</p>
                                    <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Fill in your details below to request a new ID card.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                <div className="lg:col-span-3 bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
                                    <h2 className="text-slate-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em] pb-6">Enter Your Details</h2>
                                    <EmployeeForm
                                        employee={employee}
                                        onEmployeeChange={setEmployee}
                                        photoUrl={photoUrl}
                                        onPhotoSelect={handlePhotoSelect}
                                        hasImage={!!photoUrl}
                                    />
                                    <button onClick={handleSubmitRequest} className="w-full sm:w-auto flex items-center justify-center rounded-lg h-12 px-6 bg-primary text-white text-base font-bold mt-8">Submit Request</button>
                                </div>
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
                                        <div className="flex justify-between items-center mb-2">
                                            <h2 className="text-slate-900 dark:text-white text-[22px] font-bold leading-tight tracking-[-0.015em]">Live Preview</h2>
                                            <button onClick={() => setIsEditingPhoto(!isEditingPhoto)} className="flex items-center justify-center rounded-lg h-10 px-4 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white text-sm font-bold">
                                                {isEditingPhoto ? <Check size={20} /> : <Edit2 size={20} />}
                                            </button>
                                        </div>
                                        <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal mb-4">Click the card to see the back</p>
                                        {isEditingPhoto && (
                                            <div className="flex justify-center items-center gap-2 my-4">
                                                <button onClick={handleZoomOut} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700"><ZoomOut size={18} /></button>
                                                <button onClick={handleZoomIn} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700"><ZoomIn size={18} /></button>
                                                <button onClick={handleRotateLeft} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700"><RotateCcw size={18} /></button>
                                                <button onClick={handleRotateRight} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700"><RotateCw size={18} /></button>
                                                <button onClick={handleResetPos} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700"><RefreshCw size={18} /></button>
                                            </div>
                                        )}

                                        <div className={`relative h-[400px] w-full perspective-1000 flex items-center justify-center`} >
                                            <div
                                                className={`relative w-full h-full max-w-sm transition-transform duration-700 transform-style-preserve-3d ${!isEditingPhoto && 'cursor-pointer'} ${isCardFlipped ? 'rotate-y-180' : ''}`}
                                                onClick={() => !isEditingPhoto && setCardFlipped(!isCardFlipped)}
                                            >
                                                <div className="absolute w-full h-full backface-hidden">
                                                    <div className="w-full h-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg flex items-center justify-center">
                                                        <IDCardFront employee={employee} logoSrc={frontLogoDataUrl} canvasRef={canvasRef} photoBoxRef={photoBoxRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} isLoadingImage={isProcessingImage} />
                                                    </div>
                                                </div>
                                                <div className="absolute w-full h-full backface-hidden rotate-y-180">
                                                    <div className="w-full h-full mx-auto bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-6 shadow-lg flex items-center justify-center">
                                                        <IDCardBack employee={employee} logoSrc={backLogoDataUrl} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>
                    </main>
                </div>

            </div>
        </div>
    );
};

export default EmployeePage;