// Test utility for image compression
// This can be run in the browser console or imported for testing

import { compressImage } from './utils';

// Create a test function that generates a large test image and compresses it
export async function testCompression() {
    console.log('🧪 Testing image compression...');

    // Create a large canvas to simulate a big image
    const canvas = document.createElement('canvas');
    canvas.width = 4000; // Large width
    canvas.height = 3000; // Large height

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('❌ Failed to get canvas context');
        return;
    }

    // Fill with a gradient to create a large file
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(0.5, 'green');
    gradient.addColorStop(1, 'blue');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Convert to blob
    const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95); // High quality to make it large
    });

    const originalFile = new File([blob], 'test-large-image.jpg', { type: 'image/jpeg' });
    const originalSizeMB = originalFile.size / (1024 * 1024);

    console.log(`📸 Created test image: ${originalSizeMB.toFixed(2)}MB`);

    try {
        const compressedFile = await compressImage(originalFile);
        const compressedSizeMB = compressedFile.size / (1024 * 1024);

        console.log(`✅ Compression successful:`);
        console.log(`   Original: ${originalSizeMB.toFixed(2)}MB`);
        console.log(`   Compressed: ${compressedSizeMB.toFixed(2)}MB`);
        console.log(`   Reduction: ${((1 - compressedSizeMB / originalSizeMB) * 100).toFixed(1)}%`);

        if (compressedFile.size <= 7340032) { // 7MB target
            console.log('🎉 File size is below 7MB target!');
        } else if (compressedFile.size <= 10485760) { // 10MB max
            console.log('⚠️ File size is below 10MB limit but above target');
        } else {
            console.log('❌ File size still exceeds 10MB limit');
        }

        return compressedFile;
    } catch (error) {
        console.error('❌ Compression failed:', error);
        throw error;
    }
}

// Run test if this file is executed directly
if (typeof window !== 'undefined') {
    // Browser environment - expose to window for console testing
    (window as any).testCompression = testCompression;
    console.log('💡 Run testCompression() in the console to test compression');
}