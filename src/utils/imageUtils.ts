// src/utils/imageUtils.ts
// Utility functions for handling image URLs and fallbacks

/**
 * Constructs a full image URL from a relative path
 * @param relativePath - The relative path stored in database (e.g., "/images/userId/filename.jpg")
 * @param timestamp - Optional timestamp for cache-busting
 * @returns Full URL to the image
 */
import { API_BASE_URL } from "@/config/api";
import { isSupabaseUrl } from "./supabaseStorage";

export const constructImageUrl = (
  relativePath: string | null | undefined,
  timestamp?: number,
): string => {
  if (!relativePath) return "";

  // If it's already a data URL or absolute URL, return as-is
  if (
    relativePath.startsWith("data:") ||
    relativePath.startsWith("http") ||
    relativePath.startsWith("blob:")
  ) {
    return relativePath;
  }

  // If it's a Supabase URL, return as-is (already complete)
  if (isSupabaseUrl(relativePath)) {
    return relativePath;
  }

  // If it's an API path (starts with /api), resolve against service origin
  if (relativePath.startsWith("/api")) {
    let url = `${relativePath.startsWith("/api") ? relativePath : `/api${relativePath}`}`;
    // Prepend host if missing
    if (url.startsWith("/api"))
      url = `${API_BASE_URL}${url.replace(/^\/api/, "")}`; // ensures full URL
    if (timestamp) url += `?t=${timestamp}`;
    return url;
  }

  // If the value looks like a GridFS file id (24 hex chars), return the files API
  if (/^[a-fA-F0-9]{24}$/.test(relativePath)) {
    const url =
      `${API_BASE_URL}/files/${relativePath}` +
      (timestamp ? `?t=${timestamp}` : "");
    return url;
  }

  // Legacy local paths like /uploads/... or /images/... -> fallback to files lookup endpoint
  if (
    relativePath.startsWith("/uploads") ||
    relativePath.startsWith("/images") ||
    relativePath.startsWith("uploads")
  ) {
    const url =
      `${API_BASE_URL}/files?path=${encodeURIComponent(relativePath)}` +
      (timestamp ? `&t=${timestamp}` : "");
    return url;
  }

  // As a last resort, construct a files query by filename
  const filename = relativePath.split("/").pop();
  if (filename) {
    const url =
      `${API_BASE_URL}/files?filename=${encodeURIComponent(filename)}` +
      (timestamp ? `&t=${timestamp}` : "");
    return url;
  }

  return "";
};

/**
 * Constructs a full image URL with authentication
 * @param relativePath - The relative path stored in database
 * @param timestamp - Optional timestamp for cache-busting
 * @returns Full URL - authentication handled by HTTP-only cookies
 */
