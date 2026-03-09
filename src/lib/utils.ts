import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function imageToDataUrl(imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
    img.src = imagePath;
  });
}

const MAX_FILE_SIZE = 10485760; // 10 MB in bytes
const TARGET_FILE_SIZE = 7340032; // 7 MB target (safety margin)

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // If file is well below limit, return as is
    if (file.size < 500000) { // Less than 500 KB
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate compression strategy based on file size
        let targetQuality = 0.6; // Default aggressive quality
        let scaleFactor = 1; // Default no scaling

        if (file.size > 9000000) { // > 9 MB - be very aggressive to ensure under 10MB
          targetQuality = 0.25;
          scaleFactor = 0.6; // Scale down by 40%
        } else if (file.size > 7000000) { // > 7 MB
          targetQuality = 0.35;
          scaleFactor = 0.75; // Scale down by 25%
        } else if (file.size > 5000000) { // > 5 MB
          targetQuality = 0.45;
          scaleFactor = 0.85; // Scale down by 15%
        } else if (file.size > 2000000) { // > 2 MB
          targetQuality = 0.55;
          scaleFactor = 0.9; // Scale down by 10%
        }

        const compressWithQuality = (q: number, scale: number): void => {
          const canvas = document.createElement('canvas');
          // Scale dimensions
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              const testFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
              const fileSizeInMB = testFile.size / (1024 * 1024);

              console.log(`Compression attempt: ${fileSizeInMB.toFixed(2)}MB (quality: ${q}, scale: ${scale.toFixed(2)})`);

              // Accept if under target, or under max with low quality
              if (testFile.size <= TARGET_FILE_SIZE) {
                console.log(`✓ Compression successful: ${fileSizeInMB.toFixed(2)}MB`);
                resolve(testFile);
              } else if (testFile.size <= 9000000 && q <= 0.3) { // Only accept up to 9MB with very low quality
                console.log(`✓ Compression accepted at 9MB limit: ${fileSizeInMB.toFixed(2)}MB`);
                resolve(testFile);
              } else if (q > 0.1) {
                // Continue with lower quality
                const newQuality = Math.max(0.1, q - 0.05);
                compressWithQuality(newQuality, scale);
              } else if (scale > 0.4) {
                // Further scale down dimensions more aggressively
                const newScale = scale - 0.15;
                compressWithQuality(0.2, newScale);
              } else {
                // Last resort - force accept even if over limit
                console.log(`⚠ Compression at minimum: ${fileSizeInMB.toFixed(2)}MB - forcing acceptance`);
                resolve(testFile);
              }
            },
            'image/jpeg',
            q
          );
        };

        compressWithQuality(targetQuality, scaleFactor);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
