// // src/lib/testSecureAuth.ts
// // Test utilities to verify secure cookie-based authentication

// import { checkForTokens, cleanupAllTokens } from './tokenCleanup';

// /**
//  * Test if any tokens exist in localStorage
//  */
// export const testForTokens = (): boolean => {
//   const tokens = checkForTokens();
  
//   console.log('🧪 TESTING: Checking for tokens in localStorage...');
  
//   if (tokens.length === 0) {
//     console.log('✅ PASS: No tokens found in localStorage');
//     return true;
//   } else {
//     console.warn('❌ FAIL: Found tokens in localStorage:', tokens);
//     return false;
//   }
// };

// /**
//  * Test if localStorage prevention is working
//  */
// export const testTokenPrevention = (): boolean => {
//   console.log('🧪 TESTING: localStorage token prevention...');
  
//   try {
//     // Try to store a token (should be blocked)
//     localStorage.setItem('test-token', 'should-be-blocked');
    
//     // Try to retrieve it (should return null)
//     const retrieved = localStorage.getItem('test-token');
    
//     if (retrieved === null) {
//       console.log('✅ PASS: Token prevention is working');
//       return true;
//     } else {
//       console.warn('❌ FAIL: Token prevention not working');
//       return false;
//     }
//   } catch (error) {
//     console.warn('❌ FAIL: Error testing token prevention:', error);
//     return false;
//   }
// };

// /**
//  * Run all security tests
//  */
// export const runSecurityTests = (): void => {
//   console.log('🔒 RUNNING SECURITY TESTS');
//   console.log('==========================');
  
//   const test1 = testForTokens();
//   const test2 = testTokenPrevention();
  
//   if (test1 && test2) {
//     console.log('🎉 ALL TESTS PASSED: Your app is secure!');
//   } else {
//     console.warn('⚠️ SOME TESTS FAILED: Check implementation');
//   }
  
//   console.log('==========================');
// };

// /**
//  * Manual cleanup function for testing
//  */
// export const manualCleanup = (): void => {
//   console.log('🧹 MANUAL CLEANUP: Removing all tokens...');
//   cleanupAllTokens();
//   console.log('✅ Cleanup completed');
// };
