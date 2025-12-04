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
          highResDataUrl = offscreen.toDataURL();
        }
      }

      // 2. Capture the front card, replacing the canvas with the high-res image during capture
      const frontCanvas = await html2canvas(frontCard, {
        backgroundColor: '#ffffff',
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 10000,
        onclone: (clonedDoc) => {
          if (!highResDataUrl) return;
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
        scale: 4,
        useCORS: true,
        allowTaint: true,
        logging: false,
        imageTimeout: 10000,
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
        unit: 'cm',
        format: [5.3, 8.5],
        compress: true,
      });

      const frontImgData = frontCanvas.toDataURL('image/png', 1.0);
      const backImgData = backCanvas.toDataURL('image/png', 1.0);

      pdf.addImage(frontImgData, 'PNG', 0, 0, 5.3, 8.5);
      pdf.addPage();
      pdf.addImage(backImgData, 'PNG', 0, 0, 5.3, 8.5);
      const pdfBlob = pdf.output('blob');

      // 5. Convert canvases to blobs
      const frontBlob = await new Promise<Blob>((resolve) => frontCanvas.toBlob((blob) => resolve(blob!), 'image/png'));
      const backBlob = await new Promise<Blob>((resolve) => backCanvas.toBlob((blob) => resolve(blob!), 'image/png'));

      // 6. Create a zip file
      const zip = new JSZip();
      zip.file(`${employee.fullName.replace(/ /g, '_')}_ID_Card.pdf`, pdfBlob);
      zip.file(`${employee.fullName.replace(/ /g, '_')}_Front.png`, frontBlob);
      zip.file(`${employee.fullName.replace(/ /g, '_')}_Back.png`, backBlob);


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