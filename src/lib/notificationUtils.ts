import { apiGet, apiPut } from './apiFetch';

export interface UserPreferences {
  emailNotifications: boolean;
  autoSave: boolean;
  dataSharing: boolean;
  marketingEmails: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  emailNotifications: true,
  autoSave: true,
  dataSharing: false,
  marketingEmails: false,
};

// Get user preferences from API or localStorage
export const getUserPreferences = async (): Promise<UserPreferences> => {
  try {
    // Try to get from API first with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await apiGet('/notifications/preferences');
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const preferences = data.data;
      // Store in localStorage as backup
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
      return preferences;
    }
  } catch (error) {
    console.log('Could not fetch preferences from API, using localStorage:', error);
  }

  // Fallback to localStorage
  try {
    const stored = localStorage.getItem('userPreferences');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error parsing stored preferences:', error);
  }

  // Return default preferences
  return DEFAULT_PREFERENCES;
};

// Update user preferences
export const updateUserPreferences = async (preferences: Partial<UserPreferences>): Promise<UserPreferences> => {
  try {
    const response = await apiPut('/notifications/preferences', preferences);
    if (response.ok) {
      const data = await response.json();
      const updatedPreferences = data.data;
      // Update localStorage
      localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
      return updatedPreferences;
    }
    throw new Error('Failed to update preferences');
  } catch (error) {
    console.error('Error updating preferences:', error);
    // Still update localStorage as fallback
    const currentPrefs = await getUserPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };
    localStorage.setItem('userPreferences', JSON.stringify(updatedPrefs));
    return updatedPrefs;
  }
};

// Get auto-save preference
export const getAutoSavePreference = async (): Promise<boolean> => {
  const preferences = await getUserPreferences();
  return preferences.autoSave;
};

// Get email notification preference
export const getEmailNotificationPreference = async (): Promise<boolean> => {
  const preferences = await getUserPreferences();
  return preferences.emailNotifications;
};

// Send test email
export const sendTestEmail = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await apiGet('/notifications/test-email');
    if (response.ok) {
      const data = await response.json();
      return {
        success: data.success,
        message: data.success ? 'Test email sent successfully' : data.message
      };
    }
    return {
      success: false,
      message: 'Failed to send test email'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to send test email'
    };
  }
};
