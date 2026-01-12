// src/components/SecureTokenInitializer.tsx
// Component to initialize secure token handling on app startup

import { useEffect } from 'react';
import { initializeSecureTokenHandling } from '@/lib/tokenCleanup';
import { runSecurityTests } from '@/lib/testSecureAuth';

const SecureTokenInitializer = () => {
  useEffect(() => {
    // Initialize secure token handling when app starts
    initializeSecureTokenHandling();
    
    // Run security tests in development mode
    if (process.env.NODE_ENV === 'development') {
      // Small delay to ensure initialization is complete
      setTimeout(() => {
        console.log('🧪 DEVELOPMENT MODE: Running security tests...');
        runSecurityTests();
      }, 1000);
    }
  }, []);

  // This component doesn't render anything
  return null;
};

export default SecureTokenInitializer;
