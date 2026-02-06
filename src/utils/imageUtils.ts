// src/utils/imageUtils.ts
// Utility functions for handling image URLs and fallbacks

/**
 * Constructs a full image URL from a relative path
 * @param relativePath - The relative path stored in database (e.g., "/images/userId/filename.jpg")
 * @param timestamp - Optional timestamp for cache-busting
 * @returns Full URL to the image
 */
import { API_BASE_URL } from "@/config/api";

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
 * Constructs a full image URL with authentication token for img tags
 * @param relativePath - The relative path stored in database
 * @param timestamp - Optional timestamp for cache-busting
 * @returns Full URL with auth token for authenticated image requests
 */
export const constructAuthenticatedImageUrl = (
  relativePath: string | null | undefined,
  timestamp?: number,
): string => {
  if (!relativePath) return "";

  // If it's already a data URL or absolute URL, return as-is (no token needed)
  if (
    relativePath.startsWith("data:") ||
    relativePath.startsWith("http") ||
    relativePath.startsWith("blob:")
  ) {
    return relativePath;
  }

  const token = localStorage.getItem("authToken");

  // If it's a GridFS file id
  if (/^[a-fA-F0-9]{24}$/.test(relativePath)) {
    let url = `${API_BASE_URL}/files/${relativePath}`;
    if (token) url += `?token=${encodeURIComponent(token)}`;
    if (timestamp) url += token ? `&t=${timestamp}` : `?t=${timestamp}`;
    return url;
  }

  // If it's an API path (starts with /api)
  if (relativePath.startsWith("/api")) {
    let url = `${STATIC_BASE_URL}${relativePath}`;
    if (token) url += `?token=${encodeURIComponent(token)}`;
    if (timestamp) url += token ? `&t=${timestamp}` : `?t=${timestamp}`;
    return url;
  }

  // Legacy paths
  if (
    relativePath.startsWith("/uploads") ||
    relativePath.startsWith("/images") ||
    relativePath.startsWith("uploads")
  ) {
    let url = `${API_BASE_URL}/files?path=${encodeURIComponent(relativePath)}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
    if (timestamp) url += `&t=${timestamp}`;
    return url;
  }

  // Fallback by filename
  const filename = relativePath.split("/").pop();
  if (filename) {
    let url = `${API_BASE_URL}/files?filename=${encodeURIComponent(filename)}`;
    if (token) url += `&token=${encodeURIComponent(token)}`;
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
