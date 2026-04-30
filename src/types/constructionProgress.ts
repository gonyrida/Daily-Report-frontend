export interface BoQData { 
  qty: number; 
  materialRate: number; 
  laborRate: number; 
  unitRate: number; 
  amount: number; 
}

export interface ProgressData { 
  qty: number; 
  amount: number; 
  percentage: number; 
}

export interface ConstructionProgressItem {
  id: string;
  uniqueId?: string;
  isBold?: boolean;
  scopeOfWorks: string;
  detailDescription: string;
  unit: string;
  boQ: BoQData;
  remark: string;
  previousWeek: ProgressData;
  thisWeek: ProgressData;
  upToThisWeek: ProgressData;
  remaining: ProgressData;
  nextWeekPlan: ProgressData;
  upToNextWeekPlan: ProgressData;
  source?: 'manual' | 'bulk';
  bulkImportId?: string;
  addedAt?: Date;
}

export interface ProjectInfo { 
  project: string; 
  subtitle: string; 
  date: string; 
  revision: string; 
}

export interface ConstructionProgressData { 
  projectInfo: ProjectInfo; 
  items: ConstructionProgressItem[]; 
}

export interface ConstructionProgressPayload {
  reportId: string;
  projectInfo: ProjectInfo;
  progressItems: ConstructionProgressItem[];
  createdAt: string;
  updatedAt: string;
}

interface WeeklyReportConstructionProgressProps {
  data?: ConstructionProgressData;
  onDataChange?: (data: ConstructionProgressData) => void;
  reportId?: string;
  isCreateNewMode?: boolean;
}

interface EditableCell { 
  rowIndex: number; 
  field: string; 
  itemId: string;
}

export type IdType = 'roman' | 'level1' | 'level2' | 'level3' | 'alpha' | 'empty';
export type AmbiguousIdType = IdType | 'ambiguous';

export type { WeeklyReportConstructionProgressProps, EditableCell };
