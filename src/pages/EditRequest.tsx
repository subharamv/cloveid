
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

    const [activeTab, setActiveTab] = useState<'details' | 'photo' | 'enhance'>('details');

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

        try {
            toast.info('Saving request...');

            const finalPhotoUrl = await processAndUploadImage();

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
            } else {
                toast.success('Request saved successfully!');
                navigate('/manage-requests');
            }
        } catch (error) {
            console.error('Error in handleSave:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred');
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

            {/* Main Container */}
            <div className="max-w-[1150px] mx-auto p-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Panel - Form + Upload */}
                <div className="bg-white rounded-xl p-3.5 shadow-sm">
                    <EmployeeForm employee={employee} onEmployeeChange={setEmployee} />

                    <div className="mt-2.5">
                        <PhotoUpload
                            onPhotoSelect={handlePhotoSelect}
                            currentPhoto={employee.photo}
                            showUploadNote={showUploadNote}
                            onHideUploadNote={handleHideUploadNote}
                            onShowModal={handleShowModal}
                            isLoadingImage={isLoadingImage}
                        />
                    </div>

                    {/* Photo Controls */}
                    <div className="flex gap-2 flex-wrap mt-3">
                        <button onClick={handleZoomIn} className="bg-white border border-input-border p-2 rounded-lg text-lg">＋</button>
                        <button onClick={handleZoomOut} className="bg-white border border-input-border p-2 rounded-lg text-lg">−</button>
                        <button onClick={handleRotateLeft} className="bg-white border border-input-border p-2 rounded-lg text-lg">⟲</button>
                        <button onClick={handleRotateRight} className="bg-white border border-input-border p-2 rounded-lg text-lg">⟳</button>
                        <button onClick={handleResetPos} className="bg-white border border-input-border p-2 rounded-lg text-sm">0</button>

                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.01"
                            value={editor.scale}
                            onChange={(e) => setEditor(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
                            className="w-[150px]"
                        />
                    </div>

                    {/* Image Adjustments */}
                    <div className="mt-4 border-t border-gray-200 pt-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Image Adjustments</p>
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

                    {/* Action Buttons */}
                    <div className="mt-3 flex gap-2 flex-wrap">
                        <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded-md">Save</button>
                        <button onClick={handleDownloadZip} className="bg-gray-500 text-white px-4 py-2 rounded-md">Download ZIP</button>
                        <button onClick={handleApprove} className="bg-green-500 text-white px-4 py-2 rounded-md">Approve</button>
                        <button onClick={handleReject} className="bg-red-500 text-white px-4 py-2 rounded-md">Reject</button>
                        <button onClick={() => navigate(-1)} className="border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 px-4 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">Cancel</button>
                    </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="bg-white rounded-xl p-3.5 shadow-sm">
                    <div className="text-center mb-2">
                        <strong className="text-primary">PREVIEW — FRONT</strong>
                    </div>

                    <div className="flex flex-col items-center gap-2">
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

                        <div className="text-center mt-4 mb-2">
                            <strong className="text-primary">PREVIEW — BACK</strong>
                        </div>
                        <div className="id-card-back-container w-[230px] h-[365px] bg-white shadow-sm rounded-lg overflow-hidden">
                            <IDCardBack employee={employee} logoSrc={backLogoDataUrl} />
                        </div>
                    </div>
                </div>
            </div >

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