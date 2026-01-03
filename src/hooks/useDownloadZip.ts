import { useCallback } from 'react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { Employee } from '@/types/employee';

// Define types for editor state and dimensions, mirroring their structure in Index.tsx
interface EditorState {
  img: HTMLImageElement | null;
  scale: number;
  rotation: number;
  tx: number;
  ty: number;
}

interface Dimensions {
  w: number;
  h: number;
}

export const useDownloadZip = () => {
  const downloadZip = useCallback(async (
    employee: Employee,
    editor: EditorState,
    dimensions: Dimensions,
    frontCard: HTMLElement,
    backCard: HTMLElement,
    frontLogoDataUrl?: string,
    backLogoDataUrl?: string
  ) => {
    try {
      if (!frontCard || !backCard) {
        throw new Error('ID card elements not found');
      }

      // 1. Create a high-resolution canvas with the transformed photo
      let highResDataUrl: string | null = null;
      if (editor.img) {
        try {
          const offscreen = document.createElement('canvas');
          offscreen.width = dimensions.w;
          offscreen.height = dimensions.h;
          const oc = offscreen.getContext('2d');
          if (oc) {
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
            highResDataUrl = offscreen.toDataURL('image/png');
          }
        } catch (e) {
          console.error('Error creating high-res image:', e);
          // Continue without high-res image if it fails (fallback to screen capture)
        }
      }

      // 2. Capture the front card
      const frontCanvas = await html2canvas(frontCard, {
        backgroundColor: '#ffffff',
        scale: 12, // Increased scale for ~1200 DPI
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000, // Increased timeout
        onclone: (clonedDoc) => {
          if (highResDataUrl) {
            const canvasEl = clonedDoc.querySelector('canvas');
            if (canvasEl && canvasEl.parentElement) {
              const img = clonedDoc.createElement('img');
              img.src = highResDataUrl;
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.objectFit = 'cover';
              img.style.display = 'block';
              canvasEl.parentElement.replaceChild(img, canvasEl);
            }
          }

          if (frontLogoDataUrl) {
            const logoImgs = clonedDoc.querySelectorAll('img[alt*="Clove"]');
            logoImgs.forEach((logoImg) => {
              (logoImg as HTMLImageElement).src = frontLogoDataUrl;
              logoImg.setAttribute('crossOrigin', 'anonymous');
            });
          }
        },
      });

      // 3. Capture the back card
      const backCanvas = await html2canvas(backCard, {
        backgroundColor: '#ffffff',
        scale: 12, // Increased scale for ~1200 DPI
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 15000, // Increased timeout
        onclone: (clonedDoc) => {
          if (backLogoDataUrl) {
            const logoImgs = clonedDoc.querySelectorAll('img[alt*="Clove"]');
            logoImgs.forEach((logoImg) => {
              (logoImg as HTMLImageElement).src = backLogoDataUrl;
              logoImg.setAttribute('crossOrigin', 'anonymous');
            });
          }
        },
      });

      // 4. Generate PDF with high-quality settings
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [2.125, 3.375], // Standard ID-1 size in inches
        compress: false, // Disable compression for maximum quality
      });

      const frontImgData = frontCanvas.toDataURL('image/png');
      const backImgData = backCanvas.toDataURL('image/png');

      pdf.addImage(frontImgData, 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');
      pdf.addPage();
      pdf.addImage(backImgData, 'PNG', 0, 0, 2.125, 3.375, undefined, 'FAST');
      const pdfBlob = pdf.output('blob');

      // 5. Convert canvases to blobs
      const frontBlob = await new Promise<Blob>((resolve, reject) => {
        frontCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create front card blob'));
        }, 'image/png');
      });

      const backBlob = await new Promise<Blob>((resolve, reject) => {
        backCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create back card blob'));
        }, 'image/png');
      });

      // 6. Create a zip file
      const zip = new JSZip();
      const safeName = (employee.fullName || 'employee').replace(/[^a-z0-9]/gi, '_');
      zip.file(`${safeName}_ID_Card.pdf`, pdfBlob);
      zip.file(`${safeName}_Front.png`, frontBlob);
      zip.file(`${safeName}_Back.png`, backBlob);


      // 7. Generate and return the zip blob
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      return zipBlob;
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      throw error;
    }
  }, []);

  return { downloadZip };
};