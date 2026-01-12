// src/lib/tokenCleanup.ts
// Utility to completely remove JWT tokens from localStorage and prevent future storage

/**
 * Remove ALL JWT tokens from localStorage
 * This should be called on app initialization to clean up any existing tokens
 */
export const cleanupAllTokens = (): void => {
  try {
    const keysToRemove: string[] = [];
    
    // Check all localStorage keys for token-related items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('jwt') ||
        key.toLowerCase().includes('auth') ||
        key.startsWith('daily-report:token') ||
        key === 'token' ||
        key === 'accessToken' ||
        key === 'refreshToken'
      )) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all identified keys
    keysToRemove.forEach(key => {
      console.log(`🧹 CLEANUP: Removing ${key} from localStorage`);
      localStorage.removeItem(key);
    });
    
    if (keysToRemove.length > 0) {
      console.log(`🧹 CLEANUP: Removed ${keysToRemove.length} token(s) from localStorage`);
    } else {
      console.log('🧹 CLEANUP: No tokens found in localStorage');
    }
    
    return; // Explicit void return
  } catch (error) {
    console.error('🧹 CLEANUP: Error cleaning tokens:', error);
    return; // Explicit void return
  }
};

/**
 * Prevent future localStorage token storage by overriding localStorage methods
 * This is a security measure to ensure tokens are never stored in localStorage
 */
export const preventTokenStorage = (): void => {
  const originalSetItem = localStorage.setItem;
  const originalGetItem = localStorage.getItem;
  
  // Override setItem to prevent token storage
  localStorage.setItem = function(key: string, value: string) {
    if (key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('jwt') ||
        key.toLowerCase().includes('auth')) {
      console.warn(`🚨 SECURITY: Blocked attempt to store ${key} in localStorage`);
      console.warn('🚨 Tokens should only be stored in HttpOnly cookies for security');
      return; // Block the storage
    }
    
    return originalSetItem.call(this, key, value);
  };
  
  // Override getItem to prevent token retrieval
  localStorage.getItem = function(key: string) {
    if (key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('jwt') ||
        key.toLowerCase().includes('auth')) {
      console.warn(`🚨 SECURITY: Blocked attempt to read ${key} from localStorage`);
      console.warn('🚨 Tokens should only be accessed via HttpOnly cookies');
      return null; // Block the retrieval
    }
    
    return originalGetItem.call(this, key);
  };
  
  console.log('🔒 SECURITY: localStorage token storage prevention enabled');
};

/**
 * Check if any tokens exist in localStorage (for debugging)
 */
export const checkForTokens = (): string[] => {
  const foundTokens: string[] = [];
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('jwt') ||
        key.toLowerCase().includes('auth')
      )) {
        foundTokens.push(key);
      }
    }
  } catch (error) {
    console.error('Error checking for tokens:', error);
  }
  
  return foundTokens;
};

/**
 * Initialize secure token handling
 * Call this once when your app starts
 */
export const initializeSecureTokenHandling = (): void => {
  console.log('🔒 INIT: Initializing secure token handling...');
  
  // Clean up existing tokens
  const removedCount = cleanupAllTokens();
  
  // Prevent future token storage
  preventTokenStorage();
  
  // Log final state
  const remainingTokens = checkForTokens();
  if (remainingTokens.length === 0) {
    console.log('✅ SECURITY: All tokens removed from localStorage. Cookie-only authentication active.');
  } else {
    console.warn('⚠️ SECURITY: Some tokens remain:', remainingTokens);
  }
  
  console.log('🔒 INIT: Secure token handling initialized');
};
