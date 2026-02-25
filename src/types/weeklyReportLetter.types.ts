export interface WeeklyReportLetterProps {
  data?: {
    refNoPrefix?: string;
    weekNumber?: string;
    reportDate?: string;
    recipientCompany?: string;
    recipientLocation?: string;
    recipientName?: string;
    ccList?: string[];
    letterBody?: string;
    signatureImage?: string;
    signatoryName?: string;
    signatoryPosition?: string;
    constructorName?: string;
    companyLocation?: string;
    companyPhone1?: string;
    companyPhone2?: string;
    companyEmail1?: string;
    companyEmail2?: string;
    dateRange?: string;
    projectName?: string;
    employer?: string;
  };
  onDataChange?: (data: any) => void;
}