export const constructAuthenticatedImageUrl = (
  relativePath: string | null | undefined,
  timestamp?: number,
): string => {
  if (!relativePath) return "";

  // If it's already a data URL or absolute URL, return as-is (no auth needed)
  if (
    relativePath.startsWith("data:") ||
    relativePath.startsWith("http") ||
    relativePath.startsWith("blob:")
  ) {
    return relativePath;
  }

  // If it's a Supabase URL, return as-is (public URLs don't need auth)
  if (isSupabaseUrl(relativePath)) {
    return relativePath;
  }

  //  const token = localStorage.getItem("authToken");
  
  // For uploads/images paths - cookies provide authentication automatically
  // No localStorage token needed - backend authenticateToken middleware reads HTTP-only cookies
  if (
    relativePath.startsWith("/uploads") ||
    relativePath.startsWith("uploads")
  ) {
    let url = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
    if (timestamp) url += `?t=${timestamp}`;
    return url;
  }

  // If it's a GridFS file id
  if (/^[a-fA-F0-9]{24}$/.test(relativePath)) {
    let url = `${API_BASE_URL}/files/${relativePath}`;
    //  if (token) url += `?token=${encodeURIComponent(token)}`;
    // if (timestamp) url += token ? `&t=${timestamp}` : `?t=${timestamp}`;
    if (timestamp) url += `?t=${timestamp}`;
    return url;
  }

  // If it's an API path (starts with /api)
  if (relativePath.startsWith("/api")) {
    // let url = `${STATIC_BASE_URL}${relativePath}`;
    // if (token) url += `?token=${encodeURIComponent(token)}`;
    // if (timestamp) url += token ? `&t=${timestamp}` : `?t=${timestamp}`;
    let url = `${relativePath.startsWith("/api") ? relativePath : `/api${relativePath}`}`;
    // Prepend host if missing
    if (url.startsWith("/api"))
      url = `${API_BASE_URL}${url.replace(/^\/api/, "")}`;
    if (timestamp) url += `?t=${timestamp}`;
    return url;
  }

  // Legacy local paths like /images/...
  if (
    // relativePath.startsWith("/uploads") ||
    // relativePath.startsWith("/images") ||
    // relativePath.startsWith("uploads")
    relativePath.startsWith("/images")
  ) {
    let url = `${API_BASE_URL}/files?path=${encodeURIComponent(relativePath)}`;
    // if (token) url += `&token=${encodeURIComponent(token)}`;
    if (timestamp) url += `&t=${timestamp}`;
    return url;
  }

  // As a last resort, construct a files query by filename
  const filename = relativePath.split("/").pop();
  if (filename) {
    let url = `${API_BASE_URL}/files?filename=${encodeURIComponent(filename)}`;
    // if (token) url += `&token=${encodeURIComponent(token)}`;
    if (timestamp) url += `&t=${timestamp}`;
    return url;
  }

  return "";
};

/**
 * Gets a fallback avatar URL with user initials
 * @param name - User's full name
 * @param size - Avatar size (default: 200)
 * @returns URL to a generated avatar image
 */
