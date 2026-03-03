// src/utils/testAutoFormat.ts
// Test file to verify auto-formatting logic

import { parseBulkActivities } from "./bulkActivitiesParser";

// Test cases
const testCases = [
  "Clear vegetation - 100%",
  "Clear vegetation - 100%", 
  "Site preparation - 100%",
  "Site preparation - 100",
  "Foundation work - 50%",
  "Foundation work - 50",
  "Foundation work - ",
  "I. Site preparation",
  "1. Clear vegetation",
  "1. Battambang Province 0.0%",  // User's test case
  "- Additional cleanup - 75%"
];

console.log("=== Testing Auto-Format Logic ===");

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: "${testCase}"`);
  
  const result = parseBulkActivities(testCase);
  
  if (result.activities.length > 0) {
    const activity = result.activities[0];
    console.log(`  Input: "${testCase}"`);
    console.log(`  Output: "${activity.displayIndex} ${activity.description} ${activity.percent}%"`);
    console.log(`  Valid: ${activity.isValid}`);
    if (activity.errors?.length > 0) {
      console.log(`  Errors: ${activity.errors.join(", ")}`);
    }
  } else {
    console.log("  No activities parsed");
  }
});

console.log("\n=== Summary ===");
console.log("Expected transformations:");
console.log('  "Clear vegetation - 100%" → "1. Clear Vegetation 100.0%"');
console.log('  "Clear vegetation - 100" → "1. Clear Vegetation 100.0%"');
console.log('  "Foundation work - 50%" → "1. Foundation Work 50.0%"');
console.log('  "Foundation work - 50" → "1. Foundation Work 50.0%"');
console.log('  "Foundation work - " → "1. Foundation Work 0.0%"');
console.log('  "1. Battambang Province 0.0%" → "1. Battambang Province 0.0%" (should remain unchanged)');
console.log('  "- Additional cleanup - 75%" → "- Additional cleanup 75.0%"');
