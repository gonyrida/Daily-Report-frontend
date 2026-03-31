export interface HsesData {
  training: Array<{
    id: string;
    typeOfTraining: string;
    date: string;
    venue: string;
    trainer: string;
    attendee: string;
    remarks: string;
  }>;
  inspection: Array<{
    id: string;
    typeOfInspection: string;
    date: string;
    inspector: string;
    remarks: string;
  }>;
  permit: Array<{
    id: string;
    typeOfPermit: string;
    startDate: string;
    endDate: string;
    inspector: string;
    approver: string;
    remarks: string;
  }>;
  firstAidAccident: string;
  otherActivities: string;
  hsePhotoReferences: any[];
}

export interface HsesProps {
  data?: HsesData;
  onChange?: (data: HsesData) => void;
  isEditing?: boolean;
}
