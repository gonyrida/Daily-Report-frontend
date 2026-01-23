/**
 * Utility functions for handling HSE data processing
 */

// Helper to process small images to base64 for database storage
export const processImageToBase64 = async (image: any): Promise<string | null> => {
  console.log("🔍 PROCESS TO BASE64 DEBUG: Starting processing:", {
    type: typeof image,
    isFile: image instanceof File,
    isString: typeof image === 'string',
    fileSize: image instanceof File ? image.size : 'N/A',
    stringStart: typeof image === 'string' ? image.substring(0, 20) : 'N/A'
  });
  
  if (!image) {
    console.log("🔍 PROCESS TO BASE64 DEBUG: ❌ No image provided");
    return null;
  }
  
  // If it's already base64, return as-is
  if (typeof image === 'string' && image.startsWith('data:')) {
    console.log("🔍 PROCESS TO BASE64 DEBUG: ✅ Already base64, returning as-is");
    return image;
  }
  
  // If it's a blob URL, try to convert to base64 (but only if it's not too large)
  if (typeof image === 'string' && image.startsWith('blob:')) {
    console.log("🔍 PROCESS TO BASE64 DEBUG: Processing blob URL");
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      
      console.log("🔍 PROCESS TO BASE64 DEBUG: Blob info:", {
        size: blob.size,
        type: blob.type,
        isOver15MB: blob.size > 15 * 1024 * 1024
      });
      
      // Check size - only process if less than 15MB to avoid timeouts
      if (blob.size > 15 * 1024 * 1024) {
        console.log("🔍 PROCESS TO BASE64 DEBUG: ⚠️ Skipping large blob image (>15MB)");
        return image; // Return blob URL instead
      }
      
      console.log("🔍 PROCESS TO BASE64 DEBUG: Converting blob to base64");
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          console.log("🔍 PROCESS TO BASE64 DEBUG: ✅ Blob converted to base64");
          resolve(reader.result as string);
        };
        reader.onerror = (error) => {
          console.log("🔍 PROCESS TO BASE64 DEBUG: ❌ Blob conversion failed:", error);
          reject(error);
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.log("🔍 PROCESS TO BASE64 DEBUG: ❌ Failed to process blob image:", error);
      return image; // Return original blob URL on failure
    }
  }
  
  // If it's a File object, try to convert to base64 (but only if small)
  if (image instanceof File) {
    console.log("🔍 PROCESS TO BASE64 DEBUG: Processing File object:", {
      name: image.name,
      size: image.size,
      type: image.type,
      isOver15MB: image.size > 15 * 1024 * 1024
    });
    
    // Check size - only process if less than 15MB
    if (image.size > 15 * 1024 * 1024) {
      console.log("🔍 PROCESS TO BASE64 DEBUG: ⚠️ Skipping large File image (>15MB)");
      return null;
    }
    
    console.log("🔍 PROCESS TO BASE64 DEBUG: Converting File to base64");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        console.log("🔍 PROCESS TO BASE64 DEBUG: ✅ File converted to base64");
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        console.log("🔍 PROCESS TO BASE64 DEBUG: ❌ File conversion failed:", error);
        reject(error);
      };
      reader.readAsDataURL(image);
    });
  }
  
  // For HTTP URLs, return as-is
  if (typeof image === 'string' && image.startsWith('http')) {
    console.log("🔍 PROCESS TO BASE64 DEBUG: ✅ Using HTTP URL as-is");
    return image;
  }
  
  // For any other type, try to convert to string
  console.log("🔍 PROCESS TO BASE64 DEBUG: Converting to string");
  return String(image);
};

// Helper to safely extract image data for database storage (async version)
export const extractImageForDBAsync = async (image: any): Promise<string | null> => {
  console.log("🔍 EXTRACT IMAGE ASYNC DEBUG: Input:", {
    type: typeof image,
    value: image,
    isNull: image === null,
    isUndefined: image === undefined,
    isString: typeof image === 'string',
    isFile: image instanceof File,
    stringLength: typeof image === 'string' ? image.length : 'N/A',
    startsWithData: typeof image === 'string' ? image.startsWith('data:') : 'N/A',
    startsWithBlob: typeof image === 'string' ? image.startsWith('blob:') : 'N/A',
    startsWithHttp: typeof image === 'string' ? image.startsWith('http') : 'N/A',
    fileSize: image instanceof File ? image.size : 'N/A'
  });
  
  if (!image) {
    console.log("🔍 EXTRACT IMAGE ASYNC DEBUG: ❌ No image provided");
    return null;
  }
  
  // If it's already a base64 data URL, use it as-is
  if (typeof image === 'string' && image.startsWith('data:')) {
    console.log("🔍 EXTRACT IMAGE ASYNC DEBUG: ✅ Using base64 data URL");
    return image;
  }
  
  // Try to process to base64 for better persistence
  try {
    const result = await processImageToBase64(image);
    console.log("🔍 EXTRACT IMAGE ASYNC DEBUG: Process result:", {
      success: !!result,
      resultType: typeof result,
      resultLength: typeof result === 'string' ? result.length : 'N/A',
      startsWithData: typeof result === 'string' ? result.startsWith('data:') : 'N/A'
    });
    return result;
  } catch (error) {
    console.log("🔍 EXTRACT IMAGE ASYNC DEBUG: ❌ Processing failed:", error);
    return null;
  }
};

