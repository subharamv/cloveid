
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Employee, PhotoTransform } from '@/types/employee';
import { EmployeeForm } from '@/components/EmployeeForm';
import { PhotoUpload } from '@/components/PhotoUpload';
import { ImageAdjustments } from '@/components/ImageAdjustments';
import { IDCardFront } from '@/components/IDCardFront';
import { IDCardBack } from '@/components/IDCardBack';
import { Modal } from '@/components/Modal';
import { ActionButtons } from '@/components/ActionButtons';
import { useDownloadZip } from '@/hooks/useDownloadZip';
import { useStorageProvider } from '@/hooks/useStorageProvider';
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
import AppHeader from '../components/AppHeader';
import { supabase } from '@/lib/supabaseClient';
import { ProgressBar } from '@/components/ProgressBar';

const BulkCardEditor: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { rowData, headers, rowIndex, csvData, zipUrls, cardId, batchId, cardIds, cardPrintStatuses = {}, cardPhotoUrls = {} } = location.state || { rowData: [], headers: [], rowIndex: -1, csvData: [], zipUrls: {}, cardId: null, batchId: null, cardIds: {}, cardPrintStatuses: {}, cardPhotoUrls: {} };

    const { downloadZip } = useDownloadZip();
    const { uploadZip } = useStorageProvider();
    const [zipBlob, setZipBlob] = useState<Blob | null>(null);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');
    const [saveProgress, setSaveProgress] = useState(0);
    const [showSaveProgress, setShowSaveProgress] = useState(false);
    const [isLoadingImage, setIsLoadingImage] = useState(false);

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

            const extractPublicId = (url: string): string | null => {
                try {
                    const pathname = new URL(url).pathname;
                    const parts = pathname.split('/');
                    const uploadIndex = parts.indexOf('upload');
                    if (uploadIndex === -1) return null;
                    return parts[parts.length - 1] || null;
                } catch {
                    return null;
                }
            };

            const loadImage = (urls: string[], onSuccess?: (successUrl: string) => void) => {
                let index = 0;
                const img = new Image();
                img.crossOrigin = 'anonymous';

                const tryNext = () => {
                    if (index >= urls.length) {
                        toast.error('Failed to load image from any URL.');
                        return;
                    }
                    const currentUrl = urls[index];
                    img.onload = () => {
                        console.log(`✓ Image loaded from: ${currentUrl}`);
                        setEditor(prev => ({ ...prev, img, scale: 1, rotation: 0, tx: 0, ty: 0 }));
                        setPhotoUrl(currentUrl);
                        setShowUploadNote(false);
                        onSuccess?.(currentUrl);
                    };
                    img.onerror = () => {
                        console.error(`✗ Failed to load image from: ${currentUrl}`);
                        index++;
                        if (index < urls.length) {
                            console.log(`↻ Trying fallback URL: ${urls[index]}`);
                            if (index === 1) {
                                toast.error('Background removal failed, loading original.');
                            }
                            tryNext();
                        } else {
                            toast.error(`Failed to load image from URL: ${currentUrl}`);
                        }
                    };
                    console.log(`→ Loading image from: ${currentUrl}`);
                    img.src = currentUrl;
                };
                tryNext();
            };

            if (!cloudName) {
                toast.error('Cloudinary configuration is missing. Cannot process image.');
                loadImage([imageUrl]);
                return;
            }

            const cld = new Cloudinary({ cloud: { cloudName }, url: { secure: true } });
            let processedImageUrl: string;
            let cloudinaryPublicId: string | null = null;

            try {
                if (imageUrl.startsWith('http')) {
                    const hasFetchDelivery = imageUrl.includes('image/fetch/');
                    let urlToProcess = imageUrl;

                    if (hasFetchDelivery) {
                        const fetchMatch = imageUrl.match(/image\/fetch\/(?:.*?\/)?(https:\/\/[^\s?]+)/);
                        if (fetchMatch && fetchMatch[1]) {
                            urlToProcess = fetchMatch[1];
                        } else {
                            throw new Error('Fetch delivery URLs are not supported. Reprocessing image.');
                        }
                    }

                    const hasBackgroundRemoval = imageUrl.includes('e_background_removal') || imageUrl.includes('e_bgremoval');

                    if (hasBackgroundRemoval && !hasFetchDelivery) {
                        cloudinaryPublicId = extractPublicId(imageUrl);
                        processedImageUrl = imageUrl;
                    } else {
                        if (!uploadPreset) {
                            throw new Error('Cloudinary upload preset is missing. Cannot process image.');
                        }

                        const response = await fetch(urlToProcess);
                        if (!response.ok) {
                            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                        }
                        const blob = await response.blob();

                        const blobFile = new File([blob], 'image.jpg', { type: blob.type });
                        const compressedFile = await compressImage(blobFile);

                        console.log(`Processing image: Original ${(blob.size / (1024 * 1024)).toFixed(2)}MB → Compressed ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);

                        const reader = new FileReader();
                        const dataUrlPromise = new Promise<string>((resolve, reject) => {
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(compressedFile);
                        });
                        const dataUrl = await dataUrlPromise;

                        const uploadFormData = new FormData();
                        uploadFormData.append('file', dataUrl);
                        uploadFormData.append('upload_preset', uploadPreset);

                        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                            method: 'POST',
                            body: uploadFormData
                        });
                        const uploadData = await uploadResponse.json();

                        console.log(`Cloudinary response:`, uploadData);

                        if (!uploadResponse.ok) {
                            console.error(`Cloudinary upload failed: ${uploadResponse.status}`, uploadData.error);
                            throw new Error(uploadData?.error?.message ?? `Upload failed with status ${uploadResponse.status}`);
                        }

                        if (uploadData.public_id) {
                            console.log(`✓ Image uploaded with public_id: ${uploadData.public_id}`);
                            cloudinaryPublicId = uploadData.public_id;
                            processedImageUrl = cld.image(uploadData.public_id)
                                .effect(backgroundRemoval())
                                .resize(scale().width(1000))
                                .delivery(quality(auto()))
                                .delivery(format(autoFormat()))
                                .toURL();
                            console.log(`Generated Cloudinary URL: ${processedImageUrl}`);
                        } else {
                            throw new Error(uploadData?.error?.message ?? 'Invalid Cloudinary response after upload.');
                        }
                    }
                } else if (imageUrl.startsWith('data:image')) {
                    if (!uploadPreset) {
                        toast.error('Cloudinary upload preset is missing. Cannot process uploaded image.');
                        loadImage([imageUrl]);
                        return;
                    }

                    const response = await fetch(imageUrl);
                    const blob = await response.blob();

                    const blobFile = new File([blob], 'image.jpg', { type: blob.type });
                    const compressedFile = await compressImage(blobFile);

                    console.log(`Data URL upload: Original ${(blob.size / (1024 * 1024)).toFixed(2)}MB → Compressed ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);

                    const formData = new FormData();
                    formData.append('file', compressedFile);
                    formData.append('upload_preset', uploadPreset);

                    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                        method: 'POST',
                        body: formData
                    });
                    const uploadData = await uploadResponse.json();

                    console.log(`Cloudinary response:`, uploadData);

                    if (!uploadResponse.ok) {
                        console.error(`Cloudinary upload failed: ${uploadResponse.status}`, uploadData.error);
                        throw new Error(uploadData?.error?.message ?? `Upload failed with status ${uploadResponse.status}`);
                    }

                    if (uploadData.public_id) {
                        console.log(`✓ Image uploaded with public_id: ${uploadData.public_id}`);
                        cloudinaryPublicId = uploadData.public_id;
                        processedImageUrl = cld.image(uploadData.public_id)
                            .effect(backgroundRemoval())
                            .resize(scale().width(1000))
                            .delivery(quality(auto()))
                            .delivery(format(autoFormat()))
                            .toURL();
                        console.log(`Generated Cloudinary URL: ${processedImageUrl}`);
                    } else {
                        throw new Error(uploadData?.error?.message ?? 'Invalid Cloudinary response after upload.');
                    }
                } else {
                    const optimizedUrl = imageUrl.startsWith('http') ?
                        cld.image(imageUrl).resize(scale().width(1000)).delivery(quality(auto())).delivery(format(autoFormat())).toURL() :
                        imageUrl;
                    loadImage([optimizedUrl, imageUrl].filter((u, i, arr) => arr.indexOf(u) === i));
                    return;
                }

                const urlsToTry = [processedImageUrl];
                if (cloudinaryPublicId) {
                    const cleanUrl = cld.image(cloudinaryPublicId)
                        .resize(scale().width(1000))
                        .delivery(quality(auto()))
                        .delivery(format(autoFormat()))
                        .toURL();
                    if (cleanUrl !== processedImageUrl) {
                        urlsToTry.push(cleanUrl);
                    }
                }
                if (imageUrl !== processedImageUrl && !urlsToTry.includes(imageUrl)) {
                    urlsToTry.push(imageUrl);
                }

                loadImage(urlsToTry);
                setPhotoUrl(processedImageUrl);
            } catch (error) {
                console.error(`Image processing error:`, error);
                toast.error(`Image processing failed: ${error instanceof Error ? error.message : String(error)}`);
                loadImage([imageUrl]);
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
    // Maintain aspect ratio of the photo box (230x276) to prevent distortion
    const TARGET_H_PX = Math.round(TARGET_W_PX * (276 / 230));

    const handleShowModal = useCallback((type: 'error' | 'success', title: string, message: string) => {
        setModal({ isOpen: true, type, title, message });
    }, []);

    const handleHideUploadNote = useCallback(() => {
        setShowUploadNote(false);
    }, []);



    const handlePhotoSelect = useCallback(async (file: File) => {
        try {
            setIsLoadingImage(true);
            console.log('🔵 Starting photo upload...');

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
            console.log('📋 Cloudinary response:', { status: response.status, ok: response.ok, publicId: data.public_id });

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
            console.log('🖼️ Generating optimized URLs with Cloudinary transformations...');

            // Apply Cloudinary transformations for compression and optimization
            // width: 1000 (resize to 1000px width)
            // quality: auto (Cloudinary picks best quality setting)
            // fetch_format: auto (Cloudinary picks best format like WebP)
            const imageWithBgRemoval = cld.image(publicId)
                .effect(backgroundRemoval())
                .resize(scale().width(1000))
                .delivery(quality(auto()))
                .delivery(format(autoFormat()));
            const bgRemovedUrl = imageWithBgRemoval.toURL();

            const originalImage = cld.image(publicId)
                .resize(scale().width(1000))
                .delivery(quality(auto()))
                .delivery(format(autoFormat()));
            const originalUrl = originalImage.toURL();

            console.log('→ Background removal URL (with compression):', bgRemovedUrl);
            console.log('→ Original URL (with compression - fallback):', originalUrl);

            // Larger timeout for background removal processing
            const loadTimeoutMs = 30000;
            console.log(`→ Using ${loadTimeoutMs}ms timeout for image loading`);
            let hasTriedFallback = false;
            let timeoutId: NodeJS.Timeout | null = null;

            await new Promise<void>((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';

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

                    const newEditorState = {
                        img,
                        scale: 1,
                        rotation: 0,
                        tx: 0,
                        ty: 0,
                        isDragging: false,
                        dragStart: { x: 0, y: 0 },
                        lastPos: { x: 0, y: 0 },
                    };

                    setEditor(newEditorState);
                    setEmployee(prev => ({ ...prev, photo: fileToUpload }));
                    setPhotoUrl(img.src);
                    setIsLoadingImage(false);

                    setTimeout(() => {
                        console.log('📍 Triggering canvas redraw...');
                        const canvas = canvasRef.current;
                        if (canvas) {
                            canvas.dispatchEvent(new CustomEvent('forceRedraw'));
                        }
                    }, 0);

                    const statusMsg = hasTriedFallback
                        ? `Photo uploaded with original image (background removal unavailable)`
                        : `Photo uploaded with background removed`;
                    toast.success(statusMsg);
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
                startTimeout(loadTimeoutMs, originalUrl);
                img.src = bgRemovedUrl;
            });
        } catch (error) {
            setIsLoadingImage(false);
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error('❌ Photo upload error:', errorMsg);
            handleShowModal('error', 'Photo Upload Failed', errorMsg);
            throw error;
        }
    }, [setEditor, setEmployee, handleShowModal]);

    // drawEditor: paints the editor.img into the visible canvas sized to photoBoxRef
    const drawEditor = useCallback(() => {
        const canvas = canvasRef.current;
        const photoBox = photoBoxRef.current;

        if (!canvas) {
            console.warn('⚠️ Canvas ref not available');
            return;
        }
        if (!photoBox) {
            console.warn('⚠️ PhotoBox ref not available');
            return;
        }
        if (!editor.img) {
            console.warn('⚠️ No image in editor state');
            return;
        }

        console.log('🎨 Drawing image to canvas...', {
            imageSize: `${editor.img.width}x${editor.img.height}`,
            canvasSize: `${canvas.width}x${canvas.height}`,
            photoBoxSize: `${photoBox.offsetWidth}x${photoBox.offsetHeight}`,
            editorScale: editor.scale,
            editorRotation: editor.rotation,
        });

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
            console.log('✓ Image drawn to canvas successfully');
        } catch (e) {
            console.error('❌ drawEditor error', e);
        }
    }, [editor, filters, TARGET_W_PX, TARGET_H_PX]);

    // redraw whenever editor changes
    useEffect(() => {
        console.log('🎨 Editor state changed, redrawing canvas...', { hasImage: !!editor.img, scale: editor.scale, rotation: editor.rotation });
        drawEditor();

        // Listen for force redraw events for download capture
        const canvas = canvasRef.current;
        if (canvas) {
            const handleForceRedraw = () => {
                console.log('🔄 Force redraw event triggered');
                drawEditor();
            };
            canvas.addEventListener('forceRedraw', handleForceRedraw);
            return () => canvas.removeEventListener('forceRedraw', handleForceRedraw);
        }
    }, [drawEditor, editor.img, editor.scale, editor.rotation, editor.tx, editor.ty]);

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

    const handleSaveAndBack = async () => {
        if (!employee.fullName || !employee.employeeId) {
            toast.error('Please fill in at least Full Name and Employee ID');
            return;
        }

        setIsSaving(true);
        setShowSaveProgress(true);
        setSaveProgress(0);

        try {
            const canvas = canvasRef.current;
            let updatedEmployee = { ...employee };

            // Step 1: Process photo
            setSaveProgress(10);
            if (canvas) {
                // Ensure the canvas is up to date with latest transforms
                drawEditor();
                const photoDataUrl = canvas.toDataURL('image/png', 1.0);
                updatedEmployee.photo = photoDataUrl;
            }

            // Step 2: Generate ZIP
            setSaveProgress(35);
            const blob = await generateZip();

            // Step 3: Upload ZIP to active storage provider (Supabase or Google Drive)
            setSaveProgress(60);
            const zipFileName = `${employee.fullName.replace(/ /g, '_')}_${employee.employeeId}_ID_Card.zip`;
            const finalZipUrl = await uploadZip(blob, zipFileName, 'batch', batchId || undefined);

            // Filter out broken fetch delivery URLs - don't store them
            const safeFotoUrl = photoUrl && !photoUrl.includes('image/fetch/') ? photoUrl : null;

            // Update updatedEmployee with photoUrl and zipUrl
            updatedEmployee.photo_url = safeFotoUrl;
            updatedEmployee.zip_url = finalZipUrl;

            // Step 4: Update database if cardId exists
            setSaveProgress(85);
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

                const newCardData = {
                    ...rowData.reduce((acc: any, val: any, idx: number) => {
                        acc[headers[idx]] = val;
                        return acc;
                    }, {})
                };

                headers.forEach((header: string, idx: number) => {
                    const key = String(header || '').trim().toLowerCase();
                    const employeeKey = headerMapping[key];
                    if (employeeKey) {
                        newCardData[header] = updatedEmployee[employeeKey];
                    }
                });

                newCardData['photo_url'] = safeFotoUrl;
                newCardData['zip_url'] = finalZipUrl;

                const { error: dbError } = await supabase
                    .from('id_cards')
                    .update({
                        card_data: newCardData,
                        photo_url: safeFotoUrl,
                        zip_url: finalZipUrl
                    } as any)
                    .eq('id', cardId);

                if (dbError) {
                    console.error('Error updating id_cards:', dbError);
                    toast.error('Failed to update database record, but ZIP was saved.');
                }
            }

            // Step 5: Finalize
            setSaveProgress(100);
            await new Promise(resolve => setTimeout(resolve, 500)); // Show 100% briefly

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
                    cardPrintStatuses,
                    batchId,
                    cardPhotoUrls
                }
            });
        } catch (error) {
            console.error('Error in handleSaveAndBack:', error);
            toast.error(`Failed to save changes: ${error instanceof Error ? error.message : 'Please try again.'}`);
        } finally {
            setIsSaving(false);
            setShowSaveProgress(false);
            setSaveProgress(0);
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
            backLogoDataUrl,
            filters
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
            <ProgressBar
                isVisible={showSaveProgress}
                progress={saveProgress}
                message="Saving changes..."
                position="bottom-right"
            />
            <AppHeader />

            <main className="max-w-7xl mx-auto p-3 lg:p-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    <span className="hidden md:inline">Back</span>
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
                    {/* Left: Card Previews */}
                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-4 lg:flex-row lg:justify-center lg:gap-6">
                            <IDCardFront
                                ref={frontCardRef}
                                employee={employee}
                                logoSrc={frontLogoDataUrl}
                                photoBoxRef={photoBoxRef}
                                canvasRef={canvasRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                isLoadingImage={isLoadingImage}
                            />
                            <IDCardBack ref={backCardRef} employee={employee} logoSrc={backLogoDataUrl} />
                        </div>
                    </div>

                    {/* Right: Tabbed Controls Panel */}
                    <div className="bg-white dark:bg-background-dark rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden self-start">
                        {/* Tab Bar */}
                        <div className="flex border-b border-gray-200 dark:border-gray-700">
                            {([
                                { key: 'details', icon: 'badge', label: 'Details' },
                                { key: 'photo', icon: 'photo_camera', label: 'Photo' },
                                { key: 'enhance', icon: 'tune', label: 'Enhance' },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
                                        activeTab === tab.key
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-4">
                            {activeTab === 'details' && (
                                <EmployeeForm employee={employee} onEmployeeChange={setEmployee} />
                            )}
                            {activeTab === 'photo' && (
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
                                    isLoadingImage={isLoadingImage}
                                />
                            )}
                            {activeTab === 'enhance' && (
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
                            )}
                        </div>

                        {/* Actions Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    <span className="material-symbols-outlined text-lg">download</span>
                                    Download ZIP
                                </button>
                                <button
                                    onClick={handleSaveAndBack}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                                >
                                    <span className="material-symbols-outlined text-lg">save</span>
                                    Save & Back
                                </button>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-900/30 px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <span className="material-symbols-outlined text-lg">close</span>
                                    Cancel
                                </button>
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