export const getFallbackAvatarUrl = (
  name: string,
  size: number = 200,
): string => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Using a simple avatar service or return empty string for default
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&size=${size}&background=6366f1&color=fff`;
};

/**
 * Handles image loading errors by setting fallback
 * @param event - Error event from img element
 * @param name - User's name for fallback avatar
 */
export const handleImageError = (
  event: React.SyntheticEvent<HTMLImageElement, Event>,
  name: string,
) => {
  const img = event.currentTarget;
  img.src = getFallbackAvatarUrl(name);
  img.onerror = null; // Prevent infinite loop
};

/**
 * Gets the current timestamp for cache-busting
 * @returns Current timestamp in milliseconds
 */
export const getCacheBustingTimestamp = (): number => Date.now();

// ============================================================================
// COVER IMAGE SELECTION & VALIDATION FOR MASTER REPORTS
// ============================================================================

/**
 * Default placeholder images for master report covers
 */
export const DEFAULT_MASTER_COVER_IMAGES = {
  placeholder: "/placeholder-construction.jpg",
  generic: "/images/master-report-default.jpg",
  banner: "/images/master-report-banner.jpg",
};

/**
 * Exact values that are known-bad placeholders (checked with ===)
 */
const INVALID_IMAGE_EXACT = new Set([
  "",
  "null",
  "undefined",
  "placeholder",
  "default",
  "/placeholder-construction.jpg",
]);

/**
 * Validates if an image URL is valid and not a placeholder
 */
export const isValidCoverImage = (imageUrl: string | null | undefined): boolean => {
  if (!imageUrl) return false;

  const trimmed = imageUrl.trim();
  if (trimmed === "") return false;

  // Reject known-bad placeholder values (exact match only, not substring)
  if (INVALID_IMAGE_EXACT.has(trimmed.toLowerCase())) {
    return false;
  }
  
  // Must have valid image extension or be a data URL
  const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
  const hasValidExtension = validExtensions.some(ext => trimmed.toLowerCase().endsWith(ext));
  const isDataUrl = trimmed.startsWith("data:image/");
  const isHttpUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://");
  const isRelativePath = trimmed.startsWith("/");
  
  return hasValidExtension || isDataUrl || isHttpUrl || isRelativePath;
};

/**
 * Interface for report with cover image information
 */
export interface ReportWithCover {
  projectId?: string;
  projectName?: string;
  status?: string;
  coverImage?: string;
  cover?: {
    coverImage?: string;
    projectName?: string;
    projectTitle?: string;
    employer?: string;
  };
  startDate?: string;
  endDate?: string;
  submittedAt?: string;
  createdAt?: string;
}

/**
 * Priority levels for cover image selection
 */
export type ImagePriority = "submitted" | "recent" | "any";

/**
 * Selects the best cover image from multiple reports based on priority strategy
 * 
 * Strategy:
 * 1. First valid image from submitted reports (by submission date, most recent first)
 * 2. First valid image from any report (by creation date, most recent first)
 * 3. Default placeholder image
 * 
 * @param reports - Array of reports with cover image data
 * @param priority - Selection priority strategy
 * @returns Selected report with cover image data or null
 */
export const selectMasterCoverImage = (
  reports: ReportWithCover[],
  priority: ImagePriority = "submitted"
): ReportWithCover | null => {
  if (!reports || reports.length === 0) {
    return null;
  }

  // Helper to extract cover image from report
  const getCoverImage = (report: ReportWithCover): string | null => {
    // Check both direct coverImage and nested cover.coverImage
    const image = report.coverImage || report.cover?.coverImage;
    return isValidCoverImage(image) ? image : null;
  };

  // Helper to parse date safely
  const getDateValue = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  // Strategy 1: Submitted reports first (sorted by submission date, most recent)
  if (priority === "submitted" || priority === "any") {
    const submittedReports = reports
      .filter(r => r.status === "submitted" && getCoverImage(r))
      .sort((a, b) => getDateValue(b.submittedAt) - getDateValue(a.submittedAt));
    
    if (submittedReports.length > 0) {
      return submittedReports[0];
    }
  }

  // Strategy 2: Any report with valid image (sorted by creation date, most recent)
  const reportsWithImages = reports
    .filter(r => getCoverImage(r))
    .sort((a, b) => getDateValue(b.createdAt) - getDateValue(a.createdAt));
  
  if (reportsWithImages.length > 0) {
    return reportsWithImages[0];
  }

  // Strategy 3: Return null (no valid report found)
  return null;
};

/**
 * Preloads an image to verify it loads successfully
 * @param imageUrl - URL to preload
 * @returns Promise that resolves to true if image loads, false otherwise
 */
export const preloadImage = (imageUrl: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!imageUrl || imageUrl === DEFAULT_MASTER_COVER_IMAGES.placeholder) {
      resolve(false);
      return;
    }

    const img = new Image();
    
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
    
    img.src = imageUrl;
  });
};

/**
 * Validates and returns a verified cover image with fallback
 * Attempts to preload the image and falls back if it fails
 * 
 * @param reports - Array of reports with cover image data
 * @returns Promise resolving to valid cover image URL
 */
export const getVerifiedMasterCoverImage = async (
  reports: ReportWithCover[]
): Promise<string> => {
  // Try primary selection
  const primaryImage = selectMasterCoverImage(reports, "submitted");
  const isPrimaryValid = await preloadImage(primaryImage);
  
  if (isPrimaryValid) {
    return primaryImage;
  }

  // Try secondary selection (any valid image)
  const secondaryImage = selectMasterCoverImage(reports, "any");
  if (secondaryImage !== primaryImage) {
    const isSecondaryValid = await preloadImage(secondaryImage);
    if (isSecondaryValid) {
      return secondaryImage;
    }
  }

  // Return default placeholder
  return DEFAULT_MASTER_COVER_IMAGES.placeholder;
};
