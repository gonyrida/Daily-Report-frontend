// src/utils/imageUtils.ts
// Utility functions for handling image URLs and fallbacks

import { STATIC_BASE_URL } from '@/config/api';

/**
 * Constructs a full image URL from a relative path
 * @param relativePath - The relative path stored in database (e.g., "/images/userId/filename.jpg")
 * @param timestamp - Optional timestamp for cache-busting
 * @returns Full URL to the image
 */
export const constructImageUrl = (relativePath: string | null | undefined, timestamp?: number): string => {
  if (!relativePath) {
    return '';
  }
  
  let url = `${STATIC_BASE_URL}/uploads${relativePath}`;
  
  // Add cache-busting timestamp if provided
  if (timestamp) {
    url += `?t=${timestamp}`;
  }
  
  return url;
};

/**
 * Gets a fallback avatar URL with user initials
 * @param name - User's full name
 * @param size - Avatar size (default: 200)
 * @returns URL to a generated avatar image
 */
export const getFallbackAvatarUrl = (name: string, size: number = 200): string => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
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
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>, name: string) => {
  const img = event.currentTarget;
  img.src = getFallbackAvatarUrl(name);
  img.onerror = null; // Prevent infinite loop
};

/**
 * Gets the current timestamp for cache-busting
 * @returns Current timestamp in milliseconds
 */
export const getCacheBustingTimestamp = (): number => Date.now();
