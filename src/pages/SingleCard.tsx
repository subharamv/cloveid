// src/pages/index.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const SingleCard: React.FC = () => {
    const { userRole, logout } = useAuth();

    const { downloadZip } = useDownloadZip();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [frontLogoDataUrl, setFrontLogoDataUrl] = useState<string>('');
    const [backLogoDataUrl, setBackLogoDataUrl] = useState<string>('');

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
        if (!employee.fullName || !employee.employeeId) {
            toast.error('Please fill in employee name and ID before downloading.');
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
    }, [employee, downloadZip, frontLogoDataUrl, backLogoDataUrl, editor.img, editor.rotation, editor.scale, editor.tx, editor.ty, TARGET_W_PX, TARGET_H_PX]);

    const generateCardCanvas = useCallback((cardElement: HTMLElement, isFront: boolean) => {
        return new Promise<HTMLCanvasElement>((resolve, reject) => {
            import('html2canvas').then(({ default: html2canvas }) => {
                html2canvas(cardElement, {
                    scale: 10, // Use a high scale for maximum quality
                    backgroundColor: '#FFFFFF',
                    onclone: (clonedDoc) => {
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
    }, [editor.img, editor.rotation, editor.scale, editor.tx, editor.ty, TARGET_W_PX, TARGET_H_PX]);

    const handleReset = useCallback(() => {
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
            try { URL.revokeObjectURL(lastObjectUrlRef.current); } catch (e) { }
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

                    {/* Action Buttons */}
                    <div className="mt-3">
                        <ActionButtons
                            employee={employee}
                            isPhotoUploaded={!!editor.img}
                            onDownloadPNG={async () => {
                                toast.info('Generating PNG files...');

                                const frontCard = document.querySelector('.id-card-front-container') as HTMLElement;
                                const backCard = document.querySelector('.id-card-back-container') as HTMLElement;

                                if (!frontCard || !backCard) {
                                    toast.error('Error generating PNG files: Card elements not found.');
                                    return;
                                }

                                try {
                                    const [frontCanvas, backCanvas] = await Promise.all([
                                        generateCardCanvas(frontCard, true),
                                        generateCardCanvas(backCard, false),
                                    ]);

                                    const downloadCanvasAsPNG = (canvas: HTMLCanvasElement, fileName: string) => {
                                        canvas.toBlob((blob) => {
                                            if (blob) {
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = fileName;
                                                a.click();
                                                URL.revokeObjectURL(url);
                                            }
                                        }, 'image/png', 1.0);
                                    };

                                    downloadCanvasAsPNG(frontCanvas, `${employee.fullName || 'id'}_front.png`);
                                    downloadCanvasAsPNG(backCanvas, `${employee.fullName || 'id'}_back.png`);

                                    toast.success('PNG files downloaded successfully!');
                                } catch (error) {
                                    console.error('Error generating PNG files:', error);
                                    toast.error('Error generating PNG files. Please try again.');
                                }
                            }}
                            onDownloadPDF={async () => {
                                toast.info('Generating PDF document...');

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

                                    pdf.save(`${employee.fullName || 'id'}_cards.pdf`);
                                    toast.success('PDF downloaded successfully!');
                                } catch (error) {
                                    console.error('Error generating PDF:', error);
                                    toast.error('Error generating PDF. Please try again.');
                                }
                            }}
                            onDownloadZip={handleDownloadZip}
                            onPrint={onPrint}
                            onReset={handleReset}
                        />
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
                                logo={cloveLogo}
                                canvasRef={canvasRef}
                                photoBoxRef={photoBoxRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                            />
                        </div>

                        <div className="text-center mt-4 mb-2">
                            <strong className="text-primary">PREVIEW — BACK</strong>
                        </div>
                        <div className="id-card-back-container w-[230px] h-[365px] bg-white shadow-sm rounded-lg overflow-hidden">
                            <IDCardBack employee={employee} />
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

export default SingleCard;