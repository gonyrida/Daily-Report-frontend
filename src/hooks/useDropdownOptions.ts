import { useState, useEffect } from 'react';
import { apiGet } from "@/lib/apiFetch";

// Type Definitions
export interface DropdownRole {
  id: string;
  name: string;
  type: 'management' | 'working';
}

export interface DropdownItem {
  id: string;
  name: string;
  unit: string;
  unitId: string;
}

export interface DropdownUnit {
  id: string;
  name: string;
}

export interface DropdownData {
  items: {
    material: DropdownItem[];
    equipment: DropdownItem[];
  };
  units: DropdownUnit[];
  roles: {
    management: DropdownRole[];
    working: DropdownRole[];
  };
}

export interface UseDropdownOptionsReturn {
  data: DropdownData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook Implementation
export const useDropdownOptions = (): UseDropdownOptionsReturn => {
  const [data, setData] = useState<DropdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDropdownOptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiGet('/daily-reports/dropdown-options');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response structure from API');
      }

      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch dropdown options:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchDropdownOptions
  };
};
