// src/pages/index.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Employee, PhotoTransform, getRequiredFieldsToastMessage } from '@/types/employee';
import { EmployeeForm } from '@/components/EmployeeForm';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ImageAdjustments } from '@/components/ImageAdjustments';
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
import { scale } from "@cloudinary/url-gen/actions/resize";
import { quality, format } from "@cloudinary/url-gen/actions/delivery";
import { auto } from "@cloudinary/url-gen/qualifiers/quality";
import { auto as autoFormat } from "@cloudinary/url-gen/qualifiers/format";
import { imageToDataUrl, compressImage, uploadCanvasToCloudinary } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { uploadRawPhotoToDrive } from '@/lib/googleDriveUpload';

import AppHeader from '../components/AppHeader';
import { useAuth } from '@/hooks/useAuth';
import { ProgressBar } from '@/components/ProgressBar';
import { useStorageProvider } from '@/hooks/useStorageProvider';
import StepWizard from '@/components/StepWizard';
import CardSaveProgress from '@/components/CardSaveProgress';

const SingleCard: React.FC = () => {
    const { userRole } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const { downloadZip } = useDownloadZip();
    const { uploadZip } = useStorageProvider();
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [requestId, setRequestId] = useState<string | null>(null);

    const [employee, setEmployee] = useState<Employee>({
        fullName: '',
        employeeId: '',
        bloodGroup: '',
        branch: '',
        emergencyContact: '',
        countryCode: '+91',
        photo: null,
    });
    const employeeRef = useRef(employee);
    employeeRef.current = employee;

    const batchState = location.state as {
        sourceTable?: string;
        employee?: Employee;
        headers?: string[];
        rowIndex?: number;
        csvData?: any[][];
        zipUrls?: Record<number, string>;
        cardIds?: Record<number, number>;
        batchId?: string;
        cardPrintStatuses?: Record<number, string>;
        cardId?: number;
        viewOnly?: boolean;
        returnPath?: string;
    } | null;

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const id = params.get('requestId');

        if (batchState?.employee && batchState?.sourceTable === 'id_cards') {
            setRequestId(id);
            setEmployee(batchState.employee);
            if (batchState.employee.photo_url) {
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
                };
                img.src = batchState.employee.photo_url;
            }
        } else if (id) {
            setRequestId(id);
            fetchRequestDetails(id);
        }
    }, [location.search, location.state]);

    const fetchRequestDetails = async (id: string) => {
        try {
            const { data, error } = await supabase
                .from('card_details')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setEmployee({
                    fullName: data.full_name || '',
                    employeeId: data.employee_id || '',
                    bloodGroup: data.blood_group || '',
                    branch: data.branch || '',
                    emergencyContact: data.emergency_contact || '',
                    countryCode: data.country_code || '+91',
                    photo: null,
                    photo_url: data.photo_url,
                });

                if (data.photo_url) {
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
                    };
                    img.src = data.photo_url;
                }
            }
        } catch (error) {
            console.error('Error fetching request details:', error);
            toast.error('Failed to load request details');
        }
    };

    const [rawPhotoFile, setRawPhotoFile] = useState<File | null>(null);
    const [showUploadNote, setShowUploadNote] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, type: 'error' as 'error' | 'success', title: '', message: '' });
    const [isLoadingImage, setIsLoadingImage] = useState(false);
    const [imageProcessProgress, setImageProcessProgress] = useState(0);
    const [showImageProcessProgress, setShowImageProcessProgress] = useState(false);
    const [imageProcessMessage, setImageProcessMessage] = useState('');

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

    const [filters, setFilters] = useState({
        brightness: 1,
        contrast: 1,
        saturation: 1,
        shadow: 0,
    });

    const [wizardStep, setWizardStep] = useState(0);
    // phones show one card at a time; tablets/desktop show both side by side
    const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');
    const [showAdjustments, setShowAdjustments] = useState(false);

    useEffect(() => {
        if (wizardStep === 1) setPreviewSide('front');
    }, [wizardStep]);
    const [saveProgress, setSaveProgress] = useState(0);
    const [saveMessage, setSaveMessage] = useState('');
    const [showSaveProgress, setShowSaveProgress] = useState(false);

    // track last object URL to revoke it later
    const lastObjectUrlRef = useRef<string | null>(null);

    // target export size in pixels (1200 DPI for maximum quality)
    const TARGET_W_PX = Math.round(2.125 * 1200); // width in px
    const TARGET_H_PX = Math.round(2.392 * 1200); // height in px

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

    const handleShowModal = useCallback((type: 'error' | 'success', title: string, message: string) => {
        setModal({ isOpen: true, type, title, message });
    }, []);

    const handleHideUploadNote = useCallback(() => {
        setShowUploadNote(false);
    }, []);



    const handlePhotoSelect = useCallback(async (file: File) => {
        setRawPhotoFile(file);
        try {
            setIsLoadingImage(true);
            setShowImageProcessProgress(true);
            setImageProcessProgress(10);
            setImageProcessMessage('Checking file size...');

            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

            if (!cloudName || !uploadPreset) {
                throw new Error('Missing Cloudinary configuration');
            }

            const fileSizeMB = file.size / (1024 * 1024);
            console.log(`📊 Original file size: ${fileSizeMB.toFixed(2)}MB`);

            // Check if compression is needed to stay under Cloudinary's 10MB limit
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

            setImageProcessProgress(20);
            setImageProcessMessage('Uploading to server...');
            toast.info(`Uploading ${fileSizeMB.toFixed(2)}MB image...`);

            setImageProcessProgress(40);

            const cld = new Cloudinary({
                cloud: { cloudName },
                url: { secure: true }
            });

            console.log('📤 Uploading to Cloudinary...');
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('upload_preset', uploadPreset);

            // Transformations are applied server-side via URL generation after upload
            // Unsigned uploads don't support transformation parameter in FormData

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('📋 Cloudinary response:', { status: response.status, ok: response.ok });

            if (!response.ok) {
                const errorMessage = data?.error?.message ?? `Upload failed with status ${response.status}`;
                console.error('❌ Cloudinary upload failed:', errorMessage);
                throw new Error(`Cloudinary upload error: ${errorMessage}`);
            }

            const publicId = data.public_id;
            if (!publicId) {
                throw new Error('Invalid Cloudinary response - no public_id returned');
            }

            console.log(`✓ Uploaded successfully with public_id: ${publicId}`);

            setImageProcessProgress(70);
            setImageProcessMessage('Applying Cloudinary server-side transformations...');

            // Apply Cloudinary server-side transformations for compression and optimization
            // THEN apply background removal to the compressed result
            // Transformations: width: 1000 (resize), quality: auto, format: auto (picks WebP, etc)
            const imageWithBgRemoval = cld.image(publicId)
                .effect(backgroundRemoval())
                .resize(scale().width(1000))
                .delivery(quality(auto()))
                .delivery(format(autoFormat()));
            const bgRemovedUrl = imageWithBgRemoval.toURL();

            // Fallback: Same transformations but without background removal in case processing fails
            const originalImage = cld.image(publicId)
                .resize(scale().width(1000))
                .delivery(quality(auto()))
                .delivery(format(autoFormat()));
            const originalUrl = originalImage.toURL();

            console.log('→ Background removal URL (compressed & optimized):', bgRemovedUrl);
            console.log('→ Original URL (compressed & optimized - fallback):', originalUrl);

            setImageProcessProgress(90);
            setImageProcessMessage('Loading processed image...');

            await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                let hasTriedFallback = false;
                let timeoutId: NodeJS.Timeout | null = null;

                const clearCurrentTimeout = () => {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                };

                const startTimeout = (duration: number, retryUrl?: string) => {
                    clearCurrentTimeout();
                    timeoutId = setTimeout(() => {
                        console.warn(`⚠️ Image loading timeout (${duration}ms)`, { currentUrl: img.src, retryUrl });
                        if (retryUrl && !hasTriedFallback) {
                            hasTriedFallback = true;
                            console.log('→ Retrying with fallback URL...');
                            img.src = retryUrl;
                            startTimeout(10000);
                        } else {
                            clearCurrentTimeout();
                            reject(new Error('Image loading timed out - unable to load from Cloudinary'));
                        }
                    }, duration);
                };

                img.onload = () => {
                    clearCurrentTimeout();
                    console.log('✓ Image loaded successfully');
                    console.log('📐 Image dimensions:', img.width, 'x', img.height);

                    setImageProcessProgress(100);
                    setEditor(prev => ({
                        ...prev,
                        img,
                        scale: 1,
                        rotation: 0,
                        tx: 0,
                        ty: 0,
                    }));
                    setEmployee(prev => ({ ...prev, photo: fileToUpload, photo_url: img.src }));
                    uploadRawPhotoToDrive(file, employeeRef.current.fullName, employeeRef.current.employeeId)
                        .catch((err) => console.warn('Raw photo Drive backup failed:', err));
                    setIsLoadingImage(false);
                    setTimeout(() => setShowImageProcessProgress(false), 500);
                    resolve();
                };

                img.onerror = (e) => {
                    console.error(`❌ Image load error:`, {
                        src: img.src,
                        attempted: img.src === bgRemovedUrl ? 'background-removal' : 'original',
                        hasTriedFallback
                    });

                    if (!hasTriedFallback && img.src === bgRemovedUrl) {
                        console.warn('⚠️ Background-removed image failed - attempting original URL...');
                        hasTriedFallback = true;
                        img.src = originalUrl;
                        startTimeout(10000);
                    } else {
                        clearCurrentTimeout();
                        reject(new Error('Failed to load image from Cloudinary - both background-removal and original attempts failed'));
                    }
                };

                console.log('→ Starting image load from background-removal URL');
                startTimeout(15000, originalUrl);
                img.src = bgRemovedUrl;
            });
        } catch (error) {
            console.error('Photo processing error:', error);
            const errorMsg = error instanceof Error ? error.message : 'Please try again.';
            toast.error(`Failed to process image: ${errorMsg}`);
            setIsLoadingImage(false);
            setShowImageProcessProgress(false);
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

            oc.imageSmoothingEnabled = true;
            oc.imageSmoothingQuality = 'high';
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

            let filterStr = `brightness(${filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturation})`;
            if (filters.shadow > 0) {
                const i = filters.shadow;
                const offsetY = Math.round(i * 80);
                const blur = Math.round(i * 160);
                const alpha = 0.1 + i * 0.2;
                filterStr += ` drop-shadow(0 ${offsetY}px ${blur}px rgba(0,0,0,${alpha.toFixed(2)}))`;
            }
            oc.filter = filterStr;
            oc.drawImage(editor.img, dx, dy, editor.img.width, editor.img.height);
            oc.restore();

            // finally draw the offscreen to the visible canvas (scaled to rect)
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(offscreen, 0, 0, rect.width, rect.height);
        } catch (e) {
            console.error('drawEditor error', e);
        }
    }, [editor, filters, TARGET_W_PX, TARGET_H_PX]);

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

    const handleAutoEnhance = useCallback(() => {
        setFilters({ brightness: 1.1, contrast: 1.15, saturation: 1.1, shadow: 0 });
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({ brightness: 1, contrast: 1, saturation: 1, shadow: 0 });
    }, []);

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
            }, frontCard, backCard, frontLogoDataUrl, backLogoDataUrl, filters);

            // Create download link
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${employee.fullName.replace(/ /g, '_')}_${employee.employeeId}_ID_Card.zip`;
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
    }, [employee, downloadZip, frontLogoDataUrl, backLogoDataUrl, editor.img, editor.rotation, editor.scale, editor.tx, editor.ty, filters, TARGET_W_PX, TARGET_H_PX]);

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

                        oc.imageSmoothingEnabled = true;
                        oc.imageSmoothingQuality = 'high';
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

                        let filterStr = `brightness(${filters.brightness}) contrast(${filters.contrast}) saturate(${filters.saturation})`;
                        if (filters.shadow > 0) {
                            const i = filters.shadow;
                            const offsetY = Math.round(i * 80);
                            const blur = Math.round(i * 160);
                            const alpha = 0.1 + i * 0.2;
                            filterStr += ` drop-shadow(0 ${offsetY}px ${blur}px rgba(0,0,0,${alpha.toFixed(2)}))`;
                        }
                        oc.filter = filterStr;
                        oc.drawImage(editor.img, dx, dy, editor.img.width, editor.img.height);
                        oc.restore();

                        canvasEl.width = TARGET_W_PX;
                        canvasEl.height = TARGET_H_PX;
                        const ctx = canvasEl.getContext('2d');
                        if (ctx) {
                            ctx.imageSmoothingEnabled = true;
                            ctx.imageSmoothingQuality = 'high';
                            ctx.drawImage(offscreen, 0, 0, TARGET_W_PX, TARGET_H_PX);
                        }
                    },
                }).then(resolve).catch(reject);
            });
        });
    }, [editor.img, editor.rotation, editor.scale, editor.tx, editor.ty, filters, TARGET_W_PX, TARGET_H_PX, frontLogoDataUrl, backLogoDataUrl]);

    const handleReset = useCallback(() => {
        setRawPhotoFile(null);
        setEmployee({
            fullName: '',
            employeeId: '',
            bloodGroup: '',
            branch: '',
            emergencyContact: '',
            countryCode: '+91',
            photo: null,
        });

        setRequestId(null);

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
            try { URL.revokeObjectURL(lastObjectUrlRef.current); } catch (e) { }
            lastObjectUrlRef.current = null;
        }
        setShowUploadNote(true);
        setWizardStep(0);
    }, []);

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

        const frontCard = document.querySelector('.id-card-front') as HTMLElement;
        const backCard = document.querySelector('.id-card-back') as HTMLElement;

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

    const handleSave = async () => {
        const missingFieldsMessage = getRequiredFieldsToastMessage(employee);
        if (missingFieldsMessage) {
            toast.error(missingFieldsMessage);
            return;
        }

        setShowSaveProgress(true);
        setSaveProgress(5);
        setSaveMessage('Preparing card...');

        try {
            const frontCard = document.querySelector('.id-card-front-container') as HTMLElement;
            const backCard = document.querySelector('.id-card-back-container') as HTMLElement;

            if (!frontCard || !backCard) {
                throw new Error('Card elements not found');
            }

            setSaveProgress(10);
            setSaveMessage('Generating card images...');

            // Upload the composed canvas (crop/zoom/rotation/filters already applied)
            // so the saved photo_url matches exactly what's shown in the editor.
            let composedPhotoUrl: string | null = null;
            if (canvasRef.current && editor.img) {
                drawEditor();
                setSaveMessage('Uploading positioned photo...');
                try {
                    composedPhotoUrl = await uploadCanvasToCloudinary(canvasRef.current);
                } catch (err) {
                    console.warn('Failed to upload composed photo, falling back to raw photo URL:', err);
                }
            }
            const finalPhotoUrl = composedPhotoUrl || employee.photo_url || null;

            // Generate ZIP file
            const zipBlob = await downloadZip(
                employee,
                {
                    img: editor.img,
                    scale: editor.scale,
                    rotation: editor.rotation,
                    tx: editor.tx,
                    ty: editor.ty,
                },
                { w: TARGET_W_PX, h: TARGET_H_PX },
                frontCard,
                backCard,
                frontLogoDataUrl,
                backLogoDataUrl,
                filters
            );

            setSaveProgress(45);
            setSaveMessage('ZIP ready — uploading...');

            // Upload ZIP to active storage provider (Supabase or Google Drive)
            const zipFileName = `${employee.fullName.replace(/ /g, '_')}_${employee.employeeId}_ID_Card.zip`;
            const zipUrl = await uploadZip(
                zipBlob,
                zipFileName,
                batchState?.sourceTable === 'id_cards' ? 'batch' : 'single',
                batchState?.batchId || undefined,
            );

            setSaveProgress(80);
            setSaveMessage('Saving card details...');

            // Handle batch context (from ImportManagement)
            if (batchState?.sourceTable === 'id_cards') {
                const headerMapping: Record<string, string> = {
                    'full name': 'fullName',
                    'employee id': 'employeeId',
                    'blood group': 'bloodGroup',
                    'branch': 'branch',
                    'emergency contact': 'emergencyContact',
                    'emergency no': 'emergencyContact',
                    'photo': 'photo_url',
                    'image': 'photo_url',
                    'photo (upload)': 'photo_url',
                };

                const newCardData: Record<string, any> = {};
                const originalRow = batchState.csvData?.[batchState.rowIndex!];
                if (batchState.headers) {
                    batchState.headers.forEach((header: string, headerIdx: number) => {
                        const key = header.trim().toLowerCase();
                        const employeeKey = headerMapping[key];
                        if (employeeKey) {
                            newCardData[header] = employee[employeeKey as keyof Employee] || '';
                        } else if (originalRow?.[headerIdx] !== undefined) {
                            newCardData[header] = originalRow[headerIdx];
                        }
                    });
                }
                newCardData['zip_url'] = zipUrl;

                let cardId = batchState.cardId;
                if (!cardId) {
                    const { data: insertData, error: insertError } = await supabase
                        .from('id_cards')
                        .insert({
                            employee_id: employee.employeeId,
                            batch_id: batchState.batchId,
                            card_data: newCardData,
                            photo_url: finalPhotoUrl,
                            zip_url: zipUrl,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select('id')
                        .single();

                    if (insertError || !insertData) {
                        console.error('Error inserting id_cards:', insertError);
                        toast.error('Failed to save card details.');
                        return;
                    }
                    cardId = insertData.id;
                } else {
                    const { error: updateError } = await supabase
                        .from('id_cards')
                        .update({
                            card_data: newCardData,
                            photo_url: finalPhotoUrl,
                            zip_url: zipUrl,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', cardId);

                    if (updateError) {
                        console.error('Error updating id_cards:', updateError);
                        toast.error('Failed to save card details.');
                        return;
                    }
                }

                toast.success('Card saved successfully!');

                const updatedCsvData = batchState.csvData ? batchState.csvData.map((row: any[], idx: number) => {
                    if (idx === batchState.rowIndex && batchState.headers) {
                        const newRow = [...row];
                        batchState.headers.forEach((header: string, headerIdx: number) => {
                            const key = header.trim().toLowerCase();
                            const employeeKey = headerMapping[key];
                            if (employeeKey) {
                                newRow[headerIdx] = employee[employeeKey as keyof Employee] || '';
                            }
                        });
                        return newRow;
                    }
                    return row;
                }) : undefined;

                const updatedZipUrls = batchState.zipUrls ? { ...batchState.zipUrls, [batchState.rowIndex!]: zipUrl } : undefined;
                const updatedCardIds = batchState.cardIds ? [...batchState.cardIds] : [];
                if (batchState.rowIndex !== undefined && !batchState.cardIds?.[batchState.rowIndex]) {
                    updatedCardIds[batchState.rowIndex] = cardId!;
                }

                navigate(batchState.returnPath || '/import-management', {
                    state: {
                        csvData: updatedCsvData || batchState.csvData,
                        headers: batchState.headers,
                        zipUrls: updatedZipUrls || batchState.zipUrls,
                        cardIds: updatedCardIds.length ? updatedCardIds : batchState.cardIds,
                        batchId: batchState.batchId,
                        cardPrintStatuses: batchState.cardPrintStatuses,
                    }
                });
                return;
            }

            // Normal flow: save to card_details
            const cardData = {
                full_name: employee.fullName,
                employee_id: employee.employeeId,
                blood_group: employee.bloodGroup,
                branch: employee.branch,
                emergency_contact: employee.emergencyContact,
                country_code: employee.countryCode,
                photo_url: finalPhotoUrl,
                zip_url: zipUrl,
                created_at: new Date().toISOString(),
                status: 'pending'
            };

            const { error: dbError } = await supabase
                .from('card_details')
                .insert(cardData);

            if (dbError) {
                console.error('Error saving to database:', dbError);
                toast.error('Failed to save card details.');
                setShowSaveProgress(false);
            } else {
                setSaveProgress(100);
                setSaveMessage('Saved successfully!');
                toast.success('Card details saved successfully!');
                setTimeout(() => { setShowSaveProgress(false); setSaveProgress(0); }, 1800);
                handleReset();
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while saving');
            setShowSaveProgress(false);
            setSaveProgress(0);
        }
    };

    const downloadPng = async () => {
        toast.info('Generating PNG files...');
        const f = document.querySelector('.id-card-front-container') as HTMLElement;
        const b = document.querySelector('.id-card-back-container') as HTMLElement;
        if (!f || !b) { toast.error('Card elements not found.'); return; }
        try {
            const [fc, bc] = await Promise.all([generateCardCanvas(f, true), generateCardCanvas(b, false)]);
            const dl = (c: HTMLCanvasElement, n: string) => c.toBlob((bl) => { if (bl) { const u = URL.createObjectURL(bl); const a = document.createElement('a'); a.href=u; a.download=n; a.click(); URL.revokeObjectURL(u); }}, 'image/png', 1.0);
            dl(fc, `${employee.fullName||'id'}_front.png`);
            dl(bc, `${employee.fullName||'id'}_back.png`);
            toast.success('PNG downloaded!');
        } catch { toast.error('PNG generation failed.'); }
    };

    const downloadPdf = async () => {
        toast.info('Generating PDF...');
        const f = document.querySelector('.id-card-front-container') as HTMLElement;
        const b = document.querySelector('.id-card-back-container') as HTMLElement;
        if (!f || !b) { toast.error('Card elements not found.'); return; }
        try {
            const [fc, bc] = await Promise.all([generateCardCanvas(f, true), generateCardCanvas(b, false)]);
            const { jsPDF } = await import('jspdf');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'cm', format: [5.3, 8.5] });
            pdf.addImage(fc.toDataURL('image/png',1.0),'PNG',0,0,5.3,8.5); pdf.addPage(); pdf.addImage(bc.toDataURL('image/png',1.0),'PNG',0,0,5.3,8.5);
            pdf.save(`${employee.fullName||'id'}_cards.pdf`);
            toast.success('PDF downloaded!');
        } catch { toast.error('PDF generation failed.'); }
    };

    const goToPhotoStep = () => {
        const missingFieldsMessage = getRequiredFieldsToastMessage(employee);
        if (missingFieldsMessage) {
            toast.error(missingFieldsMessage);
            return;
        }
        setWizardStep(1);
    };

    // On phones the inactive card sits directly behind the visible one. It stays
    // rendered at full size so html2canvas capture and photo dragging keep working.
    const stackedBehind = 'max-md:absolute max-md:top-0 max-md:left-0 max-md:-z-10 max-md:pointer-events-none';

    const primaryBtn = 'flex items-center justify-center gap-2 h-12 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 active:opacity-80 disabled:opacity-40 transition-opacity';
    const secondaryBtn = 'flex items-center justify-center gap-1.5 h-11 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 dark:active:bg-gray-800 transition-colors';
    const toolBtn = 'flex-1 flex items-center justify-center h-11 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 disabled:opacity-40 transition-colors';

    return (
        <div className="min-h-screen bg-background">
            <ProgressBar
                isVisible={showImageProcessProgress}
                progress={imageProcessProgress}
                message={imageProcessMessage}
                position="bottom-right"
            />
            <AppHeader />

            <main className="max-w-[1150px] mx-auto px-4 py-3 md:px-6 lg:py-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 h-9 -ml-1 px-1 text-sm text-muted-foreground hover:text-foreground mb-2 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    <span>Back</span>
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4 md:gap-6">
                    {/* Card previews: side by side on tablet/desktop, Front/Back toggle on phones */}
                    <div className="space-y-3 lg:sticky lg:top-4 self-start">
                        <div className="md:hidden flex justify-center">
                            <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                                {(['front', 'back'] as const).map((side) => (
                                    <button
                                        key={side}
                                        type="button"
                                        onClick={() => setPreviewSide(side)}
                                        className={`h-9 px-5 rounded-lg text-sm font-medium capitalize transition-all ${
                                            previewSide === side
                                                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                                                : 'text-gray-500 dark:text-gray-400'
                                        }`}
                                    >
                                        {side}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative isolate mx-auto w-[230px] md:w-auto flex flex-row items-start justify-center gap-4 md:gap-6">
                            <div
                                aria-hidden={previewSide !== 'front' ? true : undefined}
                                className={`id-card-front-container shrink-0 w-[230px] h-[365px] bg-white shadow-sm rounded-lg overflow-hidden ${previewSide !== 'front' ? stackedBehind : ''}`}
                            >
                                <IDCardFront
                                    employee={employee}
                                    logoSrc={frontLogoDataUrl}
                                    canvasRef={canvasRef}
                                    photoBoxRef={photoBoxRef}
                                    onPointerDown={handlePointerDown}
                                    onPointerMove={handlePointerMove}
                                    onPointerUp={handlePointerUp}
                                    isLoadingImage={isLoadingImage}
                                />
                            </div>
                            <div
                                aria-hidden={previewSide !== 'back' ? true : undefined}
                                className={`id-card-back-container shrink-0 w-[230px] h-[365px] bg-white shadow-sm rounded-lg overflow-hidden ${previewSide !== 'back' ? stackedBehind : ''}`}
                            >
                                <IDCardBack employee={employee} logoSrc={backLogoDataUrl} />
                            </div>
                        </div>

                        {wizardStep === 1 && editor.img && (
                            <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                                <span className="material-symbols-outlined text-sm">pan_tool</span>
                                Drag the photo on the card to position it
                            </p>
                        )}
                        <CardSaveProgress isVisible={showSaveProgress} progress={saveProgress} message={saveMessage} />
                    </div>

                    {/* Step wizard */}
                    <div className="w-full md:max-w-2xl md:mx-auto lg:max-w-none bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden self-start">
                        <StepWizard
                            steps={[
                                { label: 'Details', icon: 'badge' },
                                { label: 'Photo', icon: 'photo_camera' },
                                { label: 'Finalise', icon: 'tune' },
                            ]}
                            currentStep={wizardStep}
                            onStepClick={setWizardStep}
                        >
                            {/* Step 0 — Employee Details */}
                            <div className="space-y-5">
                                <EmployeeForm employee={employee} onEmployeeChange={setEmployee} />
                                <button type="button" onClick={goToPhotoStep} className={`w-full ${primaryBtn}`}>
                                    Next: Add Photo
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>
                            </div>

                            {/* Step 1 — Photo */}
                            <div className="space-y-4">
                                <PhotoUpload
                                    onPhotoSelect={handlePhotoSelect}
                                    currentPhoto={employee.photo}
                                    showUploadNote={showUploadNote}
                                    onHideUploadNote={handleHideUploadNote}
                                    onShowModal={handleShowModal}
                                    isLoadingImage={isLoadingImage}
                                    enableCamera
                                    hasPhoto={!!editor.img}
                                />
                                {editor.img && !isLoadingImage && (
                                    <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Position &amp; Zoom</p>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {editor.scale.toFixed(2)}x · {Math.round((editor.rotation * 180) / Math.PI)}°
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={handleZoomOut} title="Zoom out" className={toolBtn}>
                                                <span className="material-symbols-outlined text-xl">zoom_out</span>
                                            </button>
                                            <button type="button" onClick={handleZoomIn} title="Zoom in" className={toolBtn}>
                                                <span className="material-symbols-outlined text-xl">zoom_in</span>
                                            </button>
                                            <button type="button" onClick={handleRotateLeft} title="Rotate left" className={toolBtn}>
                                                <span className="material-symbols-outlined text-xl">rotate_left</span>
                                            </button>
                                            <button type="button" onClick={handleRotateRight} title="Rotate right" className={toolBtn}>
                                                <span className="material-symbols-outlined text-xl">rotate_right</span>
                                            </button>
                                            <button type="button" onClick={handleResetPos} title="Reset position" className={toolBtn}>
                                                <span className="material-symbols-outlined text-xl">restart_alt</span>
                                            </button>
                                        </div>
                                        <input
                                            type="range" min="0.5" max="3" step="0.01"
                                            value={editor.scale}
                                            onChange={(e) => setEditor(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                                            aria-label="Zoom"
                                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
                                    <button type="button" onClick={() => setWizardStep(0)} className={`px-4 ${secondaryBtn}`}>
                                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                                        Back
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(2)}
                                        disabled={isLoadingImage}
                                        className={primaryBtn}
                                    >
                                        {editor.img ? 'Next: Finalise' : 'Skip photo for now'}
                                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            {/* Step 2 — Finalise */}
                            <div className="space-y-4">
                                {editor.img && (
                                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setShowAdjustments((v) => !v)}
                                            className="w-full flex items-center justify-between h-12 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <span className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-lg text-orange-500">tune</span>
                                                Adjust photo colours
                                                <span className="text-xs font-normal text-gray-400">(optional)</span>
                                            </span>
                                            <span className={`material-symbols-outlined text-xl text-gray-400 transition-transform ${showAdjustments ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>
                                        {showAdjustments && (
                                            <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-800">
                                                <ImageAdjustments
                                                    brightness={filters.brightness}
                                                    contrast={filters.contrast}
                                                    saturation={filters.saturation}
                                                    shadow={filters.shadow}
                                                    onBrightnessChange={(val) => setFilters(prev => ({ ...prev, brightness: val }))}
                                                    onContrastChange={(val) => setFilters(prev => ({ ...prev, contrast: val }))}
                                                    onSaturationChange={(val) => setFilters(prev => ({ ...prev, saturation: val }))}
                                                    onShadowChange={(val) => setFilters(prev => ({ ...prev, shadow: val }))}
                                                    onAutoEnhance={handleAutoEnhance}
                                                    onResetFilters={handleResetFilters}
                                                    hasImage={!!editor.img}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <button type="button" onClick={handleSave} disabled={showSaveProgress} className={`w-full ${primaryBtn}`}>
                                    <span className="material-symbols-outlined text-lg">save</span>
                                    Save Card
                                </button>

                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Download or print</p>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-2">
                                        <button type="button" onClick={downloadPdf} className={secondaryBtn}>
                                            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>PDF
                                        </button>
                                        <button type="button" onClick={downloadPng} className={secondaryBtn}>
                                            <span className="material-symbols-outlined text-lg">image</span>PNG
                                        </button>
                                        <button type="button" onClick={handleDownloadZip} className={secondaryBtn}>
                                            <span className="material-symbols-outlined text-lg">folder_zip</span>ZIP
                                        </button>
                                        <button type="button" onClick={onPrint} className={secondaryBtn}>
                                            <span className="material-symbols-outlined text-lg">print</span>Print
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setWizardStep(1)}
                                        className="flex items-center gap-1 h-10 px-2 -ml-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                                        Back
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            className="flex items-center gap-1 h-10 px-3 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-lg">refresh</span>
                                            Start over
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(-1)}
                                            className="h-10 px-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </StepWizard>
                    </div>
                </div>
            </main>

            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
                type={modal.type}
                title={modal.title}
                message={modal.message}
            />
        </div>
    );
};

export default SingleCard;
