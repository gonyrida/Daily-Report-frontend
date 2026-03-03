# Bulk Activities Input System

## Overview
A comprehensive bulk input system for hierarchical activities that supports Roman numerals, natural numbers, and bullet points with automatic parsing and validation.

## Files Created

### Core Components
1. **`bulkActivitiesParser.ts`** - Smart parsing utility for hierarchical numbering
2. **`BulkActivitiesInput.tsx`** - Main bulk input component with split view
3. **`ActivityPreview.tsx`** - Preview component for parsed activities
4. **`BulkActivitiesModal.tsx`** - Modal wrapper for the bulk input
5. **`BulkActivitiesDemo.tsx`** - Demo component to test functionality
6. **`activityValidation.ts`** - Comprehensive validation utilities

### Enhanced Components
7. **`EnhancedActivities.tsx`** - Enhanced activities component with bulk import (requires hook integration)

## Features

### Smart Hierarchical Parsing
- **Roman Numerals**: I, II, III, IV, V, etc. → Title rows
- **Natural Numbers**: 1, 1.1, 1.1.1, etc. → Detail rows with hierarchy
- **Bullet Points**: - or • → Sub-detail rows
- **Percentage Extraction**: Automatic parsing of `- XX%` or `XX%` format

### Input Format Examples
```
I. Site Preparation
    1. Clear vegetation - 100%
    1.1 Remove trees - 85%
    1.2 Grade site - 60%
    - Additional cleanup - 40%

II. Foundation Work
    1. Excavation - 100%
    1.1 Footing excavation - 100%
    1.2 Backfilling - 75%
    - Compaction testing - 90%
```

### Key Features
- **Live Preview** - Real-time parsing as user types
- **Error Highlighting** - Detailed validation with line numbers
- **Format Suggestions** - Helpful formatting tips
- **Template Library** - Pre-built examples
- **Import/Export** - Copy formatted results
- **Validation Engine** - Comprehensive rule checking

### Validation Rules
- Percentage range validation (0-100%)
- Hierarchy structure validation
- Total percentage limits
- Description quality checks
- Numbering format consistency

### User Interface
- **Split View**: Input area + live preview
- **Tabbed Interface**: Input/Preview/Help sections
- **Summary Statistics**: Activity counts and totals
- **Error/Warning Display**: Clear feedback messages
- **One-Click Import**: Direct integration with existing tables

## Usage

### Basic Integration
```tsx
import BulkActivitiesModal from './BulkActivitiesModal';

<BulkActivitiesModal
  open={showModal}
  onOpenChange={setShowModal}
  onImport={(weekly, next) => {
    // Handle imported activities
  }}
/>
```

### Demo Component
Use `BulkActivitiesDemo.tsx` to test the functionality independently.

## Benefits

1. **Efficiency**: Input multiple activities at once instead of one-by-one
2. **Flexibility**: Supports various numbering formats and hierarchies
3. **Accuracy**: Built-in validation prevents common errors
4. **User-Friendly**: Live preview and helpful error messages
5. **Integration**: Works with existing activity management system

## Technical Highlights

- **Smart Parsing**: Handles complex hierarchical numbering automatically
- **Real-time Validation**: Immediate feedback as users type
- **Type Safety**: Full TypeScript support with proper interfaces
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Responsive Design**: Works on all screen sizes

This system significantly improves the user experience for entering large numbers of hierarchical activities while maintaining data quality and consistency.
