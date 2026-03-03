// Quick test for the specific case
import { parseBulkActivities } from "./bulkActivitiesParser";

const testCase = "1. Battambang Province 0.0%";
console.log(`Testing: "${testCase}"`);

const result = parseBulkActivities(testCase);

if (result.activities.length > 0) {
  const activity = result.activities[0];
  console.log(`Input: "${testCase}"`);
  console.log(`Output: "${activity.displayIndex} ${activity.description} ${activity.percent}%"`);
  console.log(`Expected: "1. Battambang Province 0.0%" (should remain unchanged)`);
  console.log(`Match: ${activity.displayIndex} ${activity.description} ${activity.percent}% === "1. Battambang Province 0.0%" ? "✅" : "❌"}`);
} else {
  console.log("No activities parsed");
}
