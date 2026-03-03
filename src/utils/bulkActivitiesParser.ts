// src/utils/bulkActivitiesParser.ts
// Utility for parsing hierarchical activity input with Roman numerals, numbers, and bullets

import { ActivityRow } from "@/types/activity.types";

export interface ParsedActivity {
  type: "title" | "detail" | "sub-detail";
  level: number;
  displayIndex: string;
  description: string;
  percent: number;
  originalLine: string;
  isValid: boolean;
  errors?: string[];
}

export interface ParseResult {
  activities: ParsedActivity[];
  errors: string[];
  warnings: string[];
  summary: {
    totalActivities: number;
    validActivities: number;
    invalidActivities: number;
    totalPercentage: number;
  };
}

// Roman numeral conversion utilities
const ROMAN_NUMERALS = {
  'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5,
  'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10,
  'XI': 11, 'XII': 12, 'XIII': 13, 'XIV': 14, 'XV': 15,
  'XVI': 16, 'XVII': 17, 'XVIII': 18, 'XIX': 19, 'XX': 20
} as const;

const ROMAN_REGEX = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)\.?\s*/i;

// Number pattern (1, 1.1, 1.1.1, etc.)
const NUMBER_REGEX = /^(\d+(?:\.\d+)*)\.?\s*/;

// Bullet pattern (- or •)
const BULLET_REGEX = /^[-•]\s*/;

// Percentage pattern
const PERCENTAGE_REGEX = /(-?\d+(?:\.\d+)?)%\s*$/;

/**
 * Parse a single line of activity input
 */
