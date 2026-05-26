/**
 * Applies a watermark to an image File and returns a new File.
 * 
 * @param originalFile The original image file to watermark
 * @param watermarkSrc The URL or path to the watermark image
 * @returns A Promise that resolves to the watermarked File
 */
export async function applyWatermark(originalFile: File, watermarkSrc: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const watermark = new Image();
    
    // Create an object URL for the uploaded file
    const objectUrl = URL.createObjectURL(originalFile);
    
    img.onload = () => {
      watermark.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          
          if (!ctx) {
            URL.revokeObjectURL(objectUrl);
            return reject(new Error("Could not get 2d context"));
          }

          // Draw the original image
          ctx.drawImage(img, 0, 0);

          // Calculate watermark dimensions (Smaller size: ~15% of image width)
          const watermarkWidth = img.width * 0.30;
          const watermarkHeight = (watermark.height / watermark.width) * watermarkWidth;
          
          // Calculate position (Top-Right with padding)
          const padding = img.height * 0.05; // 5% of height as padding
          const x = img.width - watermarkWidth - padding;
          const y = padding;

          // Apply fully solid transparency (no transparency) for better visibility
          ctx.globalAlpha = 1.0;
          
          // Draw the watermark
          ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
          
          // Reset alpha just in case
          ctx.globalAlpha = 1.0;

          // Convert canvas back to a Blob, then a File
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              return reject(new Error("Failed to create blob from canvas"));
            }
            
            const watermarkedFile = new File([blob], originalFile.name, {
              type: originalFile.type || "image/jpeg",
              lastModified: Date.now(),
            });
            
            resolve(watermarkedFile);
          }, originalFile.type || "image/jpeg", 0.95);
        } catch (error) {
          URL.revokeObjectURL(objectUrl);
          reject(error);
        }
      };
      
      watermark.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // If watermark fails to load, just return the original file to avoid breaking upload
        console.warn("Failed to load watermark, proceeding without it.");
        resolve(originalFile);
      };
      
      // Load the watermark image
      watermark.src = watermarkSrc;
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load original image"));
    };
    
    img.src = objectUrl;
  });
}