// Helper to safely extract image data for database storage (sync version - fallback)
export const extractImageForDB = (image: any): string | null => {
  console.log("🔍 EXTRACT IMAGE DEBUG: Input:", {
    type: typeof image,
    value: image,
    isNull: image === null,
    isUndefined: image === undefined,
    isString: typeof image === 'string',
    isFile: image instanceof File,
    stringLength: typeof image === 'string' ? image.length : 'N/A',
    startsWithData: typeof image === 'string' ? image.startsWith('data:') : 'N/A',
    startsWithBlob: typeof image === 'string' ? image.startsWith('blob:') : 'N/A',
    startsWithHttp: typeof image === 'string' ? image.startsWith('http') : 'N/A'
  });
  
  if (!image) {
    console.log("🔍 EXTRACT IMAGE DEBUG: ❌ No image provided");
    return null;
  }
  
  // If it's already a base64 data URL, use it as-is
  if (typeof image === 'string' && image.startsWith('data:')) {
    console.log("🔍 EXTRACT IMAGE DEBUG: ✅ Using base64 data URL");
    return image;
  }
  
  // For site activities, we want to be more permissive and try to save blob URLs too
  // since these are important for the report functionality
  if (typeof image === 'string' && image.startsWith('blob:')) {
    console.log("🔍 EXTRACT IMAGE DEBUG: ⚠️ Using blob URL (may not work later)");
    return image;
  }
  
  // For HTTP URLs, save as-is
  if (typeof image === 'string' && image.startsWith('http')) {
    console.log("🔍 EXTRACT IMAGE DEBUG: ✅ Using HTTP URL");
    return image;
  }
  
  // If it's a File object, we can't save it directly to DB without processing
  // For now, skip it to avoid large payload issues
  if (image instanceof File) {
    console.log("🔍 EXTRACT IMAGE DEBUG: ❌ Skipping File object to avoid timeouts");
    return null;
  }
  
  // For any other type, try to convert to string
  console.log("🔍 EXTRACT IMAGE DEBUG: ✅ Converting to string");
  return String(image);
};

// Helper to safely extract captions/footers
export const extractCaptionForDB = (caption: any): string => {
  if (!caption) return "";
  return String(caption);
};

// Process HSE sections for database storage (with image processing)
export const processHSEForDB = async (referenceSections: any[], tableTitle: string) => {
  console.log("🔍 HSE DEBUG: Processing sections for DB:", {
    sectionsCount: referenceSections?.length || 0,
    tableTitle
  });
  
  if (!referenceSections || !Array.isArray(referenceSections)) {
    return {
      hse_title: tableTitle || "",
      hse: []
    };
  }

  const processedHSE = await Promise.all(referenceSections.map(async (section: any) => {
    const images: string[] = [];
    const footers: string[] = [];

    console.log("🔍 HSE DEBUG: Processing section:", section.title);

    if (section.entries && Array.isArray(section.entries)) {
      for (const entry of section.entries) {
        if (entry.slots && Array.isArray(entry.slots)) {
          console.log("🔍 HSE DEBUG: Processing entry with", entry.slots.length, "slots");
          for (const slot of entry.slots) {
            // Process images to base64 for better persistence (same as site activities)
            const image = await extractImageForDBAsync(slot.image);
            console.log("🔍 HSE DEBUG: Slot image:", {
              type: typeof slot.image,
              hasImage: !!slot.image,
              preview: typeof slot.image === 'string' ? slot.image.substring(0, 50) : 'non-string',
              willSave: !!image,
              isBase64: image?.startsWith('data:') || false,
              imageSize: slot.image instanceof File ? slot.image.size : 'N/A',
              imageStartsWith: typeof slot.image === 'string' ? slot.image.substring(0, 10) : 'N/A'
            });
            if (image) {
              images.push(image);
              console.log("🔍 HSE DEBUG: ✅ Image added, total now:", images.length);
            } else {
              console.log("🔍 HSE DEBUG: ❌ Image skipped/failed");
            }
            
            // Always add captions
            const caption = extractCaptionForDB(slot.caption);
            console.log("🔍 HSE DEBUG: Slot caption:", caption);
            if (caption) footers.push(caption);
          }
        }
      }
    }

    const result = {
      section_title: section.title || "",
      images,
      footers
    };
    
    console.log("🔍 HSE DEBUG: Section result:", {
      title: result.section_title,
      imagesCount: result.images.length,
      footersCount: result.footers.length
    });

    return result;
  }));

  const finalResult = {
    hse_title: tableTitle || "",
    hse: processedHSE
  };

  console.log("🔍 HSE DEBUG: Final result:", {
    title: finalResult.hse_title,
    sectionsCount: finalResult.hse.length,
    totalImages: finalResult.hse.reduce((sum, section) => sum + section.images.length, 0),
    totalFooters: finalResult.hse.reduce((sum, section) => sum + section.footers.length, 0)
  });

  return finalResult;
};

