
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Employee } from '@/types/employee';
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
import { imageToDataUrl, compressImage } from '@/lib/utils';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import AppHeader from '../components/AppHeader';
import StepWizard from '@/components/StepWizard';
import { uploadRawPhotoToDrive } from '@/lib/googleDriveUpload';
import CardSaveProgress from '@/components/CardSaveProgress';

const EditRequest: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { downloadZip } = useDownloadZip();
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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

    const [showUploadNote, setShowUploadNote] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, type: 'error' as 'error' | 'success', title: '', message: '' });
    const [isLoadingImage, setIsLoadingImage] = useState(false);

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
    const [saveProgress, setSaveProgress] = useState(0);
    const [saveMessage, setSaveMessage] = useState('');
    const [showSaveProgress, setShowSaveProgress] = useState(false);

    // track last object URL to revoke it later
    const lastObjectUrlRef = useRef<string | null>(null);

    // target export size in pixels (1200 DPI for maximum quality)
    const TARGET_W_PX = Math.round(2.125 * 1200); // width in px
    const TARGET_H_PX = Math.round(2.392 * 1200); // height in px

    useEffect(() => {
        const fetchRequest = async () => {
            if (!id) return;

            const params = new URLSearchParams(window.location.search);
            const tableName = params.get('table') || 'requests';

            // sanitize id - requests.id is a numeric bigserial
            const numericId = parseInt(id, 10);
            if (isNaN(numericId)) {
                console.warn('Invalid request id:', id);
                toast.error('Invalid request id.');
                return;
            }

            // use maybeSingle to avoid PostgREST PGRST116 when no rows match
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .eq('id', numericId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching request:', error);
                toast.error('Failed to load request details.');
                return;
            } else if (!data) {
                // No matching row found
                console.warn('Request not found for id:', numericId);
                toast.error('Request not found.');
                navigate(-1);
                return;
            } else {
                setEmployee({
                    fullName: data.full_name,
                    employeeId: data.employee_id,
                    bloodGroup: data.blood_group,
                    branch: data.branch,
                    emergencyContact: data.emergency_contact,
                    countryCode: data.country_code || '+91',
                    photo: null, // Photo URL handling needs to be added if we want to pre-load the image
                });

                // If there is a photo URL, we might want to load it into the editor
                if (data.photo_url) {
                    setPhotoUrl(data.photo_url);
                    loadImageFromUrl(data.photo_url);
                }
            }
        };

        fetchRequest();
    }, [id]);

    const loadImageFromUrl = async (url: string) => {
        try {
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
                setPhotoUrl(img.src);
            };
            img.src = url;
        } catch (error) {
            console.error("Error loading image", error);
        }
    };

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
        try {
            setIsLoadingImage(true);
            const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

            if (!cloudName || !uploadPreset) {
                throw new Error('Missing Cloudinary configuration');
            }

            const cld = new Cloudinary({
                cloud: { cloudName },
                url: { secure: true }
            });

            // Compress locally if file is over 10MB to stay under Cloudinary limit
            let fileToUpload = file;
            const fileSizeMB = file.size / (1024 * 1024);

            if (fileSizeMB > 10) {
                console.log(`📦 File > 10MB, compressing locally...`);
                toast.info(`Compressing ${fileSizeMB.toFixed(2)}MB image...`);
                fileToUpload = await compressImage(file);
                const compressedSizeMB = fileToUpload.size / (1024 * 1024);
                console.log(`✓ Local compression complete: ${compressedSizeMB.toFixed(2)}MB`);
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

            // Apply background removal and optimizations to the uploaded image
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
                    uploadRawPhotoToDrive(file, employeeRef.current.fullName, employeeRef.current.employeeId)
                        .catch((err) => console.warn('Raw photo Drive backup failed:', err));
                    setPhotoUrl(img.src);
                    setIsLoadingImage(false);
                    resolve();
                };
                img.onerror = () => {
                    if (img.src === imageUrl) {
                        console.warn('⚠️ Background removal failed - trying original...');
                        img.src = originalImageUrl;
                    } else {
                        setIsLoadingImage(false);
                        reject(new Error('Failed to load image from Cloudinary'));
                    }
                };
                img.src = imageUrl;
            });
        } catch (error) {
            setIsLoadingImage(false);
            throw error;
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
    }, [editor.isDragging, editor.img, editor.dragStart, editor.scale, TARGET_W_PX, TARGET_H_PX]);

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

    const uploadImage = async (file: Blob) => {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            throw new Error('Missing Cloudinary configuration');
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });

        // Parse body once to avoid consuming the stream twice
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data?.error?.message ?? 'Failed to upload image');
        }

        if (!data.public_id) {
            throw new Error('Invalid Cloudinary response - no public_id returned');
        }

        const cld = new Cloudinary({
            cloud: { cloudName },
            url: { secure: true }
        });

        const transformedUrl = cld.image(data.public_id)
            .effect(backgroundRemoval())
            .resize(scale().width(1000))
            .delivery(quality(auto()))
            .delivery(format(autoFormat()))
            .toURL();

        return transformedUrl;
    };

    const generateProcessedImage = async (): Promise<Blob> => {
        if (!editor.img) throw new Error('No image to process');

        const offscreen = document.createElement('canvas');
        offscreen.width = TARGET_W_PX;
        offscreen.height = TARGET_H_PX;
        const oc = offscreen.getContext('2d');
        if (!oc) throw new Error('Could not get canvas context');

        // Fill white background
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

        return new Promise((resolve, reject) => {
            offscreen.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to generate blob'));
            }, 'image/jpeg', 0.95);
        });
    };

    const handleDownloadZip = async () => {
        try {
            toast.info('Generating ZIP file...');

            const frontCard = document.querySelector('.id-card-front-container') as HTMLElement;
            const backCard = document.querySelector('.id-card-back-container') as HTMLElement;

            if (!frontCard || !backCard) {
                throw new Error('Card elements not found');
            }

            const zipBlob = await downloadZip(
                employee,
                editor,
                { w: TARGET_W_PX, h: TARGET_H_PX },
                frontCard,
                backCard,
                frontLogoDataUrl,
                backLogoDataUrl,
                filters
            );

            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${employee.fullName.replace(/ /g, '_')}_ID_Card.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success('ZIP file downloaded!');
        } catch (e) {
            console.error('Error generating ZIP:', e);
            toast.error('Failed to generate ZIP file.');
        }
    };

    const processAndUploadImage = async () => {
        if (editor.img) {
            toast.info('Processing image...');
            const blob = await generateProcessedImage();
            toast.info('Uploading image...');
            return await uploadImage(blob);
        }
        return photoUrl;
    };

    const handleSave = async () => {
        if (!id) return;

        setShowSaveProgress(true);
        setSaveProgress(5);
        setSaveMessage('Preparing card...');

        try {
            setSaveProgress(10);
            setSaveMessage('Processing photo...');
            const finalPhotoUrl = await processAndUploadImage();

            const frontCard = document.querySelector('.id-card-front-container') as HTMLElement;
            const backCard = document.querySelector('.id-card-back-container') as HTMLElement;

            if (!frontCard || !backCard) throw new Error('Card elements not found');

            setSaveProgress(20);
            setSaveMessage('Generating card images...');

            const zipBlob = await downloadZip(
                employee,
                editor,
                { w: TARGET_W_PX, h: TARGET_H_PX },
                frontCard,
                backCard,
                frontLogoDataUrl,
                backLogoDataUrl,
                filters
            );

            setSaveProgress(45);
            setSaveMessage('ZIP ready — uploading...');

            const zipFileName = `zips/${employee.fullName.replace(/ /g, '_')}_ID_Card.zip`;
            const { error: zipError } = await supabase.storage
                .from('id-card-images')
                .upload(zipFileName, zipBlob, { upsert: true });

            if (zipError) throw zipError;

            const { data: publicUrlData } = supabase.storage
                .from('id-card-images')
                .getPublicUrl(zipFileName);

            setSaveProgress(80);
            setSaveMessage('Saving request...');

            const zipUrl = publicUrlData.publicUrl;

            const { error } = await supabase
                .from('requests')
                .update({
                    full_name: employee.fullName,
                    employee_id: employee.employeeId,
                    blood_group: employee.bloodGroup,
                    branch: employee.branch,
                    emergency_contact: employee.emergencyContact,
                    country_code: employee.countryCode,
                    photo_url: finalPhotoUrl,
                    zip_url: zipUrl,
                    is_edited: true
                })
                .eq('id', id);

            if (error) {
                console.error('Error saving request:', error);
                toast.error('Failed to save request.');
                setShowSaveProgress(false);
                setSaveProgress(0);
            } else {
                setSaveProgress(100);
                setSaveMessage('Saved successfully!');
                toast.success('Request saved successfully!');
                setTimeout(() => { setShowSaveProgress(false); setSaveProgress(0); navigate('/manage-requests'); }, 900);
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred');
            setShowSaveProgress(false);
            setSaveProgress(0);
        }
    };

    const handleApprove = async () => {
        if (!id) return;

        try {
            const finalPhotoUrl = await processAndUploadImage();

            const frontCard = document.querySelector('.id-card-front') as HTMLElement;
            const backCard = document.querySelector('.id-card-back') as HTMLElement;

            if (!frontCard || !backCard) {
                throw new Error('Card elements not found');
            }

            const zipBlob = await downloadZip(
                employee,
                editor,
                { w: TARGET_W_PX, h: TARGET_H_PX },
                frontCard,
                backCard,
                frontLogoDataUrl,
                backLogoDataUrl,
                filters
            );

            const zipFileName = `zips/${employee.fullName.replace(/ /g, '_')}_ID_Card.zip`;
            const { error: zipError } = await supabase.storage
                .from('id-card-images')
                .upload(zipFileName, zipBlob, { upsert: true });

            if (zipError) {
                throw zipError;
            }

            const { data: publicUrlData } = supabase.storage
                .from('id-card-images')
                .getPublicUrl(zipFileName);

            const zipUrl = publicUrlData.publicUrl;

            const { error } = await supabase
                .from('requests')
                .update({
                    status: 'Approved',
                    full_name: employee.fullName,
                    employee_id: employee.employeeId,
                    blood_group: employee.bloodGroup,
                    branch: employee.branch,
                    emergency_contact: employee.emergencyContact,
                    country_code: employee.countryCode,
                    photo_url: finalPhotoUrl,
                    zip_url: zipUrl
                })
                .eq('id', id);

            if (error) {
                console.error('Error approving request:', error);
                toast.error('Failed to approve request.');
            } else {
                toast.success('Request approved successfully!');
                navigate('/manage-requests');
            }
        } catch (error) {
            console.error('Error in handleApprove:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        }
    };

    const handleReject = async () => {
        if (!id) return;

        const { error } = await supabase
            .from('requests')
            .update({ status: 'Rejected' })
            .eq('id', id);

        if (error) {
            console.error('Error rejecting request:', error);
            toast.error('Failed to reject request.');
        } else {
            toast.error('Request rejected.');
            navigate('/manage-requests');
        }
    };

    const handleReset = useCallback(() => {
        // This might need to be adjusted based on how you want the reset functionality to work in the edit context
        setEmployee({
            fullName: '',
            employeeId: '',
            bloodGroup: '',
            branch: '',
            emergencyContact: '',
            countryCode: '+91',
            photo: null,
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
        setShowUploadNote(true);
    }, []);

    // keep drawEditor in sync when editor transform changes (i.e. redraw)
    useEffect(() => {
        drawEditor();
    }, [editor.scale, editor.rotation, editor.tx, editor.ty, drawEditor]);

    // cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (lastObjectUrlRef.current) {
                try { URL.revokeObjectURL(lastObjectUrlRef.current); } catch (e) { /* ignore */ }
                lastObjectUrlRef.current = null;
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <AppHeader />

            <main className="max-w-[1150px] mx-auto p-3 lg:p-6">
                <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    <span className="hidden md:inline">Back</span>
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
                    {/* Left: Card Previews */}
                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-6">
                            <div className="id-card-front-container w-[230px] h-[365px] bg-white shadow-sm rounded-lg overflow-hidden">
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
                            <div className="id-card-back-container w-[230px] h-[365px] bg-white shadow-sm rounded-lg overflow-hidden">
                                <IDCardBack employee={employee} logoSrc={backLogoDataUrl} />
                            </div>
                        </div>
                        <CardSaveProgress isVisible={showSaveProgress} progress={saveProgress} message={saveMessage} />
                    </div>

                    {/* Right: Step Wizard */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden self-start">
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
                                <button type="button"
                                    onClick={() => {
                                        if (!employee.fullName.trim() || !employee.employeeId.trim()) {
                                            toast.error('Please fill in Full Name and Employee ID to continue');
                                            return;
                                        }
                                        setWizardStep(1);
                                    }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                                    Continue to Photo
                                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                                </button>
                            </div>

                            {/* Step 1 — Photo Upload */}
                            <div className="space-y-3">
                                <PhotoUpload
                                    onPhotoSelect={handlePhotoSelect}
                                    currentPhoto={employee.photo}
                                    showUploadNote={showUploadNote}
                                    onHideUploadNote={handleHideUploadNote}
                                    onShowModal={handleShowModal}
                                    isLoadingImage={isLoadingImage}
                                />
                                {editor.img && (
                                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-2">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Position &amp; Zoom</p>
                                        <div className="flex gap-1.5 flex-wrap">
                                            <button onClick={handleZoomIn} disabled={!editor.img} className="flex-1 min-w-[36px] px-2 py-2 text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-lg transition-colors">＋</button>
                                            <button onClick={handleZoomOut} disabled={!editor.img} className="flex-1 min-w-[36px] px-2 py-2 text-sm font-bold bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-lg transition-colors">−</button>
                                            <button onClick={handleRotateLeft} disabled={!editor.img} className="flex-1 min-w-[36px] px-2 py-2 text-sm bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-lg transition-colors">⟲</button>
                                            <button onClick={handleRotateRight} disabled={!editor.img} className="flex-1 min-w-[36px] px-2 py-2 text-sm bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-lg transition-colors">⟳</button>
                                            <button onClick={handleResetPos} disabled={!editor.img} className="flex-1 min-w-[36px] px-2 py-2 text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 disabled:opacity-40 text-gray-800 dark:text-gray-200 rounded-lg transition-colors">Reset</button>
                                        </div>
                                        <input type="range" min="0.5" max="3" step="0.01" value={editor.scale}
                                            onChange={(e) => setEditor(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                                            className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary" />
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Zoom: {editor.scale.toFixed(2)}x</span>
                                            <span>Rotation: {Math.round((editor.rotation * 180) / Math.PI)}°</span>
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <button type="button" onClick={() => setWizardStep(0)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <span className="material-symbols-outlined text-base">arrow_back</span>Back
                                    </button>
                                    <button type="button" onClick={() => setWizardStep(2)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                                        Finalise<span className="material-symbols-outlined text-base">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            {/* Step 2 — Enhance & Actions */}
                            <div className="space-y-4">
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
                                <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
                                    <button type="button" onClick={handleSave}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                                        <span className="material-symbols-outlined text-base">save</span>Save Changes
                                    </button>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button type="button" onClick={handleApprove}
                                            className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                                            <span className="material-symbols-outlined text-base">check_circle</span>Approve
                                        </button>
                                        <button type="button" onClick={handleReject}
                                            className="py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-1.5">
                                            <span className="material-symbols-outlined text-base">cancel</span>Reject
                                        </button>
                                    </div>
                                    <button type="button" onClick={handleDownloadZip}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <span className="material-symbols-outlined text-base">download</span>Download ZIP
                                    </button>
                                    <button type="button" onClick={() => navigate(-1)}
                                        className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900/30 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                                <button type="button" onClick={() => setWizardStep(1)}
                                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                                    <span className="material-symbols-outlined text-sm">arrow_back</span>Back to Photo
                                </button>
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
        </div >
    );
};

export default EditRequest;