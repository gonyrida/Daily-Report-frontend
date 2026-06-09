import {
  uploadFileToServer
} from '@/services/dailyReportImageService';
import { relative } from 'path';

const formatImageUrl = (baseUrl: string, path: string | null | undefined): string | null => {
  if (!path) return null;
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

const isBase64 = (value) => {
  if (typeof value !== 'string') return false;
  // Validates common Data URL structures (e.g., data:image/png;base64,...)
  const base64Regex = /^data:image\/[a-zA-Z]*;base64,/;
  return base64Regex.test(value);
};

export const handleImageUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  coverData: any,
  setCoverData: React.Dispatch<React.SetStateAction<any>>,
  onDataChange?: (data: any) => void,
) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newImageData = e.target?.result as string;
      const updatedData = {
        ...coverData,
        coverImage: newImageData,
      };
      setCoverData(updatedData);
      onDataChange?.(updatedData);
    };
    reader.readAsDataURL(file);
  }
};

export const handleSignatureUpload = (
  event: React.ChangeEvent<HTMLInputElement>,
  letterData: any,
  setLetterData: React.Dispatch<React.SetStateAction<any>>,
  onDataChange?: (data: any) => void,
) => {
  const file = event.target.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newSignatureData = e.target?.result as string;
      const updatedData = { ...letterData, signatureImage: newSignatureData };
      setLetterData(updatedData);
      onDataChange?.(updatedData);
    };
    reader.readAsDataURL(file);
  }
};

/**
 * Iterates through a complex, nested report payload structure, detects raw file objects,
 * uploads them sequentially or in parallel, and returns a clean text-only JSON payload.
 * * @param {Object} rawState - The current state of your frontend form containing a mix of text and File objects.
 * @returns {Promise<Object>} A completely stringified payload ready for the database upsert endpoint.
 */
export const  preparePayloadFiles = async (rawState) => {
  if (!rawState) throw new Error('Utility Error: No form state passed to processor.');

  const { siteActivitiesSections } = rawState;
  // 1. Create a deep clone of the text/serializable fields safely
  // We extract carSheet and the sections carefully to rebuild them without losing binary properties.
  const clonedPayload = {
    ...rawState,
    referenceSections: JSON.parse(JSON.stringify(rawState.referenceSections || [])),
    siteActivitiesSections: [],
    carSheet: {
      ...rawState.carSheet,
      photo_groups: JSON.parse(JSON.stringify(rawState.carSheet?.photo_groups || []))
    }
  };

  try {
    // === CATEGORY 1: Root Level Files (projectLogo) ===
    if (rawState.projectLogo instanceof File || isBase64(rawState.projectLogo)) {
      console.log('Uploading project logo...');
      clonedPayload.projectLogo = await uploadFileToServer(rawState.projectLogo, 'projectLogo');
    }

    // === CATEGORY 2: Nested Slots (referenceSections) ===
    if (rawState.referenceSections && Array.isArray(rawState.referenceSections)) {
      for (let s = 0; s < rawState.referenceSections.length; s++) {
        const originalSection = rawState.referenceSections[s];
        
        for (let e = 0; e < originalSection.entries?.length; e++) {
          const originalEntry = originalSection.entries[e];
          
          for (let sl = 0; sl < originalEntry.slots?.length; sl++) {
            // Check the original state for the raw binary file
            const rawFile = originalEntry.slots[sl]?.image;
            
            if (rawFile instanceof File || isBase64(rawFile)) {
              console.log(`Uploading HSE reference image for section index ${s}, slot ${sl}...`);
              const uploadedUrl = await uploadFileToServer(rawFile, 'referenceSections');
              // Save the string path into our cloned structural payload
              clonedPayload.referenceSections[s].entries[e].slots[sl].image = uploadedUrl;
            }
          }
        }
      }
    }

    // === CATEGORY 3: Nested Slots (siteActivitiesSections) ===
    if (siteActivitiesSections && Array.isArray(siteActivitiesSections)) {
      for (let s = 0; s < siteActivitiesSections.length; s++) {
        const originalSection = siteActivitiesSections[s];
        
        // Prepare the new flat section shape
        const transformedSection = {
          section_title: originalSection.title || "Site Activity Photos", // Fallback if title exists in original state
          images: [],
          footers: []
        };

        // Drill down through entries and slots to extract and upload images
        if (originalSection.entries && Array.isArray(originalSection.entries)) {
          for (const entry of originalSection.entries) {
            if (entry.slots && Array.isArray(entry.slots)) {
              for (const slot of entry.slots) {
                
                const rawFile = slot?.image;
                let imageUrl = '';

                if (rawFile instanceof File || isBase64(rawFile)) {
                  // If it's a raw file, upload it
                  console.log(`Uploading Site Activity image...`);
                  imageUrl = await uploadFileToServer(rawFile, 'siteActivitiesSections');
                } else if (typeof rawFile === 'string') {
                  // If it's already a URL string (e.g. editing existing data), keep it
                  imageUrl = rawFile;
                }

                // Only push to arrays if we actually found an image/slot to log
                if (imageUrl) {
                  transformedSection.images.push(imageUrl);
                  // Extract footer note if available, otherwise push an empty string to maintain index alignment
                  transformedSection.footers.push(slot?.footer || slot?.caption || "");
                }
              }
            }
          }
        }

        // Add the newly formatted section to our payload
        clonedPayload.siteActivitiesSections.push(transformedSection);
      }
    }

    // === CATEGORY 4: Positional Flat Arrays (carSheet.photo_groups) ===
    if (rawState.carSheet?.photo_groups && Array.isArray(rawState.carSheet.photo_groups)) {
      for (let g = 0; g < rawState.carSheet.photo_groups.length; g++) {
        const originalGroup = rawState.carSheet.photo_groups[g];
        
        if (originalGroup.images && Array.isArray(originalGroup.images)) {
          for (let i = 0; i < originalGroup.images.length; i++) {
            const rawFile = originalGroup.images[i];
            
            if (rawFile instanceof File || isBase64(rawFile)) {
              console.log(`Uploading Car Sheet image for group ${g}, image index ${i}...`);
              const uploadedUrl = await uploadFileToServer(rawFile, 'carSheet');
              clonedPayload.carSheet.photo_groups[g].images[i] = uploadedUrl;
            }
          }
        }
      }
    }

    // 2. Return the clean payload containing text and path strings only
    return clonedPayload;

  } catch (error) {
    console.error('[UTILITY ORCHESTRATION FAILURE]:', error);
    throw new Error(`Payload Preparation Failed: ${error.message}`);
  }
}