// Process site activities sections for database storage (with image processing)
export const processSiteActivitiesForDB = async (siteActivitiesSections: any[], siteActivitiesTitle: string) => {
  console.log("🔍 SITE ACTIVITIES DEBUG: Processing sections for DB:", {
    sectionsCount: siteActivitiesSections?.length || 0,
    siteActivitiesTitle
  });
  
  if (!siteActivitiesSections || !Array.isArray(siteActivitiesSections)) {
    return {
      site_title: siteActivitiesTitle || "",
      site_ref: []
    };
  }

  const processedSiteActivities = await Promise.all(siteActivitiesSections.map(async (section: any) => {
    const images: string[] = [];
    const footers: string[] = [];
    let totalSlots = 0;
    let slotsWithImages = 0;
    let slotsWithoutImages = 0;

    console.log("🔍 SITE ACTIVITIES DEBUG: Processing section:", section.title);

    if (section.entries && Array.isArray(section.entries)) {
      for (const entry of section.entries) {
        if (entry.slots && Array.isArray(entry.slots)) {
          console.log("🔍 SITE ACTIVITIES DEBUG: Processing entry with", entry.slots.length, "slots");
          totalSlots += entry.slots.length;
          
          for (const slot of entry.slots) {
            // Count slots with/without images
            if (slot.image) {
              slotsWithImages++;
            } else {
              slotsWithoutImages++;
            }
            
            // Process images to base64 for better persistence
            const image = await extractImageForDBAsync(slot.image);
            console.log("🔍 SITE ACTIVITIES DEBUG: Slot image:", {
              type: typeof slot.image,
              hasImage: !!slot.image,
              preview: typeof slot.image === 'string' ? slot.image.substring(0, 50) : 'non-string',
              willSave: !!image,
              isBase64: image?.startsWith('data:') || false,
              imageSize: slot.image instanceof File ? slot.image.size : 'N/A',
              imageStartsWith: typeof slot.image === 'string' ? slot.image.substring(0, 10) : 'N/A'
            });
            if (image) {
              images.push(image);
              console.log("🔍 SITE ACTIVITIES DEBUG: ✅ Image added, total now:", images.length);
            } else {
              console.log("🔍 SITE ACTIVITIES DEBUG: ❌ Image skipped/failed");
            }
            
            // Always add captions
            const caption = extractCaptionForDB(slot.caption);
            console.log("🔍 SITE ACTIVITIES DEBUG: Slot caption:", caption);
            if (caption) footers.push(caption);
          }
        }
      }
    }

    console.log("🔍 SITE ACTIVITIES DEBUG: Section slot summary:", {
      totalSlots,
      slotsWithImages,
      slotsWithoutImages,
      imagesSaved: images.length,
      footersSaved: footers.length
    });

    const result = {
      section_title: section.title || "",
      images,
      footers
    };
    
    console.log("🔍 SITE ACTIVITIES DEBUG: Section result:", {
      title: result.section_title,
      imagesCount: result.images.length,
      footersCount: result.footers.length
    });

    return result;
  }));

  const finalResult = {
    site_title: siteActivitiesTitle || "",
    site_ref: processedSiteActivities
  };

  console.log("🔍 SITE ACTIVITIES DEBUG: Final result:", {
    title: finalResult.site_title,
    sectionsCount: finalResult.site_ref.length,
    totalImages: finalResult.site_ref.reduce((sum, section) => sum + section.images.length, 0),
    totalFooters: finalResult.site_ref.reduce((sum, section) => sum + section.footers.length, 0),
    sectionDetails: finalResult.site_ref.map(section => ({
      title: section.section_title,
      imagesCount: section.images.length,
      footersCount: section.footers.length
    }))
  });

  return finalResult;
};
