/**
 * Utility functions for handling HSE data processing
 */

// Helper to process small images to Supabase URLs for database storage
export const processImageToSupabase = async (
  image: any
): Promise<string | null> => {
  if (!image) {
    return null;
  }

  // If it's already a Supabase URL or HTTP URL, return as-is
  if (typeof image === "string") {
    if (image.startsWith("http")) {
      return image; // Already a URL
    }
    if (image.startsWith("data:")) {
      return image; // Legacy base64 - return as-is for compatibility
    }
    if (image.startsWith("blob:")) {
      // Convert blob URL to Supabase URL
      try {
        const response = await fetch(image);
        const blob = await response.blob();
        
        // Upload blob to Supabase
        const { uploadImageToSupabase } = await import('@/utils/supabaseStorage');
        const userId = localStorage.getItem('userId') || 'unknown';
        const fileName = `hse-${Date.now()}.jpg`;
        const supabasePath = `temp-uploads/${userId}/${fileName}`;
        
        try {
          const uploadResult = await uploadImageToSupabase(blob, 'daily-reports', supabasePath);
          if (uploadResult.error) {
            console.error('Upload failed:', uploadResult.error);
            return image; // Return original blob URL on failure
          }
          return uploadResult.publicUrl;
        } catch (uploadError) {
          console.error('Error uploading blob:', uploadError);
          return image; // Return original blob URL on failure
        }
      } catch {
        return image; // Return original blob URL on failure
      }
    }
    return image; // Return as-is for other string types
  }

  // If it's a File object, upload to Supabase
  if (image instanceof File) {
    const { uploadImageToSupabase } = await import('@/utils/supabaseStorage');
    const userId = localStorage.getItem('userId') || 'unknown';
    const fileName = `hse-${Date.now()}.jpg`;
    const supabasePath = `temp-uploads/${userId}/${fileName}`;
    
    try {
      const uploadResult = await uploadImageToSupabase(image, 'daily-reports', supabasePath);
      if (uploadResult.error) {
        console.error('Upload failed:', uploadResult.error);
        return null;
      }
      return uploadResult.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  // If it's an object with supabaseUrl
  if (typeof image === "object" && image && typeof image === 'object' && 'supabaseUrl' in image) {
    return (image as any).supabaseUrl;
  }

  // If it's an object with file property
  if (typeof image === "object" && image && 'file' in image && (image as any).file instanceof File) {
    const { uploadImageToSupabase } = await import('@/utils/supabaseStorage');
    const userId = localStorage.getItem('userId') || 'unknown';
    const fileName = `hse-${Date.now()}.jpg`;
    const supabasePath = `temp-uploads/${userId}/${fileName}`;
    
    try {
      const uploadResult = await uploadImageToSupabase((image as any).file, 'daily-reports', supabasePath);
      if (uploadResult.error) {
        console.error('Upload failed:', uploadResult.error);
        return null;
      }
      return uploadResult.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  // For any other type, try to convert to string
  return String(image);
};

// Helper to safely extract image data for database storage (async version)
export const extractImageForDBAsync = async (
  image: any
): Promise<string | null> => {
  // REPLACE with this check:
  if (
    typeof image === "object" &&
    image !== null &&
    !(image instanceof File) &&
    Object.keys(image).length === 0
  ) {
    return null;
  }

  if (!image) {
    return null;
  }

  // If it's already a base64 data URL, use it as-is
  if (typeof image === "string" && image.startsWith("data:")) {
    return image;
  }

  // Try to process to base64 for better persistence
  try {
    const result = await processImageToSupabase(image);
    return result;
  } catch (error) {
    return null;
  }
};

// Helper to safely extract image data for database storage (sync version - fallback)
export const extractImageForDB = (image: any): string | null => {
  if (!image) {
    return null;
  }

  // If it's already a base64 data URL, use it as-is
  if (typeof image === "string" && image.startsWith("data:")) {
    return image;
  }

  // For site activities, we want to be more permissive and try to save blob URLs too
  // since these are important for the report functionality
  if (typeof image === "string" && image.startsWith("blob:")) {
    return image;
  }

  // For HTTP URLs, save as-is
  if (typeof image === "string" && image.startsWith("http")) {
    return image;
  }

  // If it's a File object, we can't save it directly to DB without processing
  // For now, skip it to avoid large payload issues
  if (image instanceof File) {
    return null;
  }

  // For any other type, try to convert to string
  return String(image);
};

// Helper to safely extract captions/footers
export const extractCaptionForDB = (caption: any): string => {
  if (!caption) return "";
  return String(caption);
};

// Process images within the existing referenceSections structure
export const processImagesInReferenceSections = async (
  referenceSections: any[]
) => {
  if (!referenceSections || !Array.isArray(referenceSections)) {
    return [];
  }

  const processedSections = await Promise.all(
    referenceSections.map(async (section) => {
      const processedEntries = await Promise.all(
        section.entries.map(async (entry) => {
          const processedSlots = await Promise.all(
            entry.slots.map(async (slot) => {
              // Process image to base64 if it exists
              const processedImage = await extractImageForDBAsync(slot.image);

              return {
                ...slot,
                image: processedImage || null, // ← Base64 string or null
              };
            })
          );

          return {
            ...entry,
            slots: processedSlots,
          };
        })
      );

      return {
        ...section,
        entries: processedEntries,
      };
    })
  );

  return processedSections;
};

// Convert frontend format to site_ref format
export const convertToSiteRefFormat = (sections: any[]) => {
  if (!sections || !Array.isArray(sections)) return [];

  // IMPORTANT:
  // A section can have many entries; each entry has up to 2 slots.
  // We must include images from ALL entries, not just entries[0].
  return sections.map((section) => {
    const images: string[] = [];
    const footers: string[] = [];

    const entries = Array.isArray(section?.entries) ? section.entries : [];
    for (const entry of entries) {
      const slots = Array.isArray(entry?.slots) ? entry.slots : [];
      for (const slot of slots) {
        // Only persist real images (string URLs/data URLs). If null/undefined, skip.
        // At this point images should already be processed to strings by processImagesInReferenceSections.
        if (typeof slot?.image === "string" && slot.image) {
          images.push(slot.image);
          footers.push(typeof slot?.caption === "string" ? slot.caption : "");
        }
      }
    }

    return {
      section_title: section.title || "",
      images,
      footers,
    };
  });
};

// Convert site_ref format to frontend format
// Splits images into multiple entries with 2 slots each (matching Entry component structure)
export const convertFromSiteRefFormat = (sections: any[]) => {
  if (!sections || !Array.isArray(sections)) {
    return [];
  }

  return sections.map((section, sectionIdx) => {
    const images = section.images || [];
    const footers = section.footers || [];

    // Filter out only null/undefined/empty string images, but keep all others (including blob URLs)
    // This ensures we preserve all valid images even if some failed to convert
    const validImages: string[] = [];
    const validFooters: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      // Keep the image if it's truthy (not null, undefined, or empty string)
      // This includes base64 strings, blob URLs, http URLs, etc.
      if (img != null && img !== "" && typeof img === "string") {
        validImages.push(img);
        validFooters.push(footers[i] || "");
      }
    }

    // Split images into entries of 2 slots each
    const entries = [];
    for (let i = 0; i < validImages.length; i += 2) {
      const entrySlots = [];

      // Add up to 2 slots per entry
      for (let j = 0; j < 2 && i + j < validImages.length; j++) {
        entrySlots.push({
          id: crypto.randomUUID(),
          image: validImages[i + j],
          caption: validFooters[i + j] || "",
        });
      }

      // Ensure exactly 2 slots (add empty slot if needed)
      while (entrySlots.length < 2) {
        entrySlots.push({
          id: crypto.randomUUID(),
          image: null,
          caption: "",
        });
      }

      entries.push({
        id: crypto.randomUUID(),
        slots: entrySlots,
      });
    }

    // If no images, create one empty entry
    if (entries.length === 0) {
      entries.push({
        id: crypto.randomUUID(),
        slots: [
          { id: crypto.randomUUID(), image: null, caption: "" },
          { id: crypto.randomUUID(), image: null, caption: "" },
        ],
      });
    }

    const result = {
      id: crypto.randomUUID(),
      title: section.section_title || "",
      entries,
    };

    return result;
  });
};

// Process HSE sections for database storage (with image processing)
export const processHSEForDB = async (
  referenceSections: any[],
  tableTitle: string
) => {
  if (!referenceSections || !Array.isArray(referenceSections)) {
    return {
      hse_title: tableTitle || "",
      hse: [],
    };
  }

  const processedHSE = await Promise.all(
    referenceSections.map(async (section: any) => {
      const images: string[] = [];
      const footers: string[] = [];

      if (section.entries && Array.isArray(section.entries)) {
        for (const entry of section.entries) {
          if (entry.slots && Array.isArray(entry.slots)) {
            for (const slot of entry.slots) {
              // Process images to base64 for better persistence (same as site activities)
              const image = await extractImageForDBAsync(slot.image);
              if (image) {
                images.push(image);
              }

              // Always add captions
              const caption = extractCaptionForDB(slot.caption);
              if (caption) footers.push(caption);
            }
          }
        }
      }

      const result = {
        section_title: section.title || "",
        images,
        footers,
      };

      return result;
    })
  );

  const finalResult = {
    hse_title: tableTitle || "",
    hse: processedHSE, // ✅ Match backend field name
  };

  return finalResult;
};

// Process site activities sections for database storage (with image processing)
export const processSiteActivitiesForDB = async (
  siteActivitiesSections: any[],
  siteActivitiesTitle: string
) => {
  if (!siteActivitiesSections || !Array.isArray(siteActivitiesSections)) {
    return {
      site_title: siteActivitiesTitle || "",
      site_ref: [],
    };
  }

  const processedSiteActivities = await Promise.all(
    siteActivitiesSections.map(async (section: any) => {
      const images: string[] = [];
      const footers: string[] = [];

      if (section.entries && Array.isArray(section.entries)) {
        for (const entry of section.entries) {
          if (entry.slots && Array.isArray(entry.slots)) {
            for (const slot of entry.slots) {
              // Process images to base64 for better persistence
              // IMPORTANT: Always save the image, even if conversion fails
              // Use the original image if conversion returns null
              let imageToSave = await extractImageForDBAsync(slot.image);

              // If conversion failed but we have an original image, use the original
              if (!imageToSave && slot.image) {
                // Try to use the original image if it's already a string (blob URL, data URL, etc.)
                if (typeof slot.image === "string") {
                  imageToSave = slot.image;
                }
                // For File objects, we need to convert them - but if that failed, we'll skip
                // However, we should still add a placeholder to maintain the array structure
              }

              // Always add the image (or null if conversion failed and no fallback)
              // This ensures we maintain the correct array structure
              images.push(imageToSave || null);

              // Always add captions (even if image is null, to maintain array alignment)
              const caption = extractCaptionForDB(slot.caption);
              footers.push(caption || "");
            }
          }
        }
      }

      const result = {
        section_title: section.title || "",
        images,
        footers,
      };

      return result;
    })
  );

  const finalResult = {
    site_title: siteActivitiesTitle || "",
    site_ref: processedSiteActivities,
  };

  return finalResult;
};