function parseLine(line: string, lineNumber: number): ParsedActivity | null {
  const trimmedLine = line.trim();
  
  // Skip empty lines
  if (!trimmedLine) return null;

  let type: "title" | "detail" | "sub-detail";
  let level = 0;
  let displayIndex = "";
  let description = trimmedLine;
  let percent = 0;
  let isValid = true;
  let errors: string[] = [];

  // Extract percentage
  const percentMatch = description.match(PERCENTAGE_REGEX);
  if (percentMatch) {
    let rawPercent = percentMatch[1];
    
    // Auto-format percentage
    if (rawPercent === "100") {
      rawPercent = "100.0";
    } else if (rawPercent === "100%") {
      rawPercent = "100.0";
    } else if (rawPercent === "") {
      rawPercent = "0.0";
    }
    
    percent = parseFloat(rawPercent);
    if (percent < 0 || percent > 100) {
      isValid = false;
      errors.push("Percentage must be between 0 and 100");
    }
    description = description.replace(PERCENTAGE_REGEX, "").trim();
  } else {
    // No percentage found, default to 0.0
    percent = 0.0;
  }

  // Determine the type and extract index
  if (ROMAN_REGEX.test(description)) {
    // Roman numeral - Title row
    type = "title";
    level = 0;
    const romanMatch = description.match(ROMAN_REGEX)!;
    displayIndex = romanMatch[1].toUpperCase() + ".";
    description = description.replace(ROMAN_REGEX, "").trim();
  } else if (NUMBER_REGEX.test(description)) {
    // Number with dots - Detail row
    type = "detail";
    const numberMatch = description.match(NUMBER_REGEX)!;
    const numberStr = numberMatch[1];
    level = numberStr.split('.').length - 1;
    displayIndex = numberStr + ".";
    description = description.replace(NUMBER_REGEX, "").trim();
  } else if (BULLET_REGEX.test(description)) {
    // Bullet - Sub-detail row
    type = "sub-detail";
    level = 3; // Deeper level
    displayIndex = "-";
    description = description.replace(BULLET_REGEX, "").trim();
  } else {
    // No prefix - treat as sub-detail
    type = "sub-detail";
    level = 3;
    displayIndex = "-";
    isValid = false;
    errors.push("Missing prefix (Roman numeral, number, or bullet)");
  }

  // Auto-format description: replace dash format with proper numbering
  if (description && (description.includes(" - ") || description.includes(". "))) {
    let separator = description.includes(" - ") ? " - " : ". ";
    const parts = description.split(separator);
    if (parts.length === 2) {
      const [prefix, suffix] = parts;
      // Convert "Clear vegetation - 100%" to "1. Clear Vegetation 100.0%"
      if (suffix.match(/^\d+%?$/)) {
        let rawPercent = suffix.replace("%", "");
        if (rawPercent === "100") rawPercent = "100.0";
        else if (rawPercent === "100%") rawPercent = "100.0";
        else if (rawPercent === "") rawPercent = "0.0";
        
        description = prefix.trim() + separator + suffix.replace(/\d+%?$/, (match) => {
          const percent = parseFloat(match.replace("%", ""));
          return percent + (percent % 1 === 0 ? ".0%" : "%");
        });
      }
    }
  }

  // Validate description
  if (!description) {
    isValid = false;
    errors.push("Description cannot be empty");
  }

  return {
    type,
    level,
    displayIndex,
    description,
    percent,
    originalLine: line,
    isValid,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Parse bulk activity input
 */
export function parseBulkActivities(input: string): ParseResult {
  const lines = input.split('\n');
  const activities: ParsedActivity[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  // Parse each line
  lines.forEach((line, index) => {
    const parsed = parseLine(line, index + 1);
    if (parsed) {
      activities.push(parsed);
      
      if (!parsed.isValid && parsed.errors) {
        errors.push(`Line ${index + 1}: ${parsed.errors.join(', ')}`);
      }
    }
  });

  // Validate hierarchy
  const hierarchyErrors = validateHierarchy(activities);
  errors.push(...hierarchyErrors);

  // Calculate summary
  const validActivities = activities.filter(a => a.isValid);
  const totalPercentage = validActivities.reduce((sum, a) => sum + a.percent, 0);

  // Add warnings
  if (totalPercentage > 100 && validActivities.length > 0) {
    warnings.push(`Total percentage (${totalPercentage}%) exceeds 100%`);
  }

  if (validActivities.length === 0 && activities.length > 0) {
    warnings.push("No valid activities found");
  }

  return {
    activities,
    errors,
    warnings,
    summary: {
      totalActivities: activities.length,
      validActivities: validActivities.length,
      invalidActivities: activities.length - validActivities.length,
      totalPercentage
    }
  };
}

/**
 * Validate activity hierarchy
 */
function validateHierarchy(activities: ParsedActivity[]): string[] {
  const errors: string[] = [];
  let lastTitleIndex = 0;
  let lastDetailIndex: number[] = [];

  activities.forEach((activity, index) => {
    if (activity.type === "title") {
      lastTitleIndex++;
      lastDetailIndex = [];
    } else if (activity.type === "detail") {
      if (lastTitleIndex === 0) {
        errors.push(`Line ${index + 1}: Detail row without title`);
      }
    } else if (activity.type === "sub-detail") {
      if (lastTitleIndex === 0) {
        errors.push(`Line ${index + 1}: Sub-detail row without title`);
      }
    }
  });

  return errors;
}

/**
 * Convert parsed activities to ActivityRow arrays
 */
export function convertToActivityRows(
  parsed: ParsedActivity[],
  type: "weekly" | "next"
): { weeklyActivities: ActivityRow[]; nextWeekPlan: ActivityRow[] } {
  const weeklyActivities: ActivityRow[] = [];
  const nextWeekPlan: ActivityRow[] = [];

  parsed.forEach(activity => {
    const activityRow: ActivityRow = {
      description: activity.displayIndex + " " + activity.description,
      percent: activity.percent
    };

    // For now, put all activities in weekly activities
    // In a real implementation, you might want to separate them based on context
    weeklyActivities.push(activityRow);
    
    // Also add to next week plan for testing
    if (type === "next") {
      nextWeekPlan.push(activityRow);
    }
  });

  return { weeklyActivities, nextWeekPlan };
}

/**
 * Generate example input
 */
export function generateExampleInput(): string {
  return `I. Site Preparation
    1. Clear vegetation - 100%
    1.1 Remove trees - 85%
    1.2 Grade site - 60%
    - Additional cleanup - 40%

II. Foundation Work
    1. Excavation - 100%
    1.1 Footing excavation - 100%
    1.2 Backfilling - 75%
    - Compaction testing - 90%

III. Structural Work
    1. Column construction - 80%
    1.1 Reinforcement - 90%
    1.2 Concrete pouring - 70%
    - Curing process - 50%`;
}

/**
 * Format activities for display
 */
export function formatActivitiesForDisplay(activities: ParsedActivity[]): string {
  return activities
    .filter(a => a.isValid)
    .map(a => `${a.displayIndex} ${a.description} - ${a.percent}%`)
    .join('\n');
}
