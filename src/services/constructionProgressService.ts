import { ConstructionProgressData } from '@/types/constructionProgress';
import { apiFetch, apiGet, apiPost, apiDelete } from '@/lib/apiFetch';

/**
 * Service for managing construction progress data
 */
export class ConstructionProgressService {
  /**
   * Save construction progress data to a weekly report
   */
  static async saveConstructionProgress(
    reportId: string,
    constructionData: ConstructionProgressData
  ): Promise<{ success: boolean; data?: any; error?: string; details?: any }> {
    try {
      const response = await apiPost(`/weekly-reports/${reportId}/construction-progress`, constructionData);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save construction progress');
      }

      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Error saving construction progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get construction progress data from a weekly report
   */
  static async getConstructionProgress(
    reportId: string
  ): Promise<{ success: boolean; data?: ConstructionProgressData; error?: string }> {
    try {
      console.log('🔍 ConstructionProgressService.getConstructionProgress: Starting API call for reportId:', reportId);
      const response = await apiGet(`/weekly-reports/${reportId}/construction-progress`);
      console.log('🔍 ConstructionProgressService.getConstructionProgress: API response status:', response.status);
      
      const result = await response.json();
      console.log('🔍 ConstructionProgressService.getConstructionProgress: API response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to get construction progress');
      }

      console.log('🔍 ConstructionProgressService.getConstructionProgress: Success, returning data');
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('🔍 ConstructionProgressService.getConstructionProgress: Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Delete construction progress data from a weekly report
   */
  static async deleteConstructionProgress(
    reportId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiDelete(`/weekly-reports/${reportId}/construction-progress`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete construction progress');
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error deleting construction progress:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Auto-save construction progress data with debouncing
   */
  private static autoSaveTimeout: NodeJS.Timeout | null = null;

  static autoSaveConstructionProgress(
    reportId: string,
    constructionData: ConstructionProgressData,
    delay: number = 2000
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    return new Promise((resolve) => {
      // Clear any existing timeout
      if (this.autoSaveTimeout) {
        clearTimeout(this.autoSaveTimeout);
      }

      // Set new timeout
      this.autoSaveTimeout = setTimeout(async () => {
        const result = await this.saveConstructionProgress(reportId, constructionData);
        resolve(result);
      }, delay);
    });
  }

  /**
   * Validate construction progress data before sending to backend
   */
  static validateConstructionProgressData(data: ConstructionProgressData): string[] {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Construction progress data must be an object');
      return errors;
    }

    // Validate projectInfo
    if (!data.projectInfo || typeof data.projectInfo !== 'object') {
      errors.push('projectInfo is required and must be an object');
    } else {
      const requiredFields = ['project', 'subtitle', 'date', 'revision'];
      requiredFields.forEach(field => {
        if (typeof data.projectInfo[field as keyof typeof data.projectInfo] !== 'string') {
          errors.push(`projectInfo.${field} must be a string`);
        }
      });
    }

    // Validate items array
    if (!Array.isArray(data.items)) {
      errors.push('items must be an array');
    } else {
      data.items.forEach((item, index) => {
        if (!item.id || typeof item.id !== 'string') {
          errors.push(`Item ${index}: id is required and must be a string`);
        }

        // Validate BoQ data
        if (!item.boQ || typeof item.boQ !== 'object') {
          errors.push(`Item ${index}: boQ is required and must be an object`);
        } else {
          const boqFields = ['qty', 'materialRate', 'laborRate', 'unitRate', 'amount'];
          boqFields.forEach(field => {
            if (typeof item.boQ[field as keyof typeof item.boQ] !== 'number') {
              errors.push(`Item ${index}: boQ.${field} must be a number`);
            }
          });
        }

        // Validate progress data objects
        const progressFields = ['previousWeek', 'thisWeek', 'upToThisWeek', 'remaining', 'nextWeekPlan', 'upToNextWeekPlan'];
        progressFields.forEach(field => {
          if (!item[field] || typeof item[field] !== 'object') {
            errors.push(`Item ${index}: ${field} is required and must be an object`);
          } else {
            const progressDataFields = ['qty', 'amount', 'percentage'];
            progressDataFields.forEach(subField => {
              if (typeof item[field][subField] !== 'number') {
                errors.push(`Item ${index}: ${field}.${subField} must be a number`);
              }
            });
          }
        });
      });
    }

    return errors;
  }
}

export default ConstructionProgressService;
