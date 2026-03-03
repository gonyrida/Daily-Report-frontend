// src/utils/activityValidation.ts
// Validation utilities for bulk activity input

import { ParsedActivity } from "./bulkActivitiesParser";

export interface ValidationRule {
  name: string;
  description: string;
  validate: (activities: ParsedActivity[]) => ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  line?: number;
  message: string;
  severity: 'error';
  activity?: ParsedActivity;
}

export interface ValidationWarning {
  line?: number;
  message: string;
  severity: 'warning';
  activity?: ParsedActivity;
}

/**
 * Validate percentage ranges
 */
export const validatePercentages: ValidationRule = {
  name: "Percentage Range",
  description: "All percentages must be between 0 and 100",
  validate: (activities) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    activities.forEach((activity, index) => {
      if (activity.percent < 0) {
        errors.push({
          line: index + 1,
          message: "Percentage cannot be negative",
          severity: 'error',
          activity
        });
      } else if (activity.percent > 100) {
        errors.push({
          line: index + 1,
          message: "Percentage cannot exceed 100",
          severity: 'error',
          activity
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};

/**
 * Validate hierarchy structure
 */
export const validateHierarchy: ValidationRule = {
  name: "Hierarchy Structure",
  description: "Activities must follow proper hierarchical order",
  validate: (activities) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let lastTitleIndex = 0;
    let lastDetailNumber = "";

    activities.forEach((activity, index) => {
      if (activity.type === "title") {
        lastTitleIndex++;
        lastDetailNumber = "";
      } else if (activity.type === "detail") {
        if (lastTitleIndex === 0) {
          errors.push({
            line: index + 1,
            message: "Detail row requires a preceding title row",
            severity: 'error',
            activity
          });
        }

        // Check if detail number is sequential
        const currentNumber = activity.displayIndex.replace('.', '');
        if (lastDetailNumber && parseInt(currentNumber) !== parseInt(lastDetailNumber) + 1) {
          warnings.push({
            line: index + 1,
            message: "Detail numbers may not be sequential",
            severity: 'warning',
            activity
          });
        }
        lastDetailNumber = currentNumber;
      } else if (activity.type === "sub-detail") {
        if (lastTitleIndex === 0) {
          errors.push({
            line: index + 1,
            message: "Sub-detail row requires a preceding title row",
            severity: 'error',
            activity
          });
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};

/**
 * Validate total percentage doesn't exceed reasonable limits
 */
export const validateTotalPercentage: ValidationRule = {
  name: "Total Percentage",
  description: "Total percentage should not exceed 100%",
  validate: (activities) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const validActivities = activities.filter(a => a.isValid);
    const totalPercentage = validActivities.reduce((sum, a) => sum + a.percent, 0);

    if (totalPercentage > 100) {
      warnings.push({
        message: `Total percentage (${totalPercentage}%) exceeds 100% - this may indicate double-counting`,
        severity: 'warning'
      });
    }

    if (totalPercentage > 200) {
      errors.push({
        message: `Total percentage (${totalPercentage}%) is unrealistic - please review your data`,
        severity: 'error'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};

/**
 * Validate descriptions are not empty or too short
 */
export const validateDescriptions: ValidationRule = {
  name: "Description Quality",
  description: "Descriptions should be meaningful and not empty",
  validate: (activities) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    activities.forEach((activity, index) => {
      const description = activity.description.trim();
      
      if (!description) {
        errors.push({
          line: index + 1,
          message: "Description cannot be empty",
          severity: 'error',
          activity
        });
      } else if (description.length < 3) {
        warnings.push({
          line: index + 1,
          message: "Description is very short - please provide more detail",
          severity: 'warning',
          activity
        });
      } else if (/^\d+$/.test(description)) {
        warnings.push({
          line: index + 1,
          message: "Description contains only numbers - please add meaningful text",
          severity: 'warning',
          activity
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};

/**
 * Validate numbering format consistency
 */
export const validateNumberingFormat: ValidationRule = {
  name: "Numbering Format",
  description: "Numbering should follow consistent patterns",
  validate: (activities) => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    activities.forEach((activity, index) => {
      // Check for mixed numbering types in similar levels
      if (activity.type === "detail") {
        const numberStr = activity.displayIndex.replace('.', '');
        
        // Check if number has too many levels
        const levels = numberStr.split('.');
        if (levels.length > 3) {
          warnings.push({
            line: index + 1,
            message: "Very deep nesting (more than 3 levels) may be hard to read",
            severity: 'warning',
            activity
          });
        }

        // Check for non-sequential numbering
        if (levels.length > 1) {
          const lastLevel = parseInt(levels[levels.length - 1]);
          if (lastLevel > 20) {
            warnings.push({
              line: index + 1,
              message: "High detail numbers may indicate better grouping is needed",
              severity: 'warning',
              activity
            });
          }
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};

/**
 * Run all validation rules
 */
export function validateActivities(activities: ParsedActivity[]): ValidationResult {
  const rules: ValidationRule[] = [
    validatePercentages,
    validateHierarchy,
    validateTotalPercentage,
    validateDescriptions,
    validateNumberingFormat
  ];

  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  rules.forEach(rule => {
    const result = rule.validate(activities);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Quick validation for real-time feedback
 */
export function quickValidateActivity(line: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let isValid = true;

  const trimmedLine = line.trim();
  if (!trimmedLine) {
    return { isValid: true, errors: [], suggestions: [] };
  }

  // Check for common formatting issues
  if (!trimmedLine.match(/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|\d+|[-•])/i)) {
    errors.push("Line should start with Roman numeral, number, or bullet point");
    suggestions.push("Try: I. Title, 1. Detail, or - Sub-detail");
    isValid = false;
  }

  // Check for percentage format
  const hasPercentage = trimmedLine.match(/-?\d+(?:\.\d+)?%/);
  if (hasPercentage) {
    const percent = parseFloat(hasPercentage[0].replace('%', ''));
    if (percent < 0 || percent > 100) {
      errors.push("Percentage must be between 0 and 100");
      isValid = false;
    }
  } else {
    suggestions.push("Consider adding a percentage (e.g., - 85%)");
  }

  // Check description length
  const description = trimmedLine.replace(/^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|\d+(?:\.\d+)*\.?|[-•])\s*/i, '').replace(/-?\d+(?:\.\d+)?%\s*$/, '').trim();
  if (!description) {
    errors.push("Description cannot be empty");
    isValid = false;
  } else if (description.length < 3) {
    suggestions.push("Description seems very short");
  }

  return { isValid, errors, suggestions };
}
