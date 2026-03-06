# Rolling Totals Location Fix Summary

## Issue Description
When creating a report with a different location, the system was showing rolling total from another location instead of starting a new total for the new location.

## Root Cause
The smart loading logic was carrying over accumulated totals from the most recent report regardless of location, instead of finding the most recent report for the specific project AND location combination.

## Solution Implemented

### 1. Location-Specific Smart Loading
**New Function**: `loadMostRecentReportForProjectAndLocation`
- Fetches the most recent report for a specific project AND location
- Uses the `/daily-reports/by-location` endpoint
- Filters by project name after getting location-specific reports

### 2. Enhanced Smart Loading Logic
**Updated Logic**: When creating a new report, the system now:
1. Checks if a location is specified in URL or current state
2. **If location specified**: Loads most recent report for that specific project+location
3. **If no location**: Loads most recent report for the project (any location)
4. **If no report found**: Falls back to clean state with zero rolling totals

### 3. Location Change Handler
**New Function**: `handleLocationChange`
- Clears all rolling totals (prev and accumulated) to 0
- Ensures backend recalculates rolling totals from scratch for new location
- Mirrors the existing `handleDateChange` behavior

### 4. Component Integration
**Updated ProjectInfo Component**:
- Added `onLocationChange` prop to handle location changes
- Updated LocationDropdown to use the new handler
- Maintains backward compatibility

## Files Modified

### 1. DailyReport.tsx
- **Added**: `loadMostRecentReportForProjectAndLocation` function
- **Updated**: Smart loading logic to be location-aware
- **Added**: `handleLocationChange` function
- **Updated**: ProjectInfo component props to include `onLocationChange`

### 2. ProjectInfo.tsx
- **Added**: `onLocationChange` prop to interface
- **Added**: `handleLocationInputChange` function
- **Updated**: LocationDropdown to use the new handler

## Expected Behavior

### Before Fix
- ❌ Creating report for "Phnom Penh" shows rolling totals from "Siem Reap"
- ❌ User sees incorrect accumulated values from different location
- ❌ Rolling totals are not location-specific

### After Fix
- ✅ Creating report for "Phnom Penh" starts with zero rolling totals
- ✅ If previous report exists for "Phnom Penh", those totals are carried over
- ✅ If no previous report for "Phnom Penh", starts from zero
- ✅ Changing location clears rolling totals and starts fresh for new location
- ✅ Rolling totals are properly calculated per location

## Testing Scenarios

### Scenario 1: New Location
1. User creates report for "Project A" at "Phnom Penh"
2. System finds no previous report for "Project A" + "Phnom Penh"
3. **Result**: All rolling totals start at 0

### Scenario 2: Existing Location
1. User creates another report for "Project A" at "Phnom Penh"
2. System finds previous report for "Project A" + "Phnom Penh"
3. **Result**: Previous accumulated values carried over as prev values

### Scenario 3: Location Change
1. User changes location from "Phnom Penh" to "Siem Reap"
2. `handleLocationChange` clears all rolling totals to 0
3. **Result**: Fresh start for new location

### Scenario 4: Different Location
1. User creates report for "Project A" at "Siem Reap" (different from existing "Phnom Penh")
2. System finds no previous report for "Project A" + "Siem Reap"
3. **Result**: All rolling totals start at 0

## Backend Integration

The frontend now properly integrates with the backend location-specific features:

1. **Location Selection**: Uses location-specific smart loading
2. **Record Creation**: Location sent with report data
3. **Rolling Totals**: Backend calculates based on location-specific previous reports
4. **Date Changes**: Clears totals for proper recalculation
5. **Location Changes**: Clears totals for proper recalculation

## Benefits

✅ **Location-Specific Rolling Totals**: Each location maintains its own rolling totals
✅ **Smart Loading**: Loads appropriate previous totals based on location
✅ **User Control**: Location changes trigger total reset for fresh start
✅ **Data Integrity**: Prevents cross-location total contamination
✅ **Backward Compatibility**: Existing functionality preserved

## Summary

The rolling totals issue has been completely resolved. The system now:

1. **Creates separate rolling totals per location**
2. **Starts fresh totals for new locations**
3. **Carries over existing totals for same location**
4. **Clears totals when location changes**
5. **Integrates properly with backend location logic**

Users can now confidently create reports for different locations knowing that rolling totals will be calculated correctly for each specific location.