// Creates a new payload object with fully qualified image URLs
// based on the provided STATIC_BASE_URL, including projectLogo.
export const formatPayloadImages = (payload: any, staticBaseUrl: string) => {
  console.log("HELLO AM I BEING CALLED?")
  if (!payload || Object.keys(payload).length < 0) return payload;
  // Deep clone to keep the function pure and avoid side-effects
  const clonedPayload = JSON.parse(JSON.stringify(payload));
  const data = clonedPayload;

  // 1. Process projectLogo (Directly under data)
  if (data.projectLogo) {
    data.projectLogo = formatImageUrl(staticBaseUrl, data.projectLogo);
  }

  // 2. Process site_ref -> images array
  if (Array.isArray(data.site_ref)) {
    data.site_ref = data.site_ref.map((ref: any) => {
      if (Array.isArray(ref.images)) {
        ref.images = ref.images.map((img: string) => formatImageUrl(staticBaseUrl, img));
      }
      return ref;
    });
  }

  // 3. Process referenceSections -> entries -> slots -> image
  if (Array.isArray(data.referenceSections)) {
    data.referenceSections = data.referenceSections.map((section: any) => {
      if (Array.isArray(section.entries)) {
        section.entries = section.entries.map((entry: any) => {
          if (Array.isArray(entry.slots)) {
            entry.slots = entry.slots.map((slot: any) => {
              if (slot.image) {
                slot.image = formatImageUrl(staticBaseUrl, slot.image);
              }
              return slot;
            });
          }
          return entry;
        });
      }
      return section;
    });
  }

  // 4. Process carSheet -> photo_groups -> images array
  if (data.carSheet && Array.isArray(data.carSheet.photo_groups)) {
    data.carSheet.photo_groups = data.carSheet.photo_groups.map((group: any) => {
      if (Array.isArray(group.images)) {
        group.images = group.images.map((img: string | null) => 
          img ? formatImageUrl(staticBaseUrl, img) : null
        );
      }
      return group;
    });
  }

  return clonedPayload;
};